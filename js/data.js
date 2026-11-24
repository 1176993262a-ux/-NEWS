// ============================================================
// 家纺情报站 - 数据层
// 真实数据由 scripts/collect_news.py 采集后写入 data/news.json
// 此文件内置示例数据，用于演示与离线浏览
// ============================================================

const SOURCES = [
  { id: "htt",        name: "Home Textiles Today",   nameCn: "美国家纺今日",   focus: "全球新品牌、新产品",       freq: "每周",   color: "#e07b39", baseUrl: "https://hometextilestoday.com" },
  { id: "bnn",        name: "Bedding News Now",      nameCn: "床品新闻",       focus: "床品细分市场创新",         freq: "每周",   color: "#3b82f6", baseUrl: "https://beddingnewsnow.com" },
  { id: "cnhfa",      name: "中家纺",                 nameCn: "中国家用纺织品行业协会", focus: "国内行业、企业、标准",  freq: "每周",   color: "#dc2626", baseUrl: "http://www.chinahometex.org" },
  { id: "heimtextil", name: "Heimtextil",            nameCn: "法兰克福家纺展", focus: "全球趋势、新材料",         freq: "每月/展会季", color: "#7c3aed", baseUrl: "https://heimtextil.messefrankfurt.com" },
  { id: "intertextile", name: "Intertextile",        nameCn: "中国国际家纺展", focus: "国内供应链、新产品",       freq: "展会季", color: "#0891b2", baseUrl: "https://intertextile-home.hk.messefrankfurt.com" },
  { id: "materials",  name: "ADVANSA · Lenzing · HeiQ", nameCn: "材料与技术供应商", focus: "新材料、新技术",       freq: "每月",   color: "#059669", baseUrl: "" },
  { id: "wgsn",       name: "WGSN",                  nameCn: "时尚趋势预测",   focus: "未来消费和设计趋势",       freq: "每月",   color: "#db2777", baseUrl: "https://www.wgsn.com" },
  { id: "xhs",        name: "小红书",                 nameCn: "消费者社区",     focus: "消费者真实需求、新品牌",   freq: "每周",   color: "#ff2442", baseUrl: "https://www.xiaohongshu.com" },
];

const CATEGORIES = [
  { id: "global-products",    name: "全球新品牌·新产品" },
  { id: "bedding-innovation", name: "床品细分创新" },
  { id: "domestic-industry",  name: "国内行业·标准" },
  { id: "global-trends",      name: "全球趋势·新材料" },
  { id: "supply-chain",       name: "供应链·展会" },
  { id: "materials-tech",     name: "新材料·新技术" },
  { id: "future-trends",      name: "未来消费·设计趋势" },
  { id: "consumer-insight",   name: "消费者洞察" },
];

const SAMPLE_NEWS = [
  // ---------- 今日 ----------
  {
    id: "n001", source: "bnn", category: "bedding-innovation",
    date: "2026-11-23",
    title: "凉感科技赛道升温：床品品牌竞逐睡眠温控新卖点",
    titleEn: "Bedding Brands Double Down on Cooling Tech as Sleep-Temperature Claims Heat Up",
    summary: "多家床品品牌在第四季度集中推出凉感系列，从相变材料到石墨烯纤维，睡眠温控正从概念走向标配。业内认为凉感功能将成为中高端四件套的基础门槛。",
    tags: ["凉感", "功能床品", "温控"],
    url: "https://beddingnewsnow.com",
    featured: true
  },
  {
    id: "n002", source: "xhs", category: "consumer-insight",
    date: "2026-11-23",
    title: "「水洗棉四件套」周搜索热度环比上涨63%，宿舍场景成主力",
    summary: "本周小红书水洗棉相关笔记新增超4200篇，学生宿舍与出租屋场景占讨论主体。消费者核心诉求为：机洗不变形、裸睡亲肤、百元价位。",
    tags: ["水洗棉", "学生宿舍", "平价床品"],
    url: "https://www.xiaohongshu.com/search_result?keyword=水洗棉四件套"
  },
  {
    id: "n003", source: "cnhfa", category: "domestic-industry",
    date: "2026-11-23",
    title: "《床上用品 生态纺织品》团体标准征求意见稿发布",
    summary: "中家纺发布生态床品团体标准征求意见稿，对可降解纤维占比、染料生态安全等级提出量化要求，反馈截止2027年1月15日。",
    tags: ["行业标准", "生态纺织品", "监管"],
    url: "http://www.chinahometex.org",
    featured: true
  },

  // ---------- 昨日 ----------
  {
    id: "n004", source: "htt", category: "global-products",
    date: "2026-11-22",
    title: "Brooklinen 母公司递交IPO申请，瞄准全球扩张",
    titleEn: "Brooklinen Parent Company Files for IPO, Eyes Global Expansion",
    summary: "DTC床品巨头Brooklinen母公司正式递交纳斯达克上市申请，募资用途包括欧洲与亚洲市场拓展。招股书披露其床品复购率达38%。",
    tags: ["Brooklinen", "IPO", "DTC"],
    url: "https://hometextilestoday.com",
    featured: true
  },
  {
    id: "n005", source: "materials", category: "materials-tech",
    date: "2026-11-22",
    title: "兰精推出气候中和版 TENCEL™ Modal，瞄准高端床品应用",
    titleEn: "Lenzing Launches Climate-Neutral TENCEL Modal for Premium Bedding",
    summary: "兰精集团宣布TENCEL™ Modal纤维实现气候中和生产，首批合作方为欧洲高端床品品牌。该纤维保持原有柔软度，碳足迹降低90%。",
    tags: ["Lenzing", "TENCEL", "气候中和", "莫代尔"],
    url: "https://www.lenzing.com/news"
  },
  {
    id: "n006", source: "xhs", category: "consumer-insight",
    date: "2026-11-22",
    title: "秋冬「牛奶绒」种草笔记破万，保暖+轻量成核心关键词",
    summary: "牛奶绒四件套本周种草笔记突破1.2万篇，消费者高频提及「轻而不塌」「不起静电」。价格带集中在150-300元，南方无暖气地区需求最旺。",
    tags: ["牛奶绒", "秋冬床品", "保暖"],
    url: "https://www.xiaohongshu.com/search_result?keyword=牛奶绒"
  },

  // ---------- 本周 ----------
  {
    id: "n007", source: "htt", category: "global-products",
    date: "2026-11-21",
    title: "Parachute 伦敦首店开业，欧洲线下布局提速",
    titleEn: "Parachute Opens First Physical Store in London",
    summary: "美国生活方式品牌Parachute在伦敦开设欧洲首家门店，店内设床位体验区。此前其欧洲线上销售额同比增长85%。",
    tags: ["Parachute", "线下店", "欧洲市场"],
    url: "https://hometextilestoday.com"
  },
  {
    id: "n008", source: "bnn", category: "bedding-innovation",
    date: "2026-11-20",
    title: "重力毯市场预计2028年达12亿美元，焦虑经济催生新品类",
    titleEn: "Weighted Blanket Market Projected to Reach $1.2B by 2028",
    summary: "行业报告显示重力毯复合年增长率18.4%，驱动力为睡眠焦虑人群扩大。品类正从单一重力向「可调节配重+冷感面料」组合升级。",
    tags: ["重力毯", "市场数据", "睡眠焦虑"],
    url: "https://beddingnewsnow.com"
  },
  {
    id: "n009", source: "wgsn", category: "future-trends",
    date: "2026-11-20",
    title: "WGSN 2027春夏家纺关键色彩：数字薄荷与陶土粉",
    summary: "WGSN发布2027春夏家纺色彩方向，数字薄荷(Digital Mint)代表疗愈与科技感，陶土粉(Terracotta Blush)承载在地与温度，两者组合将主导高端床品配色。",
    tags: ["WGSN", "色彩趋势", "2027春夏"],
    url: "https://www.wgsn.com",
    featured: true
  },
  {
    id: "n010", source: "cnhfa", category: "domestic-industry",
    date: "2026-11-19",
    title: "南通叠石桥国际家纺城10月成交额同比增长12%",
    summary: "叠石桥家纺市场10月线上线下合计成交42.6亿元，电商占比首次突破55%。功能性床品（凉感/抗菌/保暖）为最大增长品类。",
    tags: ["叠石桥", "市场数据", "电商"],
    url: "http://www.chinahometex.org"
  },
  {
    id: "n011", source: "heimtextil", category: "global-trends",
    date: "2026-11-19",
    title: "Heimtextil 2027 年度主题公布：「Next Horizons」聚焦材料创新",
    summary: "法兰克福家纺展公布2027年度主题Next Horizons，下设生物基材料、闭环循环、AI织造三个方向，趋势巡展将于明年1月首发。",
    tags: ["Heimtextil", "年度主题", "生物基材料"],
    url: "https://heimtextil.messefrankfurt.com"
  },

  // ---------- 上周 ----------
  {
    id: "n012", source: "materials", category: "materials-tech",
    date: "2026-11-15",
    title: "HeiQ 环保抗菌技术成功应用于羽绒被填充物",
    summary: "HeiQ与国内羽绒供应商完成抗菌技术验证，白鹅绒经处理后抑菌率超99%且不影响蓬松度，首批产品将于2027Q1上市。",
    tags: ["HeiQ", "抗菌", "羽绒被"],
    url: "https://www.heiq.com/news"
  },
  {
    id: "n013", source: "htt", category: "global-products",
    date: "2026-11-14",
    title: "Coyuchi 完成C轮融资，主打再生棉床品",
    titleEn: "Coyuchi Raises Series C for Regenerative Cotton Bedding",
    summary: "有机家纺品牌Coyuchi获C轮融资，资金将用于再生棉供应链建设。其「Full Circle」回收计划已回收旧床品超50吨。",
    tags: ["Coyuchi", "再生棉", "可持续", "融资"],
    url: "https://hometextilestoday.com"
  },
  {
    id: "n014", source: "intertextile", category: "supply-chain",
    date: "2026-11-13",
    title: "2026 intertextile 秋冬家纺展收官：专业买家超4万",
    summary: "中国国际家纺展秋冬展观众数据出炉，海外买家增长23%。智能睡眠、功能面料、宠物家纺为三大人气板块，现场订单额同比涨9%。",
    tags: ["intertextile", "展会", "智能睡眠"],
    url: "https://intertextile-home.hk.messefrankfurt.com"
  },
  {
    id: "n015", source: "xhs", category: "consumer-insight",
    date: "2026-11-12",
    title: "「酒店同款床品」话题浏览量破3亿，白鹅绒被成爆款",
    summary: "五星级酒店同款床品话题持续升温，消费者以「住酒店体验」为购买动机。白鹅绒被搜索量周涨41%，高支棉芯被套连带增长。",
    tags: ["酒店同款", "白鹅绒被", "爆品"],
    url: "https://www.xiaohongshu.com/search_result?keyword=酒店同款床品"
  },
  {
    id: "n016", source: "bnn", category: "bedding-innovation",
    date: "2026-11-12",
    title: "DTC床垫品牌集体进军床品套装，捆绑销售成新增长引擎",
    titleEn: "DTC Mattress Brands Pivot into Bedding Bundles",
    summary: "多家线上床垫品牌上线床品套装线，利用床垫购买场景做连带销售。数据显示搭售床品可使客单价提升22-35%。",
    tags: ["DTC", "床垫", "捆绑销售", "客单价"],
    url: "https://beddingnewsnow.com"
  },

  // ---------- 更早 ----------
  {
    id: "n017", source: "wgsn", category: "future-trends",
    date: "2026-11-06",
    title: "「安静奢华」趋势延伸至卧室：极简高支棉需求上升",
    summary: "WGSN指出Quiet Luxury从服饰向家居迁移，卧室呈现「去Logo、重材质」倾向，60支以上长绒棉四件套在欧美高端市场增速显著。",
    tags: ["安静奢华", "高支棉", "Quiet Luxury"],
    url: "https://www.wgsn.com"
  },
  {
    id: "n018", source: "cnhfa", category: "domestic-industry",
    date: "2026-11-05",
    title: "中家纺发布2026年前三季度行业运行报告",
    summary: "报告显示规上家纺企业营收同比增长6.8%，利润率4.9%。出口方面对东盟增长14%，对欧美基本持平，内销贡献持续扩大。",
    tags: ["行业报告", "运行数据", "出口"],
    url: "http://www.chinahometex.org"
  },
  {
    id: "n019", source: "heimtextil", category: "global-trends",
    date: "2026-11-04",
    title: "Heimtextil 全球趋势巡展上海站回顾：生物基材料成焦点",
    summary: "趋势巡展上海站吸引超3000名专业观众，海藻纤维、菌丝体填充物、菠萝叶纤维等生物基材料样品咨询量最高。",
    tags: ["趋势巡展", "生物基材料", "海藻纤维"],
    url: "https://heimtextil.messefrankfurt.com"
  },
  {
    id: "n020", source: "materials", category: "materials-tech",
    date: "2026-11-03",
    title: "ADVANSA 新一代透气聚酯纤维通过 OEKO-TEX® 认证",
    summary: "ADVANSA推出Suprell®透气改性聚酯纤维，水分传导速度较常规产品提升40%，已获OEKO-TEX® Standard 100 Class I认证，适用于婴童床品。",
    tags: ["ADVANSA", "透气纤维", "OEKO-TEX", "婴童"],
    url: "https://www.advansa.com"
  },
  {
    id: "n021", source: "intertextile", category: "supply-chain",
    date: "2026-10-28",
    title: "intertextile 2027 春夏家纺展定档，智能睡眠板块扩容",
    summary: "2027春夏展定于明年8月举行，新增「智能睡眠科技」专馆，覆盖智能温控被、睡眠监测织物、自适应支撑枕等品类，展位预订已超六成。",
    tags: ["intertextile", "智能睡眠", "2027春夏"],
    url: "https://intertextile-home.hk.messefrankfurt.com"
  },
  {
    id: "n022", source: "htt", category: "global-products",
    date: "2026-10-22",
    title: "可持续床品认证指南：零售商需要关注什么",
    titleEn: "Sustainable Bedding Certifications: What Retailers Need to Know",
    summary: "文章梳理GOTS、OEKO-TEX、GRS等认证在床品零售中的消费者认知差异，建议品牌优先标注「亲肤安全」类认证以降低决策门槛。",
    tags: ["可持续认证", "GOTS", "零售"],
    url: "https://hometextilestoday.com"
  },
  {
    id: "n023", source: "bnn", category: "bedding-innovation",
    date: "2026-10-18",
    title: "可调节高度枕头迎来姿势敏感型买家热潮",
    titleEn: "Adjustable Pillows See Surge in Posture-Conscious Buyers",
    summary: "可增减填充层的调节枕在北美线上增速达65%，购买动机从「肩颈不适」转向「睡姿细分」。侧睡/仰睡专用枕片成为新配件品类。",
    tags: ["调节枕", "睡姿", "品类创新"],
    url: "https://beddingnewsnow.com"
  },
  {
    id: "n024", source: "xhs", category: "consumer-insight",
    date: "2026-10-15",
    title: "「亚麻席」反季热销，悦己消费推动高端床品年轻化",
    summary: "亚麻凉席10月搜索量不降反升，25-30岁女性为主力人群，「悦己」「审美优先」为核心购买动机，单价500元以上产品占比提升。",
    tags: ["亚麻席", "悦己消费", "年轻化"],
    url: "https://www.xiaohongshu.com/search_result?keyword=亚麻席"
  }
];

// 运行时数据：优先加载 data/news.json（采集脚本生成），失败则回退示例数据
// 示例数据统一标记：与真实采集数据明显区分，禁止在生产中冒充真实新闻
SAMPLE_NEWS.forEach(n => {
  n.is_demo = true;
  n.source_type = "demo";
  n.verification_status = "示例";
  n.published_at = n.date;
  n.source_url = n.url;
  n.collected_at = "2026-11-23T09:00:00+08:00";
});
let NEWS = SAMPLE_NEWS;
let DATA_LOADED_FROM_LIVE = false;

async function loadNewsData() {
  try {
    const res = await fetch("data/news.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no live data");
    const json = await res.json();
    if (Array.isArray(json.items) && json.items.length > 0) {
      NEWS = json.items;
      DATA_LOADED_FROM_LIVE = true;
      return json;
    }
    throw new Error("empty live data");
  } catch (e) {
    return { generatedAt: null, items: NEWS };
  }
}

function getSource(id) { return SOURCES.find(s => s.id === id) || {}; }
function getCategory(id) { return CATEGORIES.find(c => c.id === id) || {}; }
