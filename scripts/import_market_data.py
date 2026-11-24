#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
家纺情报站 - 市场数据导入适配器
================================
用法:
    python scripts/import_market_data.py data/import/market_2026-11.csv
    python scripts/import_market_data.py market_metrics_import_2026-11.csv --format json
    python scripts/import_market_data.py some_file.csv --dry-run

支持两种输入:
1. CSV 文件 (UTF-8, 首行表头)
   必需列: platform,subject_type,subject,period_start,period_end,metric_name,value,unit,data_type,data_source,source_url
   可选列: period_label,caliber,estimate_note
2. JSON 文件: 本站 market.html 页面端解析后下载的规范化数组

行为:
- 严格校验: value 必须数值, data_type 必须属于 5 类, 第三方估算必须含 estimate_note
- 违反口径红线的行拒绝入库并报告 (GMV/支付金额/销量/搜索指数/排名 不得混用同名指标)
- 按 id 去重合并, 写盘前备份旧数据
- 不生成任何虚构数据; 敏感后台报表禁止导入到公开仓库
"""

import argparse
import csv
import hashlib
import io
import json
import os
import sys
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MARKET_FILE = os.path.join(DATA_DIR, "market_metrics.json")
CST = timezone(timedelta(hours=8))

VALID_TYPES = ["official", "authorized", "estimate", "public", "manual"]
REQUIRED = ["platform", "subject_type", "subject", "period_start", "period_end",
            "metric_name", "value", "unit", "data_type", "data_source", "source_url"]
OPTIONAL = ["period_label", "caliber", "estimate_note"]

# 口径混用红线: 这些指标名不得合并到同一记录
AMBIGUOUS_METRICS = ["GMV", "支付金额", "成交件数", "销量区间", "搜索指数", "销售排名", "gmv", "sales rank"]


def log(msg, level="INFO"):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {level} {msg}", flush=True)


def make_id(row):
    key = "|".join(str(row.get(k, "") or "") for k in
                   ("platform", "subject", "period_start", "period_end", "metric_name", "data_source"))
    return "mk-" + hashlib.md5(key.encode("utf-8")).hexdigest()[:12]


def normalize_row(raw):
    """将一行原始数据规范化为标准记录; 返回 (record, problems)"""
    problems = []
    row = {k: (str(v).strip() if v is not None else "") for k, v in raw.items()}

    missing = [k for k in REQUIRED if not row.get(k)]
    if missing:
        return None, [f"缺必需字段 {','.join(missing)}"]

    for k in list(row.keys()):
        if not isinstance(k, str):
            continue
        rk = k.strip()
        if rk != k:
            row[rk] = row.pop(k)

    try:
        value = float(row["value"])
    except (TypeError, ValueError):
        return None, [f"value 非数值: {row['value']}"]

    dtype = row["data_type"]
    if dtype not in VALID_TYPES:
        return None, [f"data_type 非法: {dtype} (应为 {','.join(VALID_TYPES)})"]

    if row["subject_type"] not in ("brand", "category"):
        problems.append(f"subject_type 应为 brand/category, 当前 {row['subject_type']}")

    if dtype == "estimate" and not row.get("estimate_note"):
        problems.append("第三方估算必须填写 estimate_note (估算标签与原始统计区间)")

    metric = row["metric_name"]
    if metric in AMBIGUOUS_METRICS and not row.get("caliber"):
        problems.append(f"指标 {metric} 属易混用口径, 必须填写 caliber 说明统计口径")

    if problems:
        return None, problems

    return {
        "id": make_id(row),
        "platform": row["platform"],
        "subject_type": row["subject_type"],
        "subject": row["subject"],
        "period_start": row["period_start"] or None,
        "period_end": row["period_end"] or None,
        "period_label": row.get("period_label", ""),
        "metric_name": metric,
        "value": value,
        "unit": row.get("unit", ""),
        "data_source": row["data_source"],
        "data_type": dtype,
        "caliber": row.get("caliber", ""),
        "estimate_note": row.get("estimate_note", ""),
        "source_url": row.get("source_url", ""),
        "collected_at": datetime.now(CST).isoformat(timespec="seconds"),
        "verification_status": "待核验",
        "is_demo": False,
    }, []


def read_csv(path):
    with io.open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(r) for r in reader]
    # csv.DictReader 读 BOM 处理由 utf-8-sig 完成


def read_json(path):
    with io.open(path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return data["items"]
    raise ValueError("JSON 文件应为数组或含 items 数组的对象")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="市场数据导入适配器")
    parser.add_argument("file", help="待导入的 CSV 或 JSON 文件")
    parser.add_argument("--format", choices=["auto", "csv", "json"], default="auto")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        log(f"文件不存在: {args.file}", "ERROR")
        return 1

    fmt = args.format
    if fmt == "auto":
        fmt = "json" if args.file.lower().endswith(".json") else "csv"

    try:
        raw_rows = read_json(args.file) if fmt == "json" else read_csv(args.file)
    except Exception as e:
        log(f"解析 {fmt} 失败: {e}", "ERROR")
        return 1

    if not raw_rows:
        log("文件中没有可导入的行", "WARN")
        return 0

    accepted, rejected = [], []
    for i, raw in enumerate(raw_rows, 1):
        rec, problems = normalize_row(raw)
        if rec:
            accepted.append(rec)
        else:
            rejected.append((i, problems))
            log(f"第 {i} 行被拒绝: {'; '.join(problems)}", "WARN")

    log(f"解析 {len(raw_rows)} 行: 接受 {len(accepted)}, 拒绝 {len(rejected)}")
    if not accepted:
        log("没有可入库的行", "ERROR")
        return 1

    if args.dry_run:
        log("dry-run 模式, 不写回。预览前 3 条:")
        for r in accepted[:3]:
            log(json.dumps(r, ensure_ascii=False))
        return 0

    if not os.path.exists(MARKET_FILE):
        log(f"数据文件不存在: {MARKET_FILE}", "ERROR")
        return 1
    with io.open(MARKET_FILE, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    existing = {it["id"]: it for it in data.get("items", [])}
    added = 0
    for rec in accepted:
        if rec["id"] not in existing:
            existing[rec["id"]] = rec
            added += 1
        else:
            # 同 id 更新数值与口径, 保留首采时间上下文
            old = existing[rec["id"]]
            for k in ("value", "unit", "caliber", "estimate_note", "source_url", "data_source", "verification_status"):
                if rec.get(k) not in (None, ""):
                    old[k] = rec[k]
            old["collected_at"] = rec["collected_at"]
    data["items"] = list(existing.values())
    data["generatedAt"] = datetime.now(CST).isoformat(timespec="seconds")

    bak = MARKET_FILE + ".bak"
    with io.open(MARKET_FILE, "r", encoding="utf-8") as src, io.open(bak, "w", encoding="utf-8") as dst:
        dst.write(src.read())
    tmp = MARKET_FILE + ".tmp"
    with io.open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, MARKET_FILE)
    log(f"已合并入库: 新增 {added}, 更新 {len(accepted) - added}, 累计 {len(data['items'])} (备份: {bak})")
    return 0


if __name__ == "__main__":
    sys.exit(main())