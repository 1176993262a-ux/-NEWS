// ============================================================
// 品牌上新：国内外床品品牌新品数据库
// 数据：data/brand_products.json（每日由 scripts/collect_brand_products.py 巡检）
// ============================================================

let BRANDS = [];
let BP_META = null;
let BP_ITEMS = [];

const bpState = {
  brand: "all",
  region: "all",
  category: "all",
  priceBand: "all",
  query: "",
};

const CHANGE_TYPE_META = {
  "new":       { badge: "type-new",       icon: "🆕", label: "真正的新品" },
  "colorway":  { badge: "type-colorway",  icon: "🎨", label: "换色 / 换花型" },
  "revision":  { badge: "type-revision",  icon: "♻️", label: "旧品改版" },
  "relist":    { badge: "type-relist",    icon: "🔁", label: "重新上架" },
};

function bpTypeBadge(item) {
  const m = CHANGE_TYPE_META[item.change_type];
  if (!m) return "";
  return `<span class="pc-type ${m.badge}">${m.icon} ${m.label}</span>`;
}

function bpPriceBand(item) {
  const bands = (BP_META && BP_META.priceBands) || [];
  const cur = (item.currency || "CNY").toUpperCase();
  const num = parseFloat(String(item.price || "").replace(/[^\d.]/g, ""));
  if (!isFinite(num)) return null;
  for (const b of bands) {
    const r = cur === "USD" ? b.usd : b.cny;
    if (r && num >= r[0] && (r[1] == null || num < r[1])) return b.id;
  }
  return null;
}

function bpRegionOf(country) {
  const b = BRANDS.find(x => x.name === country || x.country === country);
  return b ? b.region : "";
}

function getFilteredProducts() {
  const q = bpState.query.trim().toLowerCase();
  return BP_ITEMS
    .filter(p => bpState.brand === "all" || p.brand === bpState.brand)
    .filter(p => bpState.region === "all" || bpRegionOf(p.country) === bpState.region)
    .filter(p => bpState.category === "all" || p.category === bpState.category)
    .filter(p => bpState.priceBand === "all" || bpPriceBand(p) === bpState.priceBand)
    .filter(p => {
      if (!q) return true;
      const hay = [p.name, p.material, p.filling, p.craft, p.series, (p.features || []).join(" "), p.brand_name].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const da = a.official_release_date || a.first_detected_at || "";
      const db = b.official_release_date || b.first_detected_at || "";
      return da < db ? 1 : -1;
    });
}

function bpDateLine(p) {
  const rel = p.official_release_date
    ? `📅 官方发布：${HT.fmtDateOnly(p.official_release_date)}`
    : `<span style="color:var(--muted)">📅 官方未公布上市时间</span>`;
  const found = p.first_detected_at ? `🔍 首次发现：${HT.fmtTimestamp(p.first_detected_at)}` : "";
  const coll = p.collected_at ? `🔄 采集：${HT.fmtTimestamp(p.collected_at)}` : "";
  return [rel, found, coll].filter(Boolean).join("<br>");
}

function productCardHtml(p) {
  const brand = BRANDS.find(b => b.id === p.brand) || { name: p.brand_name || p.brand, country: p.country, region: "" };
  const img = p.image_url
    ? `<img src="${HT.escapeHtml(p.image_url)}" alt="${HT.escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove()">`
    : "";
  const imgBox = `<div class="pc-img ${p.image_url ? "" : "no-img"}">${p.image_url ? img : "🖼️<span>暂无图片</span>"}</div>`;
  const specs = [
    p.material ? `<b>材质</b> ${HT.escapeHtml(p.material)}` : "",
    p.filling ? `<b>填充</b> ${HT.escapeHtml(p.filling)}` : "",
    p.craft ? `<b>工艺</b> ${HT.escapeHtml(p.craft)}` : "",
    p.sizes ? `<b>尺寸</b> ${HT.escapeHtml(p.sizes)}` : "",
  ].filter(Boolean).join(" · ");
  const features = (p.features || []).length
    ? `<div class="pc-tags">${p.features.map(f => `<span>${HT.escapeHtml(f)}</span>`).join("")}</div>` : "";
  const price = p.price
    ? `<div class="pc-price">${HT.escapeHtml(String(p.price))} <small>${HT.escapeHtml(p.currency || "")}</small></div>` : "";
  const link = p.product_url
    ? `<a class="pc-link" href="${HT.escapeHtml(p.product_url)}" target="_blank" rel="noopener">原始商品页 ↗</a>`
    : `<span style="color:var(--muted);font-size:12px">原链接待补</span>`;
  const specHtml = specs ? `<div class="pc-spec">${specs}</div>` : "";
  const srcTag = p.source_platform ? `<span class="brand-pill" style="font-size:10px">${HT.escapeHtml(p.source_platform)}</span>` : "";
  return `<article class="product-card">
    ${imgBox}
    <div class="pc-body">
      <div class="pc-brand-row">
        <span class="pc-brand">${HT.escapeHtml(brand.name)} · ${HT.escapeHtml(brand.country || p.country || "")}</span>
        ${bpTypeBadge(p)}
        ${srcTag}
        ${HT.verifyBadge(p)}
        ${HT.demoBadge(p)}
      </div>
      <div class="pc-title">${HT.escapeHtml(p.name)}</div>
      ${p.series ? `<div style="font-size:11px;color:var(--muted);margin-bottom:4px">系列：${HT.escapeHtml(p.series)}${p.model ? " · " + HT.escapeHtml(p.model) : ""}</div>` : ""}
      ${specHtml}
      ${features}
      <div class="pc-date">${bpDateLine(p)}</div>
    </div>
    <div class="pc-footer">${price}${link}</div>
  </article>`;
}

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  const list = getFilteredProducts();
  document.getElementById("brandCount").textContent = list.length;
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="emoji">🗂️</div>
      <p>暂无匹配的品牌新品记录</p>
      <p class="empty-action">首次数据将在 GitHub Actions 每日自动巡检品牌官网后出现；也可本地运行 <code>python scripts/collect_brand_products.py</code> 立即采集。<br> <b>不预置虚构商品</b>，空列表即真实状态。</p>
    </div>`;
    return;
  }
  grid.innerHTML = list.map(productCardHtml).join("");
}

function renderBrandFilters() {
  const bar = document.getElementById("brandFilterBar");
  const regions = ["国内", "国际"];
  let html = `<span class="label">品牌</span>`;
  html += `<button class="filter-chip ${bpState.brand === "all" ? "active" : ""}" data-brand="all">全部品牌</button>`;
  BRANDS.forEach(b => {
    html += `<button class="filter-chip ${bpState.brand === b.id ? "active" : ""}" data-brand="${b.id}">${b.name}</button>`;
  });
  html += `<span class="sep"></span><span class="label">地域</span>`;
  ["all", ...regions].forEach(r => {
    html += `<button class="filter-chip ${bpState.region === r ? "active" : ""}" data-region="${r}">${r === "all" ? "全部" : r}</button>`;
  });
  html += `<span class="sep"></span><span class="label">品类</span>`;
  ["all", ...(BP_META.categories || [])].forEach(c => {
    html += `<button class="filter-chip ${bpState.category === c ? "active" : ""}" data-category="${c}">${c === "all" ? "全部品类" : c}</button>`;
  });
  html += `<span class="sep"></span><span class="label">价格带</span>`;
  html += `<button class="filter-chip ${bpState.priceBand === "all" ? "active" : ""}" data-price="all">全部</button>`;
  (BP_META.priceBands || []).forEach(b => {
    html += `<button class="filter-chip ${bpState.priceBand === b.id ? "active" : ""}" data-price="${b.id}">${b.name}</button>`;
  });
  const dirty = bpState.brand !== "all" || bpState.region !== "all" || bpState.category !== "all" || bpState.priceBand !== "all" || bpState.query;
  if (dirty) html += `<button class="clear-btn" id="bpClear">清除筛选 ✕</button>`;
  bar.innerHTML = html;
  bar.querySelectorAll("[data-brand]").forEach(el => el.onclick = () => { bpState.brand = el.dataset.brand; renderBrandView(); });
  bar.querySelectorAll("[data-region]").forEach(el => el.onclick = () => { bpState.region = el.dataset.region; renderBrandView(); });
  bar.querySelectorAll("[data-category]").forEach(el => el.onclick = () => { bpState.category = el.dataset.category; renderBrandView(); });
  bar.querySelectorAll("[data-price]").forEach(el => el.onclick = () => { bpState.priceBand = el.dataset.price; renderBrandView(); });
  const clear = document.getElementById("bpClear");
  if (clear) clear.onclick = () => {
    bpState.brand = "all"; bpState.region = "all"; bpState.category = "all"; bpState.priceBand = "all"; bpState.query = "";
    document.getElementById("brandSearch").value = "";
    renderBrandView();
  };
}

// 跨品牌对比：相同品类下各品牌创新方向（基于真实 items 聚合，无数据则空状态）
function renderBrandCompare() {
  const panel = document.getElementById("brandComparePanel");
  const body = panel.querySelector(".panel-body");
  if (!BP_ITEMS.length) {
    body.innerHTML = `<div class="bm-empty">暂无商品数据，无法生成跨品牌对比。<br>首次采集后将按品类聚合各品牌的材料、工艺与卖点共性与差异。</div>`;
    panel.querySelector(".count-pill").textContent = 0;
    return;
  }
  const cats = BP_META.categories || [];
  const sections = [];
  cats.forEach(cat => {
    const inCat = BP_ITEMS.filter(p => p.category === cat);
    if (!inCat.length) return;
    const byBrand = {};
    inCat.forEach(p => {
      (byBrand[p.brand] = byBrand[p.brand] || []).push(p);
    });
    const brandNames = Object.keys(byBrand);
    if (brandNames.length < 2) return;
    // 材料/卖点频次：出现于 ≥2 品牌 → 共性；仅 1 品牌 → 差异
    const kwBrands = {};
    inCat.forEach(p => {
      const kws = [p.material, p.filling, p.craft, ...(p.features || [])].filter(Boolean).map(s => s.trim());
      const seen = new Set();
      kws.forEach(k => {
        if (seen.has(k)) return;
        seen.add(k);
        (kwBrands[k] = kwBrands[k] || new Set()).add(p.brand);
      });
    });
    const common = Object.keys(kwBrands).filter(k => kwBrands[k].size >= 2).slice(0, 6);
    const diff = Object.keys(kwBrands).filter(k => kwBrands[k].size === 1).slice(0, 6);
    const rows = brandNames.map(bid => {
      const b = BRANDS.find(x => x.id === bid) || { name: bid };
      return `<div class="cov-item"><span class="brand-pill">${HT.escapeHtml(b.name)}</span><span class="count-pill">${byBrand[bid].length} 件</span></div>`;
    }).join("");
    sections.push(`<div class="coverage-panel">
      <div class="cov-item" style="font-weight:600">${HT.escapeHtml(cat)} · ${brandNames.length} 个品牌</div>
      ${rows}
      ${common.length ? `<div style="font-size:11px;color:var(--ink-2);margin-top:6px">共性方向：${common.map(HT.escapeHtml).join("、")}</div>` : ""}
      ${diff.length ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">差异点：${diff.map(HT.escapeHtml).join("、")}</div>` : ""}
    </div>`);
  });
  body.innerHTML = sections.length ? sections.join("") : `<div class="bm-empty">当前品类下仅采集到单一品牌，需 ≥2 个品牌才能对比创新方向。</div>`;
  panel.querySelector(".count-pill").textContent = sections.length;
}

function renderBrandCheckPanel() {
  const panel = document.getElementById("brandCheckPanel");
  const body = panel.querySelector(".panel-body");
  const last = BP_META.lastCheckAt ? HT.fmtTimestamp(BP_META.lastCheckAt) : "尚未执行";
  const snap = BP_META.snapshotStatus || {};
  const snapKeys = Object.keys(snap);
  let snapHtml = "";
  if (snapKeys.length) {
    snapHtml = snapKeys.slice(0, 8).map(k => {
      const b = BRANDS.find(x => x.id === k) || { name: k };
      const s = snap[k];
      const ok = s.error ? "❌" : "✅";
      return `<div class="cov-item"><span>${ok} ${HT.escapeHtml(b.name)}</span><span class="count-pill">${s.products_seen != null ? s.products_seen + " 件" : "—"}</span></div>`;
    }).join("");
  } else {
    snapHtml = `<div class="bm-empty">暂无巡检记录，GitHub Actions 每日执行后会出现各品牌快照状态。</div>`;
  }
  body.innerHTML = `<p style="font-size:12px;color:var(--muted);margin:0 0 8px">最近巡检：<b style="color:var(--ink)">${last}</b>（北京时间口径）</p>${snapHtml}`;
  panel.querySelector(".count-pill").textContent = snapKeys.length;
}

function renderBrandsListPanel() {
  const panel = document.getElementById("brandsListPanel");
  const body = panel.querySelector(".panel-body");
  body.innerHTML = BRANDS.map(b => {
    const link = b.official_site
      ? `<a href="${HT.escapeHtml(b.official_site)}" target="_blank" rel="noopener">官网 ↗</a>`
      : `<span style="color:var(--muted)">官网待核验</span>`;
    const cnt = BP_ITEMS.filter(p => p.brand === b.id).length;
    return `<div class="source-item">
      <div class="si-dot" style="background:${b.region === "国内" ? "#dc2626" : "#3b82f6"}"></div>
      <div>
        <div class="si-name">${HT.escapeHtml(b.name)} · ${HT.escapeHtml(b.country)} <span class="count-pill">${cnt}</span></div>
        <div class="si-focus">${link} · ${b.verification_status}</div>
      </div>
    </div>`;
  }).join("");
  panel.querySelector(".count-pill").textContent = BRANDS.length;
}

function renderBrandView() {
  renderBrandFilters();
  renderProductGrid();
  renderBrandCompare();
  renderBrandCheckPanel();
  renderBrandsListPanel();
  HT.renderDemoBanner("brandDemoBanner", BP_ITEMS.some(p => p.is_demo));
}

async function initBrands() {
  document.getElementById("brandSearch").addEventListener("input", (e) => {
    bpState.query = e.target.value;
    renderProductGrid();
  });
  const res = await HT.fetchJSON("data/brand_products.json");
  if (res.ok) {
    BP_META = res.data;
    BRANDS = res.data.brands || [];
    BP_ITEMS = res.data.items || [];
  } else {
    BP_META = { categories: [], priceBands: [] };
  }
  document.getElementById("brandMeta").textContent =
    `共监控 ${BRANDS.length} 个品牌 · 已收录 ${BP_ITEMS.length} 件商品 · 最近巡检：${BP_META.lastCheckAt ? HT.fmtTimestamp(BP_META.lastCheckAt) : "尚未执行"}`;
  renderBrandView();
}

initBrands();