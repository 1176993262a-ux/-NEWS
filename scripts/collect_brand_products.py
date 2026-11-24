#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
家纺情报站 - 品牌新品每日巡检脚本
================================
用法:
    python scripts/collect_brand_products.py            # 巡检并写回 data/brand_products.json
    python scripts/collect_brand_products.py --dry-run  # 只抓取不写回
    python scripts/collect_brand_products.py --brand ikea muji  # 只巡检指定品牌

数据源策略:
1. 品牌官网优先, 其次有权限的官方旗舰店公开商品信息 (均来自 data/brand_products.json 的 brands[].official_site)
2. 只访问公开页面; 不绕过登录、验证码或反爬措施
3. 单品牌失败保留其历史数据, 仅更新快照状态与巡检时间

新品识别 (页面快照对比):
- 新出现 URL -> 与已有商品名称做相似度比对, 高相似归为 colorway/revision, 否则 new
- 历史下架后重现 -> relist
- 无官方上市日期 -> official_release_date 保持 null (绝不使用采集时间顶替)

注意: 商品名称/链接来自公开列表页原文, 材质/填充物等字段除非页面公开可得, 否则留空显示「待核验」, 不编造。
"""

import argparse
import difflib
import hashlib
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from urllib import request as urlreq
from urllib.error import URLError, HTTPError
from urllib.parse import urljoin, urlparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
SNAPSHOT_DIR = os.path.join(DATA_DIR, "snapshots")
PRODUCTS_FILE = os.path.join(DATA_DIR, "brand_products.json")
CST = timezone(timedelta(hours=8))

# 品类关键词 -> 品类归一 (中英)
CATEGORY_RULES = [
    (["四件套", "床品套件", "bedding set", "duvet cover set", "sheet set", "sheet bundle", "comforter set"], "四件套"),
    (["被芯", "被子", "羽绒被", "蚕丝被", "duvet", "comforter insert", "down comforter"], "被芯"),
    (["枕芯", "枕头", "pillow", "pillow insert"], "枕芯"),
    (["床笠", "fitted sheet", "床单款"], "床笠"),
    (["床垫", "mattress", "床褥", "mattress pad", "mattress topper"], "床垫"),
    (["毛毯", "法兰绒毯", "throw", "blanket"], "毛毯"),
    (["毛巾", "浴巾", "面巾", "towel", "bath towel", "hand towel"], "毛浴巾"),
    (["凉感", "电热", "石墨烯", "抗菌", "驱蚊", "功能"], "功能家纺"),
]


def log(msg, level="INFO"):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {level} {msg}", flush=True)


def http_get(url, timeout=20):
    req = urlreq.Request(url, headers={
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0 Safari/537.36"),
        "Accept": "text/html,application/xhtml+xml;q=0.9",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    })
    with urlreq.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    for enc in ("utf-8", "gbk", "gb18030"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


class LinkExtractor(HTMLParser):
    """提取 <a href> 与其锚文本, 用于发现商品链接"""
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            d = dict(attrs)
            self._href = d.get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            text = re.sub(r"\s+", " ", "".join(self._text)).strip()
            if self._href and text:
                self.links.append((self._href, text))
            self._href = None
            self._text = []


def clean_title(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"[\u3010\u3011\[\]]", " ", t).strip()
    return t[:120]


def looks_like_product(href, title):
    """过滤明显不是商品页的链接"""
    if not href or not title:
        return False
    low = href.lower()
    # 排除导航/帮助/账号等
    bad_hints = ["javascript:", "#", "mailto:", "login", "signin", "register",
                 "privacy", "terms", "help", "support", "about", "contact",
                 "cart", "checkout", "wishlist", "account", "policy",
                 "instagram", "facebook", "twitter", "youtube", "weibo"]
    if any(b in low for b in bad_hints):
        return False
    # 排除极短/纯导航锚文本
    if len(title) < 4:
        return False
    # 商品页常见路径特征
    good_hints = ["product", "goods", "item", "detail", "p/", "dp/", "shop/",
                  "/pd/", "/prod", "sku", "bedding", "bed", "duvet", "pillow",
                  "mattress", "sheets", "towel", "blanket", "quilt", "comforter"]
    return any(g in low for g in good_hints)


def guess_category(title):
    hay = title.lower()
    for kws, cat in CATEGORY_RULES:
        if any(k.lower() in hay for k in kws):
            return cat
    return None


def name_similarity(a, b):
    return difflib.SequenceMatcher(None, a or "", b or "").ratio()


def classify_change(name, existing_items, seen_before, url):
    """
    判定上新类型:
    - URL 历史上出现过但上一轮不在快照中 -> relist
    - 新 URL, 与某已有商品名称高度相似 (>=0.72) -> revision 或 colorway
    - 其余 -> new
    """
    if seen_before is not None and seen_before.get(url) is False:
        return "relist"
    for it in existing_items:
        sim = name_similarity(name, it.get("name", ""))
        if sim >= 0.85:
            # 差异主要在颜色/花型词 → colorway; 结构/材质词 → revision
            diff_kw = ["色", "花", "款", "条纹", "格", "印花", "colorway", "colour", "color"]
            if any(k in name for k in diff_kw) or any(k in it.get("name", "") for k in diff_kw):
                return "colorway"
            return "revision"
    return "new"


def load_data():
    with io.open(PRODUCTS_FILE, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def load_snapshot(brand_id):
    path = os.path.join(SNAPSHOT_DIR, f"brand_{brand_id}.json")
    if os.path.exists(path):
        try:
            with io.open(path, "r", encoding="utf-8-sig") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_snapshot(brand_id, snap):
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    path = os.path.join(SNAPSHOT_DIR, f"brand_{brand_id}.json")
    tmp = path + ".tmp"
    with io.open(tmp, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def patrol_brand(brand, data, now):
    """
    巡检单个品牌, 返回新商品列表与快照状态。
    官网为 null 的品牌跳过采集 (地址待人工核验), 不视为失败。
    """
    brand_id = brand["id"]
    site = brand.get("official_site")
    if not site:
        log(f"[{brand_id}] 官网地址待核验, 跳过自动采集 (不视为失败)")
        return [], {"skipped": True, "reason": "official_site 未配置", "checked_at": now}

    try:
        html = http_get(site, timeout=20)
    except Exception as e:
        log(f"[{brand_id}] 官网请求失败: {e}", "WARN")
        return [], {"error": str(e), "checked_at": now}

    parser = LinkExtractor()
    try:
        parser.feed(html)
    except Exception as e:
        log(f"[{brand_id}] HTML 解析异常: {e}", "WARN")
        return [], {"error": f"parse: {e}", "checked_at": now}

    # 只走站内链接, 限制访问范围
    base = urlparse(site)
    candidates = []
    for href, text in parser.links:
        url = urljoin(site, href)
        u = urlparse(url)
        if u.scheme not in ("http", "https"):
            continue
        if u.netloc and base.netloc and u.netloc != base.netloc:
            continue  # 不跨域采集
        if not looks_like_product(url, text):
            continue
        candidates.append((url, clean_title(text)))
    # 最多深入 N 个商品列表链接 (控制请求量, 避免对站点造成压力)
    delved = 0
    extra = []
    for url, text in candidates[:30]:
        if delved >= 12:
            break
        # 仅对列表/分类页继续深入一级, 商品页直接收录
        if any(g in url.lower() for g in ["product", "goods", "item", "detail", "p/", "dp/"]):
            continue
        try:
            sub_html = http_get(url, timeout=15)
            sub_p = LinkExtractor()
            sub_p.feed(sub_html)
            for href2, text2 in sub_p.links:
                u2 = urljoin(url, href2)
                if looks_like_product(u2, text2):
                    extra.append((u2, clean_title(text2)))
            delved += 1
            time.sleep(1.2)
        except Exception:
            delved += 1
            continue
    # 合并去重 (按 URL)
    seen_urls = {}
    merged = []
    for url, text in candidates + extra:
        if url not in seen_urls:
            seen_urls[url] = True
            merged.append((url, text))

    snapshot = load_snapshot(brand_id)
    prev_urls = snapshot.get("urls", {})
    # 记录 URL 是否在更早历史中出现过 (用于 relist 判定)
    history_urls = snapshot.get("history", {})
    existing_items = [it for it in data.get("items", []) if it.get("brand") == brand_id]

    new_items = []
    for url, title in merged:
        cat = guess_category(title)
        if cat is None:
            continue  # 无法归入监测品类, 不强行收录
        rec_id = "bp-" + hashlib.md5((brand_id + "|" + url).encode("utf-8")).hexdigest()[:10]
        if url in prev_urls:
            continue  # 上一轮已收录
        change_type = classify_change(title, existing_items, history_urls if url in history_urls else None, url)
        item = {
            "id": rec_id,
            "brand": brand_id,
            "brand_name": brand.get("name", brand_id),
            "country": brand.get("country", ""),
            "category": cat,
            "name": title,
            "model": None,
            "series": None,
            "price": None,
            "currency": "CNY" if brand.get("country") == "中国" else None,
            "sizes": None,
            "material": None,
            "filling": None,
            "craft": None,
            "features": [],
            "image_url": None,
            "product_url": url,
            "official_release_date": None,  # 列表页无法可靠获得 -> 保持 null, 不用采集时间顶替
            "first_detected_at": now,
            "collected_at": now,
            "change_type": change_type,
            "source_platform": "品牌官网",
            "verification_status": "待核验",
            "is_demo": False,
        }
        new_items.append(item)
        log(f"[{brand_id}] 新商品({change_type}): {title[:50]}")

    # 更新快照: urls 为本轮在售, history 累积所有出现过的 URL
    new_urls = {u: t for u, t in merged}
    new_history = dict(history_urls)
    for u in new_urls:
        new_history[u] = True
    save_snapshot(brand_id, {"urls": new_urls, "history": new_history, "updated_at": now})
    status = {
        "products_seen": len(new_urls),
        "new_found": len(new_items),
        "checked_at": now,
    }
    # 检测本轮消失的 URL (仅供 relist 判定与展示, 不删除已有商品记录)
    gone = [u for u in prev_urls if u not in new_urls]
    if gone:
        status["gone_count"] = len(gone)
    return new_items, status


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="品牌新品每日巡检")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--brand", nargs="*", help="只巡检指定品牌 id")
    args = parser.parse_args()

    if not os.path.exists(PRODUCTS_FILE):
        log(f"数据文件不存在: {PRODUCTS_FILE}", "ERROR")
        return 1

    data = load_data()
    brands = data.get("brands", [])
    now = datetime.now(CST).isoformat(timespec="seconds")
    targets = [b for b in brands if not args.brand or b["id"] in args.brand]

    all_new = []
    snapshot_status = {}
    for brand in targets:
        log(f"=== 巡检 [{brand['id']}] {brand.get('name','')} ===")
        try:
            new_items, status = patrol_brand(brand, data, now)
            all_new.extend(new_items)
            snapshot_status[brand["id"]] = status
        except Exception as e:
            # 任何意外异常都不得影响其他品牌与已有数据
            log(f"[{brand['id']}] 巡检异常 (已隔离): {e}", "ERROR")
            snapshot_status[brand["id"]] = {"error": str(e), "checked_at": now}
        time.sleep(2)

    # 合并到 items: 按 id 去重; 来源失败时保留历史数据
    existing_by_id = {it["id"]: it for it in data.get("items", [])}
    for it in all_new:
        if it["id"] not in existing_by_id:
            existing_by_id[it["id"]] = it
        else:
            old = existing_by_id[it["id"]]
            # 刷新采集时间, 更新 change_type; 保留 first_detected_at 与官方发布时间
            old["collected_at"] = now
            if it.get("change_type"):
                old["change_type"] = it["change_type"]
    data["items"] = list(existing_by_id.values())
    data["lastCheckAt"] = now
    data["generatedAt"] = now
    data["snapshotStatus"] = snapshot_status

    log(f"本轮新增 {len(all_new)} 件, 累计 {len(data['items'])} 件")

    if args.dry_run:
        log("dry-run 模式, 不写回")
        return 0

    bak = PRODUCTS_FILE + ".bak"
    if os.path.exists(PRODUCTS_FILE):
        with io.open(PRODUCTS_FILE, "r", encoding="utf-8") as src, io.open(bak, "w", encoding="utf-8") as dst:
            dst.write(src.read())
    tmp = PRODUCTS_FILE + ".tmp"
    with io.open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, PRODUCTS_FILE)
    log(f"已写回 {PRODUCTS_FILE} (备份: {bak})")
    return 0


if __name__ == "__main__":
    sys.exit(main())