// ============================================================
// 家纺标准与技术资料库
// 数据：data/standards.json（每周由 scripts/verify_standards.py 核验）
// ============================================================

let STANDARDS = [];
let STD_META = null;

const stdState = {
  category: "all",
  status: "all",
  query: "",
};

const STATUS_META = {
  "现行": { badge: "st-current", icon: "✅" },
  "即将实施": { badge: "st-upcoming", icon: "🕐" },
  "旧版": { badge: "st-old", icon: "📦" },
  "征求意见": { badge: "st-draft", icon: "📝" },
  "待核验": { badge: "st-unknown", icon: "❓" },
};

const STATUS_ORDER = { "即将实施": 0, "现行": 1, "征求意见": 2, "待核验": 3, "旧版": 4 };

function statusBadge(status) {
  const m = STATUS_META[status] || STATUS_META["待核验"];
  return `<span class="status-badge ${m.badge}">${m.icon} ${status}</span>`;
}

function orderByStatus(list) {
  return list.slice().sort((a, b) => {
    const sa = STATUS_ORDER[a.status] != null ? STATUS_ORDER[a.status] : 3;
    const sb = STATUS_ORDER[b.status] != null ? STATUS_ORDER[b.status] : 3;
    if (sa !== sb) return sa - sb;
    return (a.implementation_date || "") < (b.implementation_date || "") ? 1 : -1;
  });
}

function getFilteredStandards() {
  const q = stdState.query.trim().toLowerCase();
  return orderByStatus(STANDARDS)
    .filter(s => stdState.category === "all" || (s.applicable_categories || []).includes(stdState.category))
    .filter(s => stdState.status === "all" || s.status === stdState.status)
    .filter(s => {
      if (!q) return true;
      const hay = [s.std_code, s.name, (s.testing_items || []).join(" "), s.dev_advice, s.verification_note]
        .join(" ").toLowerCase();
      return hay.includes(q);
    });
}

function fmtField(val, placeholder) {
  if (val == null || val === "" || val === "待核验") {
    return `<span class="status-badge st-unknown" style="font-size:10px;padding:1px 7px">待核验</span>`;
  }
  return HT.escapeHtml(val);
}

function stdCardHtml(s) {
  const cats = (s.applicable_categories || []).map(c => `<span>${HT.escapeHtml(c)}</span>`).join("");
  const items = (s.testing_items || []).map(t => `<span>${HT.escapeHtml(t)}</span>`).join("");
  const cardClass = s.status === "即将实施" ? "upcoming" : (s.status === "旧版" ? "old" : (s.status === "待核验" ? "unknown" : ""));
  const officialLink = s.official_url
    ? `<a href="${HT.escapeHtml(s.official_url)}" target="_blank" rel="noopener">标准原文（已核验直链）↗</a>`
    : `<a href="${HT.escapeHtml(s.official_search_url)}" target="_blank" rel="noopener">国家标准全文公开系统检索 ↗</a>`;
  const replacedBy = s.replaced_by ? `<b style="color:var(--accent-ink)">${HT.escapeHtml(s.replaced_by)}</b>` : "无";
  const pubDate = s.publish_date ? HT.fmtDateOnly(s.publish_date) : "待核验";
  const implDate = s.implementation_date ? HT.fmtDateOnly(s.implementation_date) : "待核验";
  return `<article class="std-card ${cardClass}">
    <div class="std-code">${HT.escapeHtml(s.std_code)}</div>
    <div class="std-name">${HT.escapeHtml(s.name)}</div>
    <div class="std-meta-row">
      ${statusBadge(s.status)}
      <span class="tag-list" style="margin:0">${cats}</span>
    </div>
    <dl class="kv">
      <dt>标准类型</dt><dd>${fmtField(s.type)}</dd>
      <dt>发布机构</dt><dd>${fmtField(s.issuer)}</dd>
      <dt>发布日期</dt><dd>${pubDate}</dd>
      <dt>实施日期</dt><dd>${implDate}</dd>
      <dt>替代关系</dt><dd>${s.replaces ? `替代 ${HT.escapeHtml(s.replaces)}` : "无"}${s.replaced_by ? `；将被 ${replacedBy} 替代` : ""}</dd>
      <dt>检测项目</dt><dd><span class="tag-list">${items || '<span class="status-badge st-unknown" style="font-size:10px;padding:1px 7px">待核验</span>'}</span></dd>
      <dt>官方链接</dt><dd>${officialLink}</dd>
      <dt>核验状态</dt><dd>${statusBadge(s.verification_status)} ${s.verification_date ? HT.fmtDateOnly(s.verification_date) : ""}</dd>
    </dl>
    <div class="note-box dev-note"><b style="color:var(--ink-2)">💡 开发应用建议：</b>${HT.escapeHtml(s.dev_advice)}</div>
    ${s.verification_note ? `<div class="note-box">⚠️ ${HT.escapeHtml(s.verification_note)}</div>` : ""}
  </article>`;
}

function renderStdFilters() {
  const bar = document.getElementById("stdFilterBar");
  const cats = ["all", ...["四件套", "枕芯", "被芯", "毛浴巾", "儿童床品"]];
  const statuses = ["all", "现行", "即将实施", "待核验"];
  let html = `<span class="label">品类</span>`;
  cats.forEach(c => {
    html += `<button class="filter-chip ${stdState.category === c ? "active" : ""}" data-cat="${c}">${c === "all" ? "全部品类" : c}</button>`;
  });
  html += `<span class="sep"></span><span class="label">状态</span>`;
  statuses.forEach(s => {
    html += `<button class="filter-chip ${stdState.status === s ? "active" : ""}" data-status="${s}">${s === "all" ? "全部状态" : s}</button>`;
  });
  if (stdState.category !== "all" || stdState.status !== "all" || stdState.query) {
    html += `<button class="clear-btn" id="stdClear">清除筛选 ✕</button>`;
  }
  bar.innerHTML = html;
  bar.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { stdState.category = b.dataset.cat; renderStdView(); });
  bar.querySelectorAll("[data-status]").forEach(b => b.onclick = () => { stdState.status = b.dataset.status; renderStdView(); });
  const clear = document.getElementById("stdClear");
  if (clear) clear.onclick = () => {
    stdState.category = "all"; stdState.status = "all"; stdState.query = "";
    document.getElementById("stdSearch").value = "";
    renderStdView();
  };
}

function renderStdGrid() {
  const grid = document.getElementById("stdGrid");
  const list = getFilteredStandards();
  document.getElementById("stdCount").textContent = list.length;
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="emoji">🔍</div><p>没有匹配的标准，试试调整筛选条件</p></div>`;
    return;
  }
  grid.innerHTML = list.map(stdCardHtml).join("");
}

// 最新标准变化：自动从记录推导，可追溯
function renderStdChanges() {
  const panel = document.getElementById("stdChangesPanel");
  const changes = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  STANDARDS.forEach(s => {
    if (s.status === "即将实施" && s.implementation_date) {
      const dt = new Date(s.implementation_date + "T00:00:00");
      const days = Math.round((dt - today) / 86400000);
      changes.push({
        icon: "🕐",
        text: `<b>${HT.escapeHtml(s.std_code)}</b> 将于 ${HT.fmtDateOnly(s.implementation_date)} 实施${days > 0 ? `（还有 ${days} 天）` : ""}${s.replaces ? `，替代 ${HT.escapeHtml(s.replaces)}` : ""}`,
        date: s.implementation_date,
        sortKey: 0,
      });
    }
    if (s.replaced_by) {
      changes.push({
        icon: "🔁",
        text: `<b>${HT.escapeHtml(s.std_code)}</b>（现行）将被 <b>${HT.escapeHtml(s.replaced_by)}</b> 替代，请规划切换时间`,
        date: s.implementation_date || "",
        sortKey: 1,
      });
    }
    if (s.verification_status === "待核验" || s.status === "待核验") {
      changes.push({
        icon: "❓",
        text: `<b>${HT.escapeHtml(s.std_code)}</b> 存在待核验字段，需在国家标准信息公共服务平台确认后补全`,
        date: "",
        sortKey: 2,
      });
    }
  });

  // 若核验脚本记录了正式变化日志，优先展示
  if (STD_META && Array.isArray(STD_META.lastChanges) && STD_META.lastChanges.length) {
    changes.push(...STD_META.lastChanges.map(c => ({
      icon: c.icon || "📌",
      text: HT.escapeHtml(c.text),
      date: c.date || "",
      sortKey: -1,
    })));
  }

  changes.sort((a, b) => a.sortKey - b.sortKey || (a.date < b.date ? 1 : -1));
  const body = changes.length
    ? changes.slice(0, 20).map(c =>
        `<div class="change-item"><div class="ci-icon">${c.icon}</div><div><div class="ci-text">${c.text}</div>${c.date ? `<div class="ci-date">${HT.fmtDateOnly(c.date)}</div>` : ""}</div></div>`
      ).join("")
    : `<div class="bm-empty">暂无标准变化记录</div>`;
  panel.querySelector(".panel-body").innerHTML = body;
  panel.querySelector(".count-pill").textContent = changes.length;
}

function renderStdView() {
  renderStdFilters();
  renderStdGrid();
  renderStdChanges();
}

async function initStandards() {
  document.getElementById("stdSearch").addEventListener("input", (e) => {
    stdState.query = e.target.value;
    renderStdGrid();
  });
  const res = await HT.fetchJSON("data/standards.json");
  if (res.ok && Array.isArray(res.data.standards)) {
    STANDARDS = res.data.standards;
    STD_META = res.data;
    document.getElementById("stdMeta").textContent =
      `共 ${STANDARDS.length} 项标准 · 最近核验尝试：${STD_META.generatedAt ? HT.fmtTimestamp(STD_META.generatedAt) : "未知"}`;
  } else {
    document.getElementById("stdMeta").textContent = "标准数据文件尚未生成";
  }
  renderStdView();
}

initStandards();