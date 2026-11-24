// ============================================================
// 市场数据：家纺市场与销售指标
// 数据：data/market_metrics.json（空状态为真实状态，不造假）
// 导入：页面端 CSV 预览校验 → 下载规范化 JSON → scripts/import_market_data.py 合并
// ============================================================

let MK_META = null;
let MK_ITEMS = [];

const mkState = {
  platform: "all",
  dataType: "all",
  period: "all",
  chartMetric: "",
};

function mkTypeMeta(id) {
  const list = (MK_META && MK_META.dataTypes) || [];
  return list.find(t => t.id === id) || { id: id, name: id, badge: "dt-public" };
}

function mkTypeBadge(item) {
  const t = mkTypeMeta(item.data_type);
  return `<span class="metric-type ${t.badge}">${t.name}</span>`;
}

function getFilteredMetrics() {
  return MK_ITEMS
    .filter(m => mkState.platform === "all" || m.platform === mkState.platform)
    .filter(m => mkState.dataType === "all" || m.data_type === mkState.dataType)
    .filter(m => mkState.period === "all" || m.period_label === mkState.period)
    .sort((a, b) => (a.period_label || "") < (b.period_label || "") ? 1 : -1);
}

function mkSourceLink(m) {
  if (!m.source_url) return `<span style="color:var(--muted)">无链接</span>`;
  return `<a href="${HT.escapeHtml(m.source_url)}" target="_blank" rel="noopener">来源 ↗</a>`;
}

function mkPeriod(m) {
  if (m.period_label) return HT.escapeHtml(m.period_label);
  const s = m.period_start ? HT.fmtDateOnly(m.period_start) : "?";
  const e = m.period_end ? HT.fmtDateOnly(m.period_end) : "?";
  return `${s} ~ ${e}`;
}

function renderMetricTable() {
  const wrap = document.getElementById("metricTableWrap");
  const list = getFilteredMetrics();
  document.getElementById("marketCount").textContent = list.length;
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">
      <div class="emoji">📊</div>
      <p>暂无市场指标数据</p>
      <p class="empty-action">这是<b>真实空状态</b>：尚未接入授权渠道，不使用假数据填充。<br>可先通过右侧「CSV 导入」录入公开行业报告或授权数据，或等 GitHub Actions 自动收录公开榜单。</p>
    </div>`;
    return;
  }
  const rows = list.map(m => {
    const est = m.data_type === "estimate" && m.estimate_note
      ? `<div style="font-size:10px;color:#b45309;margin-top:2px">⚠️ 估算：${HT.escapeHtml(m.estimate_note)}</div>` : "";
    const subj = `${HT.escapeHtml(m.subject)}<small style="color:var(--muted)">（${m.subject_type === "brand" ? "品牌" : m.subject_type === "category" ? "品类" : HT.escapeHtml(m.subject_type || "")}）</small>`;
    return `<tr>
      <td>${HT.escapeHtml(m.platform)}</td>
      <td>${subj}</td>
      <td><b>${HT.escapeHtml(m.metric_name)}</b><div style="font-size:10px;color:var(--muted)">${HT.escapeHtml(m.caliber || "口径未标注")}</div></td>
      <td class="metric-value">${HT.escapeHtml(String(m.value))} <small>${HT.escapeHtml(m.unit || "")}</small></td>
      <td>${mkTypeBadge(m)}${est}</td>
      <td>${mkPeriod(m)}</td>
      <td>${HT.escapeHtml(m.data_source || "")}<br>${mkSourceLink(m)}</td>
      <td style="font-size:11px;color:var(--muted)">${m.collected_at ? HT.fmtTimestamp(m.collected_at) : "--"}${HT.demoBadge(m)}</td>
    </tr>`;
  }).join("");
  wrap.innerHTML = `<div class="table-scroll"><table class="metric-table">
    <thead><tr><th>平台</th><th>主体</th><th>指标 / 口径</th><th>数值</th><th>数据类型</th><th>统计区间</th><th>来源</th><th>采集</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ---------- 简易 SVG 柱状趋势图（按月/区间查看同一指标变化） ----------
function renderMarketChart() {
  const box = document.getElementById("marketChart");
  if (!MK_ITEMS.length) {
    box.innerHTML = `<div class="bm-empty">暂无数据，无法绘制趋势图。</div>`;
    return;
  }
  const filtered = getFilteredMetrics();
  // 指标选择：默认取出现频次最高的指标
  const metricCounts = {};
  filtered.forEach(m => { metricCounts[m.metric_name] = (metricCounts[m.metric_name] || 0) + 1; });
  const metricNames = Object.keys(metricCounts).sort((a, b) => metricCounts[b] - metricCounts[a]);
  if (!metricNames.length) {
    box.innerHTML = `<div class="bm-empty">当前筛选下无指标数据。</div>`;
    return;
  }
  if (!mkState.chartMetric || !metricNames.includes(mkState.chartMetric)) mkState.chartMetric = metricNames[0];
  const sel = document.getElementById("chartMetricSelect");
  if (sel) {
    sel.innerHTML = metricNames.map(n => `<option value="${HT.escapeHtml(n)}" ${n === mkState.chartMetric ? "selected" : ""}>${HT.escapeHtml(n)}</option>`).join("");
  }
  const series = filtered
    .filter(m => m.metric_name === mkState.chartMetric)
    .sort((a, b) => (a.period_label || "") < (b.period_label || "") ? -1 : 1);
  const values = series.map(m => parseFloat(m.value));
  const valid = values.filter(v => isFinite(v));
  if (!valid.length) {
    box.innerHTML = `<div class="bm-empty">所选指标无可绘制的数值。</div>`;
    return;
  }
  const max = Math.max(...valid, 1);
  const W = 640, H = 200, pad = 34, barGap = 6;
  const bw = Math.max(8, Math.min(48, (W - pad * 2 - barGap * (series.length - 1)) / Math.max(series.length, 1)));
  let bars = "";
  series.forEach((m, i) => {
    const v = parseFloat(m.value);
    const h = isFinite(v) ? Math.max(2, (v / max) * (H - pad * 2)) : 2;
    const x = pad + i * (bw + barGap);
    const y = H - pad - h;
    const label = isFinite(v) ? String(v) : "?";
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="var(--accent, #3b82f6)" opacity="0.85"></rect>
      <text class="axis-text" x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${HT.escapeHtml(label)}</text>
      <text class="axis-text" x="${(x + bw / 2).toFixed(1)}" y="${H - pad + 15}" text-anchor="middle">${HT.escapeHtml(m.period_label || "?")}</text>`;
  });
  const typeNote = series.map(m => mkTypeMeta(m.data_type).name).filter((v, i, a) => a.indexOf(v) === i).join(" / ");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="指标趋势图">
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad / 2}" y2="${H - pad}" stroke="var(--muted, #999)" stroke-width="1"></line>
    ${bars}
  </svg>
  <div class="chart-legend"><span>指标：${HT.escapeHtml(mkState.chartMetric)}</span><span>数据类型：${HT.escapeHtml(typeNote)}</span><span>共 ${series.length} 期</span></div>`;
}

function renderMarketFilters() {
  const bar = document.getElementById("marketFilterBar");
  const platforms = [...new Set(MK_ITEMS.map(m => m.platform))].sort();
  const periods = [...new Set(MK_ITEMS.map(m => m.period_label).filter(Boolean))].sort().reverse();
  let html = `<span class="label">平台</span>`;
  html += `<button class="filter-chip ${mkState.platform === "all" ? "active" : ""}" data-platform="all">全部</button>`;
  platforms.forEach(p => { html += `<button class="filter-chip ${mkState.platform === p ? "active" : ""}" data-platform="${HT.escapeHtml(p)}">${HT.escapeHtml(p)}</button>`; });
  html += `<span class="sep"></span><span class="label">数据类型</span>`;
  html += `<button class="filter-chip ${mkState.dataType === "all" ? "active" : ""}" data-dtype="all">全部</button>`;
  (MK_META.dataTypes || []).forEach(t => { html += `<button class="filter-chip ${mkState.dataType === t.id ? "active" : ""}" data-dtype="${t.id}">${t.name}</button>`; });
  html += `<span class="sep"></span><span class="label">区间</span>`;
  html += `<button class="filter-chip ${mkState.period === "all" ? "active" : ""}" data-period="all">全部</button>`;
  periods.forEach(p => { html += `<button class="filter-chip ${mkState.period === p ? "active" : ""}" data-period="${HT.escapeHtml(p)}">${HT.escapeHtml(p)}</button>`; });
  const dirty = mkState.platform !== "all" || mkState.dataType !== "all" || mkState.period !== "all";
  if (dirty) html += `<button class="clear-btn" id="mkClear">清除筛选 ✕</button>`;
  bar.innerHTML = html;
  bar.querySelectorAll("[data-platform]").forEach(el => el.onclick = () => { mkState.platform = el.dataset.platform; renderMarketView(); });
  bar.querySelectorAll("[data-dtype]").forEach(el => el.onclick = () => { mkState.dataType = el.dataset.dtype; renderMarketView(); });
  bar.querySelectorAll("[data-period]").forEach(el => el.onclick = () => { mkState.period = el.dataset.period; renderMarketView(); });
  const clear = document.getElementById("mkClear");
  if (clear) clear.onclick = () => { mkState.platform = "all"; mkState.dataType = "all"; mkState.period = "all"; renderMarketView(); };
}

function renderTypePanel() {
  const panel = document.getElementById("marketTypePanel");
  const body = panel.querySelector(".panel-body");
  body.innerHTML = (MK_META.dataTypes || []).map(t =>
    `<div style="margin-bottom:10px"><span class="metric-type ${t.badge}">${t.name}</span><div style="font-size:11px;color:var(--muted);margin-top:3px">${t.note}</div></div>`
  ).join("") + `<div style="font-size:11px;color:#b45309;border-top:1px dashed var(--border);padding-top:10px;margin-top:4px">⚠️ GMV、支付金额、成交件数、销量区间、搜索指数、销售排名<b>不得混为一谈</b>，不同口径必须分别记录。</div>`;
}

// ---------- CSV 前端导入：解析 → 校验预览 → 下载规范化 JSON ----------
function parseCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function csvToObjects(text) {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(l => {
    const cells = parseCsvLine(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || "").trim(); });
    return obj;
  });
  return { headers, rows };
}

function validateCsvRow(row, required) {
  const problems = [];
  required.forEach(k => {
    if (!row[k]) problems.push(`缺 ${k}`);
  });
  if (row.value !== undefined && row.value !== "" && isNaN(parseFloat(row.value))) problems.push("value 非数值");
  const validTypes = ["official", "authorized", "estimate", "public", "manual"];
  if (row.data_type && !validTypes.includes(row.data_type)) problems.push(`data_type 应为 ${validTypes.join("/")}`);
  if (row.data_type === "estimate" && !row.estimate_note) problems.push("第三方估算必须填 estimate_note");
  return problems;
}

function setupMarketImport() {
  const input = document.getElementById("csvFileInput");
  const preview = document.getElementById("csvPreview");
  const dlBtn = document.getElementById("csvDownloadBtn");
  let parsedRows = [];
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = csvToObjects(String(reader.result || ""));
      const required = (MK_META.importer && MK_META.importer.csvRequiredHeaders) || [];
      const missingHeaders = required.filter(k => !headers.includes(k));
      parsedRows = rows;
      if (missingHeaders.length) {
        preview.innerHTML = `<div style="color:#b91c1c;font-size:12px">✕ 表头缺少必需列：${missingHeaders.map(HT.escapeHtml).join("、")}。需要：${required.map(HT.escapeHtml).join("、")}</div>`;
        dlBtn.style.display = "none";
        return;
      }
      const rowsHtml = rows.map((r, i) => {
        const problems = validateCsvRow(r, required);
        const status = problems.length ? `<span style="color:#b91c1c">✕ ${problems.map(HT.escapeHtml).join("；")}</span>` : `<span style="color:#059669">✓ 可导入</span>`;
        return `<tr><td>${i + 1}</td><td>${HT.escapeHtml(r.platform || "")}</td><td>${HT.escapeHtml(r.subject || "")}</td><td>${HT.escapeHtml(r.metric_name || "")}</td><td>${HT.escapeHtml(r.value || "")}</td><td>${HT.escapeHtml(r.data_type || "")}</td><td>${status}</td></tr>`;
      }).join("");
      const okCount = rows.filter(r => !validateCsvRow(r, required).length).length;
      preview.innerHTML = `<div style="font-size:12px;margin-bottom:8px">解析 ${rows.length} 行，其中 <b style="color:#059669">${okCount}</b> 行通过校验。</div>
        <div class="table-scroll"><table class="metric-table"><thead><tr><th>#</th><th>平台</th><th>主体</th><th>指标</th><th>数值</th><th>类型</th><th>校验</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
      dlBtn.style.display = okCount ? "inline-block" : "none";
      dlBtn.onclick = () => {
        const now = new Date().toISOString();
        const items = rows.filter(r => !validateCsvRow(r, required).length).map(r => ({
          id: "mk-import-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          platform: r.platform,
          subject_type: r.subject_type || "category",
          subject: r.subject,
          period_start: r.period_start || null,
          period_end: r.period_end || null,
          period_label: r.period_label || "",
          metric_name: r.metric_name,
          value: parseFloat(r.value),
          unit: r.unit || "",
          data_source: r.data_source,
          data_type: r.data_type,
          caliber: r.caliber || "",
          estimate_note: r.estimate_note || "",
          source_url: r.source_url || "",
          collected_at: now,
          verification_status: "待核验",
          is_demo: false,
        }));
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `market_metrics_import_${now.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        HT.showToast("已下载规范化 JSON，请用 import_market_data.py 合并入库");
      };
    };
    reader.readAsText(file, "utf-8");
  });
}

function renderMarketView() {
  renderMarketFilters();
  renderMetricTable();
  renderMarketChart();
  HT.renderDemoBanner("marketDemoBanner", MK_ITEMS.some(m => m.is_demo));
}

async function initMarket() {
  const res = await HT.fetchJSON("data/market_metrics.json");
  if (res.ok) {
    MK_META = res.data;
    MK_ITEMS = res.data.items || [];
  } else {
    MK_META = { dataTypes: [], importer: { csvRequiredHeaders: [] }, platforms: [] };
  }
  document.getElementById("marketMeta").textContent =
    `已收录 ${MK_ITEMS.length} 项指标 · 数据类型 5 类 · 当前 ${MK_ITEMS.length ? "含数据" : "为空状态（未接入授权渠道，不造假）"}`;
  const sel = document.getElementById("chartMetricSelect");
  if (sel) sel.onchange = (e) => { mkState.chartMetric = e.target.value; renderMarketChart(); };
  setupMarketImport();
  renderTypePanel();
  renderMarketView();
}

initMarket();