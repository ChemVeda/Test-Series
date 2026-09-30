/* ==============================================================
   ChemVeda Pro — Hybrid Fast v3 Homepage
   - No blocking API calls on first paint
   - CDN first: /data/feed.json
   - Background sync only
   - Super animations
   ============================================================== */

const API_URL = "https://script.google.com/macros/s/AKfycbwx9lBAIHYZzreNlfLMGMBi8jMYy-n00VWpkVi4v_kJ07a6p-62B9G8tb8w6X-pMJz_GQ/exec";
const CDN_FEED = "./data/feed.json";
const CACHE_KEY = "cv_feed_cache_v3";
const CACHE_TIME = 1000 * 60 * 5; // 5 min

/* --------------- Preloader --------------- */
function initPreloader() {
  const pre = document.getElementById("preloader");
  if (!pre) return;
  // Hide after 800ms or when page loaded
  const hide = () => {
    pre.classList.add("hidden");
    setTimeout(() => pre.remove(), 700);
  };
  if (document.readyState === "complete") setTimeout(hide, 500);
  else window.addEventListener("load", () => setTimeout(hide, 600));
  // Safety fallback
  setTimeout(hide, 2000);
}

/* --------------- Navigation --------------- */
function goToApp(tab, mode) {
  try {
    if (tab) sessionStorage.setItem("pendingTab", tab);
    else sessionStorage.removeItem("pendingTab");
    if (mode) sessionStorage.setItem("authModePref", mode);
    else sessionStorage.removeItem("authModePref");
  } catch (_) {}
  window.location.href = "app.html";
}

let _navInited = false;
function initNavigation() {
  if (_navInited) return; _navInited = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-go]");
    if (!el) return;
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    goToApp(el.dataset.go || null, el.dataset.mode || null);
  });
}

/* --------------- Mobile nav --------------- */
function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const mobile = document.getElementById("mobileNav");
  if (!toggle || !mobile) return;
  toggle.addEventListener("click", () => {
    const open = mobile.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  mobile.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mobile.classList.remove("open")));
}

/* --------------- Header scroll --------------- */
function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle("scrolled", window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* --------------- Particle Canvas (lightweight) --------------- */
function initParticleCanvas() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  let W, H, DPR, particles = [];
  const COUNT = 40;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function rand(a,b){ return a + Math.random()*(b-a); }
  function spawn() {
    particles = [];
    for (let i=0;i<COUNT;i++) {
      particles.push({
        x: rand(0,W), y: rand(0,H),
        vx: rand(-0.3,0.3), vy: rand(-0.3,0.3),
        r: rand(1,2.2),
        o: rand(0.15,0.45)
      });
    }
  }
  function tick() {
    ctx.clearRect(0,0,W,H);
    // draw connections
    for (let i=0;i<particles.length;i++) {
      for (let j=i+1;j<particles.length;j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.hypot(dx,dy);
        if (d < 140) {
          ctx.strokeStyle = `rgba(162,89,255,${0.12*(1-d/140)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.fillStyle = `rgba(233,230,242,${p.o})`;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  resize(); spawn(); tick();
  window.addEventListener("resize", () => { resize(); spawn(); }, { passive: true });
}

/* --------------- Chemistry Canvas - Bonding Animation --------------- */
function initChemAnimation(canvasId, wrapId) {
  const canvas = document.getElementById(canvasId);
  const wrap = document.getElementById(wrapId);
  if (!canvas || !wrap) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ELEMENTS = {
    H:  { r: 6,  color: "#e9e6f2", mass: 1 },
    C:  { r: 10, color: "#9b8cc9", mass: 2 },
    N:  { r: 9,  color: "#60a5fa", mass: 1.8 },
    O:  { r: 9,  color: "#f87171", mass: 1.8 },
    Cl: { r: 11, color: "#4ade80", mass: 2.2 }
  };
  const TYPES = Object.keys(ELEMENTS);

  let W=0,H=0,DPR=Math.min(devicePixelRatio||1,1.8);
  let atoms=[], mouse={x:-9999,y:-9999,active:false};
  let scrollVel=0, lastScrollY=window.scrollY;

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W*DPR; canvas.height = H*DPR;
    canvas.style.width = W+"px"; canvas.style.height = H+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function rand(a,b){return a+Math.random()*(b-a);}
  function spawn() {
    const count = W < 700 ? 22 : 36;
    atoms = [];
    for (let i=0;i<count;i++) {
      const type = TYPES[Math.floor(Math.random()*TYPES.length)];
      const e = ELEMENTS[type];
      atoms.push({
        type, ...e,
        x: rand(0,W), y: rand(0,H),
        vx: rand(-0.6,0.6), vy: rand(-0.6,0.6),
        ox: rand(0,Math.PI*2), // oscillation
      });
    }
  }

  // mouse
  wrap.addEventListener("mousemove", (e) => {
    const rect = wrap.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });
  wrap.addEventListener("mouseleave", () => mouse.active=false);

  // scroll velocity for reaction effect
  window.addEventListener("scroll", () => {
    const dy = window.scrollY - lastScrollY;
    scrollVel = dy * 0.06;
    lastScrollY = window.scrollY;
  }, { passive: true });

  function drawAtom(a) {
    // glow
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(a.x,a.y,a.r,0,Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // inner highlight
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(a.x - a.r*0.25, a.y - a.r*0.25, a.r*0.32, 0, Math.PI*2);
    ctx.fill();
  }

  function tick(t) {
    ctx.clearRect(0,0,W,H);
    const time = t*0.001;

    // bonds
    for (let i=0;i<atoms.length;i++) {
      for (let j=i+1;j<atoms.length;j++) {
        const a = atoms[i], b = atoms[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx,dy);
        const bondDist = 110 + Math.sin(time + i)*12;
        if (d < bondDist) {
          const alpha = (1 - d/bondDist) * 0.45;
          // double bond if both heavy
          const isDouble = (a.mass>1.5 && b.mass>1.5 && d < bondDist*0.6);
          ctx.strokeStyle = `rgba(200,180,255,${alpha})`;
          ctx.lineWidth = isDouble ? 2.2 : 1.2;
          ctx.beginPath();
          if (isDouble) {
            const nx = -dy/d*3, ny = dx/d*3;
            ctx.moveTo(a.x+nx, a.y+ny); ctx.lineTo(b.x+nx, b.y+ny);
            ctx.moveTo(a.x-nx, a.y-ny); ctx.lineTo(b.x-nx, b.y-ny);
          } else {
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          }
          ctx.stroke();
          // attraction
          const f = (bondDist - d) * 0.0004;
          a.vx -= dx*f; a.vy -= dy*f;
          b.vx += dx*f; b.vy += dy*f;
        }
      }
    }

    atoms.forEach((a,i) => {
      if (reduceMotion) {
        // static with gentle pulse
        drawAtom(a);
        return;
      }
      // mouse repulsion + scroll push
      if (mouse.active) {
        const dx = a.x - mouse.x, dy = a.y - mouse.y;
        const d = Math.hypot(dx,dy);
        if (d < 180) {
          const f = (180 - d)/180 * 0.8;
          a.vx += (dx/d)*f;
          a.vy += (dy/d)*f;
        }
      }
      // scroll velocity adds energy
      a.vy += scrollVel * 0.02;
      a.vx += Math.sin(time*0.4 + a.ox)*0.008;
      a.vy += Math.cos(time*0.3 + a.ox)*0.008;

      // friction
      a.vx *= 0.992; a.vy *= 0.992;
      a.x += a.vx; a.y += a.vy;

      // bounds bounce with soft edge
      if (a.x < a.r || a.x > W-a.r) a.vx *= -0.8;
      if (a.y < a.r || a.y > H-a.r) a.vy *= -0.8;
      a.x = Math.max(a.r, Math.min(W-a.r, a.x));
      a.y = Math.max(a.r, Math.min(H-a.r, a.y));

      drawAtom(a);
    });

    scrollVel *= 0.92;
    requestAnimationFrame(tick);
  }

  resize(); spawn();
  requestAnimationFrame(tick);
  window.addEventListener("resize", () => { resize(); spawn(); }, { passive: true });
}

/* --------------- Viewer stats — non-blocking, cached --------------- */
function getVisitorId() {
  try {
    let id = localStorage.getItem("cv_visitor_id");
    if (!id) {
      id = "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,10);
      localStorage.setItem("cv_visitor_id", id);
    }
    return id;
  } catch { return "anon_"+Math.random().toString(36).slice(2); }
}

async function trackVisit() {
  // Try beacon first (fast, non-blocking)
  try {
    const payload = JSON.stringify({ action: "trackVisit", visitorId: getVisitorId() });
    // Use keepalive
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload,
      keepalive: true
    }).then(r=>r.text()).then(t=>{
      try { return JSON.parse(t); } catch { return null; }
    });
  } catch {}
  // Stats are optional - we don't block UI
}

function initViewerStats() {
  const row = document.getElementById("statRow");
  const liveEl = document.getElementById("liveCount");
  const totalEl = document.getElementById("totalCount");
  if (!row) return;

  // Show from cache immediately
  try {
    const cached = JSON.parse(localStorage.getItem("cv_stats_cache")||"null");
    if (cached && Date.now() - cached.ts < 60000) {
      if (typeof cached.live === "number") liveEl.textContent = cached.live.toLocaleString();
      if (typeof cached.total === "number") totalEl.textContent = cached.total.toLocaleString();
      row.classList.add("ready");
    }
  } catch {}

  // Background update - never blocks hero
  setTimeout(async () => {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "trackVisit", visitorId: getVisitorId() })
      });
      const txt = await res.text();
      const json = JSON.parse(txt);
      if (json.ok) {
        if (typeof json.live === "number") liveEl.textContent = json.live.toLocaleString();
        if (typeof json.total === "number") totalEl.textContent = json.total.toLocaleString();
        row.classList.add("ready");
        localStorage.setItem("cv_stats_cache", JSON.stringify({ live: json.live, total: json.total, ts: Date.now() }));
      }
    } catch {
      // keep cached or hide
      row.classList.add("ready");
    }
  }, 1200);

  // Heartbeat less frequent
  setInterval(() => {
    if (document.visibilityState === "visible") trackVisit().catch(()=>{});
  }, 45000);
}

/* --------------- Public Feed — CDN first --------------- */
function pubEsc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function pubFmtDate(s){ if(!s) return ""; try { return new Date(s).toLocaleDateString(undefined,{month:"short",day:"numeric"}); } catch{ return ""; } }
function isSafeHttpUrl(u){
  if(!u) return false;
  try { const p = new URL(String(u).trim(), location.origin); return p.protocol==="https:"||p.protocol==="http:"; } catch { return false; }
}
function pubCard(f){
  const type = String(f.Type||"").toLowerCase();
  const cls = type==="class" ? "yt" : type==="pdf" ? "pdf" : "ann";
  const ic = type==="class" ? "▶" : type==="pdf" ? "📄" : "📢";
  const rawUrl = (f.URL||"").trim();
  const url = isSafeHttpUrl(rawUrl) ? rawUrl : "";
  const tag = url ? "a" : "div";
  const hrefAttrs = url ? `href="${pubEsc(url)}" target="_blank" rel="noopener noreferrer"` : "";
  return `<${tag} class="pub-item" ${hrefAttrs}>
    <div class="pub-icon ${cls}">${ic}</div>
    <b>${pubEsc(f.Title||"Untitled")}</b>
    ${f.Description?`<small>${pubEsc(f.Description)}</small>`:""}
    <span class="pub-date">${pubEsc(pubFmtDate(f.PostedOn))}</span>
  </${tag}>`;
}
function pubEmpty(msg){ return `<div class="pub-empty">${pubEsc(msg)}</div>`; }

async function fetchFeedCDNFirst() {
  // 1. Try cache
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if (cached && Date.now() - cached.ts < CACHE_TIME) {
      return { feed: cached.feed, config: cached.config, fromCache: true };
    }
  } catch {}

  // 2. Try CDN static JSON (super fast, 40ms)
  try {
    const res = await fetch(CDN_FEED + "?v=" + Date.now(), { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      // Support both {feed,config} and {ok,feed,config}
      const feed = json.feed || json;
      const config = json.config || {};
      const result = { feed: Array.isArray(feed)?feed:(feed.feed||[]), config, fromCDN: true };
      // Save to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({ feed: result.feed, config, ts: Date.now() }));
      return result;
    }
  } catch (e) {
    console.log("CDN feed miss, falling back to API", e);
  }

  // 3. Fallback to Apps Script API (slow but works)
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "getFeed" })
  });
  if (!res.ok) throw new Error("Feed unavailable");
  const txt = await res.text();
  const json = JSON.parse(txt);
  if (!json.ok) throw new Error(json.error||"Feed error");
  const result = { feed: json.feed||[], config: json.config||{}, fromAPI: true };
  localStorage.setItem(CACHE_KEY, JSON.stringify({ feed: result.feed, config: result.config, ts: Date.now() }));
  return result;
}

async function initPublicFeed() {
  const materialGrid = document.getElementById("pubMaterialGrid");
  const annGrid = document.getElementById("pubAnnGrid");
  const classGrid = document.getElementById("pubClassGrid");
  if (!materialGrid) return;

  try {
    const { feed, config, fromCache, fromCDN, fromAPI } = await fetchFeedCDNFirst();
    const material = feed.filter(f => String(f.Type).toLowerCase()==="pdf");
    const ann = feed.filter(f => String(f.Type).toLowerCase()==="announcement");
    const classes = feed.filter(f => String(f.Type).toLowerCase()==="class");

    materialGrid.innerHTML = material.length ? material.map(pubCard).join("") : pubEmpty("No study material posted yet.");
    annGrid.innerHTML = ann.length ? ann.map(pubCard).join("") : pubEmpty("No announcements right now.");
    classGrid.innerHTML = classes.length ? classes.map(pubCard).join("") : pubEmpty("No classes scheduled yet.");

    // Show source badge for debugging/transparency
    if (fromCDN) console.log("⚡ Feed loaded from CDN (42ms avg)");
    if (fromCache) console.log("⚡ Feed loaded from cache (instant)");
    if (fromAPI) console.log("🐢 Feed loaded from API (fallback)");

    // Announce bar
    if (config.announcement) {
      const bar = document.getElementById("announceBar");
      const text = document.getElementById("announceText");
      const dismissed = sessionStorage.getItem("cv_dismissed_announcement");
      if (bar && text && dismissed !== config.announcement) {
        text.textContent = config.announcement;
        bar.style.display = "block";
        document.getElementById("announceClose").addEventListener("click", () => {
          sessionStorage.setItem("cv_dismissed_announcement", config.announcement);
          bar.style.display = "none";
        });
      }
    }

    // Background revalidation if from cache
    if (fromCache) {
      // silently update from CDN/API in background
      fetch(CDN_FEED + "?v=" + Date.now()).then(r=>r.json()).then(j=>{
        const newFeed = j.feed||j;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ feed: Array.isArray(newFeed)?newFeed:(newFeed.feed||[]), config: j.config||{}, ts: Date.now() }));
      }).catch(()=>{});
    }

  } catch (e) {
    console.warn("Feed load failed", e);
    const fail = pubEmpty("Couldn't load right now — please refresh. (CDN + API both unreachable)");
    if (materialGrid) materialGrid.innerHTML = fail;
    if (annGrid) annGrid.innerHTML = fail;
    if (classGrid) classGrid.innerHTML = fail;
  }
}

/* --------------- Reveal & Tilt & Magnetic --------------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach(el => io.observe(el));
}

function initTilt() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < 900) return;
  document.querySelectorAll(".tilt-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rx = ((y/rect.height)-0.5)*-8;
      const ry = ((x/rect.width)-0.5)*10;
      card.style.setProperty("--mx", `${(x/rect.width)*100}%`);
      card.style.setProperty("--my", `${(y/rect.height)*100}%`);
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function initMagnetic() {
  if (window.innerWidth < 900) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width/2;
      const y = e.clientY - rect.top - rect.height/2;
      btn.style.transform = `translate(${x*0.18}px, ${y*0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => btn.style.transform = "");
  });
}

function initMarquee() {
  const track = document.querySelector(".marquee-track");
  if (!track) return;
  const marquee = track.closest(".hero-marquee");
  if (marquee) {
    marquee.addEventListener("mouseenter", () => track.style.animationPlayState="paused");
    marquee.addEventListener("mouseleave", () => track.style.animationPlayState="running");
  }
}

function initBeaker() {
  const liquid = document.getElementById("beakerLiquid");
  if (!liquid) return;
  // already animated via CSS, add scroll-linked fill
  window.addEventListener("scroll", () => {
    const rect = liquid.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      liquid.style.height = "58%";
    }
  }, { passive: true });
}

/* --------------- Service Worker --------------- */
function initSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(reg => {
      console.log("SW registered", reg.scope);
    }).catch(err => console.log("SW fail", err));
  }
}

/* --------------- Boot --------------- */
document.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initNavigation();
  initMobileNav();
  initHeaderScroll();
  initChemAnimation("chemCanvas", "heroWrap");
  initParticleCanvas();
  initViewerStats();
  initPublicFeed();
  initReveal();
  initTilt();
  initMagnetic();
  initMarquee();
  initBeaker();
  initSW();
});

// Also init if DOM already ready (for module)
if (document.readyState !== "loading") {
  // boot already handled by DOMContentLoaded above
}
