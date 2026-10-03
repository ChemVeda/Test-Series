/* ==============================================================
   ChemVeda Pro — Homepage interactions
   1) goToApp()            — send a visitor to app.html, remembering
                              which tab they wanted (login happens there)
   2) initViewerStats()    — live/total counter via the same Apps
                              Script backend app.html already uses
   3) initChemAnimation()  — the animated atoms/molecules canvas
   ============================================================== */

/* Must match the API_URL constant near the top of app.html's <script>.
   If you ever redeploy the Google Apps Script web app, update BOTH places. */
const API_URL = "https://script.google.com/macros/s/AKfycbxj8wGY6s-X6UTlCpcASQ0wVGsEHRRVSncI7TMWVUsOzY0nLLFPfeCwYoiYZ7YLs_wcrg/exec";

/* --------------- Navigation to the app --------------- */
function goToApp(tab, mode) {
  if (tab) sessionStorage.setItem("pendingTab", tab);
  else sessionStorage.removeItem("pendingTab");
  if (mode) sessionStorage.setItem("authModePref", mode);
  window.location.href = "app.html";
}
document.querySelectorAll("[data-go]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    goToApp(el.dataset.go || null, el.dataset.mode || null);
  });
});

/* --------------- Mobile nav toggle --------------- */
const navToggle = document.getElementById("navToggle");
const mobileNav = document.getElementById("mobileNav");
if (navToggle && mobileNav) {
  navToggle.addEventListener("click", () => mobileNav.classList.toggle("open"));
  mobileNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => mobileNav.classList.remove("open")));
}

/* ==============================================================
   Viewer counter — real numbers only.
   We ask the backend how many people are here right now and how
   many unique visitors there have been in total. If the backend
   doesn't support this yet (see /apps-script/visitor-tracking.gs),
   we simply hide the row instead of making up a number.
   ============================================================== */
function getVisitorId() {
  let id = localStorage.getItem("cv_visitor_id");
  if (!id) {
    id = "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("cv_visitor_id", id);
  }
  return id;
}

async function trackVisit() {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "trackVisit", visitorId: getVisitorId() })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "stats unavailable");
  return json;
}

function initViewerStats() {
  const row = document.getElementById("statRow");
  const liveEl = document.getElementById("liveCount");
  const totalEl = document.getElementById("totalCount");
  if (!row) return;

  const apply = (json) => {
    if (typeof json.live === "number") liveEl.textContent = json.live.toLocaleString();
    if (typeof json.total === "number") totalEl.textContent = json.total.toLocaleString();
    row.classList.add("ready");
  };

  trackVisit().then(apply).catch(() => { /* backend not wired up yet — stay hidden, no fake numbers */ });

  // Heartbeat every 60s while the tab is visible keeps the "live" count accurate
  // (backend treats a visitor as live for 150s).
  setInterval(() => {
    if (document.visibilityState === "visible") trackVisit().then(apply).catch(() => {});
  }, 60000);
}

/* ==============================================================
   Chemistry canvas — floating atoms + drifting molecules that
   react gently to the cursor. Purely decorative, so it degrades
   to a single static frame under prefers-reduced-motion.
   ============================================================== */
function initChemAnimation(canvasId, wrapId) {
  const canvas = document.getElementById(canvasId);
  const wrap = document.getElementById(wrapId);
  if (!canvas || !wrap) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ELEMENTS = {
    H:  { r: 6,  color: "#e9e6f2" },
    C:  { r: 10, color: "#9b8cc9" },
    N:  { r: 9,  color: "#60a5fa" },
    O:  { r: 9,  color: "#f87171" },
    Cl: { r: 11, color: "#4ade80" }
  };

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let atoms = [];
  let clusters = [];
  const mouse = { x: -9999, y: -9999, active: false };

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnAtoms() {
    const density = W < 700 ? 60 : 42; // px per atom target — fewer, bigger gaps on small screens
    const count = Math.max(10, Math.min(26, Math.round((W * H) / (density * 9000))));
    const types = Object.keys(ELEMENTS);
    atoms = Array.from({ length: count }, () => {
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        type,
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.18, 0.18), vy: rand(-0.18, 0.18),
        phase: rand(0, Math.PI * 2)
      };
    });
  }

  function makeCluster(kind, x, y) {
    return { kind, x, y, vx: rand(-0.08, 0.08), vy: rand(-0.05, 0.05), rot: rand(0, Math.PI * 2), rotSpeed: rand(-0.0025, 0.0025) };
  }

  function spawnClusters() {
    const kinds = ["water", "methane", "co2", "benzene"];
    const n = W < 700 ? 2 : 4;
    clusters = Array.from({ length: n }, (_, i) => makeCluster(kinds[i % kinds.length], rand(W * 0.1, W * 0.9), rand(H * 0.15, H * 0.85)));
  }

  function drawAtom(x, y, type, t) {
    const el = ELEMENTS[type];
    // electron ring
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t);
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, el.r + 9, el.r + 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(el.r + 9, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // nucleus
    const grad = ctx.createRadialGradient(x - el.r * 0.3, y - el.r * 0.3, 1, x, y, el.r);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.25, el.color);
    grad.addColorStop(1, el.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, el.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function bondLine(x1, y1, x2, y2, alpha, double) {
    ctx.strokeStyle = `rgba(196,181,253,${alpha})`;
    ctx.lineWidth = 1.4;
    if (!double) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      return;
    }
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 3, ny = (dx / len) * 3;
    ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny); ctx.stroke();
  }

  function localPoint(cluster, dx, dy) {
    const c = Math.cos(cluster.rot), s = Math.sin(cluster.rot);
    return { x: cluster.x + dx * c - dy * s, y: cluster.y + dx * s + dy * c };
  }

  function drawCluster(cluster) {
    if (cluster.kind === "water") {
      const O = localPoint(cluster, 0, 0);
      const H1 = localPoint(cluster, -15, 12);
      const H2 = localPoint(cluster, 15, 12);
      bondLine(O.x, O.y, H1.x, H1.y, 0.35);
      bondLine(O.x, O.y, H2.x, H2.y, 0.35);
      drawAtom(H1.x, H1.y, "H", cluster.rot * 2);
      drawAtom(H2.x, H2.y, "H", cluster.rot * 2);
      drawAtom(O.x, O.y, "O", cluster.rot * 2);
    } else if (cluster.kind === "methane") {
      const C = localPoint(cluster, 0, 0);
      const pts = [0, 90, 180, 270].map((a) => localPoint(cluster, Math.cos(a * Math.PI / 180) * 22, Math.sin(a * Math.PI / 180) * 22));
      pts.forEach((p) => bondLine(C.x, C.y, p.x, p.y, 0.32));
      pts.forEach((p) => drawAtom(p.x, p.y, "H", cluster.rot * 2));
      drawAtom(C.x, C.y, "C", cluster.rot * 2);
    } else if (cluster.kind === "co2") {
      const C = localPoint(cluster, 0, 0);
      const O1 = localPoint(cluster, -28, 0);
      const O2 = localPoint(cluster, 28, 0);
      bondLine(C.x, C.y, O1.x, O1.y, 0.35, true);
      bondLine(C.x, C.y, O2.x, O2.y, 0.35, true);
      drawAtom(O1.x, O1.y, "O", cluster.rot * 2);
      drawAtom(O2.x, O2.y, "O", cluster.rot * 2);
      drawAtom(C.x, C.y, "C", cluster.rot * 2);
    } else if (cluster.kind === "benzene") {
      // skeletal hexagon, alternating double bonds — the familiar aromatic ring glyph
      const R = 30;
      const verts = Array.from({ length: 6 }, (_, i) => localPoint(cluster, Math.cos((i / 6) * Math.PI * 2) * R, Math.sin((i / 6) * Math.PI * 2) * R));
      for (let i = 0; i < 6; i++) {
        const a = verts[i], b = verts[(i + 1) % 6];
        bondLine(a.x, a.y, b.x, b.y, 0.4, i % 2 === 0);
      }
    }
  }

  function step(dt, t) {
    ctx.clearRect(0, 0, W, H);

    // free atoms
    atoms.forEach((a) => {
      if (!reduceMotion) {
        if (mouse.active) {
          const dx = a.x - mouse.x, dy = a.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const radius = 130;
          if (dist < radius && dist > 0.01) {
            const f = ((radius - dist) / radius) * 0.03;
            a.vx += (dx / dist) * f;
            a.vy += (dy / dist) * f;
          }
        }
        a.vx += rand(-0.006, 0.006);
        a.vy += rand(-0.006, 0.006);
        a.vx *= 0.985; a.vy *= 0.985;
        const speed = Math.hypot(a.vx, a.vy);
        const maxSpeed = 0.6;
        if (speed > maxSpeed) { a.vx = (a.vx / speed) * maxSpeed; a.vy = (a.vy / speed) * maxSpeed; }
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < -20) a.x = W + 20; if (a.x > W + 20) a.x = -20;
        if (a.y < -20) a.y = H + 20; if (a.y > H + 20) a.y = -20;
      }
    });

    // transient bonds between nearby free atoms
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const a = atoms[i], b = atoms[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) bondLine(a.x, a.y, b.x, b.y, (1 - d / 130) * 0.22);
      }
    }
    atoms.forEach((a) => drawAtom(a.x, a.y, a.type, t * 0.6 + a.phase));

    // molecule clusters drift + rotate slowly
    clusters.forEach((c) => {
      if (!reduceMotion) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.rotSpeed * dt;
        if (c.x < -50) c.x = W + 50; if (c.x > W + 50) c.x = -50;
        if (c.y < -50) c.y = H + 50; if (c.y > H + 50) c.y = -50;
      }
      drawCluster(c);
    });
  }

  resize();
  spawnAtoms();
  spawnClusters();
  window.addEventListener("resize", () => { resize(); spawnAtoms(); spawnClusters(); });

  wrap.addEventListener("mousemove", (e) => {
    const rect = wrap.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; mouse.active = true;
  });
  wrap.addEventListener("mouseleave", () => { mouse.active = false; });
  wrap.addEventListener("touchmove", (e) => {
    if (!e.touches[0]) return;
    const rect = wrap.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left; mouse.y = e.touches[0].clientY - rect.top; mouse.active = true;
  }, { passive: true });

  if (reduceMotion) { step(0, 0); return; }

  // Only animate while the hero is on screen and the tab is visible, and cap the
  // frame rate on small screens — this is what keeps phones from lagging.
  let last = performance.now();
  let running = false, onScreen = true;
  const minFrame = W < 700 ? 1000 / 30 : 0;
  function loop(now) {
    if (!running) return;
    if (minFrame && now - last < minFrame) { requestAnimationFrame(loop); return; }
    const dt = Math.min(now - last, 40) / 16.67; // normalize to ~60fps steps
    last = now;
    step(dt, now / 1000);
    requestAnimationFrame(loop);
  }
  function sync() {
    const should = onScreen && document.visibilityState === "visible";
    if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!should) running = false;
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; sync(); }).observe(wrap);
  }
  document.addEventListener("visibilitychange", sync);
  sync();
}

/* ==============================================================
   Public feed — Study Material, Announcements, Live & Upcoming
   Classes, shown right on the homepage with no login required.
   Same "getFeed" action app.html's Home tab uses; it's public
   on the backend (no token check), so we can call it directly.
   ============================================================== */
function pubEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function pubFmtDate(s) { if (!s) return ""; try { return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (_) { return ""; } }

function pubCard(f) {
  const type = String(f.Type || "").toLowerCase();
  const cls = type === "class" ? "yt" : type === "pdf" ? "pdf" : "ann";
  const ic = type === "class" ? "▶" : type === "pdf" ? "📄" : "📢";
  const url = f.URL || "";
  const tag = url ? "a" : "div";
  const hrefAttrs = url ? `href="${pubEsc(url)}" target="_blank" rel="noopener"` : "";
  return `<${tag} class="pub-item" ${hrefAttrs}>
    <div class="pub-icon ${cls}">${ic}</div>
    <b>${pubEsc(f.Title || "Untitled")}</b>
    ${f.Description ? `<small>${pubEsc(f.Description)}</small>` : ""}
    <span class="pub-date">${pubEsc(pubFmtDate(f.PostedOn))}</span>
  </${tag}>`;
}
function pubEmpty(msg) { return `<div class="pub-empty">${pubEsc(msg)}</div>`; }

function renderPublicFeed(json) {
  const materialGrid = document.getElementById("pubMaterialGrid");
  const annGrid = document.getElementById("pubAnnGrid");
  const classGrid = document.getElementById("pubClassGrid");
  const feed = json.feed || [];
  const config = json.config || {};

  const material = feed.filter((f) => String(f.Type).toLowerCase() === "pdf");
  const ann = feed.filter((f) => String(f.Type).toLowerCase() === "announcement");
  const classes = feed.filter((f) => String(f.Type).toLowerCase() === "class");

  materialGrid.innerHTML = material.length ? material.map(pubCard).join("") : pubEmpty("No study material posted yet.");
  annGrid.innerHTML = ann.length ? ann.map(pubCard).join("") : pubEmpty("No announcements right now.");
  classGrid.innerHTML = classes.length ? classes.map(pubCard).join("") : pubEmpty("No classes scheduled yet.");

  if (config.announcement) {
    const bar = document.getElementById("announceBar");
    const text = document.getElementById("announceText");
    const dismissedText = sessionStorage.getItem("cv_dismissed_announcement");
    if (bar && text && dismissedText !== config.announcement) {
      text.textContent = config.announcement;
      bar.style.display = "block";
      document.getElementById("announceClose").onclick = () => {
        sessionStorage.setItem("cv_dismissed_announcement", config.announcement);
        bar.style.display = "none";
      };
    }
  }
}

/* Stale-while-revalidate: show the last feed we saw instantly (from this
   browser's storage), then refresh from the backend and re-render. */
async function initPublicFeed() {
  const materialGrid = document.getElementById("pubMaterialGrid");
  if (!materialGrid) return;
  const KEY = "cv_feed_cache";
  let showedCache = false;
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) || "null");
    if (cached && cached.feed) { renderPublicFeed(cached); showedCache = true; }
  } catch (_) {}

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getFeed" })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Couldn't load feed");
    renderPublicFeed(json);
    try { localStorage.setItem(KEY, JSON.stringify({ feed: json.feed || [], config: json.config || {} })); } catch (_) {}
  } catch (e) {
    if (showedCache) return;
    const fail = pubEmpty("Couldn't load right now — please refresh.");
    document.getElementById("pubMaterialGrid").innerHTML = fail;
    document.getElementById("pubAnnGrid").innerHTML = fail;
    document.getElementById("pubClassGrid").innerHTML = fail;
  }
}

/* --------------- Support: forgot-password links get the username filled in --------------- */
function initSupport() {
  const input = document.getElementById("spUser");
  const wa = document.getElementById("spWa");
  const mail = document.getElementById("spMail");
  if (!input || !wa || !mail) return;
  const WA_NUM = "917277971329", EMAIL = "webjobdk@gmail.com";
  const update = () => {
    const msg = "Hi ChemVeda Pro support, I forgot my password and need a reset.\nUsername: " + (input.value.trim() || "(not entered)");
    wa.href = "https://wa.me/" + WA_NUM + "?text=" + encodeURIComponent(msg);
    mail.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Password reset request - ChemVeda Pro") + "&body=" + encodeURIComponent(msg);
  };
  input.addEventListener("input", update);
  update();
}

/* --------------- Marquee: pause on hover --------------- */
function initMarquee() {
  const track = document.querySelector(".marquee-track");
  if (!track) return;
  const marquee = track.closest(".hero-marquee");
  if (marquee) {
    marquee.addEventListener("mouseenter", () => track.style.animationPlayState = "paused");
    marquee.addEventListener("mouseleave", () => track.style.animationPlayState = "running");
  }
}

/* --------------- Boot --------------- */
document.addEventListener("DOMContentLoaded", () => {
  initSupport();
  initMarquee();
  initPublicFeed();
  initChemAnimation("chemCanvas", "heroWrap");
  // Visitor counter is decorative — start it after the page has settled.
  setTimeout(initViewerStats, 2500);
});
