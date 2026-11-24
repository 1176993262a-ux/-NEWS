// ============================================================
// 家纺情报站 V2.0 - 跨页面共享基础
// 主题/导航/提示/存储/取数/示例与核验标记
// ============================================================

const HT = {
  escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  showToast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1800);
  },

  storage: {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 存储满时静默 */ }
    }
  },

  initTheme() {
    const saved = HT.storage.get("ht_theme", "light");
    document.documentElement.dataset.theme = saved;
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.textContent = saved === "dark" ? "☀️" : "🌙";
      btn.onclick = HT.toggleTheme;
    }
  },

  toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    HT.storage.set("ht_theme", next);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
  },

  setTodayBadge() {
    const el = document.getElementById("todayBadge");
    if (!el) return;
    const n = new Date();
    el.textContent = `📅 ${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  },

  setNavActive() {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".page-link").forEach(a => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (href === current) a.classList.add("active");
    });
  },

  fmtTimestamp(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch (e) { return String(iso); }
  },

  fmtDateOnly(iso) {
    if (!iso) return "—";
    const d = new Date(String(iso).length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return String(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },

  async fetchJSON(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return { ok: false, data: null };
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, data: null };
    }
  },

  // 示例数据标记（演示数据必须与真实数据明显区分）
  demoBadge(item) {
    return item && item.is_demo ? '<span class="demo-badge">示例数据</span>' : "";
  },

  // 核验状态标记
  verifyBadge(item) {
    if (!item) return "";
    const v = item.verification_status;
    if (v === "已核验") return '<span class="verify-badge ok">已核验</span>';
    if (v === "示例") return "";
    return '<span class="verify-badge">待核验</span>';
  },

  renderDemoBanner(containerId, hasDemo) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (hasDemo) {
      el.innerHTML = '<div class="demo-banner">⚠️ 当前页面包含<b>示例数据</b>，仅用于展示界面与交互，不代表真实情报。运行采集脚本或 GitHub Actions 自动运行后，将替换为真实可追溯数据。</div>';
    } else {
      el.innerHTML = "";
    }
  },

  shellReady() {
    HT.initTheme();
    HT.setTodayBadge();
    HT.setNavActive();
  }
};

// 每个页面启动时统一初始化外壳
document.addEventListener("DOMContentLoaded", HT.shellReady);