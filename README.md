# 家纺情报站

床品行业每日情报面板 —— 为家纺产品经理打造的信息聚合工具。

覆盖 8 个核心信息源，按「全球品牌 / 床品创新 / 国内行业 / 全球趋势 / 供应链 / 材料技术 / 未来趋势 / 消费者洞察」八个维度组织，支撑每周情报扫描与展会季深度跟踪。

## 快速开始

直接双击打开 `index.html` 即可浏览（内置示例数据）。

## 目录结构

```
├── index.html              # 情报站主页面
├── css/style.css           # 样式（含深色模式）
├── js/data.js              # 信息源配置 + 示例数据 + 数据加载
├── js/app.js               # 页面交互（筛选/搜索/收藏/已读/主题）
├── data/
│   ├── news.json           # 采集脚本生成的实时数据（自动加载）
│   └── inbox/              # 小红书等需手动导入的数据
├── scripts/
│   └── collect_news.py     # 每日采集脚本
└── README.md
```

## 数据采集

### 运行采集

```bash
python scripts/collect_news.py
```

脚本会依次抓取各信息源，合并去重后写入 `data/news.json`，刷新页面自动生效。

常用参数：

```bash
python scripts/collect_news.py --source htt bnn   # 只采集指定源
python scripts/collect_news.py --dry-run          # 试跑不写盘
```

### 各信息源采集方式

| 信息源 | 方式 | 说明 |
|---|---|---|
| Home Textiles Today | RSS | `https://hometextilestoday.com/feed/` |
| Bedding News Now | RSS | `https://beddingnewsnow.com/feed/` |
| 中家纺 | 网页抽取 | 列表页 `<a>` 关键词过滤 |
| Heimtextil | 网页抽取 | 新闻/趋势页 |
| Intertextile | 网页抽取 | 新闻中心页 |
| ADVANSA/Lenzing/HeiQ | RSS + 网页 | Lenzing、HeiQ 走 RSS，ADVANSA 走网页 |
| WGSN | 网页抽取 | 博客/趋势页 |
| 小红书 | inbox 导入 | 见下文 |

### 小红书数据导入

小红书有较强反爬与合规限制，采用手动/半自动导入：

1. 在小红书搜索核心关键词（如「四件套」「水洗棉」「酒店同款床品」）
2. 挑选高互动笔记，按格式整理为 JSON 放入 `data/inbox/`
3. 采集脚本会自动读取合并

格式示例见 `data/inbox/xhs_sample.json`：

```json
[
  {
    "date": "2026-11-23",
    "title": "笔记标题或趋势总结",
    "summary": "核心发现：消费者诉求、价格带、场景",
    "tags": ["标签1", "标签2"],
    "url": "https://www.xiaohongshu.com/..."
  }
]
```

### 可选：LLM 翻译与摘要

海外源标题/摘要默认保留原文。设置以下环境变量即可启用 LLM 自动翻译与摘要：

```bash
set HT_LLM_ENDPOINT=https://your-llm-api/chat    # 接口需返回 {"result": "..."}
set HT_LLM_TOKEN=your-token                       # 可选 Bearer Token
```

### 海外站点代理

```bash
set HT_HTTP_PROXY=http://127.0.0.1:7890
```

## 每日自动运行（Windows 计划任务）

```powershell
# 每天 08:00 自动采集, 记录日志
schtasks /create /tn "家纺情报站每日采集" /tr "pythonw C:\...\scripts\collect_news.py" /sc daily /st 08:00
```

## 功能说明

- **来源筛选**：顶部导航按信息源一键过滤，显示各源条数
- **分类筛选**：八大分类维度切换
- **全文搜索**：标题/摘要/标签即时搜索
- **收藏**：点击 ☆ 收藏，侧栏「我的收藏」集中管理（本地持久化）
- **已读标记**：点击卡片自动标记已读并降低透明度
- **深色模式**：右上角切换，本地记忆
- **数据来源标识**：每次加载明确显示当前是实时数据还是示例数据

---

# 部署为公开网站

网站已配置为 GitHub Pages + GitHub Actions 架构：Pages 负责免费公开托管，Actions 负责每天北京时间早 8 点自动采集数据。无需服务器，无需安装任何软件。

## 部署步骤（约 5 分钟）

**第 1 步：创建 GitHub 仓库**

1. 登录 [github.com](https://github.com)（没有账号就注册一个，免费）
2. 点击右上角 "+" → "New repository"
3. 仓库名随意，例如 `bedding-intel`，选择 **Public**，点击 "Create repository"

**第 2 步：上传项目文件**

1. 在新仓库页面，点击 "uploading an existing file" 链接
2. 将本项目的全部文件（连同文件夹）拖入上传区：
   - `index.html`、`css/`、`js/`、`data/`、`scripts/`、`.github/`、`.nojekyll`、`README.md`
   - 注意：`.github/workflows/collect-and-deploy.yml` 必须上传，这是自动采集与部署的核心配置
3. 提交信息随便填，点击 "Commit changes"

**第 3 步：启用 GitHub Pages**

1. 进入仓库 Settings → Pages
2. "Build and deployment" 下的 Source 选择 **GitHub Actions**
3. 保存即可

**第 4 步：触发首次部署**

1. 进入仓库 Actions 标签页，会看到 "Collect & Deploy" 工作流
2. 点击右侧 "Run workflow" → "Run workflow" 手动触发一次
3. 等待绿色对勾出现后，回到 Actions → "github-pages" 环境，或仓库首页右侧 "Deployments" 可看到链接
4. 公开访问地址格式为 `https://你的用户名.github.io/仓库名/`

此后每天早 8 点自动采集；你也可以随时在 Actions 页面手动 "Run workflow" 立即更新。

## 每天更新的小红书数据怎么加

小红书无法自动抓取（反爬限制），但可以通过 GitHub 网页随时补充：

1. 在 GitHub 仓库中打开 `data/inbox/`，点击 "Add file" → "Create new file"
2. 命名如 `xhs_week.json`，粘贴以下格式的笔记发现：

```json
[
  {
    "date": "2026-11-24",
    "title": "趋势或笔记总结",
    "summary": "核心发现",
    "tags": ["标签"],
    "url": "https://www.xiaohongshu.com/..."
  }
]
```

3. Commit 后，工作流自动触发并部署，情报即上线

## 自定义域名（可选）

如果你想用 `intel.yourdomain.com` 这类地址：仓库 Settings → Pages → "Custom domain" 填入你的域名，并在域名服务商处添加一条 CNAME 记录指向 `你的用户名.github.io`。

## 国内访问说明

GitHub Pages 在国内大部分地区可访问，但偶有波动。若目标读者全在国内，可考虑将仓库镜像到国内静态托管（如腾讯云 EdgeOne Pages、阿里云 OSS 静态网站），同样只需上传相同文件，只是自动采集需另行配置定时任务。