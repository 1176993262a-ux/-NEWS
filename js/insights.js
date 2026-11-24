// ============================================================
// 创新机会：关联品牌上新、市场销售、材料技术与消费者需求
// 所有结论必须能追溯到原始记录；区分事实 / 推断 / 建议
// 数据不足时显示空状态，不强行计算机会评分
// ============================================================

let INS = { standards: null, brands: null, market: null, news: null };
let INS_BRANDS = [];
let INS_PRODUCTS = [];

function itBadge(type) {
  if (type === "fact") return '<span class="it-badge it-fact">📌 事实</span>';
  if (type === "inference") return '<span class="it-badge it-inference">🧠 推断</span>';
  if (type === "suggestion") return '<span class="it-badge it-suggestion">💡 建议</span>';
  return "";
}

function refLink(href, label) {
  if (!href) return "";
  return `<a class="bm-item" href="${HT.escapeHtml(href)}" target="_blank" rel="noopener">${HT.escapeHtml(label || "原始记录")} ↗</a>`;
}

function refInternal(label) {
  return `<span class="bm-item" style="cursor:default">${HT.escapeHtml(label)}</span>`;
}

function insightCardHtml(card) {
  const refs = (card.refs || []).map(r => r.url ? refLink(r.url, r.label) : refInternal(r.label)).join("");
  const graded = card.evidence != null ? `<span class="count-pill">证据 ${card.evidence} 条</span>` : "";
  const empty = card.empty === true;
  return `<article class="insight-card ${card.type}">
    <div class="ic-head">${itBadge(card.type)} ${graded} <span class="cat-tag">${HT.escapeHtml(card.category)}</span></div>
    <div class="nc-title">${HT.escapeHtml(card.title)}</div>
    ${card.summary ? `<div class="nc-summary">${card.summary}</div>` : ""}
    ${card.emptyHint ? `<div class="note-box">${card.emptyHint}</div>` : ""}
    ${refs ? `<div class="ref-list"><div class="ref-title">溯源自：</div>${refs}</div>` : ""}
    ${card.note ? `<div class="note-box dev-note" style="font-size:11px">⚠️ ${HT.escapeHtml(card.note)}</div>` : ""}
  </article>`;
}

// ---------- 基于 standards.json 生成事实卡片 ----------
function buildStandardFacts() {
  const std = INS.standards;
  if (!std || !Array.isArray(std.standards) || !std.standards.length) {
    return {
      category: "标准合规",
      cards: [{
        type: "fact", category: "标准合规",
        title: "标准库数据尚未加载",
        empty: true,
        emptyHint: "data/standards.json 加载失败或为空，请检查数据文件或稍后再试。",
      }],
    };
  }
  const cards = [];
  std.standards.forEach(s => {
    if (s.status === "即将实施" && s.implementation_date) {
      cards.push({
        type: "fact",
        category: "标准合规 · " + (s.applicable_categories || []).slice(0, 2).join("/"),
        title: `${s.std_code}《${s.name}》将于 ${HT.fmtDateOnly(s.implementation_date)} 实施${s.replaces ? `，替代 ${s.replaces}` : ""}`,
        summary: s.dev_advice ? `开发影响：${s.dev_advice}` : "",
        refs: [{ url: s.official_search_url || s.platform_url, label: `${s.std_code} 官方检索` }, { label: `来源：data/standards.json · ${s.std_code}` }],
        evidence: 1,
      });
    }
    if (s.status === "现行" && s.testing_items && s.testing_items.length) {
      cards.push({
        type: "fact",
        category: "标准合规 · " + (s.applicable_categories || []).slice(0, 2).join("/"),
        title: `${s.std_code} 现行有效，关键检测项目：${s.testing_items.join("、")}`,
        refs: [{ url: s.official_search_url || s.platform_url, label: `${s.std_code} 官方检索` }, { label: `来源：data/standards.json · ${s.std_code}` }],
        evidence: 1,
      });
    }
  });
  return { category: "标准合规", cards };
}

// ---------- 基于 brand_products.json 生成事实与推断 ----------
function buildBrandCards() {
  const bp = INS.brands;
  const items = INS_PRODUCTS;
  if (!bp || !items.length) {
    return {
      category: "品牌上新",
      cards: [{
        type: "fact", category: "品牌上新",
        title: "暂无品牌新品数据，无法进行创新方向对比",
        empty: true,
        emptyHint: "品牌上新库当前为空（真实状态，无网络或未执行采集）。等 scripts/collect_brand_products.py 首次采集后，将自动生成各品类的材料/工艺/卖点共性与差异分析。",
      }],
    };
  }
  const cards = [];
  const catList = bp.categories || [];
  catList.forEach(cat => {
    const inCat = items.filter(p => p.category === cat);
    if (!inCat.length) return;
    const brandSet = new Set(inCat.map(p => p.brand));
    cards.push({
      type: "fact",
      category: "品牌上新 · " + cat,
      title: `${cat} 品类已监测到 ${inCat.length} 件新品，覆盖 ${brandSet.size} 个品牌：${[...brandSet].map(bid => (INS_BRANDS.find(b => b.id === bid) || { name: bid }).name).join("、")}`,
      refs: inCat.slice(0, 5).map(p => ({ url: p.product_url, label: `${p.brand_name} ${p.name}` })),
      evidence: inCat.length,
    });
    // 推断：仅当 ≥2 品牌时才做共性/差异推断，并明确标注为推断
    if (brandSet.size >= 2) {
      const kwBrands = {};
      inCat.forEach(p => {
        [p.material, p.filling, p.craft, ...(p.features || [])].filter(Boolean).forEach(k => {
          (kwBrands[k] = kwBrands[k] || new Set()).add(p.brand);
        });
      });
      const common = Object.keys(kwBrands).filter(k => kwBrands[k].size >= 2).slice(0, 6);
      const diff = Object.keys(kwBrands).filter(k => kwBrands[k].size === 1).slice(0, 6);
      cards.push({
        type: "inference",
        category: "品牌上新 · " + cat,
        title: `「${cat}」品类创新方向推断`,
        summary: (common.length ? `共性方向（多品牌同时采用）：${common.join("、")}。` : "暂未发现多品牌共性方向。") +
                 (diff.length ? `差异点（单品牌独有）：${diff.join("、")}。` : "") +
                 `<br><small style="color:var(--muted)">此为基于 ${inCat.length} 件商品记录的聚合推断，非定量结论。</small>`,
        refs: inCat.slice(0, 5).map(p => ({ url: p.product_url, label: `${p.brand_name} ${p.name}` })),
        evidence: inCat.length,
        note: "推断 ≠ 事实：品牌卖点表述可能存在营销夸大，需结合实物检测与标准要求验证。",
      });
    }
  });
  return { category: "品牌上新", cards };
}

// ---------- 基于 market_metrics.json 生成事实卡片 ----------
function buildMarketCards() {
  const mk = INS.market;
  const items = (mk && Array.isArray(mk.items)) ? mk.items : [];
  if (!items.length) {
    return {
      category: "市场数据",
      cards: [{
        type: "fact", category: "市场数据",
        title: "暂无市场销售数据，价格带机会无法量化",
        empty: true,
        emptyHint: "市场指标当前为空状态（未接入授权渠道，不造假）。可通过 market.html 的 CSV 导入录入公开行业报告数据；有授权后再接入后台接口。严禁用假数据计算机会评分。",
      }],
    };
  }
  const cards = [];
  const byMetric = {};
  items.forEach(m => { (byMetric[m.metric_name] = byMetric[m.metric_name] || []).push(m); });
  Object.keys(byMetric).forEach(name => {
    const rows = byMetric[name].sort((a, b) => (a.period_label || "") < (b.period_label || "") ? -1 : 1);
    const estimate = rows.some(r => r.data_type === "estimate");
    cards.push({
      type: "fact",
      category: "市场数据 · " + name,
      title: `${name}：共 ${rows.length} 期记录，覆盖 ${[...new Set(rows.map(r => r.platform))].join("、")}`,
      summary: rows.slice(0, 4).map(r => `${r.period_label || r.period_start} ${r.subject} ${r.value}${r.unit || ""}（${(INS.market.dataTypes || []).find(t => t.id === r.data_type)?.name || r.data_type}${r.data_type === "estimate" ? "·估算" : ""}）`).join("；") + (estimate ? `<br><small style="color:#b45309">⚠️ 含第三方估算数据，不得当作事实参考，原始区间见 estimate_note。</small>` : ""),
      refs: rows.slice(0, 5).map(r => ({ url: r.source_url, label: `${r.platform} · ${r.metric_name} · ${r.period_label || ""}` })),
      evidence: rows.length,
    });
  });
  return { category: "市场数据", cards };
}

// ---------- 基于 news.json 生成消费者需求事实 ----------
function buildNewsCards() {
  const news = INS.news;
  const items = (news && Array.isArray(news.items)) ? news.items : [];
  if (!items.length) {
    return {
      category: "消费者需求",
      cards: [{
        type: "fact", category: "消费者需求",
        title: "暂无资讯数据，消费者需求证据缺失",
        empty: true,
        emptyHint: "daily 资讯采集尚未执行或 data/news.json 未生成。资讯（尤其小红书 inbox 与行业媒体）是消费者真实需求的证据来源，采集后自动生成需求证据卡片。",
      }],
    };
  }
  // 小红书与行业媒体中带需求关键词的记录作为证据
  const demandKw = ["需求", "搜索", "热度", "痛点", "复购", "偏好", "裸睡", "宿舍", "凉感", "过敏", "敏感肌"];
  const demandItems = items.filter(n => {
    const hay = [n.title, n.summary, (n.tags || []).join(" ")].join(" ");
    return demandKw.some(k => hay.includes(k));
  });
  const demoItems = items.filter(n => n.is_demo);
  if (!demandItems.length) {
    return {
      category: "消费者需求",
      cards: [{
        type: "fact", category: "消费者需求",
        title: "当前资讯中暂未识别到消费者需求证据",
        summary: `已加载 ${items.length} 条资讯${demoItems.length ? `（其中 ${demoItems.length} 条为示例数据）` : ""}，但未命中需求类关键词（如 ${demandKw.slice(0, 5).join("、")}）`,
        empty: true,
        emptyHint: "需求证据需来自真实采集记录。示例数据不作为推断依据。",
        note: demoItems.length ? "当前数据为示例，不用于生成需求结论。" : undefined,
      }],
    };
  }
  const cards = [{
    type: "fact",
    category: "消费者需求",
    title: `识别到 ${demandItems.length} 条含消费者需求证据的资讯`,
    summary: demandItems.slice(0, 3).map(n => `${n.source}：${n.title}`).join("；"),
    refs: demandItems.slice(0, 5).map(n => ({ url: n.url || n.source_url, label: `${n.title.slice(0, 24)}…` })),
    evidence: demandItems.length,
    note: demandItems.some(n => n.is_demo) ? "部分来源为示例数据，结论仅供参考，真实采集后以真实记录为准。" : undefined,
  }];
  return { category: "消费者需求", cards };
}

// ---------- 综合：仅在三类以上证据齐备时输出建议 ----------
function buildSuggestionCards() {
  const hasStd = INS.standards && INS.standards.standards && INS.standards.standards.length;
  const hasProduct = INS_PRODUCTS.length >= 3;
  const hasMarket = INS.market && INS.market.items && INS.market.items.length;
  const hasNews = INS.news && INS.news.items && INS.news.items.length && INS.news.items.some(n => !n.is_demo);
  if (!(hasStd && hasProduct)) {
    return {
      category: "产品开发建议",
      cards: [{
        type: "suggestion", category: "产品开发建议",
        title: "证据不足以生成可验证的产品开发建议",
        empty: true,
        emptyHint: `当前证据状态：标准库 ${hasStd ? "✅" : "❌"} · 品牌新品 ${hasProduct ? "✅" : "❌（需 ≥3 件）"} · 市场数据 ${hasMarket ? "✅" : "❌"} · 真实资讯 ${hasNews ? "✅" : "❌"}。<br>至少需要标准库与品牌新品数据齐备才输出方向性建议；数据不足时不强行计算机会评分。`,
      }],
    };
  }
  // 有标准 + 有新品：给出带来源的合规+创新方向建议（推断级）
  const cards = [];
  const upcoming = (INS.standards.standards || []).filter(s => s.status === "即将实施");
  if (upcoming.length) {
    cards.push({
      type: "suggestion",
      category: "产品开发建议",
      title: "新品开发优先对齐即将实施标准",
      summary: `建议 2027-08-01 前上市的新品按 ${upcoming.map(s => s.std_code).join("、")} 规划检测与标签，避免上市后标准切换导致返工。`,
      refs: upcoming.map(s => ({ url: s.official_search_url, label: `${s.std_code} 官方检索` })),
      note: "此建议基于标准记录与产品记录的关联，不构成合规承诺，具体指标以官方原文为准。",
    });
  }
  return { category: "产品开发建议", cards };
}

function renderInsights() {
  const wrap = document.getElementById("insightsList");
  const sections = [
    buildStandardFacts(),
    buildBrandCards(),
    buildMarketCards(),
    buildNewsCards(),
    buildSuggestionCards(),
  ];
  let html = "";
  let totalCards = 0, emptyCards = 0;
  sections.forEach(sec => {
    totalCards += sec.cards.length;
    emptyCards += sec.cards.filter(c => c.empty).length;
    html += `<section class="insight-section">
      <div class="ic-head"><h3>${HT.escapeHtml(sec.category)}</h3><span class="count-pill">${sec.cards.length}</span></div>
      <div class="insight-list">${sec.cards.map(insightCardHtml).join("")}</div>
    </section>`;
  });
  wrap.innerHTML = html;
  const meta = document.getElementById("insightsMeta");
  if (meta) {
    meta.textContent = `共 ${totalCards} 条分析 · 其中 ${emptyCards} 条因证据不足显示空状态 · 所有结论可追溯至原始记录`;
  }
  HT.renderDemoBanner("insightsDemoBanner",
    (INS.news && INS.news.items && INS.news.items.some(n => n.is_demo)) ||
    (INS.brands && INS.brands.items && INS.brands.items.some(p => p.is_demo))
  );
}

async function initInsights() {
  const [stdRes, bpRes, mkRes, newsRes] = await Promise.all([
    HT.fetchJSON("data/standards.json"),
    HT.fetchJSON("data/brand_products.json"),
    HT.fetchJSON("data/market_metrics.json"),
    HT.fetchJSON("data/news.json"),
  ]);
  INS.standards = stdRes.ok ? stdRes.data : null;
  INS.brands = bpRes.ok ? bpRes.data : null;
  INS.market = mkRes.ok ? mkRes.data : null;
  INS.news = newsRes.ok ? newsRes.data : null;
  INS_BRANDS = (INS.brands && INS.brands.brands) || [];
  INS_PRODUCTS = (INS.brands && INS.brands.items) || [];
  renderInsights();
}

initInsights();