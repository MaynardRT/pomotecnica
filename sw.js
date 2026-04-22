const CACHE_NAME = "pomotecnica-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./site.webmanifest",
  "./favicon.ico",
  "./Assets/images/Pomotecnica.png",
  "./Assets/sounds/alarm.mp3",
];

function isSameOrigin(requestUrl) {
  return new URL(requestUrl).origin === self.location.origin;
}

function isCorePath(pathname) {
  return (
    pathname === "/" ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("/styles.css") ||
    pathname.endsWith("/script.js")
  );
}

async function fetchAndUpdateCache(request) {
  const networkResponse = await fetch(request);

  if (networkResponse && networkResponse.ok && isSameOrigin(request.url)) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

async function networkFirst(request, fallbackRequest) {
  try {
    return await fetchAndUpdateCache(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackRequest) {
      return cache.match(fallbackRequest);
    }

    throw new Error("No cached fallback available");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkPromise = fetchAndUpdateCache(request).catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkPromise;

  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Unable to resolve request from cache or network");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isNavigationRequest = event.request.mode === "navigate";
  const sameOrigin = requestUrl.origin === self.location.origin;
  const shouldUseNetworkFirst =
    isNavigationRequest || (sameOrigin && isCorePath(requestUrl.pathname));

  if (shouldUseNetworkFirst) {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(fetch(event.request));
});
