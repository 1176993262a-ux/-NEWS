#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
家纺情报站 · 每日数据采集脚本
================================
用法:
    python scripts/collect_news.py            # 全量采集并写入 data/news.json
    python scripts/collect_news.py --dry-run  # 只抓取不写盘, 用于检查
    python scripts/collect_news.py --source htt bnn  # 只采集指定信息源

工作方式:
    1. RSS 源 (Home Textiles Today / Bedding News Now 等) 走 RSS 解析
    2. 网页源 (中家纺 / Heimtextil / Intertextile 等) 走列表页关键词抽取
    3. 材料&技术源 (ADVANSA / Lenzing / HeiQ) 走各自新闻页 RSS 或网页抽取
    4. 小红书: 出于反爬与合规, 从 data/inbox/*.json 手动/半自动导入
    5. 合并去重 (按 URL + 标题指纹), 保留历史数据, 输出 data/news.json

可选环境变量:
    HT_LLM_ENDPOINT  传入则启用 LLM 中文翻译与摘要 (POST JSON {text})
    HT_LLM_TOKEN     LLM 接口鉴权 Bearer Token
    HT_HTTP_PROXY    走代理访问海外站点, 例 http://127.0.0.1:7890
"""

import argparse
import glob
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta, date
from html.parser import HTMLParser
from urllib import request as urlreq
from urllib.error import URLError, HTTPError
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

# ------------------------------------------------------------------
# 路径
# ------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
INBOX_DIR = os.path.join(DATA_DIR, "inbox")
NEWS_FILE = os.path.join(DATA_DIR, "news.json")

# ------------------------------------------------------------------
# 信息源配置
#   type: rss / scrape / inbox
#   category: 默认分类 id (与 js/data.js 中 CATEGORIES 对应)
# ------------------------------------------------------------------
SOURCES = [
    {
        "id": "htt", "type": "rss",
        "feeds": ["https://hometextilestoday.com/feed/"],
        "category": "global-products",
    },
    {
        "id": "bnn", "type": "rss",
        "feeds": ["https://beddingnewsnow.com/feed/"],
        "category": "bedding-innovation",
    },
    {
        "id": "cnhfa", "type": "scrape",
        "pages": ["http://www.chinahometex.org/channels/3.html",
                  "http://www.chinahometex.org/channels/4.html"],
        "category": "domestic-industry",
        "link_hint": ["news", "art", "info", "content"],
    },
    {
        "id": "heimtextil", "type": "scrape",
        "pages": ["https://heimtextil.messefrankfurt.com/frankfurt/en/news-press.html"],
        "category": "global-trends",
        "link_hint": ["news", "press", "trend"],
    },
    {
        "id": "intertextile", "type": "scrape",
        "pages": ["https://intertextile-home.hk.messefrankfurt.com/hongkong/en/press.html"],
        "category": "supply-chain",
        "link_hint": ["press", "news"],
    },
    {
        "id": "materials", "type": "rss",
        "feeds": ["https://www.lenzing.com/news/rss",
                  "https://www.heiq.com/feed/"],
        "pages": ["https://www.advansa.com/news/"],
        "category": "materials-tech",
        "link_hint": ["news"],
    },
    {
        "id": "wgsn", "type": "scrape",
        "pages": ["https://www.wgsn.com/blogs/"],
        "category": "future-trends",
        "link_hint": ["blog", "trend"],
    },
    {
        "id": "xhs", "type": "inbox",
        "category": "consumer-insight",
    },
]

# 相关性关键词 (不区分大小写; 命中任一即保留)
KEYWORDS = [
    "bedding", "bed linen", "duvet", "pillow", "mattress", "quilt",
    "blanket", "sheet", "comforter", "home textile", "textile",
    "tencel", "lenzing", "fib", "cotton", "down",
    "trend", "material", "fabric",
    "家纺", "床品", "四件套", "被", "枕", "床垫", "家纺展", "纤维",
    "面料", "趋势", "标准", "行业", "水洗棉", "牛奶绒", "亚麻",
]

# 排除关键词: 命中即判为无关内容 (招聘/广告/推广等), 避免误收录
BAD_KEYWORDS = [
    "招聘", "诚聘", "招工", "求职", "简历", "高薪诚聘",
    "career", "careers", "hiring", "job", "jobs", "vacanc", "recruit",
    "广告", "推广", "招商加盟", "加盟商", "招代理", "热线", "咨询电话", "赞助商",
]


def log(msg, level="INFO"):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {level} {msg}", flush=True)


# ------------------------------------------------------------------
# HTTP
# ------------------------------------------------------------------
def http_get(url, timeout=20):
    headers = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0 Safari/537.36"),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    proxy = os.environ.get("HT_HTTP_PROXY")
    if proxy:
        handler = urlreq.ProxyHandler({"http": proxy, "https": proxy})
        opener = urlreq.build_opener(handler)
    else:
        opener = urlreq.build_opener()
    req = urlreq.Request(url, headers=headers)
    with opener.open(req, timeout=timeout) as resp:
        raw = resp.read()
        # 尝试从 header 或 meta 推断编码, 默认 utf-8
        charset = "utf-8"
        ctype = resp.headers.get("Content-Type", "")
        m = re.search(r"charset=([\w-]+)", ctype)
        if m:
            charset = m.group(1)
        text = raw.decode(charset, errors="replace")
        m2 = re.search(r'<meta[^>]+charset=["\']?([\w-]+)', text[:2000], re.I)
        if m2 and m2.group(1).lower() not in ("utf-8",):
            try:
                text = raw.decode(m2.group(1), errors="replace")
            except LookupError:
                pass
        return text


def strip_html(html_text):
    return re.sub(r"<[^>]+>", " ", html_text).strip()


# ------------------------------------------------------------------
# RSS 解析 (兼容 RSS 2.0 与 Atom)
# ------------------------------------------------------------------
def parse_rss(xml_text, base_url):
    items = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        log(f"RSS 解析失败 {base_url}: {e}", "WARN")
        return items

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    # RSS 2.0
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = strip_html(item.findtext("description") or "")
        pub = (item.findtext("pubDate") or item.findtext("dc:date") or "").strip()
        items.append({"title": title, "url": link or base_url,
                      "summary": desc, "pub": pub})
    # Atom
    if not items:
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            title = (entry.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            link = link_el.get("href", "") if link_el is not None else ""
            summary = strip_html(entry.findtext(
                "{http://www.w3.org/2005/Atom}summary") or
                entry.findtext("{http://www.w3.org/2005/Atom}content") or "")
            pub = (entry.findtext("{http://www.w3.org/2005/Atom}updated") or
                   entry.findtext("{http://www.w3.org/2005/Atom}published") or "").strip()
            items.append({"title": title, "url": link or base_url,
                          "summary": summary, "pub": pub})
    return items


def parse_pubdate(s):
    """尽力解析日期, 失败返回今天"""
    if not s:
        return date.today().isoformat()
    # ISO 8601
    try:
        s2 = re.sub(r"[Zz]$", "+00:00", s)
        dt = datetime.fromisoformat(s2)
        return dt.date().isoformat()
    except (ValueError, TypeError):
        pass
    # RFC 822 / 850
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
                "%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日"):
        try:
            return datetime.strptime(s.strip()[:26], fmt).date().isoformat()
        except ValueError:
            continue
    m = re.search(r"(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})", s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    return date.today().isoformat()


# ------------------------------------------------------------------
# 网页列表抽取: 抓 <a> 文本, 关键词过滤
# ------------------------------------------------------------------
class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            d = dict(attrs)
            self._href = d.get("href", "")
            self._text = []

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            text = "".join(self._text).strip()
            if text and len(text) >= 6:
                self.links.append({"url": self._href, "title": text})
            self._href = None
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)


def scrape_links(html_text, base_url, link_hints):
    p = LinkExtractor()
    try:
        p.feed(html_text)
    except Exception:
        pass
    out = []
    seen = set()
    parsed_base = urlparse(base_url)
    for a in p.links:
        url = urljoin(base_url, a["url"])
        pu = urlparse(url)
        # 只保留同域或子域链接
        if pu.netloc and parsed_base.netloc and pu.netloc != parsed_base.netloc:
            if not pu.netloc.endswith("." + parsed_base.netloc.split("www.")[-1]):
                continue
        # 过滤导航/翻页
        if any(x in pu.path.lower() for x in ("login", "register", "cart", "search")):
            continue
        if link_hints and not any(h in pu.path.lower() for h in link_hints):
            continue
        if url in seen or a["title"] in seen:
            continue
        seen.add(url)
        seen.add(a["title"])
        out.append({"url": url, "title": a["title"]})
    return out


# ------------------------------------------------------------------
# 可选 LLM 翻译/摘要
# ------------------------------------------------------------------
def llm_call(text, task="translate"):
    endpoint = os.environ.get("HT_LLM_ENDPOINT")
    if not endpoint:
        return None
    payload = json.dumps({"text": text, "task": task}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    token = os.environ.get("HT_LLM_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = urlreq.Request(endpoint, data=payload, headers=headers, method="POST")
        with urlreq.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("result") or data.get("text")
    except Exception as e:
        log(f"LLM 调用失败 ({task}): {e}", "WARN")
        return None


def make_chinese_title(title_en, summary_en):
    zh = llm_call(title_en, "translate")
    if zh:
        return zh
    # 无 LLM 时保留原文, 前端会显示 titleEn
    return title_en


def make_summary(text, limit=120):
    if not text:
        return ""
    zh = llm_call(text[:1000], "summarize")
    if zh:
        return zh[:limit * 2]
    return re.sub(r"\s+", " ", text)[:limit]


# ------------------------------------------------------------------
# 相关性过滤
# ------------------------------------------------------------------
def is_relevant(title, summary=""):
    hay = f"{title} {summary}".lower()
    # 先排除招聘/广告/推广等无关内容
    if any(bk.lower() in hay for bk in BAD_KEYWORDS):
        return False
    return any(k.lower() in hay for k in KEYWORDS)


# ------------------------------------------------------------------
# 各类型采集器
# ------------------------------------------------------------------
def collect_rss(src, limit=15):
    found = []
    for feed_url in src.get("feeds", []):
        try:
            xml_text = http_get(feed_url)
            entries = parse_rss(xml_text, feed_url)
            log(f"[{src['id']}] RSS {feed_url} -> {len(entries)} 条")
        except Exception as e:
            log(f"[{src['id']}] RSS 失败 {feed_url}: {e}", "WARN")
            continue
        for e in entries:
            if not is_relevant(e["title"], e["summary"]):
                continue
            d = parse_pubdate(e["pub"])
            found.append(annotate_item({
                "source": src["id"],
                "category": src["category"],
                "date": d,
                "title": make_chinese_title(e["title"], e["summary"]),
                "titleEn": e["title"],
                "summary": make_summary(e["summary"]),
                "url": e["url"],
                "tags": extract_tags(e["title"] + " " + e["summary"]),
            }, source_type="auto-rss", verification_status="已核验"))
        time.sleep(1)
    return found[:limit]


def collect_scrape(src, limit=15):
    found = []
    for page_url in src.get("pages", []):
        try:
            html_text = http_get(page_url)
            links = scrape_links(html_text, page_url, src.get("link_hint", []))
            log(f"[{src['id']}] 网页 {page_url} -> {len(links)} 链接")
        except Exception as e:
            log(f"[{src['id']}] 网页失败 {page_url}: {e}", "WARN")
            continue
        for a in links:
            if not is_relevant(a["title"]):
                continue
            found.append(annotate_item({
                "source": src["id"],
                "category": src["category"],
                "date": date.today().isoformat(),
                "title": make_chinese_title(a["title"], ""),
                "titleEn": a["title"] if not re.search(r"[\u4e00-\u9fff]", a["title"]) else "",
                "summary": "",
                "url": a["url"],
                "tags": extract_tags(a["title"]),
            }, source_type="auto-scrape", verification_status="待核验"))
        time.sleep(1)
    return found[:limit]


def collect_inbox(src):
    """读取 data/inbox/*.json, 格式同 NEWS item (title/summary/tags/url/date)"""
    found = []
    os.makedirs(INBOX_DIR, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(INBOX_DIR, "*.json"))):
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
            items = data if isinstance(data, list) else data.get("items", [])
            for it in items:
                found.append(annotate_item({
                    "source": src["id"],
                    "category": src["category"],
                    "date": it.get("date", date.today().isoformat()),
                    "title": it["title"],
                    "titleEn": it.get("titleEn", ""),
                    "summary": it.get("summary", ""),
                    "url": it.get("url", ""),
                    "tags": it.get("tags", extract_tags(it["title"])),
                }, source_type="inbox", verification_status="待核验"))
            log(f"[{src['id']}] 导入 {path} -> {len(items)} 条")
        except Exception as e:
            log(f"[{src['id']}] inbox 读取失败 {path}: {e}", "WARN")
    return found


def annotate_item(item, source_type, verification_status):
    """V2.0: 统一补充溯源与核验元数据, 兼容旧数据 (旧字段缺失时补默认值)"""
    now = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")
    item["source_url"] = item.get("source_url") or item.get("url", "")
    item.setdefault("published_at", item.get("date", ""))
    item["collected_at"] = item.get("collected_at") or now
    item["source_type"] = item.get("source_type") or source_type
    item["verification_status"] = item.get("verification_status") or verification_status
    if item.get("is_demo") is None:
        item["is_demo"] = False
    return item


STOPWORDS = {"the", "a", "an", "of", "for", "and", "in", "to", "with", "new",
             "的", "了", "和", "与", "在", "为"}


def extract_tags(text, max_tags=4):
    """从文本中抽取高频有意义词作为标签"""
    words = re.findall(r"[\u4e00-\u9fff]{2,4}|[A-Za-z]{3,}", text)
    seen, tags = set(), []
    for w in words:
        lw = w.lower()
        if lw in STOPWORDS or lw in seen:
            continue
        if any(k.lower() == lw for k in KEYWORDS) and len(tags) < max_tags:
            tags.append(lw if w.isascii() else w)
            seen.add(lw)
    return tags


# ------------------------------------------------------------------
# 去重 & 合并
# ------------------------------------------------------------------
def item_fingerprint(item):
    key = (item.get("url", "") + "|" + item.get("title", "")).encode("utf-8")
    return hashlib.md5(key).hexdigest()[:12]


def load_existing():
    if os.path.exists(NEWS_FILE):
        try:
            with open(NEWS_FILE, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
            return data.get("items", [])
        except Exception:
            return []
    return []


def merge(existing, fresh, keep_days=90):
    """合并新旧数据, 按指纹去重, 保留近 keep_days 天"""
    by_fp = {}
    for it in existing:
        by_fp[item_fingerprint(it)] = it
    new_count = 0
    for it in fresh:
        fp = item_fingerprint(it)
        if fp not in by_fp:
            it["id"] = "f" + fp
            it["featured"] = False
            by_fp[fp] = it
            new_count += 1
        else:
            # 更新已有条目的内容, 保留 featured/收藏标记
            old = by_fp[fp]
            for k in ("title", "titleEn", "summary", "tags", "date"):
                if it.get(k):
                    old[k] = it[k]
            # V2.0: 为旧数据补齐元数据字段 (保留旧值不覆盖)
            old.setdefault("source_url", old.get("url", ""))
            old.setdefault("published_at", old.get("date", ""))
            old.setdefault("collected_at", it.get("collected_at", ""))
            old.setdefault("source_type", it.get("source_type", "legacy"))
            old.setdefault("verification_status", it.get("verification_status", "待核验"))
            old.setdefault("is_demo", False)
    cutoff = (date.today() - timedelta(days=keep_days)).isoformat()
    items = [v for v in by_fp.values() if v.get("date", "") >= cutoff]
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    return items, new_count


# ------------------------------------------------------------------
# 主流程
# ------------------------------------------------------------------
def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    parser = argparse.ArgumentParser(description="家纺情报站每日采集")
    parser.add_argument("--dry-run", action="store_true", help="只抓取不写盘")
    parser.add_argument("--source", nargs="*", help="只采集指定信息源 id")
    args = parser.parse_args()

    targets = [s for s in SOURCES if not args.source or s["id"] in args.source]
    fresh = []
    for src in targets:
        log(f"=== 采集 [{src['id']}] {src['type']} ===")
        collected = []
        try:
            if src["type"] == "rss":
                collected = collect_rss(src)
            elif src["type"] == "scrape":
                collected = collect_scrape(src)
            elif src["type"] == "inbox":
                collected = collect_inbox(src)
        except Exception as e:
            log(f"[{src['id']}] 采集异常: {e}", "ERROR")
        log(f"[{src['id']}] 有效条目 {len(collected)} 条")
        fresh.extend(collected)

    existing = load_existing()
    try:
        items, new_count = merge(existing, fresh)
    except Exception as e:
        # 合并异常不得导致已保存数据丢失: 退回使用旧数据
        log(f"合并异常, 保留旧数据: {e}", "ERROR")
        items, new_count = existing, 0
    log(f"合并完成: 新增 {new_count} 条, 总计 {len(items)} 条")

    if args.dry_run:
        log("dry-run 模式, 不写盘")
        return 0

    # V2.0: 写盘前备份旧数据, 保证异常可回滚
    os.makedirs(DATA_DIR, exist_ok=True)
    bak_file = NEWS_FILE + ".bak"
    if os.path.exists(NEWS_FILE):
        try:
            with open(NEWS_FILE, "r", encoding="utf-8") as src, open(bak_file, "w", encoding="utf-8") as dst:
                dst.write(src.read())
        except Exception as e:
            log(f"备份旧数据失败 (继续写盘): {e}", "WARN")

    now_cst = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")
    output = {
        "generatedAt": now_cst,
        "total": len(items),
        "changelog": {
            "run_at": now_cst,
            "new_count": new_count,
            "total_after": len(items),
            "sources_seen": [t["id"] for t in targets],
        },
        "items": items,
    }
    tmp_file = NEWS_FILE + ".tmp"
    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, NEWS_FILE)
    except Exception as e:
        # 写盘失败时保留旧文件, 清理临时文件
        log(f"写盘失败, 旧数据未受影响: {e}", "ERROR")
        if os.path.exists(tmp_file):
            try:
                os.remove(tmp_file)
            except Exception:
                pass
        return 1
    log(f"已写入 {NEWS_FILE} (备份: {bak_file}, 新增 {new_count} 条)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
