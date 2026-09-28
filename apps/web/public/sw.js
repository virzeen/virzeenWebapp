// Virzeen service worker (performance-seo.md §4): installable app + offline page.
// Deliberately small. Pages always come from the network (prices, stock and the bag must be live); only
// content-hashed build files (/_next/static, safe to cache forever) and the offline page are cached.
// Bump VERSION to replace the cached offline page.

const VERSION = "v1";
const OFFLINE_CACHE = `virzeen-offline-${VERSION}`;
const STATIC_CACHE = "virzeen-static";
const OFFLINE_URL = "/offline";
const MAX_STATIC_ENTRIES = 150;

function stylesheetHrefs(html) {
  const hrefs = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    if (!/\brel="stylesheet"/.test(tag)) continue;
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
    if (href?.startsWith("/_next/static/")) hrefs.push(href);
  }
  return hrefs;
}

async function trimStaticCache() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map((key) => cache.delete(key)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(OFFLINE_URL, { cache: "reload" });
      if (!response.ok) return;
      await (await caches.open(OFFLINE_CACHE)).put(OFFLINE_URL, response.clone());
      // Keep the offline page styled without a connection.
      const staticCache = await caches.open(STATIC_CACHE);
      await Promise.all(
        stylesheetHrefs(await response.text()).map((href) => staticCache.add(href).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([OFFLINE_CACHE, STATIC_CACHE]);
      await Promise.all(
        (await caches.keys()).filter((key) => !keep.has(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
          event.waitUntil(trimStaticCache());
        }
        return response;
      })(),
    );
  }
});
