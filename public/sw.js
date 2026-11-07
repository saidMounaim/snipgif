// Snipgif service worker: precaches the built site so every page works offline, and caches the
// ffmpeg core from jsDelivr the first time a tool loads it. Plain script, served as-is from /sw.js.

// Replaced at build time by the pwa-precache integration in astro.config.mjs; the build fails if it is missing.
self.__PRECACHE__ = { version: 'dev', urls: [] };

const { version: VERSION, urls: PRECACHE_URLS } = self.__PRECACHE__;
const SITE_CACHE = `snipgif-${VERSION}`;
// Keep in step with CORE_BASE_URL in src/lib/gif-engine.ts.
const ENGINE_CACHE = 'snipgif-engine-0.12.10';
const ENGINE_PREFIX = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/';

const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline | Snipgif</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5">
<h1>You are offline</h1>
<p>This page is not saved yet. It will be available offline after you open it once while online.</p>
<p><a href="/">Go to the video to GIF converter</a></p>
</body>
</html>`;

// No skipWaiting: open tabs keep the files they loaded, and a new version takes over once all tabs close.
self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(SITE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key.startsWith('snipgif-') && key !== SITE_CACHE && key !== ENGINE_CACHE)
						.map((key) => caches.delete(key)),
				),
			),
	);
});

// Caching is best-effort: a storage failure (for example a full quota) must never turn a good
// network response into an error, so the cache write runs after the response is returned.
async function cacheFirst(event, cacheName, store) {
	const { request } = event;
	try {
		const cached = await caches.match(request, { cacheName });
		if (cached) return cached;
	} catch {
		// Cache storage unavailable: fall through to the network.
	}
	const response = await fetch(request);
	// Only full, readable successes: never opaque, partial, or error responses.
	if (store && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
		const copy = response.clone();
		event.waitUntil(
			caches
				.open(cacheName)
				.then((cache) => cache.put(request, copy))
				.catch(() => {}),
		);
	}
	return response;
}

async function networkFirstPage(request) {
	try {
		return await fetch(request);
	} catch {
		const cached = await caches.match(request, { cacheName: SITE_CACHE, ignoreSearch: true });
		return (
			cached ??
			new Response(OFFLINE_PAGE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
		);
	}
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.href.startsWith(ENGINE_PREFIX)) {
		event.respondWith(cacheFirst(event, ENGINE_CACHE, true));
		return;
	}
	// Other origins (Google Analytics included) are left to the network.
	if (url.origin !== self.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(networkFirstPage(request));
		return;
	}
	// Hashed /_astro/ files and the other precached files never change under the same URL.
	if (url.pathname.startsWith('/_astro/') || PRECACHE_URLS.includes(url.pathname)) {
		event.respondWith(cacheFirst(event, SITE_CACHE, url.pathname.startsWith('/_astro/')));
	}
});
