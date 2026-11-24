// ============================================================
// 家纺情报站 - 首页应用逻辑（V2.0：接入 common.js，增加示例/核验标记）
// ============================================================

const state = {
  source: "all",
  category: "all",
  query: "",
  bookmarks: HT.storage.get("ht_bookmarks", []),
  readIds: HT.storage.get("ht_read", []),
};

// ---------- 日期工具 ----------
function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - dt) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff > 1 && diff <= 6) return `${diff}天前`;
  const m = dt.getMonth() + 1, day = dt.getDate();
  return `${m}月${day}日`;
}

function dateGroupLabel(d) {
  const dt = new Date(d + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - dt) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff > 1 && diff <= 7) return "本周更早";
  if (diff > 7 && diff <= 14) return "上周";
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月`;
}

// ---------- 过滤 ----------
function getFiltered() {
  const q = state.query.trim().toLowerCase();
  return NEWS
    .filter(n => state.source === "all" || n.source === state.source)
    .filter(n => state.category === "all" || n.category === state.category)
    .filter(n => {
      if (!q) return true;
      const hay = [n.title, n.titleEn || "", n.summary, n.tags ? n.tags.join(" ") : ""].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------- 渲染 ----------
function renderSourceNav() {
  const nav = document.getElementById("sourceNav");
  const counts = {};
  NEWS.forEach(n => counts[n.source] = (counts[n.source] || 0) + 1);

  let html = `<button class="chip ${state.source === "all" ? "active" : ""}" data-source="all">全部 <span class="count">${NEWS.length}</span></button>`;
  SOURCES.forEach(s => {
    const c = counts[s.id] || 0;
    html += `<button class="chip ${state.source === s.id ? "active" : ""}" data-source="${s.id}" title="${s.nameCn} · ${s.focus}">
      <span class="dot" style="background:${s.color}"></span>${s.name} <span class="count">${c}</span></button>`;
  });
  nav.innerHTML = html;
  nav.querySelectorAll(".chip").forEach(btn => {
    btn.onclick = () => { state.source = btn.dataset.source; renderAll(); };
  });
}

function renderFilterBar() {
  const bar = document.getElementById("filterBar");
  const cats = [{ id: "all", name: "全部分类" }, ...CATEGORIES];
  let html = `<span class="label">分类</span>`;
  cats.forEach(c => {
    html += `<button class="filter-chip ${state.category === c.id ? "active" : ""}" data-cat="${c.id}">${c.name}</button>`;
  });
  if (state.source !== "all" || state.category !== "all" || state.query) {
    html += `<button class="clear-btn" id="clearFilters">清除筛选 ✕</button>`;
  }
  bar.innerHTML = html;
  bar.querySelectorAll(".filter-chip").forEach(btn => {
    btn.onclick = () => { state.category = btn.dataset.cat; renderAll(); };
  });
  const clear = document.getElementById("clearFilters");
  if (clear) clear.onclick = () => {
    state.source = "all"; state.category = "all"; state.query = "";
    document.getElementById("searchInput").value = "";
    renderAll();
  };
}

function renderDigest() {
  const box = document.getElementById("digest");
  const featured = NEWS.filter(n => n.featured).slice(0, 4);
  if (!featured.length) { box.innerHTML = ""; return; }
  let html = `<div class="digest-header"><h2><span class="pulse"></span>今日重点</h2>
    <span style="font-size:12px;color:var(--muted)">${DATA_LOADED_FROM_LIVE ? "已加载实时数据" : "当前为示例数据 · 运行采集脚本可获取真实数据"}</span></div>
    <div class="digest-grid">`;
  featured.forEach(n => {
    const s = getSource(n.source);
    html += `<div class="digest-card" data-id="${n.id}" style="--c:${s.color}">
      <div class="dc-source" style="color:${s.color}">${s.name}${HT.demoBadge(n)}</div>
      <div class="dc-title">${HT.escapeHtml(n.title)}</div>
    </div>`;
  });
  html += `</div>`;
  box.innerHTML = html;
  box.querySelectorAll(".digest-card").forEach(card => {
    card.onclick = () => {
      const n = NEWS.find(x => x.id === card.dataset.id);
      if (n) openItem(n);
    };
  });
}

function newsCardHtml(n) {
  const s = getSource(n.source);
  const c = getCategory(n.category);
  const starred = state.bookmarks.includes(n.id);
  const read = state.readIds.includes(n.id);
  const link = n.url || n.source_url || s.baseUrl || "#";
  return `<article class="news-card ${read ? "read" : ""}" data-id="${n.id}">
    <div class="stripe" style="background:${s.color}"></div>
    <div class="nc-body">
      <div class="nc-meta">
        <span class="src-badge" style="background:${s.color}">${s.name}</span>
        <span class="cat-tag">${c.name}</span>
        <span class="nc-time">${fmtDate(n.date)}</span>
        ${HT.demoBadge(n)}${HT.verifyBadge(n)}
      </div>
      <div class="nc-title">${HT.escapeHtml(n.title)}</div>
      ${n.titleEn ? `<div class="nc-title-en">${HT.escapeHtml(n.titleEn)}</div>` : ""}
      <div class="nc-summary">${HT.escapeHtml(n.summary)}</div>
      ${n.tags && n.tags.length ? `<div class="nc-tags">${n.tags.map(t => `<span>#${HT.escapeHtml(t)}</span>`).join("")}</div>` : ""}
    </div>
    <div class="nc-actions">
      <button class="star-btn ${starred ? "on" : ""}" data-star="${n.id}" title="收藏">${starred ? "★" : "☆"}</button>
      <a class="open-link" href="${link}" target="_blank" rel="noopener">查看原文 ↗</a>
    </div>
  </article>`;
}

function renderFeed() {
  const feed = document.getElementById("feed");
  const items = getFiltered();
  if (!items.length) {
    feed.innerHTML = `<div class="empty"><div class="emoji">📭</div><p>没有匹配的情报，试试调整筛选条件</p></div>`;
    return;
  }
  const groups = {};
  items.forEach(n => {
    const g = dateGroupLabel(n.date);
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
    `<div class="date-group"><div class="date-group-title">${g} · ${groups[g].length}条</div>${groups[g].map(newsCardHtml).join("")}</div>`
  ).join("");

  feed.querySelectorAll(".star-btn").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); toggleBookmark(btn.dataset.star); };
  });
  feed.querySelectorAll(".news-card").forEach(card => {
    card.onclick = () => {
      const n = NEWS.find(x => x.id === card.dataset.id);
      if (n) openItem(n);
    };
  });
}

function openItem(n) {
  if (!state.readIds.includes(n.id)) {
    state.readIds.push(n.id);
    HT.storage.set("ht_read", state.readIds);
    const card = document.querySelector(`.news-card[data-id="${n.id}"]`);
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
  const list = state.bookmarks
    .map(id => NEWS.find(n => n.id === id))
    .filter(Boolean);
  let body = list.length
    ? list.map(n => {
        const s = getSource(n.source);
        return `<a class="bm-item" data-id="${n.id}"><div class="bm-title">${HT.escapeHtml(n.title)}</div><div class="bm-src">${s.name} · ${fmtDate(n.date)}${HT.demoBadge(n)}</div></a>`;
      }).join("")
    : `<div class="bm-empty">点击 ☆ 收藏值得深挖的情报</div>`;
  panel.querySelector(".panel-body").innerHTML = body;
  panel.querySelector(".count-pill").textContent = list.length;
  panel.querySelectorAll(".bm-item").forEach(a => {
    a.onclick = () => {
      const n = NEWS.find(x => x.id === a.dataset.id);
      if (n) openItem(n);
    };
  });
}

function renderSourcesPanel() {
  const panel = document.getElementById("sourcesPanel");
  if (!panel) return;
  let html = "";
  SOURCES.forEach(s => {
    html += `<div class="source-item" data-source="${s.id}">
      <div class="si-dot" style="background:${s.color}"></div>
      <div>
        <div class="si-name">${s.name} · ${s.nameCn}</div>
        <div class="si-focus">${s.focus}</div>
        <div class="si-freq">更新频率：${s.freq}</div>
      </div>
    </div>`;
  });
  panel.querySelector(".panel-body").innerHTML = html;
  panel.querySelectorAll(".source-item").forEach(el => {
    el.onclick = () => {
      state.source = el.dataset.source;
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });
}

function renderAll() {
  renderSourceNav();
  renderFilterBar();
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
    timeEl.textContent = `最近采集：${HT.fmtTimestamp(data.generatedAt)}（北京时间）`;
  } else {
    statusEl.textContent = "示例";
    timeEl.textContent = "当前展示示例数据，首次自动采集后切换为实时情报";
  }
}

// ---------- 启动 ----------
async function init() {
  HT.shellReady();
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderFeed();
  });

  const dataResult = await loadNewsData();
  renderSourcesPanel();
  renderAll();
  renderDataStatus(dataResult);
}

init();