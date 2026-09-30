// Cloudflare Worker - Cache Proxy for Apps Script (Optional but recommended)
// Makes Apps Script feel like CDN - caches GET for 5 min, instant
// Deploy on Cloudflare Workers free tier (100k req/day)

const API_URL = "https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec"; // your Apps Script URL
const CACHE_TTL = 300; // 5 min

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";

    // Only cache GET requests for feed/tests
    const cacheableActions = ["getFeed", "getTests", "getTest", "feed", "tests"];
    const isCacheable = request.method === "GET" && cacheableActions.includes(action);

    if (!isCacheable) {
      // Pass through POST directly to Apps Script
      return fetch(API_URL, {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" ? await request.clone().text() : undefined
      });
    }

    // Try Cloudflare cache
    const cache = caches.default;
    let cacheKey = new Request(url.toString(), request);
    let cached = await cache.match(cacheKey);
    if (cached) {
      // Return cached with header
      let res = new Response(cached.body, cached);
      res.headers.set("X-Cache", "HIT");
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    }

    // Fetch from origin
    const originUrl = API_URL + "?" + url.searchParams.toString();
    let originRes = await fetch(originUrl);
    let body = await originRes.text();

    let response = new Response(body, {
      status: originRes.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
        "X-Cache": "MISS"
      }
    });

    // Save to cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  }
}
