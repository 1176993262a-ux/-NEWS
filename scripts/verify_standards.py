#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
家纺情报站 - 标准动态每周核验脚本
================================
用法:
    python scripts/verify_standards.py            # 核验并写回 data/standards.json
    python scripts/verify_standards.py --dry-run  # 只核验不写回

核验目标: 国家标准全文公开系统 (openstd.samr.gov.cn) 搜索列表 + 详情页

行为:
1. 先按标准号在搜索页 table.result_list 精确匹配行, 取状态/实施日期/详情 hcno
2. 再抓详情页补全 中文标准名称 / 发布日期 / 实施日期 / 状态 / 替代关系
3. 仅在官方页面返回可明确解析的字段时更新, 无法确认时保留原值并标注待核验
4. 对比核验前后差异, 生成 meta.lastChanges 变化日志
5. 写盘前备份旧数据到 data/standards.json.bak, 异常不丢数据
6. 单条标准核验异常不影响其他标准

注意: 不复制、不分发受版权保护的标准全文, 仅索引公开元数据与链接。
"""

import argparse
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from urllib import request as urlreq
from urllib.error import URLError, HTTPError
from urllib.parse import quote

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
STANDARDS_FILE = os.path.join(DATA_DIR, "standards.json")

CST = timezone(timedelta(hours=8))

OPENSTD_SEARCH = "https://openstd.samr.gov.cn/bzgk/gb/std_list?p.p2={code}&p.p90=circulationDate&p.p91=desc"

VALID_STATUSES = ("现行", "即将实施", "废止", "废止代替", "修订", "征求意见")


def log(msg, level="INFO"):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {level} {msg}", flush=True)


def http_get(url, timeout=20):
    req = urlreq.Request(url, headers={
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0 Safari/537.36"),
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9",
        "Accept-Language": "zh-CN,zh;q=0.9",
    })
    with urlreq.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    for enc in ("utf-8", "gbk", "gb18030"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def extract_date(text):
    """提取 2010-06-01 / 2010年6月1日 / 2010-06-01 00:00:00.0 形态日期"""
    if not text:
        return ""
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r"(\d{4})\u5e74(\d{1,2})\u6708(\d{1,2})\u65e5", text)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    return ""


def _cell_text(html_fragment):
    t = re.sub(r"<[^>]+>", "", html_fragment)
    return re.sub(r"\s+", "", t).replace("\xa0", "").strip()


def _parse_result_table(html):
    """解析 openstd 搜索结果表, 返回行列表 (列序按表头动态映射)"""
    tm = re.search(r'<table[^>]*class="table result_list[^"]*"[^>]*>(.*?)</table>', html, re.S)
    if not tm:
        return []
    table_html = tm.group(1)
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, re.S)
    if not rows:
        return []
    header_cells = re.findall(r"<th[^>]*>(.*?)</th>", rows[0], re.S)
    col_map = {}
    for i, hc in enumerate(header_cells):
        name = _cell_text(hc)
        if "标准号" in name:
            col_map["std_no"] = i
        elif "语种" in name:
            col_map["lang"] = i
        elif "标准名称" in name:
            col_map["name"] = i
        elif "状态" in name:
            col_map["status"] = i
        elif "发布日期" in name:
            col_map["publish"] = i
        elif "实施日期" in name:
            col_map["impl"] = i
    if "std_no" not in col_map or "status" not in col_map:
        return []
    out = []
    for tr in rows[1:]:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(cells) <= col_map["std_no"]:
            continue
        rec = {
            "std_no": _cell_text(cells[col_map["std_no"]]),
            "lang": _cell_text(cells[col_map["lang"]]) if "lang" in col_map else "",
            "status": _cell_text(cells[col_map["status"]]),
        }
        if "name" in col_map:
            rec["name"] = _cell_text(cells[col_map["name"]])
        if "publish" in col_map:
            rec["publish_dt"] = _cell_text(cells[col_map["publish"]])
        if "impl" in col_map:
            rec["impl_dt"] = _cell_text(cells[col_map["impl"]])
        hm = re.search(r"showInfo\(['\"]([A-F0-9]{16,})['\"]\)", cells[col_map["std_no"]], re.I)
        if hm:
            rec["hcno"] = hm.group(1)
        out.append(rec)
    return out


def _label_value(html, label, chars=120):
    """从详情页提取 标签: 值 形态的值"""
    for pat in (label + r"[：:\s]*</[^>]+>\s*([^<]{2,%d})" % chars,
                label + r"[：:]\s*([^<；;]{2,%d})" % chars):
        m = re.search(pat, html, re.S)
        if m:
            val = re.sub(r"\s+", "", m.group(1)).replace("\u3000", "").strip()
            if val and val not in ("暂无", "无", "--"):
                return val
    return ""


def verify_detail(official_url):
    """抓详情页补全: 名称/发布日期/实施日期/状态/替代关系, 仅返回可明确解析的字段"""
    fields = {}
    try:
        html = http_get(official_url, timeout=20)
    except Exception as e:
        log(f"详情页请求失败: {e}", "WARN")
        return fields
    name = _label_value(html, "中文标准名称")
    if name:
        fields["name"] = name
    pub = _label_value(html, "发布日期")
    d = extract_date(pub)
    if d:
        fields["publish_date"] = d
    impl = _label_value(html, "实施日期")
    d = extract_date(impl)
    if d:
        fields["implementation_date"] = d
    status = _label_value(html, "标准状态")
    if status in VALID_STATUSES:
        fields["status"] = status
    rep = _label_value(html, "代替情况", 200)
    if rep:
        fields["replace_info_raw"] = rep
    return fields


def verify_one(std):
    """
    核验单条标准, 返回 (found, fetched_fields)。
    严格只从搜索结果表与详情页的真实字段取数, 未知字段保留原值。
    """
    code = std.get("std_code", "")
    if not code:
        return False, {}
    fields = {}
    try:
        html = http_get(OPENSTD_SEARCH.format(code=quote(code)), timeout=20)
    except Exception as e:
        log(f"[{code}] 检索请求失败: {e}", "WARN")
        return False, {}

    rows = _parse_result_table(html)
    if not rows:
        log(f"[{code}] 官方检索未返回可解析结果表", "WARN")
        return False, {}

    norm_code = re.sub(r"\s+", "", code)
    main_rows = [r for r in rows if re.sub(r"\s+", "", r["std_no"]) == norm_code and not r.get("lang")]
    if not main_rows:
        main_rows = [r for r in rows if re.sub(r"\s+", "", r["std_no"]) == norm_code]
    if not main_rows:
        log(f"[{code}] 结果表中无精确匹配行 (共 {len(rows)} 行), 保留待核验", "WARN")
        return False, {}

    r = main_rows[0]
    if r["status"] in VALID_STATUSES:
        fields["status"] = r["status"]
    if r.get("impl_dt"):
        d = extract_date(r["impl_dt"])
        if d:
            fields["implementation_date"] = d
    if r.get("publish_dt"):
        d = extract_date(r["publish_dt"])
        if d:
            fields["publish_date"] = d
    if r.get("name"):
        fields["name"] = r["name"]
    if r.get("hcno"):
        fields["official_url"] = f"https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno={r['hcno']}"

    # 详情页补全列表页缺失字段
    if fields.get("official_url"):
        time.sleep(1)
        detail = verify_detail(fields["official_url"])
        for k in ("name", "publish_date", "implementation_date", "status"):
            if detail.get(k):
                fields[k] = detail[k]
        raw = detail.get("replace_info_raw", "")
        if raw:
            m_replace = re.search(r"全部代替[：:\s]*([A-Z0-9/\u2014\-]+(?:\.\d+)?)", raw)
            if m_replace and not std.get("replaces"):
                fields["replaces"] = m_replace.group(1)
            m_by = re.search(r"被([A-Z0-9/\u2014\-]+(?:\.\d+)?)代替", raw)
            if m_by and not std.get("replaced_by"):
                fields["replaced_by"] = m_by.group(1)
    return bool(fields), fields


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="家纺标准每周核验")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(STANDARDS_FILE):
        log(f"数据文件不存在: {STANDARDS_FILE}", "ERROR")
        return 1

    with io.open(STANDARDS_FILE, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    standards = data.get("standards", [])
    now = datetime.now(CST).isoformat(timespec="seconds")
    changes = []

    for std in standards:
        code = std.get("std_code", "")
        log(f"=== 核验 {code} ===")
        old_status = std.get("status", "")
        old_impl = std.get("implementation_date", "")
        old_pub = std.get("publish_date", "")
        found, fetched = verify_one(std)
        if found:
            std["verification_status"] = "已核验"
            std["verification_date"] = now[:10]
            std["collected_at"] = now
            new_status = fetched.get("status", "")
            new_impl = fetched.get("implementation_date", "")
            new_pub = fetched.get("publish_date", "")
            if new_status and new_status != old_status:
                changes.append({
                    "icon": "🔄", "date": now[:10],
                    "text": f"{code} 状态由「{old_status}」变更为「{new_status}」（来源：国家标准全文公开系统）",
                })
                std["status"] = new_status
            if new_impl and new_impl != old_impl:
                changes.append({
                    "icon": "📅", "date": now[:10],
                    "text": f"{code} 实施日期由「{old_impl or '待核验'}」更新为「{new_impl}」",
                })
                std["implementation_date"] = new_impl
            if new_pub and new_pub != old_pub:
                std["publish_date"] = new_pub
            if fetched.get("name") and "待核验" not in fetched["name"]:
                std["name"] = fetched["name"]
            if fetched.get("official_url"):
                std["official_url"] = fetched["official_url"]
            if fetched.get("replaces") and not std.get("replaces"):
                std["replaces"] = fetched["replaces"]
                changes.append({
                    "icon": "🔗", "date": now[:10],
                    "text": f"{code} 替代关系确认：替代 {fetched['replaces']}",
                })
            if fetched.get("replaced_by") and not std.get("replaced_by"):
                std["replaced_by"] = fetched["replaced_by"]
                changes.append({
                    "icon": "🔔", "date": now[:10],
                    "text": f"{code} 将被 {fetched['replaced_by']} 代替",
                })
            log(f"[{code}] 已核验: status={std.get('status')} impl={std.get('implementation_date')}")
        else:
            std["verification_date"] = now[:10]
            note = std.get("verification_note") or ""
            if "自动核验未获取到官方页面确认信息" not in note:
                note = (note + " " if note else "") + "自动核验未获取到官方页面确认信息，请人工至 std.samr.gov.cn 核实"
            std["verification_note"] = note.strip()
            log(f"[{code}] 未能确认, 保留原数据并记录核验尝试", "WARN")
        time.sleep(2)

    data["generatedAt"] = now
    if changes:
        prev = data.get("lastChanges", [])
        data["lastChanges"] = (changes + prev)[:50]
        log(f"检测到 {len(changes)} 项标准变化")
    else:
        log("无标准变化")

    if args.dry_run:
        log("dry-run 模式, 不写回")
        return 0

    bak = STANDARDS_FILE + ".bak"
    if os.path.exists(STANDARDS_FILE):
        with io.open(STANDARDS_FILE, "r", encoding="utf-8") as src, io.open(bak, "w", encoding="utf-8") as dst:
            dst.write(src.read())
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = STANDARDS_FILE + ".tmp"
    with io.open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STANDARDS_FILE)
    log(f"已写回 {STANDARDS_FILE} (备份: {bak})")
    return 0


if __name__ == "__main__":
    sys.exit(main())