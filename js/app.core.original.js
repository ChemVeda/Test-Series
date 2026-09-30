
/* ==============================================================
   ChemVeda Pro 2026-27 — Client
   ============================================================== */

const API_URL = "https://script.google.com/macros/s/AKfycbzNOJRP3BZaDsfqFXljj6VskcgXyiqJi9DGHjtnIvnupCA1vfb0s_iBAzOnthViO6kv/exec";

/* Lottie animation URLs (LottieFiles public CDN) */
const LOTTIE = {
  loading:    "https://assets6.lottiefiles.com/packages/lf20_usmfx6bp.json",
  success:    "https://assets1.lottiefiles.com/packages/lf20_s2lryxtd.json",
  celebrate:  "https://assets9.lottiefiles.com/packages/lf20_touohxv0.json",
  empty:      "https://assets2.lottiefiles.com/packages/lf20_ydo1amjm.json",
  quiz:       "https://assets7.lottiefiles.com/packages/lf20_kkflmtur.json",
  book:       "https://assets10.lottiefiles.com/packages/lf20_kdx6cani.json",
  chat:       "https://assets6.lottiefiles.com/packages/lf20_gjmecwii.json",
  saved:      "https://assets2.lottiefiles.com/packages/lf20_lktqxa1n.json"
};

/* --------------- State --------------- */
const state = {
  route: "auth",       // auth | app | admin-auth | admin
  student: null,
  admin: null,
  tab: "home",         // home | tests | doubts
  adminTab: "dashboard",
  quiz: null,          // {test, answers, cursor, startedAt}
  toasts: [],
  cache: {}
};

/* --------------- Storage --------------- */
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch(_){ return null; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k)
};

/* --------------- API ---------------
   Every call auto-attaches the logged-in student/admin session token,
   so individual call sites never need to remember to pass it. */
async function api(action, data = {}) {
  const payload = Object.assign({ action }, data);
  if (state.student && state.student.token && payload.token === undefined) payload.token = state.student.token;
  if (state.admin && state.admin.token && payload.adminToken === undefined) payload.adminToken = state.admin.token;
  const body = JSON.stringify(payload);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    throw new Error(t.slice(0,300) || ("Network error " + res.status));
  }
  let json;
  const txt = await res.text();
  try { json = JSON.parse(txt); } catch(_) { throw new Error("Invalid server response"); }
  if (!json.ok) throw new Error(json.error || "API error");
  return json;
}

/* --------------- Toast --------------- */
function toast(msg, kind = "") {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  el.setAttribute("data-testid", "toast");
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(-10px)"; el.style.transition="opacity .3s, transform .3s"; }, 2400);
  setTimeout(() => el.remove(), 2800);
}

/* --------------- Lottie helper --------------- */
function lottieMount(container, url, opts = {}) {
  if (!container) return null;
  if (typeof lottie === "undefined") {
    try { container.innerHTML = `<div style="padding:18px;text-align:center;color:var(--text-dim)">✨</div>`; } catch(_){}
    return null;
  }
  container.innerHTML = "";
  try {
    lottie.loadAnimation({
      container, renderer: "svg", loop: opts.loop !== false, autoplay: true, path: url
    });
  } catch (e) { /* offline fallback */ }
}

/* --------------- Ripple --------------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn");
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  btn.style.setProperty("--x", (e.clientX - r.left) + "px");
  btn.style.setProperty("--y", (e.clientY - r.top) + "px");
  btn.classList.remove("ripple"); void btn.offsetWidth; btn.classList.add("ripple");
  setTimeout(() => btn.classList.remove("ripple"), 500);
});

/* --------------- Small DOM helpers --------------- */
function h(html){ const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }
function fmtDate(s){ if(!s) return ""; try{ return new Date(s).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});}catch(_){return s;} }
function fmtDay(s){ if(!s) return ""; try{ return new Date(s).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}catch(_){return s;}}
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function icon(name){
  const icons = {
    home:'<path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>',
    test:'<path d="M9 2h6l1 2h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l1-2zm3 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
    doubt:'<path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"/>',
    trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    settings:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]||""}</svg>`;
}

/* ==============================================================
   ROOT RENDER
   ============================================================== */
function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  if (state.route === "auth") return renderAuth(app);
  if (state.route === "admin-auth") return renderAdminAuth(app);
  if (state.route === "app")   return renderStudentApp(app);
  if (state.route === "admin") return renderAdmin(app);
}

/* ==============================================================
   AUTH (Student)
   ============================================================== */
function renderAuth(root) {
  const mode = state.authMode || "login";
  const pending = sessionStorage.getItem("pendingTab");
  root.innerHTML = `
    <a class="admin-trigger" href="index.html" title="Back to ChemVeda home" data-testid="home-link" style="left:16px;right:auto;text-decoration:none">${icon("home")}</a>
    <button type="button" class="admin-trigger" id="adminGear" title="Admin login" data-testid="admin-gear">${icon("settings")}</button>
    <div class="auth-wrap">
      <div class="auth-card glass">
        <div class="brand">
          <div class="brand-mark">CV</div>
          <div class="brand-name">ChemVeda <span>Pro</span></div>
        </div>
        <p class="muted" style="text-align:center;margin-bottom:24px;font-size:.9rem">${pending ? "Sign in to continue to " + esc(pending.charAt(0).toUpperCase()+pending.slice(1)) : "Learn. Practice. Rise."}</p>

        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab ${mode==='login'?'active':''}" data-testid="tab-login" data-mode="login">Log in</button>
          <button type="button" class="auth-tab ${mode==='register'?'active':''}" data-testid="tab-register" data-mode="register">Register</button>
        </div>

        <form class="form-grid" id="authForm" autocomplete="off">
          ${mode==='register' ? `
            <div class="row">
              <div class="field"><label class="label">Full name</label><input class="input" name="name" required data-testid="input-name"/></div>
              <div class="field"><label class="label">Class</label>
                <select class="select" name="klass" data-testid="input-class">
                  <option>9</option><option selected>10</option><option>11</option><option>12</option><option>Competitive</option>
                </select>
              </div>
            </div>
          ` : ``}
          <div class="field"><label class="label">Username</label><input class="input" name="username" required data-testid="input-username"/></div>
          <div class="field"><label class="label">Password</label><input class="input" type="password" name="password" required data-testid="input-password"/></div>
          <button type="submit" class="btn btn-primary" data-testid="btn-auth-submit">${mode==='register'?'Create account':'Sign in'}</button>
        </form>
      </div>
    </div>`;

if(root.querySelector("#adminGear")) root.querySelector("#adminGear").onclick = () => { state.route = "admin-auth"; render(); };
  root.querySelectorAll(".auth-tab").forEach(t => t.onclick = () => { state.authMode = t.dataset.mode; render(); });
  root.querySelector("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "…";
    try {
      const res = mode === "register"
        ? await api("register", { name: f.get("name"), username: f.get("username"), password: f.get("password"), klass: f.get("klass") })
        : await api("login", { username: f.get("username"), password: f.get("password") });
      state.student = res.student;
      store.set("student", res.student);
      const pendingTab = sessionStorage.getItem("pendingTab");
      sessionStorage.removeItem("pendingTab");
      state.route = "app"; state.tab = pendingTab || "home";
      store.set("activeTab", state.tab);
      toast(`Welcome, ${res.student.name.split(" ")[0]}!`, "success");
      render();
    } catch (err) {
      toast(err.message, "error");
      btn.disabled = false; btn.textContent = mode === "register" ? "Create account" : "Sign in";
    }
  };
}

/* ==============================================================
   ADMIN AUTH
   ============================================================== */
function renderAdminAuth(root){
  root.innerHTML = `
    <button type="button" class="admin-trigger" id="adminAuthBackBtn" title="Back">✕</button>
    <div class="auth-wrap">
      <div class="auth-card glass">
        <div class="brand">
          <div class="brand-mark" style="background:linear-gradient(135deg,#fbbf24,#a259ff)">A</div>
          <div class="brand-name">Admin <span>Panel</span></div>
        </div>
        <p class="muted" style="text-align:center;margin-bottom:24px;font-size:.9rem">Restricted area · staff only</p>
        <form class="form-grid" id="adminForm">
          <div class="field"><label class="label">Username</label><input class="input" name="username" required data-testid="admin-username"/></div>
          <div class="field"><label class="label">Password</label><input class="input" type="password" name="password" required data-testid="admin-password"/></div>
          <button type="submit" class="btn btn-primary" data-testid="admin-submit">Enter Admin</button>
        </form>
      </div>
    </div>`;
  const adminBack = root.querySelector("#adminAuthBackBtn"); if (adminBack) adminBack.onclick = () => { state.route = "auth"; render(); };
  root.querySelector("#adminForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "…";
    try {
      const res = await api("adminLogin", { username: f.get("username"), password: f.get("password") });
      state.admin = res.admin;
      store.set("admin", res.admin);
      state.route = "admin"; state.adminTab = "dashboard";
      toast(`Hello, ${res.admin.name}`, "success");
      render();
    } catch (err) {
      toast(err.message, "error");
      btn.disabled = false; btn.textContent = "Enter Admin";
    }
  };
}

/* ==============================================================
   STUDENT APP SHELL
   ============================================================== */
function renderStudentApp(root){
  const s = state.student;
  root.innerHTML = `
    <header class="appbar">
      <div class="appbar-inner">
        <div class="user-tag">
          <div class="avatar">${esc((s.name||"S")[0].toUpperCase())}</div>
          <div class="user-info"><b>${esc(s.name)}</b><br/><small>${esc(s.rollNo)} · Class ${esc(s.klass)}</small></div>
        </div>
        <div style="display:flex;gap:8px">
          <a class="btn-icon" href="index.html" title="ChemVeda home" data-testid="btn-site-home">${icon("home")}</a>
          <button type="button" class="btn-icon" id="logoutBtn" title="Log out" data-testid="btn-logout" style="color:var(--red);border-color:rgba(248,113,113,.25)">${icon("logout")}</button>
        </div>
      </div>
    </header>
    <main class="container" style="padding-top:20px" id="studentMain"></main>
    <nav class="bottom-nav" role="tablist">
      <button type="button" class="nav-btn ${state.tab==='home'?'active':''}" data-tab="home" data-testid="nav-home">${icon("home")}<span>Home</span></button>
      <button type="button" class="nav-btn ${state.tab==='tests'?'active':''}" data-tab="tests" data-testid="nav-tests">${icon("test")}<span>Tests</span></button>
      <button type="button" class="nav-btn ${state.tab==='doubts'?'active':''}" data-tab="doubts" data-testid="nav-doubts">${icon("doubt")}<span>Doubts</span></button>
      <button type="button" class="nav-btn ${state.tab==='progress'?'active':''}" data-tab="progress" data-testid="nav-progress">${icon("trend")}<span>Progress</span></button>
      <button type="button" class="nav-btn ${state.tab==='profile'?'active':''}" data-tab="profile" data-testid="nav-profile">${icon("user")}<span>Profile</span></button>
    </nav>`;

if(root.querySelector("#logoutBtn")) root.querySelector("#logoutBtn").onclick = () => {
    store.del("student");
    state.student = null;
    state.quiz = null;
    state.result = null;
    state.route = "auth";
    clearInterval(window.__timerId);
    render();
    toast("Logged out");
  };
  root.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => {
    state.tab = b.dataset.tab;
    state.result = null; // clear stale result when switching tabs
    store.set("activeTab", b.dataset.tab);
    render();
  });

  const main = root.querySelector("#studentMain");
  if (state.quiz) return renderQuiz(main);
  if (state.result) return renderResult(main);
  if (state.tab === "home")   return renderHome(main);
  if (state.tab === "tests")  return renderTests(main);
  if (state.tab === "doubts") return renderDoubts(main);
  if (state.tab === "progress") return renderProgress(main);
  if (state.tab === "profile") return renderStudentProfile(main);
}

/* --- HOME --- */
async function renderHome(root){
  root.innerHTML = skeletonList(3);
  try {
    const { feed = [], config = {} } = await api("getFeed");
    const banner = config.bannerURL || "";
    const announcement = config.announcement || "Welcome back! Keep up the study streak.";

    root.innerHTML = `
      <div class="hero-banner" data-testid="home-banner">
        <div class="hero-content">
          <div class="hero-eyebrow"><span>⚗ ChemVeda Pro 2026–27</span></div>
          <div class="hero-title">Hey ${esc(state.student.name.split(" ")[0])},<br/>ready to <span class="grad">level up?</span></div>
          <div class="hero-subtitle">${esc(announcement)}</div>
          <div class="hero-pills">
            <div class="hero-pill">🎯 Daily Tests</div>
            <div class="hero-pill">📈 Live Rankings</div>
            <div class="hero-pill">💬 Doubt Support</div>
            <div class="hero-pill">📄 Study Material</div>
          </div>
        </div>
        <div class="hero-deco">
          <div class="hero-molecule">
            <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="120" cy="120" r="28" fill="rgba(162,89,255,0.35)" stroke="rgba(162,89,255,0.7)" stroke-width="2"/>
              <text x="120" y="126" text-anchor="middle" font-family="Space Grotesk" font-size="16" font-weight="700" fill="#d4b8ff">C</text>
              <circle cx="40" cy="80" r="18" fill="rgba(96,165,250,0.25)" stroke="rgba(96,165,250,0.6)" stroke-width="1.5"/>
              <text x="40" y="86" text-anchor="middle" font-family="Space Grotesk" font-size="13" font-weight="700" fill="#93c5fd">H</text>
              <circle cx="200" cy="80" r="18" fill="rgba(96,165,250,0.25)" stroke="rgba(96,165,250,0.6)" stroke-width="1.5"/>
              <text x="200" y="86" text-anchor="middle" font-family="Space Grotesk" font-size="13" font-weight="700" fill="#93c5fd">H</text>
              <circle cx="60" cy="180" r="20" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.55)" stroke-width="1.5"/>
              <text x="60" y="186" text-anchor="middle" font-family="Space Grotesk" font-size="13" font-weight="700" fill="#86efac">O</text>
              <circle cx="185" cy="175" r="20" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.55)" stroke-width="1.5"/>
              <text x="185" y="181" text-anchor="middle" font-family="Space Grotesk" font-size="13" font-weight="700" fill="#86efac">N</text>
              <circle cx="120" cy="30" r="16" fill="rgba(251,191,36,0.2)" stroke="rgba(251,191,36,0.5)" stroke-width="1.5"/>
              <text x="120" y="36" text-anchor="middle" font-family="Space Grotesk" font-size="12" font-weight="700" fill="#fde68a">S</text>
              <line x1="120" y1="92" x2="58" y2="80" stroke="rgba(162,89,255,0.5)" stroke-width="1.5"/>
              <line x1="120" y1="92" x2="182" y2="80" stroke="rgba(162,89,255,0.5)" stroke-width="1.5"/>
              <line x1="120" y1="148" x2="75" y2="162" stroke="rgba(34,197,94,0.45)" stroke-width="1.5"/>
              <line x1="120" y1="148" x2="167" y2="160" stroke="rgba(34,197,94,0.45)" stroke-width="1.5"/>
              <line x1="120" y1="92" x2="120" y2="46" stroke="rgba(251,191,36,0.4)" stroke-width="1.5"/>
              <circle cx="40" cy="80" r="5" fill="rgba(96,165,250,0.5)"/>
              <circle cx="200" cy="80" r="5" fill="rgba(96,165,250,0.5)"/>
            </svg>
          </div>
        </div>
        ${banner ? `<img src="${esc(banner)}" style="position:absolute;right:0;top:0;height:100%;object-fit:cover;opacity:.18;border-radius:var(--radius-lg)" alt="" onerror="this.remove()"/>` : ""}
      </div>

      <div class="section-header"><h2>Live &amp; Upcoming Classes</h2></div>
      <div class="feed-grid" id="ytGrid"></div>

      <div class="section-header"><h2>Study Material</h2></div>
      <div class="feed-grid" id="pdfGrid"></div>

      <div class="section-header"><h2>Announcements</h2></div>
      <div class="feed-grid" id="annGrid"></div>
    `;

    const yt = feed.filter(f => String(f.Type).toLowerCase() === "class");
    const pdf = feed.filter(f => String(f.Type).toLowerCase() === "pdf");
    const ann = feed.filter(f => String(f.Type).toLowerCase() === "announcement");

    root.querySelector("#ytGrid").innerHTML = yt.length ? yt.map(feedCard).join("") : emptyMsg("No classes scheduled yet");
    root.querySelector("#pdfGrid").innerHTML = pdf.length ? pdf.map(feedCard).join("") : emptyMsg("No study material yet");
    root.querySelector("#annGrid").innerHTML = ann.length ? ann.map(feedCard).join("") : emptyMsg("No announcements yet");
  } catch (e) { root.innerHTML = errorMsg(e.message); }
}

function feedCard(f){
  const type = String(f.Type||"").toLowerCase();
  const cls = type === "class" ? "yt" : type === "pdf" ? "pdf" : "ann";
  const ic  = type === "class" ? "▶" : type === "pdf" ? "📄" : "📢";
  const url = f.URL || "#";
  return `<a href="${esc(url)}" target="_blank" rel="noopener" class="card feed-item" data-testid="feed-item">
    <div class="feed-icon ${cls}">${ic}</div>
    <b>${esc(f.Title||"Untitled")}</b>
    <small class="muted">${esc(f.Description||"")}</small>
    <small class="mute2 tiny">${esc(fmtDate(f.PostedOn))}</small>
  </a>`;
}
function emptyMsg(t){ return `<div class="empty" style="grid-column:1/-1"><p>${esc(t)}</p></div>`; }
function errorMsg(t){ return `<div class="card" style="border-color:rgba(248,113,113,.3);color:#fecaca">${esc(t)}</div>`; }
function skeletonList(n){
  let out = "";
  for (let i=0;i<n;i++) out += `<div class="card" style="margin-bottom:12px"><div class="skeleton" style="height:16px;width:60%;margin-bottom:10px"></div><div class="skeleton" style="height:12px;width:40%"></div></div>`;
  return out;
}

/* --- TESTS --- */
async function renderTests(root){
  root.innerHTML = skeletonList(3);
  try {
    const { tests = [], todayTestId } = await api("getTests");
    const resAll = await api("getResults", { rollNo: state.student.rollNo });
    const takenIds = new Set((resAll.results||[]).map(r=>r.TestID));
    const today = tests.find(t => t.testId === todayTestId);
    const past = tests.filter(t => t.testId !== todayTestId);

    root.innerHTML = `
      ${today ? `
        <div class="glass today-card" data-testid="today-test">
          <span class="badge green">● Today</span>
          <h3>${esc(today.title)}</h3>
          <p class="muted" style="margin:6px 0 14px">${esc(today.subject)} · ${today.timer} min · ${today.questionsCount} questions</p>
          ${takenIds.has(today.testId)
            ? `<span class="badge green" style="padding:10px 16px;font-size:.85rem">✓ Already Submitted</span>`
            : `<button type="button" class="btn btn-green" id="startToday" data-testid="btn-start-today">Start Test →</button>`
          }
        </div>` : ""}

      <div class="section-header"><h2>All Tests</h2>
        <button type="button" class="btn btn-ghost btn-sm" id="lbBtn" data-testid="btn-leaderboard">🏆 Leaderboard</button>
      </div>
      <div id="testList"></div>
    `;
    const tl = root.querySelector("#testList");
    if (!tests.length) {
      tl.innerHTML = emptyMsg("No tests have been created yet");
    } else if (!past.length && !today) {
      tl.innerHTML = emptyMsg("No tests available");
    } else if (past.length && past.every(t => takenIds.has(t.testId))) {
      tl.innerHTML = `
        <div class="card" style="text-align:center;padding:28px;border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.06)">
          <div style="font-size:2.5rem;margin-bottom:10px">🎉</div>
          <h3 style="color:var(--green);margin-bottom:6px">All tests completed!</h3>
          <p class="muted" style="font-size:.9rem">You've attempted all available tests. Check back later for new ones.</p>
          <div style="margin-top:14px">
            ${past.map(t => `<div class="test-row" style="margin-bottom:8px">
              <div class="meta"><b>${esc(t.title)}</b><small>${esc(t.subject)} · ${esc(fmtDay(t.date))}</small></div>
              <span class="badge green">✓ Done</span>
            </div>`).join("")}
          </div>
        </div>`;
    } else {
      tl.innerHTML = past.map(t => `
        <div class="test-row" data-testid="test-row">
          <div class="meta">
            <b>${esc(t.title)}</b>
            <small>${esc(t.subject)} · ${esc(fmtDay(t.date))} · ${t.timer} min · ${t.questionsCount} Q</small>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${takenIds.has(t.testId)
              ? `<span class="badge green">✓ Attempted</span>`
              : `<button type="button" class="btn btn-primary btn-sm start-test" data-id="${esc(t.testId)}" data-testid="btn-start-${esc(t.testId)}">Start</button>`
            }
          </div>
        </div>`).join("");
    }

    const startTodayBtn = root.querySelector("#startToday");
    if (startTodayBtn) startTodayBtn.onclick = () => startQuiz(today.testId);
    root.querySelectorAll(".start-test").forEach(b => b.onclick = () => startQuiz(b.dataset.id));
if(root.querySelector("#lbBtn")) root.querySelector("#lbBtn").onclick = () => openLeaderboard();
  } catch (e) { root.innerHTML = errorMsg(e.message); }
}

async function openLeaderboard(){
  const modal = openModal("🏆 Leaderboard", `
    <div class="toolbar">
      <select class="select" id="lbClass" data-testid="lb-class">
        <option value="">All classes</option>
        <option>9</option><option>10</option><option>11</option><option>12</option><option>Competitive</option>
      </select>
      <button type="button" class="btn btn-ghost btn-sm" id="lbRefresh">Refresh</button>
    </div>
    <div id="lbBody">${skeletonList(4)}</div>`);
  async function load(){
    const klass = modal.querySelector("#lbClass").value;
    modal.querySelector("#lbBody").innerHTML = skeletonList(4);
    const { leaderboard = [] } = await api("getLeaderboard", klass ? { klass } : {});
    modal.querySelector("#lbBody").innerHTML = leaderboard.length ? `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Test</th><th>Score</th><th>Time</th></tr></thead>
        <tbody>${leaderboard.map(r=>`<tr><td><b>${r.rank}</b></td><td>${esc(r.name)}</td><td>${esc(r.klass)}</td><td>${esc(r.testTitle)}</td><td><b>${r.pct}%</b></td><td>${esc(r.timeFmt)}</td></tr>`).join("")}</tbody>
      </table></div>` : emptyMsg("No results yet");
  }
  modal.querySelector("#lbClass").onchange = load;
if(modal.querySelector("#lbRefresh")) modal.querySelector("#lbRefresh").onclick = load;
  load();
}

/* --- QUIZ --- */
async function startQuiz(testId){
  showLoading("Loading test…");
  try {
    const { test } = await api("getTest", { testId });
    const saved = store.get("resume_" + testId);
    state.quiz = {
      test,
      answers: saved?.answers || new Array(test.questions.length).fill(null),
      cursor: saved?.cursor || 0,
      startedAt: saved?.startedAt || Date.now(),
      timerSec: test.timer * 60
    };
    hideLoading();
    render();
  } catch (e) { hideLoading(); toast(e.message, "error"); }
}

function renderQuiz(root){
  const q = state.quiz;
  const cur = q.cursor;
  const question = q.test.questions[cur];
  const elapsed = Math.floor((Date.now() - q.startedAt) / 1000);
  const remain = Math.max(q.timerSec - elapsed, 0);

  root.innerHTML = `
    <div class="quiz-wrap">
      <div class="quiz-head">
        <div>
          <span class="badge purple">${esc(q.test.subject)}</span>
          <h2 style="margin-top:6px">${esc(q.test.title)}</h2>
        </div>
        <div class="timer" id="timer" data-testid="quiz-timer">⏱ <span id="timerTxt">${fmtSec(remain)}</span></div>
      </div>

      <div class="glass q-card" data-testid="quiz-question">
        <div class="q-num">Question ${cur+1} of ${q.test.questions.length}</div>
        <div class="q-text">${esc(question.q || question.text || question.question || "(Question text not available)")}</div>
        ${question.q_hi ? `<div class="q-text-hi hi">${esc(question.q_hi)}</div>` : ""}
        <div id="opts"></div>
      </div>

      <div class="quiz-controls">
        <button type="button" class="btn btn-ghost" id="prev" ${cur===0?'disabled':''} data-testid="btn-prev">← Prev</button>
        ${cur === q.test.questions.length - 1
          ? `<button type="button" class="btn btn-green" id="submit" data-testid="btn-submit-quiz">Submit ✓</button>`
          : `<button type="button" class="btn btn-primary" id="next" data-testid="btn-next">Next →</button>`}
      </div>

      <div class="palette" data-testid="quiz-palette">${q.test.questions.map((_,i)=>`
        <button type="button" class="pal-btn ${q.answers[i]!=null?'answered':''} ${i===cur?'current':''}" data-i="${i}">${i+1}</button>
      `).join("")}</div>
    </div>`;

  // options
  const opts = root.querySelector("#opts");
  const questionOptions = question.options || question.choices || [];
  if (questionOptions.length === 0) {
    opts.innerHTML = `<div class="muted" style="padding:12px">No options found for this question. Check the test data format.</div>`;
  }
  questionOptions.forEach((op, i) => {
    const div = document.createElement("div");
    div.className = "option" + (q.answers[cur] === i ? " selected" : "");
    div.setAttribute("data-testid", `quiz-option-${i}`);
    div.innerHTML = `<div class="letter">${String.fromCharCode(65+i)}</div>
      <div><div class="txt">${esc(op)}</div>${question.options_hi&&question.options_hi[i]?`<div class="txt-hi hi">${esc(question.options_hi[i])}</div>`:""}</div>`;
    div.onclick = () => { q.answers[cur] = i; store.set("resume_"+q.test.testId, {test: q.test, answers: q.answers, cursor: q.cursor, startedAt: q.startedAt}); render(); };
    opts.appendChild(div);
  });

  // nav
  const btnPrev = root.querySelector("#prev");
  if (btnPrev) btnPrev.onclick = () => { q.cursor = Math.max(0, cur - 1); render(); };
  const btnNext = root.querySelector("#next");
  if (btnNext) btnNext.onclick = () => { q.cursor = Math.min(q.test.questions.length-1, cur+1); render(); };
  const btnSubmit = root.querySelector("#submit");
  if (btnSubmit) btnSubmit.onclick = confirmSubmit;

  root.querySelectorAll(".pal-btn").forEach(b => b.onclick = () => { q.cursor = Number(b.dataset.i); render(); });

  // timer tick
  clearInterval(window.__timerId);
  window.__timerId = setInterval(() => {
    const el = Math.floor((Date.now() - q.startedAt) / 1000);
    const r = Math.max(q.timerSec - el, 0);
    const tt = root.querySelector("#timerTxt");
    if (!tt) return clearInterval(window.__timerId);
    tt.textContent = fmtSec(r);
    if (r < 120) root.querySelector("#timer").classList.add("warn");
    if (r <= 0) { clearInterval(window.__timerId); submitQuiz(true); }
  }, 1000);
}

function fmtSec(s){ const m = Math.floor(s/60), r = s%60; return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`; }

function confirmSubmit(){
  const q = state.quiz;
  const unans = q.answers.filter(a => a == null || a === undefined).length;
  const modal = openModal("Submit test?", `
    <p class="muted" style="margin-bottom:16px">${unans>0 ? `You have <b style="color:#fecaca">${unans}</b> unanswered question(s). ` : ""}Are you sure you want to submit?</p>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button type="button" class="btn btn-ghost" id="cx">Cancel</button>
      <button type="button" class="btn btn-green" id="cf" data-testid="btn-confirm-submit">Submit</button>
    </div>`);
if(modal.querySelector("#cx")) modal.querySelector("#cx").onclick = () => modal.remove();
if(modal.querySelector("#cf")) modal.querySelector("#cf").onclick = () => { modal.remove(); submitQuiz(false); };
}

async function submitQuiz(auto){
  const q = state.quiz;
  clearInterval(window.__timerId);
  showLoading(auto ? "Time up — submitting…" : "Grading your test…");
  try {
    const timeSec = Math.min(Math.floor((Date.now() - q.startedAt)/1000), q.timerSec);
    const { result } = await api("submitResult", {
      testId: q.test.testId, rollNo: state.student.rollNo, name: state.student.name, klass: state.student.klass,
      answers: q.answers, timeSec
    });
    store.del("resume_" + q.test.testId);
    state.quiz = null;
    state.result = { result, test: q.test, timeSec };
    hideLoading(); render();
  } catch (e) {
    hideLoading();
    if (e.message && e.message.includes("already submitted")) {
      // Clear local resume state since server already has it
      store.del("resume_" + q.test.testId);
      state.quiz = null;
      state.tab = "tests";
      toast("This test was already submitted.", "error");
      render();
    } else {
      toast(e.message, "error");
    }
  }
}

/* --- RESULT --- */
function renderResult(root){
  const { result, test, timeSec } = state.result;
  const pct = result.pct;
  const isHigh = pct >= 80;
  root.innerHTML = `
    <div class="container" style="padding-top:12px;max-width:820px">
      <div class="glass result-hero" data-testid="result-hero">
        <div class="grade-circle" style="--pct:${pct}%"><span>${esc(result.grade)}</span></div>
        <h1>${isHigh ? "Outstanding!" : pct>=50 ? "Well done!" : "Keep going!"}</h1>
        <p class="muted" style="margin-top:6px">${esc(test.title)} · ${esc(test.subject)}</p>
        <div class="result-stats">
          <div class="stat-tile"><b>${result.score}/${result.total}</b><small>Score</small></div>
          <div class="stat-tile"><b>${pct}%</b><small>Percentage</small></div>
          <div class="stat-tile"><b>${result.review.filter(r=>r.isCorrect).length}</b><small>Correct</small></div>
          <div class="stat-tile"><b>${result.review.filter(r=>!r.isCorrect&&r.chosen>=0).length}</b><small>Wrong</small></div>
          <div class="stat-tile"><b>${fmtSec(timeSec)}</b><small>Time</small></div>
        </div>
        <div id="celeb" style="width:220px;margin:0 auto"></div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
          <button class="btn btn-ghost" id="resultBackBtn" type="button">Back to Tests</button>
          <button type="button" class="btn btn-primary" id="reviewBtn" data-testid="btn-review">See Review</button>
        </div>
      </div>
      <div id="reviewBody" class="hidden" style="margin-top:20px"></div>
    </div>`;

  if (isHigh) lottieMount(root.querySelector("#celeb"), LOTTIE.celebrate, { loop: false });
  else lottieMount(root.querySelector("#celeb"), LOTTIE.success, { loop: false });

  const resultBack = root.querySelector("#resultBackBtn"); if (resultBack) resultBack.onclick = () => { state.result = null; state.tab = "tests"; render(); };
  let reviewOpen = false;
if(root.querySelector("#reviewBtn")) root.querySelector("#reviewBtn").onclick = () => {
    const rb = root.querySelector("#reviewBody");
    const btn = root.querySelector("#reviewBtn");
    reviewOpen = !reviewOpen;
    if (!reviewOpen) {
      rb.classList.add("hidden");
      btn.textContent = "See Review";
      return;
    }
    rb.classList.remove("hidden");
    btn.textContent = "Hide Review";
    const reviewData = result.review || [];
    if (!reviewData.length) {
      rb.innerHTML = `<div class="card muted" style="text-align:center;padding:24px">No review data available.</div>`;
      return;
    }
    rb.innerHTML = reviewData.map((r, i) => {
      const opts = r.options || r.choices || [];
      const correctIdx = Number(r.correct);
      const chosenIdx  = (r.chosen !== undefined && r.chosen !== null) ? Number(r.chosen) : -1;
      return `<div class="review-item ${r.isCorrect ? 'correct' : 'wrong'}">
        <div class="review-q">${i+1}. ${esc(r.q || r.text || "")}</div>
        ${r.q_hi ? `<div class="hi muted" style="margin-bottom:6px">${esc(r.q_hi)}</div>` : ""}
        ${opts.map((op, idx) => {
          const isCorrect = idx === correctIdx;
          const isChosen  = idx === chosenIdx;
          let cls = "";
          let suffix = "";
          if (isCorrect) { cls = "correct"; suffix = " ✓ Correct"; }
          else if (isChosen && !isCorrect) { cls = "your"; suffix = " ✗ Your answer"; }
          return `<div class="review-opt ${cls}">${String.fromCharCode(65+idx)}. ${esc(op)}${suffix}</div>`;
        }).join("")}
        ${chosenIdx === -1 ? `<div class="review-opt" style="color:var(--amber);margin-top:6px">⚠ Not attempted</div>` : ""}
      </div>`;
    }).join("");
  };
}

/* --- DOUBTS --- */
async function renderDoubts(root){
  root.innerHTML = `
    <div class="section-header"><h2>Doubt Box</h2></div>
    <div class="glass" style="padding:18px;margin-bottom:20px">
      <form id="doubtForm" class="form-grid">
        <div class="row">
          <div class="field"><label class="label">Subject</label>
            <select class="select" name="subject" data-testid="doubt-subject"><option>Chemistry</option><option>Physics</option><option>Math</option><option>Biology</option><option>General</option></select>
          </div>
          <div class="field" style="align-self:end"><button class="btn btn-primary" type="submit" data-testid="btn-post-doubt">Post Doubt</button></div>
        </div>
        <div class="field"><label class="label">Your question</label>
          <textarea class="textarea" name="question" required placeholder="Type your doubt here…" data-testid="doubt-question"></textarea>
        </div>
      </form>
    </div>
    <div id="myDoubts">${skeletonList(2)}</div>`;

  root.querySelector("#doubtForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("postDoubt", { rollNo: state.student.rollNo, name: state.student.name, subject: f.get("subject"), question: f.get("question") });
      toast("Doubt posted!","success");
      e.target.reset();
      loadDoubts();
    } catch (err) { toast(err.message, "error"); }
  };
  loadDoubts();

  async function loadDoubts(){
    try {
      const { doubts = [] } = await api("getDoubts", { rollNo: state.student.rollNo });
      const wrap = root.querySelector("#myDoubts");
      if (!doubts.length) { wrap.innerHTML = emptyMsg("You haven't posted any doubts yet"); return; }
      wrap.innerHTML = doubts.map(d => `
        <div class="doubt-item" data-testid="doubt-item">
          <div class="top">
            <div><span class="badge purple">${esc(d.Subject||"General")}</span></div>
            <span class="badge ${String(d.Status).toLowerCase()==='resolved'?'green':String(d.Status).toLowerCase()==='replied'?'amber':'red'}">${esc(d.Status||"open")}</span>
          </div>
          <div class="q">${esc(d.Question)}</div>
          <small class="mute2 tiny">Posted ${esc(fmtDate(d.PostedOn))}</small>
          ${d.Reply ? `<div class="reply"><b style="color:#86efac">Teacher's reply:</b><br/>${esc(d.Reply)}<br/><small class="mute2 tiny">Replied ${esc(fmtDate(d.RepliedOn))}</small></div>`:""}
        </div>`).join("");
    } catch (e) { root.querySelector("#myDoubts").innerHTML = errorMsg(e.message); }
  }
}

/* --- PROGRESS / ANALYTICS (student) --- */
async function renderProgress(root){
  root.innerHTML = skeletonList(3);
  try {
    const { stats } = await api("getStudentStats", { rollNo: state.student.rollNo });
    if (!stats.testsTaken) {
      root.innerHTML = `
        <div class="section-header"><h2>Your Progress</h2></div>
        ${emptyMsg("Take a test to start seeing your progress here")}`;
      return;
    }
    root.innerHTML = `
      <div class="section-header"><h2>Your Progress</h2></div>
      <div class="stat-grid" style="margin-bottom:22px">
        ${statCard("📝","Tests taken", stats.testsTaken, "#60a5fa")}
        ${statCard("🎯","Average score", stats.avgPct + "%", "#a259ff")}
        ${statCard("🏅","Best score", stats.bestPct + "%", "#22c55e")}
        ${statCard("📊","Class rank", stats.rank ? ("#" + stats.rank + " / " + stats.totalInClass) : "—", "#fbbf24")}
      </div>
      <div class="glass" style="padding:18px;margin-bottom:20px">
        <h3 style="margin-bottom:12px">Score trend</h3>
        <canvas id="trendChart" height="140"></canvas>
      </div>
      ${stats.subjectBreakdown.length ? `
      <div class="glass" style="padding:18px">
        <h3 style="margin-bottom:12px">Subject-wise average</h3>
        <canvas id="subjectChart" height="140"></canvas>
      </div>` : ""}
    `;
    const trendCtx = root.querySelector("#trendChart");
    try { new Chart(trendCtx, {
      type: "line",
      data: {
        labels: stats.trend.map(t => fmtDay(t.date)),
        datasets: [{
          label: "Score %", data: stats.trend.map(t => t.pct),
          borderColor: "#a259ff", backgroundColor: "rgba(162,89,255,.15)",
          tension: 0.35, fill: true, pointBackgroundColor: "#a259ff"
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: "#8b8ba0" }, grid: { color: "rgba(255,255,255,.06)" } },
          x: { ticks: { color: "#8b8ba0" }, grid: { display: false } }
        }
      }
    });
     } catch(e){ console.warn("Chart failed", e); }
if (stats.subjectBreakdown.length) {
      new Chart(root.querySelector("#subjectChart"), {
        type: "bar",
        data: {
          labels: stats.subjectBreakdown.map(s => s.subject),
          datasets: [{ label: "Avg %", data: stats.subjectBreakdown.map(s => s.avgPct), backgroundColor: "#60a5fa", borderRadius: 6 }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, ticks: { color: "#8b8ba0" }, grid: { color: "rgba(255,255,255,.06)" } },
            x: { ticks: { color: "#8b8ba0" }, grid: { display: false } }
          }
        }
      });
    }
  } catch (e) { root.innerHTML = errorMsg(e.message); }
}

/* --- PROFILE (student): edit name/class/username, change password --- */
function renderStudentProfile(root){
  const s = state.student;
  root.innerHTML = `
    <div class="section-header"><h2>Your Profile</h2></div>

    <div class="glass" style="padding:20px;margin-bottom:20px">
      <h3 style="margin-bottom:4px">Profile details</h3>
      <p class="muted tiny" style="margin-bottom:16px">Roll number: <b>${esc(s.rollNo)}</b> (can't be changed)</p>
      <form id="profileForm" class="form-grid" autocomplete="off">
        <div class="row">
          <div class="field"><label class="label">Full name</label><input class="input" name="name" required value="${esc(s.name)}" data-testid="profile-name"/></div>
          <div class="field"><label class="label">Class</label>
            <select class="select" name="klass" data-testid="profile-class">
              ${["9","10","11","12","Competitive"].map(k => `<option ${s.klass===k?"selected":""}>${k}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field"><label class="label">Username</label><input class="input" name="username" required value="${esc(s.username)}" data-testid="profile-username"/></div>
        <div class="field" id="usernameChangeField" style="display:none">
          <label class="label">Current password <span class="muted tiny">(required to change username)</span></label>
          <input class="input" type="password" name="currentPasswordForUsername" data-testid="profile-username-pass"/>
        </div>
        <button type="submit" class="btn btn-primary" data-testid="btn-profile-save">Save changes</button>
      </form>
    </div>

    <div class="glass" style="padding:20px">
      <h3 style="margin-bottom:16px">Change password</h3>
      <form id="passwordForm" class="form-grid" autocomplete="off">
        <div class="field"><label class="label">Current password</label><input class="input" type="password" name="currentPassword" required data-testid="profile-current-password"/></div>
        <div class="field"><label class="label">New password</label><input class="input" type="password" name="newPassword" required minlength="4" data-testid="profile-new-password"/></div>
        <div class="field"><label class="label">Confirm new password</label><input class="input" type="password" name="confirmPassword" required minlength="4" data-testid="profile-confirm-password"/></div>
        <button type="submit" class="btn btn-primary" data-testid="btn-password-save">Update password</button>
      </form>
    </div>
  `;

  const usernameInput = root.querySelector('input[name="username"]');
  const usernameField = root.querySelector("#usernameChangeField");
  usernameInput.addEventListener("input", () => {
    usernameField.style.display = usernameInput.value.trim().toLowerCase() !== s.username.toLowerCase() ? "" : "none";
  });

  root.querySelector("#profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    const payload = { op: "update", name: f.get("name"), klass: f.get("klass"), username: f.get("username") };
    if (f.get("username").trim().toLowerCase() !== s.username.toLowerCase()) {
      payload.currentPassword = f.get("currentPasswordForUsername");
    }
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const res = await api("studentProfile", payload);
      state.student = res.student;
      store.set("student", res.student);
      toast("Profile updated", "success");
      render();
    } catch (err) {
      toast(err.message, "error");
      btn.disabled = false; btn.textContent = "Save changes";
    }
  };

  root.querySelector("#passwordForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (f.get("newPassword") !== f.get("confirmPassword")) {
      toast("New passwords don't match", "error"); return;
    }
    btn.disabled = true; btn.textContent = "Updating…";
    try {
      const res = await api("studentProfile", { op: "changePassword", currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") });
      state.student = res.student;
      store.set("student", res.student);
      e.target.reset();
      toast("Password updated", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Update password";
    }
  };
}

/* ==============================================================
   ADMIN PANEL
   ============================================================== */
function renderAdmin(root){
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-side">
        <div class="brand" style="margin-bottom:20px">
          <div class="brand-mark" style="background:linear-gradient(135deg,#fbbf24,#a259ff)">A</div>
          <div class="brand-name" style="font-size:1.05rem">Admin</div>
        </div>
        <div id="adminNav"></div>
        <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:12px">
          <div class="muted tiny" style="padding:0 14px 6px">${esc(state.admin.name)}</div>
          <button type="button" class="admin-nav-btn" id="adminLogout" data-testid="btn-admin-logout">${icon("logout")}<span>Log out</span></button>
        </div>
      </aside>
      <main class="admin-main" id="adminMain"></main>
    </div>`;
  const nav = root.querySelector("#adminNav");
  const items = [
    ["dashboard","Dashboard","📊"],
    ["tests","Tests","📝"],
    ["students","Students","👥"],
    ["feed","Feed","📢"],
    ["doubts","Doubts","💬"],
    ["results","Results","🏆"],
    ["profile","Profile","🔑"]
  ];
  nav.innerHTML = items.map(([k,l,i]) => `<button type="button" class="admin-nav-btn ${state.adminTab===k?'active':''}" data-tab="${k}" data-testid="admin-nav-${k}">${i} <span>${l}</span></button>`).join("");
  nav.querySelectorAll(".admin-nav-btn").forEach(b => b.onclick = () => { state.adminTab = b.dataset.tab; render(); });
if(root.querySelector("#adminLogout")) root.querySelector("#adminLogout").onclick = () => { store.del("admin"); state.admin = null; state.route = "auth"; render(); toast("Signed out"); };

  const main = root.querySelector("#adminMain");
  if (state.adminTab === "dashboard") return adminDashboard(main);
  if (state.adminTab === "tests")     return adminTests(main);
  if (state.adminTab === "students")  return adminStudents(main);
  if (state.adminTab === "feed")      return adminFeed(main);
  if (state.adminTab === "doubts")    return adminDoubts(main);
  if (state.adminTab === "results")   return adminResults(main);
  if (state.adminTab === "profile")   return adminProfile(main);
}

async function adminDashboard(root){
  root.innerHTML = `<h1>Dashboard</h1><p class="muted" style="margin-bottom:20px">Overview of platform activity</p><div class="stat-grid" id="statGrid">${skeletonList(4)}</div>`;
  try {
    const { stats } = await api("adminStats");
    root.querySelector("#statGrid").innerHTML = `
      ${statCard("👥", "Total students", stats.students, "#a259ff")}
      ${statCard("📝", "Total tests", stats.tests, "#22c55e")}
      ${statCard("📊", "Tests today", stats.testsToday, "#fbbf24")}
      ${statCard("📈", "Tests this week", stats.testsWeek, "#60a5fa")}
      ${statCard("🎯", "Avg score", stats.avg + "%", "#f472b6")}
      ${statCard("💬", "Active doubts", stats.activeDoubts, "#f87171")}
    `;

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-top:22px";
    grid.innerHTML = `
      <div class="glass" style="padding:18px">
        <h3 style="margin-bottom:12px">Attempts &amp; average score — last 14 days</h3>
        <canvas id="dailyTrendChart" height="110"></canvas>
      </div>
      <div class="glass" style="padding:18px">
        <h3 style="margin-bottom:12px">🏆 Top performers</h3>
        <div id="topPerformers"></div>
      </div>`;
    root.appendChild(grid);

    if (stats.dailyTrend && stats.dailyTrend.length) {
      new Chart(root.querySelector("#dailyTrendChart"), {
        data: {
          labels: stats.dailyTrend.map(d => fmtDay(d.date)),
          datasets: [
            { type: "bar", label: "Attempts", data: stats.dailyTrend.map(d => d.count), backgroundColor: "rgba(96,165,250,.35)", yAxisID: "y1", borderRadius: 4 },
            { type: "line", label: "Avg %", data: stats.dailyTrend.map(d => d.avgPct), borderColor: "#a259ff", backgroundColor: "#a259ff", tension: 0.35, yAxisID: "y", pointRadius: 3 }
          ]
        },
        options: {
          plugins: { legend: { labels: { color: "#c9c9d8" } } },
          scales: {
            y:  { position: "left", min: 0, max: 100, ticks: { color: "#8b8ba0" }, grid: { color: "rgba(255,255,255,.06)" } },
            y1: { position: "right", beginAtZero: true, ticks: { color: "#8b8ba0" }, grid: { display: false } },
            x:  { ticks: { color: "#8b8ba0" }, grid: { display: false } }
          }
        }
      });
    }

    const tp = root.querySelector("#topPerformers");
    tp.innerHTML = (stats.topPerformers && stats.topPerformers.length)
      ? stats.topPerformers.map((p, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;${i<stats.topPerformers.length-1?'border-bottom:1px solid var(--border)':''}">
          <div><b>${i+1}. ${esc(p.name)}</b><br/><small class="muted">Class ${esc(p.klass)} · ${p.attempts} test${p.attempts===1?'':'s'}</small></div>
          <span class="badge purple">${p.avgPct}%</span>
        </div>`).join("")
      : `<p class="muted">No results yet</p>`;
  } catch (e) { root.querySelector("#statGrid").innerHTML = errorMsg(e.message); }
}
function statCard(ic,label,val,color){
  return `<div class="stat-card" data-testid="stat-${esc(label).replace(/\s/g,'-').toLowerCase()}">
    <div class="icon" style="background:${color}22;color:${color}">${ic}</div>
    <b>${esc(val)}</b><small>${esc(label)}</small>
  </div>`;
}

/* --- ADMIN Tests --- */
async function adminTests(root){
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div><h1>Test Manager</h1><p class="muted">Create, edit, and manage tests</p></div>
      <button type="button" class="btn btn-primary" id="addTest" data-testid="btn-add-test">+ New Test</button>
    </div>
    <div id="testTableWrap">${skeletonList(3)}</div>`;
if(root.querySelector("#addTest")) root.querySelector("#addTest").onclick = () => testForm(null);
  await refresh();
  async function refresh(){
    try {
      const { tests = [] } = await api("crudTest", { op: "list" });
      const w = root.querySelector("#testTableWrap");
      if (!tests.length) { w.innerHTML = emptyMsg("No tests yet — click 'New Test' to create one"); return; }
      w.innerHTML = `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>Title</th><th>Subject</th><th>Date</th><th>Timer</th><th>Q's</th><th>Status</th><th></th></tr></thead>
        <tbody>${tests.map(t=>`
          <tr data-testid="test-row-${esc(t.testId)}">
            <td><b>${esc(t.title)}</b><br/><small class="mute2 tiny mono">${esc(t.testId)}</small></td>
            <td>${esc(t.subject)}</td><td>${esc(fmtDay(t.date))}</td>
            <td>${esc(t.timer)}m</td><td>${(t.questions||[]).length}</td>
            <td><span class="badge ${t.status==='active'?'green':'red'}">${esc(t.status)}</span></td>
            <td style="text-align:right">
              <button type="button" class="btn btn-ghost btn-sm edit-t" data-id="${esc(t.testId)}">Edit</button>
              <button type="button" class="btn btn-danger btn-sm del-t" data-id="${esc(t.testId)}">Delete</button>
            </td>
          </tr>`).join("")}</tbody></table></div>`;
      w.querySelectorAll(".edit-t").forEach(b => b.onclick = () => testForm(tests.find(t=>t.testId===b.dataset.id)));
      w.querySelectorAll(".del-t").forEach(b => b.onclick = async () => {
        if (!confirm("Delete this test?")) return;
        try { await api("crudTest", { op: "delete", testId: b.dataset.id }); toast("Deleted","success"); refresh(); }
        catch(e){ toast(e.message,"error"); }
      });
    } catch (e) { root.querySelector("#testTableWrap").innerHTML = errorMsg(e.message); }
  }

  function testForm(existing){
    const modal = openModal(existing?"Edit Test":"New Test", `
      <form id="tf" class="form-grid">
        <div class="row">
          <div class="field"><label class="label">Title</label><input class="input" name="title" required value="${esc(existing?.title||"")}" data-testid="test-title"/></div>
          <div class="field"><label class="label">Subject</label><input class="input" name="subject" required value="${esc(existing?.subject||"")}" data-testid="test-subject"/></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">Date (YYYY-MM-DD)</label><input class="input" name="date" placeholder="2026-02-15" value="${esc(existing?.date||"")}" data-testid="test-date"/></div>
          <div class="field"><label class="label">Timer (min)</label><input class="input" type="number" name="timer" min="1" value="${existing?.timer||15}" data-testid="test-timer"/></div>
        </div>
        <div class="field"><label class="label">Status</label>
          <select class="select" name="status" data-testid="test-status">
            <option value="active" ${existing?.status==="active"?"selected":""}>Active</option>
            <option value="inactive" ${existing?.status==="inactive"?"selected":""}>Inactive</option>
          </select>
        </div>
        <div class="field">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <label class="label">Questions <span id="qCount" class="muted tiny"></span></label>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn btn-ghost btn-sm" id="toggleJsonMode">⬡ Paste JSON</button>
            </div>
          </div>
          <div id="qBuilderWrap"></div>
          <div id="jsonModeWrap" class="hidden">
            <textarea class="textarea" id="jsonPasteArea" style="min-height:160px;font-size:.78rem" placeholder='Paste JSON array: [{"q":"...","options":["A","B","C","D"],"answer":0}]'></textarea>
            <button type="button" class="btn btn-ghost btn-sm" id="parseJsonBtn" style="margin-top:6px">⟳ Parse & Load into Builder</button>
          </div>
          <div style="margin-top:8px">
            <span class="muted tiny">Preview JSON: </span>
            <div class="json-preview" id="jsonPreview">[]</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" id="cx">Cancel</button>
          <button type="submit" class="btn btn-green" data-testid="btn-save-test">Save Test</button>
        </div>
      </form>`);
if(modal.querySelector("#cx")) modal.querySelector("#cx").onclick = () => modal.remove();

    // ── Question Builder logic ──
    let builderQs = JSON.parse(JSON.stringify(existing?.questions || []));
    // Ensure at least 1 blank question
    if (!builderQs.length) builderQs.push({ q: "", q_hi: "", options: ["","","",""], answer: 0 });

    function renderBuilder() {
      const wrap = modal.querySelector("#qBuilderWrap");
      wrap.innerHTML = "";
      builderQs.forEach((bq, qi) => {
        const block = document.createElement("div");
        block.className = "qb-wrap";
        block.innerHTML = `
          <div class="qb-head">
            <span>Q${qi+1}</span>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn btn-ghost btn-sm mv-q" data-qi="${qi}" data-dir="-1" ${qi===0?"disabled":""} title="Move up">↑</button>
              <button type="button" class="btn btn-ghost btn-sm mv-q" data-qi="${qi}" data-dir="1" ${qi===builderQs.length-1?"disabled":""} title="Move down">↓</button>
              <button type="button" class="btn btn-ghost btn-sm dup-q" data-qi="${qi}" title="Duplicate">⧉ Duplicate</button>
              <button type="button" class="btn btn-danger btn-sm rm-q" data-qi="${qi}">✕ Remove</button>
            </div>
          </div>
          <div class="qb-body">
            <div class="field"><label class="label" style="font-size:.7rem">Question (English)</label>
              <input class="input" placeholder="Type question…" value="${esc(bq.q||"")}" data-qi="${qi}" data-field="q"/>
            </div>
            <div class="field"><label class="label" style="font-size:.7rem">Question (Hindi — optional)</label>
              <input class="input" placeholder="हिंदी में प्रश्न…" value="${esc(bq.q_hi||"")}" data-qi="${qi}" data-field="q_hi"/>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span class="label" style="font-size:.7rem;margin:0">Options</span>
              <span class="muted tiny">(select ✓ for correct answer)</span>
            </div>
            ${(bq.options||["","","",""]).map((op,oi) => `
              <div class="qb-option-row">
                <div class="letter">${String.fromCharCode(65+oi)}</div>
                <input class="input" placeholder="Option ${String.fromCharCode(65+oi)}" value="${esc(op)}" data-qi="${qi}" data-oi="${oi}" data-field="option"/>
                <input type="radio" class="correct-radio" name="correct_${qi}" value="${oi}" ${Number(bq.answer)===oi?"checked":""} data-qi="${qi}" title="Mark as correct"/>
                ${Number(bq.answer)===oi?`<span class="qb-correct-label">✓ Correct</span>`:""}
              </div>`).join("")}
          </div>`;
        wrap.appendChild(block);
      });

      // Add-question button
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "qb-add-q";
      addBtn.textContent = "+ Add Question";
      addBtn.onclick = () => {
        builderQs.push({ q: "", q_hi: "", options: ["","","",""], answer: 0 });
        renderBuilder();
      };
      wrap.appendChild(addBtn);

      // Remove question
      wrap.querySelectorAll(".rm-q").forEach(b => b.onclick = () => {
        if (builderQs.length <= 1) { toast("Need at least 1 question","error"); return; }
        builderQs.splice(Number(b.dataset.qi), 1);
        renderBuilder();
      });

      // Duplicate question
      wrap.querySelectorAll(".dup-q").forEach(b => b.onclick = () => {
        const qi = Number(b.dataset.qi);
        const copy = JSON.parse(JSON.stringify(builderQs[qi]));
        builderQs.splice(qi + 1, 0, copy);
        renderBuilder();
        toast("Question duplicated", "success");
      });

      // Move question up/down
      wrap.querySelectorAll(".mv-q").forEach(b => b.onclick = () => {
        const qi = Number(b.dataset.qi), dir = Number(b.dataset.dir);
        const swapWith = qi + dir;
        if (swapWith < 0 || swapWith >= builderQs.length) return;
        [builderQs[qi], builderQs[swapWith]] = [builderQs[swapWith], builderQs[qi]];
        renderBuilder();
      });

      // Sync inputs → builderQs live
      wrap.querySelectorAll("input[data-field='q']").forEach(inp => inp.oninput = () => {
        builderQs[Number(inp.dataset.qi)].q = inp.value; updatePreview();
      });
      wrap.querySelectorAll("input[data-field='q_hi']").forEach(inp => inp.oninput = () => {
        builderQs[Number(inp.dataset.qi)].q_hi = inp.value; updatePreview();
      });
      wrap.querySelectorAll("input[data-field='option']").forEach(inp => inp.oninput = () => {
        builderQs[Number(inp.dataset.qi)].options[Number(inp.dataset.oi)] = inp.value; updatePreview();
      });
      wrap.querySelectorAll("input.correct-radio").forEach(r => r.onchange = () => {
        builderQs[Number(r.dataset.qi)].answer = Number(r.value); renderBuilder();
      });
      updatePreview();
    }

    function updatePreview() {
      const prev = modal.querySelector("#jsonPreview");
      if (prev) prev.textContent = JSON.stringify(builderQs, null, 2);
      const cnt = modal.querySelector("#qCount");
      if (cnt) cnt.textContent = `(${builderQs.length})`;
    }

    renderBuilder();

    // Toggle JSON paste mode
if(modal.querySelector("#toggleJsonMode")) modal.querySelector("#toggleJsonMode").onclick = () => {
      const jw = modal.querySelector("#jsonModeWrap");
      jw.classList.toggle("hidden");
    };
if(modal.querySelector("#parseJsonBtn")) modal.querySelector("#parseJsonBtn").onclick = () => {
      const raw = modal.querySelector("#jsonPasteArea").value.trim();
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
        builderQs = parsed.map(q => ({
          q: q.q || q.text || q.question || "",
          q_hi: q.q_hi || "",
          options: q.options || q.choices || ["","","",""],
          options_hi: q.options_hi || [],
          answer: q.answer !== undefined ? Number(q.answer) : 0
        }));
        modal.querySelector("#jsonModeWrap").classList.add("hidden");
        renderBuilder();
        toast("Loaded " + builderQs.length + " questions from JSON", "success");
      } catch(err) { toast("Invalid JSON: " + err.message, "error"); }
    };

    modal.querySelector("#tf").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const qs = builderQs;
      if (!qs.length) { toast("At least one question is required","error"); return; }
      const badQ = qs.findIndex(q => !q.q.trim() || !q.options.some(o => o.trim()) || q.answer === undefined);
      if (badQ >= 0) { toast(`Question ${badQ+1}: fill in the question text and at least one option`,"error"); return; }
      const payload = { title: f.get("title"), subject: f.get("subject"), date: f.get("date"), timer: Number(f.get("timer")), status: f.get("status"), questions: qs };
      try {
        if (existing) await api("crudTest", Object.assign({ op:"update", testId: existing.testId }, payload));
        else await api("crudTest", Object.assign({ op:"create" }, payload));
        toast("Saved","success"); modal.remove(); refresh();
      } catch (err) { toast(err.message,"error"); }
    };
  }
}

/* --- ADMIN Students --- */
async function adminStudents(root){
  root.innerHTML = `<h1>Students</h1><p class="muted" style="margin-bottom:16px">All registered students</p>
    <div class="toolbar">
      <input class="input" id="q" placeholder="Search name / username / roll…" data-testid="student-search"/>
      <select class="select" id="fc" data-testid="student-class-filter"><option value="">All classes</option><option>9</option><option>10</option><option>11</option><option>12</option><option>Competitive</option></select>
    </div>
    <div id="studWrap">${skeletonList(3)}</div>`;
  let all = [];
  async function load(){
    try { const r = await api("crudStudent", { op:"list" }); all = r.students || []; draw(); }
    catch(e){ root.querySelector("#studWrap").innerHTML = errorMsg(e.message); }
  }
  function draw(){
    const q = root.querySelector("#q").value.toLowerCase();
    const c = root.querySelector("#fc").value;
    const list = all.filter(s => (!q || (s.name+s.username+s.rollNo).toLowerCase().includes(q)) && (!c || String(s.klass)===c));
    root.querySelector("#studWrap").innerHTML = list.length ? `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Roll</th><th>Name</th><th>Username</th><th>Class</th><th>Registered</th><th></th></tr></thead>
      <tbody>${list.map(s=>`<tr>
        <td class="mono">${esc(s.rollNo)}</td><td><b>${esc(s.name)}</b></td>
        <td>${esc(s.username)}</td><td>${esc(s.klass)}</td><td>${esc(fmtDate(s.registeredOn))}</td>
        <td style="text-align:right"><button type="button" class="btn btn-ghost btn-sm rp" data-r="${esc(s.rollNo)}">Reset pass</button></td>
      </tr>`).join("")}</tbody></table></div>` : emptyMsg("No students match");
    root.querySelectorAll(".rp").forEach(b => b.onclick = async () => {
      const np = prompt("New password:", "changeme123"); if (!np) return;
      try { await api("crudStudent", { op:"resetPassword", rollNo: b.dataset.r, newPassword: np }); toast("Password reset","success"); }
      catch(e){ toast(e.message,"error"); }
    });
  }
  root.querySelector("#q").oninput = draw;
  root.querySelector("#fc").onchange = draw;
  load();
}

/* --- ADMIN Feed --- */
async function adminFeed(root){
  root.innerHTML = `<h1>Feed Manager</h1><p class="muted" style="margin-bottom:16px">Announcements, classes, PDFs, banner</p>
    <div class="glass" style="padding:18px;margin-bottom:22px">
      <h3 style="margin-bottom:12px">Add Item</h3>
      <form id="ff" class="form-grid">
        <div class="row">
          <div class="field"><label class="label">Type</label>
            <select class="select" name="type" data-testid="feed-type"><option value="announcement">Announcement</option><option value="class">YouTube class</option><option value="pdf">PDF</option></select>
          </div>
          <div class="field"><label class="label">Title</label><input class="input" name="title" required data-testid="feed-title"/></div>
        </div>
        <div class="field"><label class="label">URL (YouTube / PDF link)</label><input class="input" name="url" data-testid="feed-url"/></div>
        <div class="field"><label class="label">Description</label><input class="input" name="description" data-testid="feed-desc"/></div>
        <button class="btn btn-primary" type="submit" data-testid="btn-add-feed">Post</button>
      </form>
    </div>

    <div class="glass" style="padding:18px;margin-bottom:22px">
      <h3 style="margin-bottom:12px">Home Banner &amp; Announcement</h3>
      <div class="form-grid">
        <div class="field"><label class="label">Banner Image URL</label>
          <div style="display:flex;gap:8px"><input class="input" id="banner" data-testid="banner-url"/><button type="button" class="btn btn-green btn-sm" id="saveBanner">Save</button></div>
        </div>
        <div class="field"><label class="label">Announcement (top of home)</label>
          <div style="display:flex;gap:8px"><input class="input" id="ann" data-testid="ann-text"/><button type="button" class="btn btn-green btn-sm" id="saveAnn">Save</button></div>
        </div>
      </div>
    </div>

    <h3 style="margin-bottom:12px">Current items</h3>
    <div id="feedList">${skeletonList(3)}</div>`;
  root.querySelector("#ff").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api("crudFeed", { op:"create", type: f.get("type"), title: f.get("title"), url: f.get("url"), description: f.get("description") });
      toast("Posted","success"); e.target.reset(); load();
    } catch(err){ toast(err.message,"error"); }
  };
if(root.querySelector("#saveBanner")) root.querySelector("#saveBanner").onclick = async () => {
    try { await api("crudFeed", { op:"setBanner", bannerURL: root.querySelector("#banner").value }); toast("Banner updated","success"); } catch(e){ toast(e.message,"error"); }
  };
if(root.querySelector("#saveAnn")) root.querySelector("#saveAnn").onclick = async () => {
    try { await api("crudFeed", { op:"setAnnouncement", announcement: root.querySelector("#ann").value }); toast("Announcement updated","success"); } catch(e){ toast(e.message,"error"); }
  };
  async function load(){
    try {
      const { feed = [] } = await api("crudFeed", { op:"list" });
      const w = root.querySelector("#feedList");
      w.innerHTML = feed.length ? feed.map(f => `
        <div class="test-row">
          <div class="meta"><b>${esc(f.Title||"Untitled")}</b><small>${esc(f.Type)} · ${esc(fmtDate(f.PostedOn))} · ${esc(f.Description||"")}</small></div>
          <button type="button" class="btn btn-danger btn-sm delF" data-t="${esc(f.Title||"")}" data-p="${esc(f.PostedOn||"")}">Delete</button>
        </div>`).join("") : emptyMsg("No feed items yet");
      w.querySelectorAll(".delF").forEach(b => b.onclick = async () => {
        if (!confirm("Delete this item?")) return;
        try { await api("crudFeed", { op:"delete", title: b.dataset.t, postedOn: b.dataset.p }); toast("Deleted","success"); load(); } catch(e){ toast(e.message,"error"); }
      });
    } catch(e){ root.querySelector("#feedList").innerHTML = errorMsg(e.message); }
  }
  load();
}

/* --- ADMIN Doubts --- */
async function adminDoubts(root){
  root.innerHTML = `<h1>Doubt Center</h1><p class="muted" style="margin-bottom:16px">Reply to student doubts</p>
    <div class="toolbar">
      <select class="select" id="fs" data-testid="doubts-filter"><option value="">All statuses</option><option value="open">Open</option><option value="replied">Replied</option><option value="resolved">Resolved</option></select>
    </div>
    <div id="dList">${skeletonList(3)}</div>`;
  let all = [];
  async function load(){
    try { const r = await api("crudDoubt", { op:"list" }); all = r.doubts || []; draw(); }
    catch(e){ root.querySelector("#dList").innerHTML = errorMsg(e.message); }
  }
  function draw(){
    const st = root.querySelector("#fs").value;
    const list = all.filter(d => !st || String(d.Status).toLowerCase() === st);
    const w = root.querySelector("#dList");
    if (!list.length) { w.innerHTML = emptyMsg("No doubts"); return; }
    w.innerHTML = list.map(d => `
      <div class="doubt-item" data-testid="admin-doubt">
        <div class="top">
          <div><span class="badge purple">${esc(d.Subject||"General")}</span> · <b>${esc(d.Name)}</b> <small class="mute2 tiny">(${esc(d.RollNo)})</small></div>
          <span class="badge ${String(d.Status).toLowerCase()==='resolved'?'green':String(d.Status).toLowerCase()==='replied'?'amber':'red'}">${esc(d.Status)}</span>
        </div>
        <div class="q">${esc(d.Question)}</div>
        <small class="mute2 tiny">Posted ${esc(fmtDate(d.PostedOn))}</small>
        ${d.Reply?`<div class="reply">${esc(d.Reply)}<br/><small class="mute2 tiny">Replied ${esc(fmtDate(d.RepliedOn))}</small></div>`:""}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <input class="input rp" placeholder="Write a reply…" value="${esc(d.Reply||"")}" style="flex:1;min-width:200px" data-testid="admin-reply-input"/>
          <button type="button" class="btn btn-primary btn-sm sr" data-id="${esc(d.DoubtID)}" data-testid="btn-send-reply">Reply</button>
          ${String(d.Status).toLowerCase()!=='resolved'?`<button type="button" class="btn btn-green btn-sm mr" data-id="${esc(d.DoubtID)}">Mark resolved</button>`:""}
        </div>
      </div>`).join("");
    w.querySelectorAll(".sr").forEach(b => b.onclick = async () => {
      const txt = b.parentElement.querySelector(".rp").value;
      try { await api("crudDoubt", { op:"reply", doubtId: b.dataset.id, reply: txt, status: "replied" }); toast("Reply sent","success"); load(); }
      catch(e){ toast(e.message,"error"); }
    });
    w.querySelectorAll(".mr").forEach(b => b.onclick = async () => {
      try { await api("crudDoubt", { op:"resolve", doubtId: b.dataset.id }); toast("Marked resolved","success"); load(); }
      catch(e){ toast(e.message,"error"); }
    });
  }
  root.querySelector("#fs").onchange = draw;
  load();
}

/* --- ADMIN Results --- */
async function adminResults(root){
  root.innerHTML = `<h1>Results</h1><p class="muted" style="margin-bottom:16px">Filter and export</p>
    <div class="toolbar">
      <input class="input" id="ftest" placeholder="Filter by TestID…" data-testid="filter-test"/>
      <select class="select" id="fclass" data-testid="filter-class"><option value="">All classes</option><option>9</option><option>10</option><option>11</option><option>12</option><option>Competitive</option></select>
      <input class="input" id="froll" placeholder="Filter by RollNo…" data-testid="filter-roll"/>
      <button type="button" class="btn btn-primary btn-sm" id="apply">Apply</button>
      <div class="spacer"></div>
      <button type="button" class="btn btn-green btn-sm" id="csv" data-testid="btn-export-csv">Export CSV</button>
    </div>
    <div id="resWrap">${skeletonList(3)}</div>`;
  let rows = [];
  async function load(){
    const testId = root.querySelector("#ftest").value.trim();
    const klass  = root.querySelector("#fclass").value;
    const rollNo = root.querySelector("#froll").value.trim();
    try {
      const r = await api("exportResults", Object.assign({}, testId?{testId}:{}, klass?{klass}:{}, rollNo?{rollNo}:{}));
      rows = r.results || [];
      root.querySelector("#resWrap").innerHTML = rows.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>S.No</th><th>Date</th><th>Name</th><th>Roll</th><th>Class</th><th>Test</th><th>Score</th><th>%</th><th>Grade</th><th>Time</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${esc(r["S.No"])}</td><td>${esc(r.Date)}</td><td><b>${esc(r.Name)}</b></td>
          <td class="mono">${esc(r.RollNo)}</td><td>${esc(r.Class)}</td><td>${esc(r.Title)}</td>
          <td>${esc(r.Score)}/${esc(r.Total)}</td><td><b>${esc(r["%"])}%</b></td>
          <td><span class="badge">${esc(r.Grade)}</span></td><td>${esc(r.TimeFmt)}</td>
        </tr>`).join("")}</tbody></table></div>` : emptyMsg("No results found");
    } catch(e){ root.querySelector("#resWrap").innerHTML = errorMsg(e.message); }
  }
if(root.querySelector("#apply")) root.querySelector("#apply").onclick = load;
if(root.querySelector("#csv")) root.querySelector("#csv").onclick = () => {
    if (!rows.length) return toast("Nothing to export","error");
    const headers = ["S.No","Date","Name","RollNo","Class","TestID","Title","Subject","Score","Total","%","Grade","TimeSec","TimeFmt","SubmittedOn"];
    const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => `"${String(r[h]==null?"":r[h]).replace(/"/g,'""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "chemveda-results.csv"; a.click();
    toast("Downloaded","success");
  };
  load();
}

/* --- ADMIN PROFILE: edit name/username, change password --- */
async function adminProfile(root){
  const a = state.admin;
  root.innerHTML = `
    <h1>Profile</h1><p class="muted" style="margin-bottom:20px">Manage your admin account</p>

    <div class="glass" style="padding:20px;margin-bottom:20px;max-width:520px">
      <h3 style="margin-bottom:16px">Account details</h3>
      <form id="adminProfileForm" class="form-grid" autocomplete="off">
        <div class="field"><label class="label">Name</label><input class="input" name="name" required value="${esc(a.name)}" data-testid="admin-profile-name"/></div>
        <div class="field"><label class="label">Username</label><input class="input" name="username" required value="${esc(a.username)}" data-testid="admin-profile-username"/></div>
        <div class="field" id="adminUsernameChangeField" style="display:none">
          <label class="label">Current password <span class="muted tiny">(required to change username)</span></label>
          <input class="input" type="password" name="currentPasswordForUsername" data-testid="admin-profile-username-pass"/>
        </div>
        <button type="submit" class="btn btn-primary" data-testid="btn-admin-profile-save">Save changes</button>
      </form>
    </div>

    <div class="glass" style="padding:20px;max-width:520px">
      <h3 style="margin-bottom:16px">Change password</h3>
      <form id="adminPasswordForm" class="form-grid" autocomplete="off">
        <div class="field"><label class="label">Current password</label><input class="input" type="password" name="currentPassword" required data-testid="admin-current-password"/></div>
        <div class="field"><label class="label">New password</label><input class="input" type="password" name="newPassword" required minlength="4" data-testid="admin-new-password"/></div>
        <div class="field"><label class="label">Confirm new password</label><input class="input" type="password" name="confirmPassword" required minlength="4" data-testid="admin-confirm-password"/></div>
        <button type="submit" class="btn btn-primary" data-testid="btn-admin-password-save">Update password</button>
      </form>
    </div>
  `;

  const usernameInput = root.querySelector('input[name="username"]');
  const usernameField = root.querySelector("#adminUsernameChangeField");
  usernameInput.addEventListener("input", () => {
    usernameField.style.display = usernameInput.value.trim().toLowerCase() !== a.username.toLowerCase() ? "" : "none";
  });

  root.querySelector("#adminProfileForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    const payload = { op: "update", name: f.get("name"), username: f.get("username") };
    if (f.get("username").trim().toLowerCase() !== a.username.toLowerCase()) {
      payload.currentPassword = f.get("currentPasswordForUsername");
    }
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const res = await api("adminProfile", payload);
      state.admin = res.admin;
      store.set("admin", res.admin);
      toast("Profile updated", "success");
      render();
    } catch (err) {
      toast(err.message, "error");
      btn.disabled = false; btn.textContent = "Save changes";
    }
  };

  root.querySelector("#adminPasswordForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector("button[type=submit]");
    if (f.get("newPassword") !== f.get("confirmPassword")) {
      toast("New passwords don't match", "error"); return;
    }
    btn.disabled = true; btn.textContent = "Updating…";
    try {
      const res = await api("adminProfile", { op: "changePassword", currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") });
      state.admin = res.admin;
      store.set("admin", res.admin);
      e.target.reset();
      toast("Password updated", "success");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Update password";
    }
  };
}

/* ==============================================================
   Modal & Loading
   ============================================================== */
function openModal(title, bodyHtml){
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal glass"><div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="btn-icon" id="mcx" data-testid="modal-close">✕</button></div><div id="mbody">${bodyHtml}</div></div>`;
  document.body.appendChild(back);
if(back.querySelector("#mcx")) back.querySelector("#mcx").onclick = () => back.remove();
  back.onclick = (e) => { if (e.target === back) back.remove(); };
  return back;
}
function showLoading(msg){
  hideLoading();
  const el = document.createElement("div");
  el.className = "loading-full";
  el.id = "loadingFull";
  el.innerHTML = `<div style="text-align:center"><div id="lotL" style="width:180px;height:180px"></div><p class="muted" style="margin-top:-16px">${esc(msg||"Loading…")}</p></div>`;
  document.body.appendChild(el);
  lottieMount(el.querySelector("#lotL"), LOTTIE.loading);
}
function hideLoading(){ const el = document.getElementById("loadingFull"); if (el) el.remove(); }

/* ==============================================================
   Keyboard shortcut for admin (Ctrl+Shift+A)
   ============================================================== */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    if (state.route === "auth") { state.route = "admin-auth"; render(); }
  }
});

/* ==============================================================
   Boot
   ============================================================== */
(function boot(){
  const s = store.get("student");
  const a = store.get("admin");
  if (location.hash === "#/admin" || location.hash === "#admin") {
    if (a) { state.admin = a; state.route = "admin"; }
    else state.route = "admin-auth";
  } else if (s) {
    state.student = s;
    state.route = "app";
    let pendingTab = null;
    try { pendingTab = sessionStorage.getItem("pendingTab"); sessionStorage.removeItem("pendingTab"); } catch(_){}
    state.tab = pendingTab || store.get("activeTab") || "home";
    if (pendingTab) store.set("activeTab", pendingTab);
    // Restore in-progress quiz from localStorage
    const resumeKeys = Object.keys(localStorage).filter(k => k.startsWith("resume_"));
    if (resumeKeys.length) {
      // find most recently started quiz
      let latest = null;
      resumeKeys.forEach(k => {
        const q = store.get(k);
        if (q && q.test && (!latest || q.startedAt > latest.startedAt)) latest = q;
      });
      if (latest) {
        // Recalculate remaining time — if expired, don't restore
        const elapsed = Math.floor((Date.now() - latest.startedAt) / 1000);
        const timerSec = (latest.test.timer || 15) * 60;
        if (elapsed < timerSec) {
          state.quiz = Object.assign({ timerSec }, latest);
        } else {
          // Timer expired while away — auto-submit silently on next render
          store.del("resume_" + latest.test.testId);
        }
      }
    }
  } else {
    state.route = "auth";
    let modePref = null;
    try { modePref = sessionStorage.getItem("authModePref"); sessionStorage.removeItem("authModePref"); } catch(_){}
    if (modePref === "login" || modePref === "register") state.authMode = modePref;
  }
  render();
})();
