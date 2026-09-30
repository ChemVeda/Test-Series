// db.js - IndexedDB wrapper for Hybrid Fast
// Handles offline test caching and result queue

const DB_NAME = "chemveda_v3";
const DB_VERSION = 3;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("tests")) {
        db.createObjectStore("tests", { keyPath: "testId" });
      }
      if (!db.objectStoreNames.contains("results")) {
        db.createObjectStore("results", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("feed")) {
        db.createObjectStore("feed", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("offlineQueue")) {
        db.createObjectStore("offlineQueue", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheTest(test) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tests", "readwrite");
    tx.objectStore("tests").put({ ...test, _cachedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedTest(testId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tests", "readonly");
    const req = tx.objectStore("tests").get(testId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCachedTests() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tests", "readonly");
    const req = tx.objectStore("tests").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheFeed(feed, config) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("feed", "readwrite");
    tx.objectStore("feed").put({ key: "main", feed, config, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedFeed() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("feed", "readonly");
    const req = tx.objectStore("feed").get("main");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineResult(payload) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineQueue", "readwrite");
    const req = tx.objectStore("offlineQueue").add({ ...payload, _queuedAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineQueue", "readonly");
    const req = tx.objectStore("offlineQueue").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearOfflineQueueItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineQueue", "readwrite");
    tx.objectStore("offlineQueue").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// LocalStorage fallback for quick reads
export const ls = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k)
};
