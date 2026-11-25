// ============================================================
// 家纺情报站 - 首页应用逻辑（V2.1：多维组合筛选、分面计数、统一搜索）
// F01 全站搜索 / F02 多维组合筛选 / F03 标签修复与待分类 / F04 去重与统一ID
// ============================================================

const state = {
  sources: [],          // 多选（同维 OR）
  types: [],            // 情报主类型多选（同维 OR），替代旧单选 category
  query: "",
  sortMode: "published", // published=发布时间 | collected=首次采集时间
  bookmarks: HT.storage.get("ht_bookmarks", []),
  readIds: HT.storage.get("ht_read", []),
};

// ---------- 日期工具 ----------
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date((String(d).length <= 10 ? d + "T00:00:00" : d));
  if (isNaN(dt.getTime())) return String(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - dt.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff > 1 && diff <= 6) return diff + "天前";
  return (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
}

function dateGroupLabel(d) {
  if (!d) return "未知日期";
  const dt = new Date((String(d).length <= 10 ? d + "T00:00:00" : d));
  if (isNaN(dt.getTime())) return "未知日期";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt0 = new Date(dt); dt0.setHours(0, 0, 0, 0);
  const diff = Math.round((today - dt0) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff > 1 && diff <= 7) return "本周更早";
  if (diff > 7 && diff <= 14) return "上周";
  return dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月";
}

function sortDateOf(n) {
  const p = state.sortMode === "collected" ? (n.collected_at || n.published_at || n.date || "") : (n.published_at || n.date || "");
  return p || "";
}

// ---------- 归一化查询 ----------
function normQuery() { return Taxonomy.normalizeText(state.query); }

function activeFilters(dimId) {
  const f = {};
  if (state.sources.length) f.source = state.sources;
  if (state.types.length) f.intel_type = state.types;
  return f;
}

// ---------- 过滤（F02 同维 OR、跨维 AND，F01 统一搜索） ----------
function getFiltered() {
  const q = normQuery();
  return Taxonomy.filterRecords(NEWS, activeFilters(), q)
    .slice()
    .sort((a, b) => (sortDateOf(a) < sortDateOf(b) ? 1 : sortDateOf(a) > sortDateOf(b) ? -1 : 0));
}

// ---------- 各维度分面计数（忽略本维选择，第6节） ----------
function sourceFacet() {
  return Taxonomy.facetCounts(NEWS, "source", activeFilters(), normQuery());
}
function typeFacet() {
  return Taxonomy.facetCounts(NEWS, "intel_type", activeFilters(), normQuery());
}

// ---------- 渲染：信息源多选导航 ----------
function renderSourceNav() {
  const nav = document.getElementById("sourceNav");
  const counts = sourceFacet();
  let html = '<button class="chip ' + (state.sources.length ? "" : "active") + '" data-source="all">全部 <span class="count">' + NEWS.length + "</span></button>";
  SOURCES.forEach(s => {
    const c = counts[s.id] || 0;
    const on = state.sources.includes(s.id) ? "chip active" : "chip";
    html += '<button class="' + on + '" data-source="' + s.id + '" title="' + HT.escapeHtml(s.nameCn + " · " + s.focus) + '" '
      + (c === 0 && state.sources.length && !state.sources.includes(s.id) ? 'style="opacity:.4" ' : "")
      + '><span class="dot" style="background:' + s.color + '"></span>' + s.name + ' <span class="count">' + c + "</span></button>";
  });
  nav.innerHTML = html;
  nav.querySelectorAll(".chip").forEach(btn => {
    btn.onclick = () => {
      const v = btn.dataset.source;
      if (v === "all") state.sources = [];
      else {
        const i = state.sources.indexOf(v);
        i === -1 ? state.sources.push(v) : state.sources.splice(i, 1);
      }
      renderAll();
    };
  });
}

// ---------- 渲染：类型筛选条（F03 分面计数、待分类兜底、零结果显示0） ----------
function renderFilterBar() {
  const bar = document.getElementById("filterBar");
  const counts = typeFacet();
  const types = Taxonomy.flatten("intel_type");
  let html = '<span class="label">类型</span>';
  types.forEach(t => {
    const c = counts[t.id] || 0;
    const on = state.types.includes(t.id) ? "active" : "";
    // 未选中且计数为0时淡显但保留（F03：零结果保留标签和0）
    const dim = (!on && c === 0) ? 'style="opacity:.4"' : "";
    html += '<button class="filter-chip ' + on + '" data-type="' + t.id + '" ' + dim + '>' + t.name + ' <span class="fc-count">' + c + "</span></button>";
  });
  // 待分类桶：category 无法映射的记录
  const uc = counts["unclassified"] || 0;
  const ucOn = state.types.includes("unclassified") ? "active" : "";
  const ucDim = (!ucOn && uc === 0) ? 'style="opacity:.4"' : "";
  html += '<button class="filter-chip filter-unc ' + ucOn + '" data-type="unclassified" ' + ucDim + '>待分类 <span class="fc-count">' + uc + "</span></button>";

  html += '<span class="sep"></span>';
  html += '<select id="sortMode" class="sort-select" aria-label="排序方式">';
  html += '<option value="published"' + (state.sortMode === "published" ? " selected" : "") + ">按发布时间</option>";
  html += '<option value="collected"' + (state.sortMode === "collected" ? " selected" : "") + ">按采集时间</option>";
  html += "</select>";

  if (state.sources.length || state.types.length || state.query) {
    html += '<button class="clear-btn" id="clearFilters">清除全部 ✕</button>';
  }
  bar.innerHTML = html;

  bar.querySelectorAll(".filter-chip").forEach(btn => {
    btn.onclick = () => {
      const v = btn.dataset.type;
      const i = state.types.indexOf(v);
      i === -1 ? state.types.push(v) : state.types.splice(i, 1);
      renderAll();
    };
  });
  const sel = document.getElementById("sortMode");
  if (sel) sel.onchange = () => { state.sortMode = sel.value; renderAll(); };
  const clear = document.getElementById("clearFilters");
  if (clear) clear.onclick = () => {
    state.sources = []; state.types = []; state.query = "";
    const inp = document.getElementById("searchInput");
    if (inp) inp.value = "";
    renderAll();
  };
}

// ---------- 渲染：已选条件（逐个移除，F02） ----------
function renderActiveConds() {
  const box = document.getElementById("activeConds");
  if (!box) return;
  const chips = [];
  state.sources.forEach(sid => {
    const s = SOURCES.find(x => x.id === sid) || { name: sid };
    chips.push('<button class="cond-chip" data-k="source" data-v="' + sid + '">' + s.name + ' ✕</button>');
  });
  state.types.forEach(tid => {
    const t = tid === "unclassified" ? UNCATEGORIZED : (Taxonomy.findById("intel_type", tid) || { name: tid });
    chips.push('<button class="cond-chip" data-k="type" data-v="' + tid + '">' + t.name + ' ✕</button>');
  });
  if (state.query) chips.push('<button class="cond-chip" data-k="query" data-v="">“' + HT.escapeHtml(state.query) + '” ✕</button>');
  box.innerHTML = chips.join("");
  box.querySelectorAll(".cond-chip").forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.k, v = btn.dataset.v;
      if (k === "source") state.sources = state.sources.filter(x => x !== v);
      else if (k === "type") state.types = state.types.filter(x => x !== v);
      else if (k === "query") { state.query = ""; const inp = document.getElementById("searchInput"); if (inp) inp.value = ""; }
      renderAll();
    };
  });
}

// ---------- 渲染：今日重点 ----------
function renderDigest() {
  const box = document.getElementById("digest");
  // F03/首页：待核验不进入默认重点；示例数据仅在无实时数据时展示
  const featured = NEWS.filter(n => n.featured && Taxonomy.resolve(n, "verification")[0] !== "pending").slice(0, 4);
  if (!featured.length) { box.innerHTML = ""; return; }
  let html = '<div class="digest-header"><h2><span class="pulse"></span>今日重点</h2>'
    + '<span style="font-size:12px;color:var(--muted)">' + (DATA_LOADED_FROM_LIVE ? "已加载实时数据" : "当前为示例数据 · 运行采集脚本可获取真实数据") + "</span></div>"
    + '<div class="digest-grid">';
  featured.forEach(n => {
    const s = getSource(n.source);
    html += '<div class="digest-card" data-id="' + n.id + '" style="--c:' + s.color + '">'
      + '<div class="dc-source" style="color:' + s.color + '">' + s.name + HT.demoBadge(n) + "</div>"
      + '<div class="dc-title">' + HT.escapeHtml(n.title) + "</div>"
      + "</div>";
  });
  html += "</div>";
  box.innerHTML = html;
  box.querySelectorAll(".digest-card").forEach(card => {
    card.onclick = () => { const n = NEWS.find(x => x.id === card.dataset.id); if (n) openItem(n); };
  });
}

// ---------- 渲染：情报卡片 ----------
function newsCardHtml(n) {
  const s = getSource(n.source);
  const c = getCategory(n.category && !LEGACY_CATEGORY_MAP[n.category] ? n.category : Taxonomy.resolve(n, "intel_type")[0]);
  const starred = state.bookmarks.includes(n.id);
  const read = state.readIds.includes(n.id);
  const link = n.url || n.source_url || s.baseUrl || "#";
  const pub = n.published_at || n.date || "";
  const col = n.collected_at || "";
  const showCol = state.sortMode === "collected" && col && col.slice(0, 10) !== (pub || "").slice(0, 10);
  return '<article class="news-card ' + (read ? "read" : "") + '" data-id="' + n.id + '">'
    + '<div class="stripe" style="background:' + s.color + '"></div>'
    + '<div class="nc-body">'
    + '<div class="nc-meta">'
    + '<span class="src-badge" style="background:' + s.color + '">' + s.name + "</span>"
    + '<span class="cat-tag">' + c.name + "</span>"
    + '<span class="nc-time" title="发布:' + HT.escapeHtml(pub || "未知") + (col ? " | 采集:" + HT.fmtTimestamp(col) : "") + '">' + fmtDate(pub) + "</span>"
    + (showCol ? '<span class="nc-time">采集 ' + HT.fmtDateOnly(col) + "</span>" : "")
    + HT.demoBadge(n) + HT.verifyBadge(n)
    + "</div>"
    + '<div class="nc-title">' + HT.escapeHtml(n.title) + "</div>"
    + (n.titleEn ? '<div class="nc-title-en">' + HT.escapeHtml(n.titleEn) + "</div>" : "")
    + '<div class="nc-summary">' + HT.escapeHtml(n.summary) + "</div>"
    + (n.tags && n.tags.length ? '<div class="nc-tags">' + n.tags.map(t => "<span>#" + HT.escapeHtml(t) + "</span>").join("") + "</div>" : "")
    + "</div>"
    + '<div class="nc-actions">'
    + '<button class="star-btn ' + (starred ? "on" : "") + '" data-star="' + n.id + '" title="收藏">' + (starred ? "★" : "☆") + "</button>"
    + '<a class="open-link" href="' + HT.escapeHtml(link) + '" target="_blank" rel="noopener">查看原文 ↗</a>'
    + "</div>"
    + "</article>";
}

// ---------- 渲染：情报流 ----------
function renderFeed() {
  const feed = document.getElementById("feed");
  const items = getFiltered();
  const total = items.length;
  const head = document.getElementById("feedCount");
  if (head) head.textContent = total + " 条";
  if (!total) {
    feed.innerHTML = '<div class="empty"><div class="emoji">📭</div><p>没有匹配的情报。零结果也说明筛选条件有效：当前条件下 ' + total + ' 条。</p><p style="font-size:12px">试试移除某个已选条件，或清除全部筛选。</p></div>';
    return;
  }
  const groups = {};
  items.forEach(n => {
    const g = dateGroupLabel(sortDateOf(n));
    (groups[g] = groups[g] || []).push(n);
  });
  const order = ["今天", "昨天", "本周更早", "上周"];
  const keys = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a < b ? 1 : -1;
  });
  feed.innerHTML = keys.map(g =>
    '<div class="date-group"><div class="date-group-title">' + g + " · " + groups[g].length + "条</div>" + groups[g].map(newsCardHtml).join("") + "</div>"
  ).join("");

  feed.querySelectorAll(".star-btn").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); toggleBookmark(btn.dataset.star); };
  });
  feed.querySelectorAll(".news-card").forEach(card => {
    card.onclick = () => { const n = NEWS.find(x => x.id === card.dataset.id); if (n) openItem(n); };
  });
}

function openItem(n) {
  if (!state.readIds.includes(n.id)) {
    state.readIds.push(n.id);
    HT.storage.set("ht_read", state.readIds);
    const card = document.querySelector('.news-card[data-id="' + n.id + '"]');
    if (card) card.classList.add("read");
  }
}

function toggleBookmark(id) {
  const i = state.bookmarks.indexOf(id);
  if (i === -1) { state.bookmarks.push(id); HT.showToast("已加入收藏"); }
  else { state.bookmarks.splice(i, 1); HT.showToast("已取消收藏"); }
  HT.storage.set("ht_bookmarks", state.bookmarks);
  renderAll();
}

function renderBookmarks() {
  const panel = document.getElementById("bookmarksPanel");
  if (!panel) return;
  const list = state.bookmarks.map(id => NEWS.find(n => n.id === id)).filter(Boolean);
  let body = list.length
    ? list.map(n => {
        const s = getSource(n.source);
        return '<a class="bm-item" data-id="' + n.id + '"><div class="bm-title">' + HT.escapeHtml(n.title) + "</div><div class=\"bm-src\">" + s.name + " · " + fmtDate(n.published_at || n.date) + HT.demoBadge(n) + "</div></a>";
      }).join("")
    : '<div class="bm-empty">点击 ☆ 收藏值得深挖的情报</div>';
  panel.querySelector(".panel-body").innerHTML = body;
  panel.querySelector(".count-pill").textContent = list.length;
  panel.querySelectorAll(".bm-item").forEach(a => {
    a.onclick = () => { const n = NEWS.find(x => x.id === a.dataset.id); if (n) openItem(n); };
  });
}

function renderSourcesPanel() {
  const panel = document.getElementById("sourcesPanel");
  if (!panel) return;
  let html = "";
  SOURCES.forEach(s => {
    html += '<div class="source-item" data-source="' + s.id + '">'
      + '<div class="si-dot" style="background:' + s.color + '"></div>'
      + "<div><div class=\"si-name\">" + s.name + " · " + s.nameCn + "</div>"
      + '<div class="si-focus">' + s.focus + "</div>"
      + '<div class="si-freq">更新频率：' + s.freq + "</div></div></div>";
  });
  panel.querySelector(".panel-body").innerHTML = html;
  panel.querySelectorAll(".source-item").forEach(el => {
    el.onclick = () => {
      const v = el.dataset.source;
      if (!state.sources.includes(v)) state.sources.push(v);
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });
}

function renderAll() {
  renderSourceNav();
  renderFilterBar();
  renderActiveConds();
  renderDigest();
  renderFeed();
  renderBookmarks();
  const hasDemo = NEWS.some(n => n.is_demo);
  HT.renderDemoBanner("demoBanner", hasDemo);
}

// ---------- 数据状态 ----------
function renderDataStatus(data) {
  const statusEl = document.getElementById("dataStatus");
  const timeEl = document.getElementById("lastUpdated");
  if (!statusEl || !timeEl) return;
  if (DATA_LOADED_FROM_LIVE && data && data.generatedAt) {
    statusEl.textContent = "实时";
    timeEl.textContent = "最近采集：" + HT.fmtTimestamp(data.generatedAt) + "（北京时间）";
  } else {
    statusEl.textContent = "示例";
    timeEl.textContent = "当前展示示例数据，首次自动采集后切换为实时情报";
  }
}

// ---------- 幂等迁移：为记录补齐统一ID/归一字段（F04，已有则保留） ----------
function migrateNewsRecords() {
  if (!Array.isArray(NEWS)) return;
  NEWS.forEach(n => Taxonomy.assignIds(n));
}

// ---------- 启动 ----------
async function init() {
  HT.shellReady();
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderSourceNav();
    renderFilterBar();
    renderActiveConds();
    renderFeed();
  });

  const dataResult = await loadNewsData();
  migrateNewsRecords();
  renderSourcesPanel();
  renderAll();
  renderDataStatus(dataResult);
}

init();