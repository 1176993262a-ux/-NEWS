# data/inbox/ 手动导入目录

本目录用于存放**真实**的半自动导入情报（如小红书公开笔记摘要），供 `scripts/collect_news.py` 的 inbox 采集器读取。

## 格式

JSON 数组，每条字段：`date`、`title`、`titleEn`(可选)、`summary`、`tags`、`url`。

```json
[
  {
    "date": "2026-11-23",
    "title": "真实笔记标题",
    "summary": "真实内容摘要",
    "tags": ["标签"],
    "url": "https://www.xiaohongshu.com/explore/真实笔记ID"
  }
]
```

## 红线

- 只放**可追溯的真实数据**，url 必须指向原始公开页面。
- **禁止**在本目录放置虚构/示例数据；示例与测试夹具放在 `scripts/fixtures/`。
- inbox 导入的记录统一标记 `source_type: "inbox"`、`verification_status: "待核验"`，不冒充已核验。