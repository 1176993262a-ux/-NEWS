// ============================================================
// 家纺情报站 V2.1 - 全站标签字典（PRD 第6节）
// 九个独立维度：稳定ID、中英名称、多语言别名、父级ID、旧标签映射、启用状态
// 所有页面筛选用本字典；同维 OR、跨维 AND；分面计数忽略本维自身选择
// ============================================================

const TAXONOMY = {

  product_category: {
    id: "product_category", name: "产品品类", nameEn: "Product Category", multi: true,
    values: [
      { id: "bed-set", name: "四件套", nameEn: "Bedding Set",
        aliases: ["bedding set","bed linen","bedding","床品","床单","床笠","被套","枕套","寝具","シーツ","掛け布団カバー","침구","침대 시트","이불커버","Bettwäsche","Spannbettlaken","linge de lit","drap-housse"],
        children: [
          { id: "bed-set-kit", name: "套件", nameEn: "Kit", parent: "bed-set", aliases: ["套件","kit","set bedding"] },
          { id: "bed-set-sheet", name: "床单", nameEn: "Flat Sheet", parent: "bed-set", aliases: ["床单","flat sheet","シーツ"] },
          { id: "bed-set-fitted", name: "床笠", nameEn: "Fitted Sheet", parent: "bed-set", aliases: ["床笠","床裙","fitted sheet","spannbettlaken","drap-housse"] },
          { id: "bed-set-duvet-cover", name: "被套", nameEn: "Duvet Cover", parent: "bed-set", aliases: ["被套","duvet cover","掛け布団カバー","이불커버"] },
          { id: "bed-set-pillowcase", name: "枕套", nameEn: "Pillowcase", parent: "bed-set", aliases: ["枕套","pillowcase"] },
        ] },
      { id: "quilt", name: "被芯", nameEn: "Duvet / Comforter",
        aliases: ["duvet","comforter","quilt","羽绒被","纤维被","棉花被","蚕丝被","羊毛被","被子","掛け布団","羽毛布団","이불","구스이불","Bettdecke","Daunendecke","couette"],
        children: [
          { id: "quilt-down", name: "羽绒被", nameEn: "Down Duvet", parent: "quilt", aliases: ["羽绒被","down duvet","down comforter","羽毛布団"] },
          { id: "quilt-fiber", name: "纤维被", nameEn: "Fiber Duvet", parent: "quilt", aliases: ["纤维被","fiber duvet","化纤被","合成纤维被"] },
          { id: "quilt-cotton", name: "棉花被", nameEn: "Cotton Quilt", parent: "quilt", aliases: ["棉花被","棉被","cotton quilt"] },
          { id: "quilt-silk", name: "蚕丝被", nameEn: "Silk Duvet", parent: "quilt", aliases: ["蚕丝被","silk duvet","silk quilt"] },
          { id: "quilt-wool", name: "羊毛被", nameEn: "Wool Duvet", parent: "quilt", aliases: ["羊毛被","wool duvet","wool comforter"] },
          { id: "quilt-other", name: "其他填充被", nameEn: "Other Fill Duvet", parent: "quilt", aliases: ["其他填充被","mixed fill","混合填充"] },
        ] },
      { id: "pillow", name: "枕芯", nameEn: "Pillow",
        aliases: ["pillow","ergonomic pillow","枕头","支撑枕","记忆枕","枕","まくら","ベッドパッド","베개","기능성 베개","Kopfkissen","oreiller"],
        children: [
          { id: "pillow-fiber", name: "纤维枕", nameEn: "Fiber Pillow", parent: "pillow", aliases: ["纤维枕","fiber pillow"] },
          { id: "pillow-memory", name: "记忆绵枕", nameEn: "Memory Foam Pillow", parent: "pillow", aliases: ["记忆绵枕","记忆棉枕","memory foam pillow","memory pillow"] },
          { id: "pillow-latex", name: "乳胶枕", nameEn: "Latex Pillow", parent: "pillow", aliases: ["乳胶枕","latex pillow"] },
          { id: "pillow-down", name: "羽绒枕", nameEn: "Down Pillow", parent: "pillow", aliases: ["羽绒枕","down pillow"] },
          { id: "pillow-natural", name: "天然填充枕", nameEn: "Natural Fill Pillow", parent: "pillow", aliases: ["天然填充枕","natural fill","荞麦枕"] },
          { id: "pillow-composite", name: "复合材料枕", nameEn: "Composite Pillow", parent: "pillow", aliases: ["复合材料枕","composite pillow","复合枕"] },
        ] },
      { id: "mattress", name: "床垫", nameEn: "Mattress",
        aliases: ["mattress","hybrid mattress","弹簧床垫","泡绵床垫","マットレス","敷き布団","매트리스","Matratze","matelas"],
        children: [
          { id: "mattress-spring", name: "弹簧床垫", nameEn: "Spring Mattress", parent: "mattress", aliases: ["弹簧床垫","spring mattress","innerspring","袋装弹簧"] },
          { id: "mattress-foam", name: "泡绵床垫", nameEn: "Foam Mattress", parent: "mattress", aliases: ["泡绵床垫","泡沫床垫","foam mattress","memory foam mattress","泡棉床垫"] },
          { id: "mattress-latex", name: "乳胶床垫", nameEn: "Latex Mattress", parent: "mattress", aliases: ["乳胶床垫","latex mattress"] },
          { id: "mattress-coir", name: "棕纤维床垫", nameEn: "Coir Mattress", parent: "mattress", aliases: ["棕纤维床垫","棕垫","coir mattress","椰棕"] },
          { id: "mattress-hybrid", name: "复合床垫", nameEn: "Hybrid Mattress", parent: "mattress", aliases: ["复合床垫","hybrid mattress","混合床垫"] },
          { id: "mattress-topper", name: "薄垫", nameEn: "Mattress Topper", parent: "mattress", aliases: ["薄垫","mattress topper","topper","床褥"] },
        ] },
      { id: "material-general", name: "通用材料", nameEn: "General Material",
        aliases: ["面料","填充物","辅料","功能材料","fabric","filling","functional material"],
        children: [
          { id: "material-fabric", name: "面料", nameEn: "Fabric", parent: "material-general", aliases: ["面料","fabric","面料材质"] },
          { id: "material-filling", name: "填充物", nameEn: "Filling", parent: "material-general", aliases: ["填充物","填充","filling","fill"] },
          { id: "material-auxiliary", name: "辅料", nameEn: "Auxiliary", parent: "material-general", aliases: ["辅料","auxiliary","trims"] },
          { id: "material-functional", name: "功能材料", nameEn: "Functional Material", parent: "material-general", aliases: ["功能材料","functional material","功能纤维"] },
        ] },
    ]
  },

  intel_type: {
    id: "intel_type", name: "情报主类型", nameEn: "Intelligence Type", multi: false,
    values: [
      { id: "brand-news", name: "品牌动态", nameEn: "Brand News", aliases: ["品牌动态","brand news"] },
      { id: "product-launch", name: "产品上新", nameEn: "Product Launch", aliases: ["产品上新","product launch","新品"] },
      { id: "product-iteration", name: "产品迭代", nameEn: "Product Iteration", aliases: ["产品迭代","product iteration","迭代"] },
      { id: "material-tech", name: "材料技术", nameEn: "Material Technology", aliases: ["材料技术","material technology","材料工艺"] },
      { id: "tech-patent", name: "技术专利", nameEn: "Technology Patent", aliases: ["技术专利","tech patent","专利"] },
      { id: "research-paper", name: "科研论文", nameEn: "Research Paper", aliases: ["科研论文","research paper","论文"] },
      { id: "cross-industry", name: "跨界技术", nameEn: "Cross-industry Tech", aliases: ["跨界技术","cross-industry tech","跨界"] },
      { id: "standard-regulation", name: "标准法规", nameEn: "Standard & Regulation", aliases: ["标准法规","standard regulation","标准"] },
      { id: "industry-trend", name: "行业趋势", nameEn: "Industry Trend", aliases: ["行业趋势","industry trend","趋势"] },
      { id: "market-demand", name: "市场需求", nameEn: "Market Demand", aliases: ["市场需求","market demand","需求"] },
      { id: "supply-chain-expo", name: "供应链展会", nameEn: "Supply Chain & Expo", aliases: ["供应链展会","supply chain expo","展会"] },
      { id: "business-change", name: "经营变化", nameEn: "Business Change", aliases: ["经营变化","business change","经营"] },
    ]
  },

  tech_function: {
    id: "tech_function", name: "技术功能", nameEn: "Tech Function", multi: true,
    values: [
      { id: "thermo-moisture", name: "温湿度管理", nameEn: "Thermo & Moisture", aliases: ["温湿度管理","thermo moisture"],
        children: [
          { id: "cooling-touch", name: "接触凉感", parent: "thermo-moisture", aliases: ["凉感","接触凉感","cooling","cool touch","接触冷感","냉감"] },
          { id: "heat-dissipation", name: "持续散热", parent: "thermo-moisture", aliases: ["散热","持续散热","heat dissipation","放熱","방열"] },
          { id: "thermal-insulation", name: "保暖", parent: "thermo-moisture", aliases: ["保暖","保温","thermal insulation","断熱","보온"] },
          { id: "pcm", name: "相变调温", parent: "thermo-moisture", aliases: ["相变","相变材料","PCM","phase change","thermoregulation","温度調節","상변화물질","온도조절"] },
          { id: "moisture-absorb", name: "吸湿", parent: "thermo-moisture", aliases: ["吸湿","moisture absorbing","吸湿性"] },
          { id: "moisture-wicking", name: "导湿", parent: "thermo-moisture", aliases: ["导湿","吸湿排汗","moisture wicking","吸水速乾","흡한속건"] },
          { id: "breathable", name: "透气", parent: "thermo-moisture", aliases: ["透气","breathable","air permeable","通気"] },
          { id: "vapor-permeable", name: "透湿", parent: "thermo-moisture", aliases: ["透湿","water vapor permeable","透湿性"] },
        ] },
      { id: "comfort-touch", name: "舒适与触感", nameEn: "Comfort & Touch", aliases: ["舒适触感","comfort touch"],
        children: [
          { id: "softness", name: "柔软", parent: "comfort-touch", aliases: ["柔软","soft","softness"] },
          { id: "skin-friendly", name: "亲肤", parent: "comfort-touch", aliases: ["亲肤","skin-friendly"] },
          { id: "low-friction", name: "低摩擦", parent: "comfort-touch", aliases: ["低摩擦","low friction"] },
          { id: "lightweight func", name: "轻量化", parent: "comfort-touch", aliases: ["轻量","轻量化","lightweight"] },
          { id: "drape", name: "悬垂性", parent: "comfort-touch", aliases: ["悬垂","悬垂性","drape"] },
        ] },
      { id: "support", name: "支撑与承托", nameEn: "Support", aliases: ["支撑承托","support"],
        children: [
          { id: "pressure-relief", name: "压力分散", parent: "support", aliases: ["压力分散","分散压力","pressure relief","体圧分散","체압분산"] },
          { id: "resilience-fn", name: "回弹", parent: "support", aliases: ["回弹","回弹性","resilience","復元性","복원력"] },
          { id: "zoned-support", name: "分区支撑", parent: "support", aliases: ["分区支撑","分区","zoned support","zone"] },
          { id: "height-adjust", name: "高度调节", parent: "support", aliases: ["高度调节","可调高度","adjustable height","高さ調整","높이조절"] },
          { id: "firmness-adjust", name: "软硬度调节", parent: "support", aliases: ["软硬度调节","可调软硬","adjustable firmness","硬さ調整","경도조절"] },
        ] },
      { id: "hygiene", name: "卫生防护", nameEn: "Hygiene", aliases: ["卫生防护","hygiene"],
        children: [
          { id: "antibacterial", name: "抗菌", parent: "hygiene", aliases: ["抗菌","antibacterial","anti-bacterial","抗菌防臭"] },
          { id: "anti-mite", name: "防螨", parent: "hygiene", aliases: ["防螨","抗螨","anti-mite","防ダニ"] },
          { id: "anti-mold", name: "防霉", parent: "hygiene", aliases: ["防霉","anti-mold","mold resistant"] },
          { id: "anti-stain", name: "防污", parent: "hygiene", aliases: ["防污","stain resistant","anti-stain"] },
          { id: "easy-clean", name: "易清洁", parent: "hygiene", aliases: ["易清洁","easy clean","cleanable"] },
        ] },
      { id: "durability", name: "耐用与维护", nameEn: "Durability", aliases: ["耐用维护","durability"],
        children: [
          { id: "wash-durable", name: "耐洗", parent: "durability", aliases: ["耐洗","耐水洗","washable","wash durability","洗濯耐久性","세탁내구성"] },
          { id: "abrasion-resist", name: "耐磨", parent: "durability", aliases: ["耐磨","abrasion resistant","耐磨性"] },
          { id: "anti-pilling", name: "抗起球", parent: "durability", aliases: ["抗起球","不起球","anti-pilling"] },
          { id: "anti-wrinkle", name: "抗皱", parent: "durability", aliases: ["抗皱","防皱","anti-wrinkle","wrinkle free"] },
          { id: "shrink-resist", name: "防缩水", parent: "durability", aliases: ["防缩水","防缩","shrink resistant","尺寸稳定"] },
          { id: "aging-resist", name: "抗老化", parent: "durability", aliases: ["抗老化","anti-aging","耐老化"] },
        ] },
      { id: "convenience", name: "使用便利性", nameEn: "Convenience", aliases: ["使用便利性","convenience"],
        children: [
          { id: "easy-install", name: "易安装", parent: "convenience", aliases: ["易安装","easy install"] },
          { id: "easy-remove", name: "易拆洗", parent: "convenience", aliases: ["易拆洗","removable cover","拆洗"] },
          { id: "anti-slip", name: "防移位", parent: "convenience", aliases: ["防移位","防滑","anti-slip","non-slip"] },
          { id: "size-fit", name: "尺寸适配", parent: "convenience", aliases: ["尺寸适配","尺寸兼容","size fit"] },
          { id: "easy-storage", name: "便捷收纳", parent: "convenience", aliases: ["便捷收纳","易收纳","storage"] },
        ] },
      { id: "eco-safety", name: "安全与环保", nameEn: "Eco & Safety", aliases: ["安全环保","eco safety"],
        children: [
          { id: "low-toxic", name: "低有害物质", parent: "eco-safety", aliases: ["低有害物质","low toxicity","harmful substance free"] },
          { id: "recycled", name: "再生材料", parent: "eco-safety", aliases: ["再生材料","回收材料","recycled","再生繊維"] },
          { id: "biodegradable", name: "可降解", parent: "eco-safety", aliases: ["可降解","biodegradable","生分解性"] },
          { id: "circular", name: "循环利用", parent: "eco-safety", aliases: ["循环利用","circular","recyclable","リサイクル"] },
          { id: "low-water", name: "低水耗", parent: "eco-safety", aliases: ["低水耗","节水","low water","water saving"] },
        ] },
    ]
  },

  innovation_object: {
    id: "innovation_object", name: "创新对象", nameEn: "Innovation Object", multi: true,
    values: [
      { id: "obj-material", name: "材料", nameEn: "Material", aliases: ["材料","material"] },
      { id: "obj-process", name: "工艺", nameEn: "Process", aliases: ["工艺","process"] },
      { id: "obj-structure", name: "结构", nameEn: "Structure", aliases: ["结构","structure"] },
      { id: "obj-function", name: "功能", nameEn: "Function", aliases: ["功能","function"] },
      { id: "obj-performance", name: "性能", nameEn: "Performance", aliases: ["性能","performance"] },
      { id: "obj-spec", name: "规格", nameEn: "Specification", aliases: ["规格","specification"] },
      { id: "obj-experience", name: "使用体验", nameEn: "User Experience", aliases: ["使用体验","user experience","体验"] },
      { id: "obj-appearance", name: "外观", nameEn: "Appearance", aliases: ["外观","appearance","设计"] },
      { id: "obj-packaging", name: "包装", nameEn: "Packaging", aliases: ["包装","packaging"] },
    ]
  },

  source_industry: {
    id: "source_industry", name: "来源行业", nameEn: "Source Industry", multi: true,
    values: [
      { id: "apparel-sport", name: "运动服饰", nameEn: "Sports Apparel", aliases: ["运动服饰","sports apparel"] },
      { id: "outdoor", name: "户外装备", nameEn: "Outdoor Gear", aliases: ["户外装备","outdoor gear","户外"] },
      { id: "automotive", name: "汽车内饰", nameEn: "Automotive Interior", aliases: ["汽车内饰","automotive interior","汽车"] },
      { id: "medical-care", name: "医疗护理", nameEn: "Medical Care", aliases: ["医疗护理","medical care","医疗"] },
      { id: "ergonomics", name: "人体工学", nameEn: "Ergonomics", aliases: ["人体工学","ergonomics"] },
      { id: "intimate-apparel", name: "贴身服饰", nameEn: "Intimate Apparel", aliases: ["贴身服饰","intimate apparel"] },
      { id: "aerospace", name: "航空航天", nameEn: "Aerospace", aliases: ["航空航天","aerospace"] },
      { id: "eco-material-ind", name: "环保材料", nameEn: "Eco Material", aliases: ["环保材料","eco material"] },
      { id: "home-textile-ind", name: "家纺行业", nameEn: "Home Textile", aliases: ["家纺行业","home textile","家纺"] },
      { id: "furniture", name: "家具行业", nameEn: "Furniture", aliases: ["家具行业","furniture","家具"] },
    ]
  },

  region: {
    id: "region", name: "国家地区", nameEn: "Region", multi: true,
    values: [
      { id: "china", name: "中国", nameEn: "China", aliases: ["中国","china","CN","国内"] },
      { id: "japan", name: "日本", nameEn: "Japan", aliases: ["日本","japan","JP"] },
      { id: "korea", name: "韩国", nameEn: "South Korea", aliases: ["韩国","south korea","korea","KR"] },
      { id: "europe", name: "欧洲", nameEn: "Europe", aliases: ["欧洲","europe","EU"] },
      { id: "north-america", name: "北美", nameEn: "North America", aliases: ["北美","north america","US","CA","美国"] },
      { id: "oceania", name: "澳洲/大洋洲", nameEn: "Oceania", aliases: ["澳洲","大洋洲","oceania","AU","NZ","澳大利亚"] },
      { id: "region-other", name: "其他", nameEn: "Other", aliases: ["其他","other"] },
      { id: "region-unknown", name: "未知", nameEn: "Unknown", aliases: ["未知","unknown"] },
    ]
  },

  maturity: {
    id: "maturity", name: "成熟度", nameEn: "Maturity", multi: false,
    values: [
      { id: "T0", name: "T0 概念/基础研究", nameEn: "T0 Concept", aliases: ["T0"] },
      { id: "T1", name: "T1 实验研究/专利公开", nameEn: "T1 Lab/Patent", aliases: ["T1"] },
      { id: "T2", name: "T2 样品/原型", nameEn: "T2 Prototype", aliases: ["T2"] },
      { id: "T3", name: "T3 商业应用/可购型号", nameEn: "T3 Commercial", aliases: ["T3"] },
      { id: "T4", name: "T4 规模量产", nameEn: "T4 Mass Production", aliases: ["T4"] },
      { id: "T-unknown", name: "未知", nameEn: "Unknown", aliases: ["T-unknown","未知"] },
    ]
  },

  evidence_type: {
    id: "evidence_type", name: "证据来源分类", nameEn: "Evidence Type", multi: false,
    values: [
      { id: "E1", name: "E1 官方监管/标准机构", nameEn: "Official/Regulator", aliases: ["E1"] },
      { id: "E2", name: "E2 原始科研及专利", nameEn: "Research/Patent", aliases: ["E2"] },
      { id: "E3", name: "E3 企业第一方资料", nameEn: "Corporate 1st-party", aliases: ["E3"] },
      { id: "E4", name: "E4 专业第三方媒体/展会", nameEn: "3rd-party Media", aliases: ["E4"] },
      { id: "E5", name: "E5 社交及其他公开信息", nameEn: "Social/Public", aliases: ["E5"] },
    ]
  },

  verification: {
    id: "verification", name: "核验状态", nameEn: "Verification Status", multi: false,
    values: [
      { id: "verified", name: "已核验", nameEn: "Verified", aliases: ["已核验","verified"] },
      { id: "partially-verified", name: "部分核验", nameEn: "Partially Verified", aliases: ["部分核验","partially verified"] },
      { id: "pending", name: "待核验", nameEn: "Pending", aliases: ["待核验","pending"] },
      { id: "conflict", name: "信息冲突", nameEn: "Conflicting", aliases: ["信息冲突","conflicting"] },
    ]
  },
};

// 旧标签迁移：V2.0 编辑性 category → V2.1 情报主类型；无法映射归“待分类”，保留旧值不丢数据
const LEGACY_CATEGORY_MAP = {
  "global-products": "product-launch",
  "bedding-innovation": "product-launch",
  "domestic-industry": "standard-regulation",
  "global-trends": "industry-trend",
  "supply-chain": "supply-chain-expo",
  "materials-tech": "material-tech",
  "future-trends": "industry-trend",
  "consumer-insight": "market-demand",
};

// V2.0 旧核验状态文本 → V2.1 verification ID
const LEGACY_VERIFY_MAP = {
  "已核验": "verified", "部分核验": "partially-verified",
  "待核验": "pending", "信息冲突": "conflict", "示例": "pending",
};
// ============================================================
// 字典工具：归一化、解析、父级展开、URL归一、搜索、分面计数
// ============================================================

const Taxonomy = {

  // 全半角归一：全角→半角、小写、去首尾空格（F01 大小写/全半角要求）
  normalizeText(t) {
    if (!t) return "";
    return String(t)
      .replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, " ")
      .trim()
      .toLowerCase();
  },

  // 扁平化某维度全部值（含子级），返回 [{id,name,nameEn,aliases,parent,enabled}]
  flatten(dimId) {
    const dim = TAXONOMY[dimId];
    if (!dim) return [];
    const out = [];
    const walk = (vals, parent) => vals.forEach(v => {
      out.push({ id: v.id, name: v.name, nameEn: v.nameEn || "", aliases: v.aliases || [], parent: parent || null, enabled: v.enabled !== false });
      if (v.children) walk(v.children, v.id);
    });
    walk(dim.values, null);
    return out;
  },

  // 按 ID 查值（全维度）
  findById(dimId, id) {
    return this.flatten(dimId).find(v => v.id === id) || null;
  },

  // 解析记录在某维度的稳定 ID 列表（含旧标签迁移；未知/缺失 → ["unclassified"]）
  resolve(record, dimId) {
    if (!record) return ["unclassified"];
    let raw = record[dimId];
    // 旧字段迁移
    if (!raw && dimId === "intel_type" && record.category) {
      raw = LEGACY_CATEGORY_MAP[record.category] || "unclassified";
      if (record._legacy_category === undefined && LEGACY_CATEGORY_MAP[record.category]) record._legacy_category = record.category;
    }
    if (!raw && dimId === "verification" && record.verification_status) {
      raw = LEGACY_VERIFY_MAP[record.verification_status] || "pending";
    }
    if (!raw) return ["unclassified"];
    return Array.isArray(raw) ? raw.map(String) : [String(raw)];
  },

  // 父级展开：记录的 ID 列表 → 含所有祖先的集合（父类查询匹配子类，第6节）
  expandWithParents(ids) {
    if (!ids || !ids.length) return new Set(["unclassified"]);
    const parentOf = {};
    Object.keys(TAXONOMY).forEach(d => this.flatten(d).forEach(v => { if (v.parent) parentOf[v.id] = v.parent; }));
    const set = new Set();
    ids.forEach(id => {
      set.add(id);
      let cur = parentOf[id], guard = 0;
      while (cur && guard < 8) { set.add(cur); cur = parentOf[cur]; guard++; }
    });
    if (ids.includes("unclassified") || !ids.length) set.add("unclassified");
    return set;
  },

  // 命中判定：记录在该维度是否命中任一选中 ID（同维 OR；空/“all” 不参与筛选）
  matchesDimension(record, dimId, selectedIds) {
    if (!selectedIds || !selectedIds.length || selectedIds.includes("all")) return true;
    const expanded = this.expandWithParents(this.resolve(record, dimId));
    return selectedIds.some(sel => expanded.has(sel));
  },

  // URL 归一：去跟踪参数（utm_* fbclid gclid ref spm 等）、去 www、去尾斜杠与 fragment
  normalizeUrl(url) {
    if (!url) return "";
    const s = String(url).trim();
    // 非标准 URL 直接归一
    if (!/^https?:\/\//i.test(s)) return this.normalizeText(s);
    try {
      const u = new URL(s);
      const dropPrefix = ["utm_", "fbclid", "gclid", "referrer", "spm", "scm", "share_", "mc_cid", "mc_eid", "_hsenc", "_hsmi", "igshid", "si", "pp"];
      const params = new URLSearchParams(u.search);
      [...params.keys()].forEach(k => {
        const lk = k.toLowerCase();
        if (dropPrefix.some(p => lk === p || lk.startsWith(p)) || k === "ref") params.delete(k);
      });
      const qs = params.toString();
      return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "") + (qs ? "?" + qs : "") + (u.hash || "")).toLowerCase();
    } catch (e) {
      return this.normalizeText(s.split("?")[0].split("#")[0]);
    }
  },

  // 构建记录可搜索文本（F01：标题/原语言/摘要/品牌/材料/技术别名/标准号/标签）
  searchHaystack(record) {
    const parts = [];
    ["title", "titleEn", "origTitle", "summary", "summaryEn", "origSummary",
     "brand", "brand_name", "std_code", "model", "series", "material", "fabric",
     "filling", "process", "doi", "patent_no", "id", "event_id", "entity_id"].forEach(f => {
      const val = record ? record[f] : null;
      if (typeof val === "string" && val) parts.push(val);
      else if (typeof val === "number") parts.push(String(val));
    });
    (record && record.tags || []).forEach(t => typeof t === "string" && parts.push(t));
    // 技术功能标签别名词补入（支持别名检索，如 cooling 命中“接触凉感”）
    this.resolve(record, "tech_function").forEach(fid => {
      const m = this.findById("tech_function", fid);
      if (m) parts.push([m.name, m.nameEn, ...m.aliases].join(" "));
    });
    return this.normalizeText(parts.join(" "));
  },

  // 搜索匹配：空格分隔多词 AND（全半角归一后子串匹配）
  searchMatch(record, normalizedQuery) {
    if (!normalizedQuery) return true;
    const hay = record._hay || (record._hay = this.searchHaystack(record));
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return tokens.every(tok => hay.includes(tok));
  },

  // 分面计数：计算 dimId 各选项计数时，应用其他所有维度与搜索，忽略本维自身选择（第6节）
  facetCounts(records, dimId, activeFilters, normalizedQuery) {
    const others = {};
    Object.keys(activeFilters || {}).forEach(d => {
      if (d !== dimId && activeFilters[d] && activeFilters[d].length) others[d] = activeFilters[d];
    });
    const filtered = records.filter(r =>
      this.searchMatch(r, normalizedQuery) &&
      Object.keys(others).every(d => this.matchesDimension(r, d, others[d]))
    );
    const flat = this.flatten(dimId);
    const counts = {};
    filtered.forEach(r => {
      const ids = this.resolve(r, dimId);
      ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
        const m = flat.find(v => v.id === id);
        if (m && m.parent) counts[m.parent] = (counts[m.parent] || 0) + 1;
      });
    });
    return counts;
  },

  // 多维组合筛选主入口（F02：同维 OR、跨维 AND；与搜索联动）
  filterRecords(records, filters, normalizedQuery) {
    return records.filter(r => {
      if (!this.searchMatch(r, normalizedQuery)) return false;
      return Object.keys(filters || {}).every(d => this.matchesDimension(r, d, filters[d]));
    });
  },

  // 三层 ID 生成（F04）：entity / event / evidence
  // 新闻/事件类：事件指纹即主键；来源 URL 归一为证据 ID
  // 实体类（品牌/技术/标准）：外部传入实体 key
  eventId(record) {
    if (record.id) return record.id;
    return "f" + this.shortHash(this.normalizeUrl(record.source_url || record.url || "") + "|" + this.normalizeText(record.title || ""));
  },

  shortHash(str) {
    let h1 = 0x811c9dc5, h2 = 0x1000193;
    for (let i = 0; i < str.length; i++) {
      h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193);
      h2 = Math.imul(h2 + str.charCodeAt(i), 0x85ebca6b);
    }
    const a = (h1 >>> 0).toString(16), b = (h2 >>> 0).toString(16);
    return (a + b).slice(0, 12);
  },

  // 为记录补齐三层 ID 与归一字段（幂等：已有则保留）
  assignIds(record) {
    if (!record) return record;
    record.event_id = record.event_id || record.id || this.eventId(record);
    if (!record.id) record.id = record.event_id;
    const norm = this.normalizeUrl(record.source_url || record.url || "");
    record._url_normalized = norm;
    record.evidence_id = record.evidence_id || ("ev-" + this.shortHash(norm));
    // 新闻类实体即事件本身；品牌/技术/标准记录可后续由采集器赋 entity_id
    record.entity_id = record.entity_id || record.event_id;
    return record;
  },
};

// Node 环境导出（供脚本测试）
if (typeof module !== "undefined" && module.exports) module.exports = { TAXONOMY, Taxonomy, LEGACY_CATEGORY_MAP, LEGACY_VERIFY_MAP };