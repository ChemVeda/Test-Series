// tests.js - Hybrid Fast Test Loader
// Priority: 1) CDN JSON (/data/tests/*.json) 2) IndexedDB cache 3) API fallback

import { cacheTest, getCachedTest, getAllCachedTests } from "./db.js";

const API_URL = "https://script.google.com/macros/s/AKfycbwx9lBAIHYZzreNlfLMGMBi8jMYy-n00VWpkVi4v_kJ07a6p-62B9G8tb8w6X-pMJz_GQ/exec";
const CDN_BASE = "./data/tests/";
const TESTS_INDEX = "./data/tests/index.json"; // list of tests meta

// Fast fetch with timeout
async function fetchWithTimeout(url, opts = {}, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// API fallback (original method)
async function apiFetch(action, data = {}) {
  const payload = { action, ...data };
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const txt = await res.text();
  const json = JSON.parse(txt);
  if (!json.ok) throw new Error(json.error || "API error");
  return json;
}

// 1. Load tests list - CDN first
export async function loadTestsListHybrid() {
  // Try CDN index.json (fastest, 40ms)
  try {
    const res = await fetchWithTimeout(TESTS_INDEX + "?v=" + Date.now(), {}, 2500);
    if (res.ok) {
      const json = await res.json();
      const tests = json.tests || json;
      // Cache meta
      return { tests, fromCDN: true };
    }
  } catch (e) {
    console.log("CDN index miss", e.message);
  }

  // Try IndexedDB cached tests list
  try {
    const cached = await getAllCachedTests();
    if (cached.length > 0) {
      // Filter to recent (last 7 days)
      const recent = cached.filter(t => Date.now() - (t._cachedAt||0) < 1000*60*60*24*7);
      if (recent.length) {
        return { tests: recent.map(t => ({ testId: t.testId, title: t.title, subject: t.subject, timer: t.timer, questionsCount: t.questions?.length||t.questionsCount, ...t })), fromCache: true };
      }
    }
  } catch {}

  // Fallback to API
  console.log("Falling back to API for tests list");
  const { tests = [], todayTestId } = await apiFetch("getTests");
  // Cache them
  tests.forEach(t => cacheTest(t).catch(()=>{}));
  return { tests, todayTestId, fromAPI: true };
}

// 2. Load single test - CDN first
export async function loadSingleTestHybrid(testId) {
  const start = performance.now();

  // Try CDN JSON file
  try {
    const url = `${CDN_BASE}${testId}.json?v=${Date.now()}`;
    const res = await fetchWithTimeout(url, {}, 3000);
    if (res.ok) {
      const test = await res.json();
      const elapsed = Math.round(performance.now() - start);
      console.log(`⚡ Test ${testId} loaded from CDN in ${elapsed}ms`);
      await cacheTest(test);
      return { test, source: "cdn", elapsed };
    }
  } catch (e) {
    console.log(`CDN miss for ${testId}:`, e.message);
  }

  // Try IndexedDB
  try {
    const cached = await getCachedTest(testId);
    if (cached && Date.now() - (cached._cachedAt||0) < 1000*60*60*24*3) {
      const elapsed = Math.round(performance.now() - start);
      console.log(`⚡ Test ${testId} loaded from IndexedDB in ${elapsed}ms`);
      return { test: cached, source: "cache", elapsed };
    }
  } catch {}

  // Fallback to API
  console.log(`🐢 Loading ${testId} from API (slow path)`);
  const { test } = await apiFetch("getTest", { testId });
  const elapsed = Math.round(performance.now() - start);
  console.log(`Test ${testId} loaded from API in ${elapsed}ms`);
  await cacheTest(test);
  return { test, source: "api", elapsed };
}

// 3. Submit result - queue if offline
export async function submitResultHybrid(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "submitResult", ...payload })
    });
    if (!res.ok) throw new Error("Network error");
    const txt = await res.text();
    const json = JSON.parse(txt);
    if (!json.ok) throw new Error(json.error);
    return json;
  } catch (e) {
    // Queue for later if offline
    if (!navigator.onLine) {
      const { queueOfflineResult } = await import("./db.js");
      await queueOfflineResult(payload);
      throw new Error("You are offline — result queued and will sync when online");
    }
    throw e;
  }
}

// 4. Background sync for offline queue
export async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  const { getOfflineQueue, clearOfflineQueueItem } = await import("./db.js");
  const queue = await getOfflineQueue();
  for (const item of queue) {
    try {
      await apiFetch("submitResult", item);
      await clearOfflineQueueItem(item.id);
      console.log("Synced offline result", item.id);
    } catch (e) {
      console.log("Failed to sync", item.id, e);
    }
  }
}

// Auto sync when online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Online — syncing offline queue");
    syncOfflineQueue();
  });
}
