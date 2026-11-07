# Feature: Installable PWA

**From build-plan:** feature 21
**Build attempt:** 1
**Branch:** feature/installable-pwa
**Status:** verified

## Goal

Let people install Snipgif on a phone or desktop and keep using it offline: every
page works offline as soon as the app is installed, and converting or compressing
works offline after the converter engine has been used once online.

## In scope

- A web app manifest with name, colors, display mode, and icons, linked from
  every page, so supporting browsers offer "Install".
- App icons generated once from the site's header mark (white Lucide `Film` glyph
  on the brand gradient rounded square), committed as PNGs: 192 px, 512 px, a
  512 px maskable variant, and a 180 px Apple touch icon.
- A hand-written service worker that precaches the whole built site at install,
  serves pages network-first with a cached fallback, serves hashed `/_astro/`
  assets cache-first, and caches the ffmpeg core from jsDelivr on first use.
- A build step that writes the exact precache list and a cache version into the
  built service worker.
- Registration of the service worker in production builds only.
- Cookie and Privacy Policy text describing what is now stored on the device.

## Out of scope

- A custom "Install app" button or banner, and install instructions in the UI
  (browsers provide their own install prompt; iOS uses Share > Add to Home
  Screen).
- Precaching the 30 MB ffmpeg engine at install (decided: cache on first use).
- Moving the ffmpeg core off jsDelivr or changing its version.
- Push notifications, background sync, share target, or file handlers.
- An "update available" prompt (a new version activates once all tabs close).
- Replacing `public/favicon.svg` and `favicon.ico`, which are still Astro's
  default logo (see Open questions).
- Offline analytics: GA4 requests simply fail offline.
- Features 22 and later.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`: no commits per step.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. App icons and manifest.**
  Add `public/icon.svg`: the header mark (rounded square filled with the light
  theme's `bg-brand` gradient, white `Film` glyph from `lucide-react` centered at
  the header's proportions). Add `public/icon-maskable.svg`: the same gradient
  full-bleed with the glyph inside the central 80% safe zone. Render
  `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and
  `apple-touch-icon.png` (180 px, opaque, no transparency) with a locally
  available renderer (headless Google Chrome is installed); add no project
  dependency. Add `public/manifest.webmanifest` (contract below). In
  `Layout.astro` `<head>`, link the manifest and the Apple touch icon, and add
  two `theme-color` metas for light and dark `prefers-color-scheme`.
  **Done when:** `npm run build` passes; `dist/manifest.webmanifest` is valid
  JSON matching the contract; each PNG has the stated pixel size (check with
  `sips -g pixelWidth -g pixelHeight`); every built page links the manifest and
  touch icon; the icons visibly show the film mark (inspect the PNGs).

- [x] **2. Service worker and build-time precache list.**
  Add `public/sw.js` (behavior contract below) containing a single placeholder
  line for the precache list and version. Add a small inline Astro integration in
  `astro.config.mjs` using the `astro:build:done` hook: list every file in the
  build output, map HTML files to their served clean URLs (`index.html` to `/`,
  `about.html` to `/about`, `blog/x.html` to `/blog/x`), exclude `sw.js` itself,
  compute a version from a hash of the list and file contents, and replace the
  placeholder in the built `sw.js`. Fail the build if the placeholder is
  missing, so a stale service worker can never ship.
  **Done when:** `npm run build` passes; `dist/sw.js` contains a precache list
  with every page's clean URL (no `.html`), every `/_astro/` file, the fonts,
  icons, and manifest, and no `sw.js`; the version changes when any built file
  changes and stays the same on an unchanged rebuild.

- [x] **3. Registration and policy copy.**
  In `Layout.astro`, register `/sw.js` after the `load` event, only when
  `import.meta.env.PROD` is true and `'serviceWorker' in navigator`, inside
  `try`/`catch` with registration errors swallowed, as one small inline script.
  Update `src/content/pages/cookies.md` ("What Snipgif stores itself") and
  `privacy.md` ("Information stored on your device") to say the site saves its
  own files, and once used the converter engine, in the browser's cache storage
  so it loads faster and works offline; nothing is sent anywhere; clearing site
  data removes it. Set `updated` to the build date on both.
  **Done when:** `npm run build` passes; every built page contains the
  registration script; `npm run dev` pages do not (the script is absent in dev);
  `/cookies` and `/privacy` show the new text and date.

- [x] **4. Best-effort caching (repairs F-02).**
  In `public/sw.js`, make `cacheFirst` never fail because of cache storage: a
  failed cache read falls through to the network, and the cache write for a
  fresh response runs in `event.waitUntil` with errors swallowed, so the
  network response is returned even when storage refuses the write (for
  example a full quota on the 30 MB engine).
  **Done when:** `npm run build` passes; `node --check` passes on both
  service worker files; no `await cache.put` remains on the response path;
  every `cacheFirst` call passes the fetch event; F-02 is marked `fixed`.

## Files / areas

- `public/icon.svg`, `public/icon-maskable.svg`, `public/icons/*.png` - new.
- `public/manifest.webmanifest` - new.
- `public/sw.js` - new, service worker source with the precache placeholder.
- `astro.config.mjs` - inline integration that fills the precache list.
- `src/layouts/Layout.astro` - manifest, touch icon, theme-color metas,
  registration script.
- `src/content/pages/cookies.md`, `src/content/pages/privacy.md` - storage text.

## Data / contracts

**Manifest** (`/manifest.webmanifest`):

- `name`: `Snipgif - Video to GIF`; `short_name`: `Snipgif`
- `description`: the home page's meta description
- `start_url`: `/`; `scope`: `/`; `id`: `/`; `display`: `standalone`
- `background_color` and `theme_color`: the light `--background` token
  converted to an sRGB hex; the dark-theme `theme-color` meta uses the dark
  `--background` hex
- `icons`: `icon-192.png` (192x192, `any`), `icon-512.png` (512x512, `any`),
  `icon-maskable-512.png` (512x512, `maskable`), all `image/png`

**Service worker** (`/sw.js`, scope `/`):

- Caches: `snipgif-<version>` for the precached site, and
  `snipgif-engine-0.12.10` for the ffmpeg core.
- `install`: add every precache URL to `snipgif-<version>`. No `skipWaiting`, so
  open tabs keep the files they loaded and a new version takes over once all
  tabs close.
- `activate`: delete `snipgif-*` caches other than the current version and the
  engine cache.
- `fetch`, GET only, never touching other origins except the engine:
  - Navigations: network first; on failure, the cached page for that URL; if
    none, a small inline offline HTML response ("You are offline and this page
    is not saved yet") with a link to `/`.
  - Same-origin `/_astro/` files: cache first, then network.
  - Other same-origin precached files: cache first, then network.
  - `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/`: cache first; on a miss,
    fetch and store a clone only when the response is OK (status 200, CORS).
  - Everything else, including Google Analytics: not intercepted.
- A failed engine fetch while offline still reaches the converter's existing
  `EngineLoadError` message, unchanged.

**Hosting:** Vercel serves `sw.js` from the site root with its default
revalidating cache headers; no `vercel.json` change is needed.

## Testing

No test or Verify command is configured. Evidence is `npm run build` plus
inspection of `dist/manifest.webmanifest`, `dist/sw.js`, the icon pixel sizes,
and the built HTML. Installability, offline page loads, and offline conversion
need a production build served over localhost or HTTPS in a browser (for
example `npm run preview` plus DevTools Application panel); that is a `/check`
or manual step, not claimed here.

## Notes for the AI

- The engine is fetched with `fetch()` by `toBlobURL` in
  `src/lib/gif-engine.ts`, so the service worker can cache it; keep
  `CORE_BASE_URL` and the engine cache name in step with each other.
- `public/sw.js` is served as-is; keep it plain JavaScript with no imports.
- Do not cache opaque or error responses; never cache the GA4 tag.
- The registration script must not run in `astro dev`, where it would cache dev
  assets.
- Precached HTML pages must use the clean URLs Vercel serves (`cleanUrls`), or
  offline navigations will miss the cache.
- Keep total precache size small (the built site is about 1 MB); report it.
- No new dependencies. Follow the Writing standard (no em dashes, en dashes, or
  ellipsis characters).

## Open questions

- **Favicon.** `public/favicon.svg` and `favicon.ico` are still Astro's default
  logo, not Snipgif's mark. Replace them with the new `icon.svg` in a follow-up
  `/fix`? (Not done here; it does not block this feature.)


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9359,"specSha256":"2fa230d04d3252fe9775b1fdecba3c0c1e0947367072ac29f9cda89f2f33355f","branch":"refs/heads/feature/installable-pwa","head":"cd06769473d29c83a1e2397406da3cd74d8b83f7","baseRef":"refs/heads/master","baseCommit":"6849777921552042d23daaebbc89edc46d337d94","sourceTree":"db4af70b2e2903bbb09f3a8d969857c482f74b60","landing":"local-merge","absentOptional":[]} -->

## Findings

### 21/F-01 [P3] closed - Build-plan item 15 still lists the removed Contact page

**File:** blueprint/build-plan.md:36
**Found:** 2026-11-07 by /audit independent (scope: current; lens: quality)
**Why it matters:** Step 5 removed the contact page, and the overview's item 15 now lists only About, Privacy Policy, Terms of Use, and Cookie Policy. The build-plan's item 15 still reads "About, Contact, Privacy Policy, ...", with no note like the one item 19 got, so the plan and the overview disagree about what the trust pages include. The spec only required the overview edit, so this is a consistency cleanup, not a contract break.
**Suggested fix:** Either drop "Contact" from item 15 or append a short note that this fix removed the contact page, matching the item 19 style, then refresh the overview source-hash through the overview skill. No current requirement would be lost.
**Resolution:** Fixed by fix `drop-contact-from-build-plan-item-15` (2026-11-07): item 15 now lists only About, Privacy Policy, Terms of Use, and Cookie Policy, with a note that the Contact page was removed. Awaiting `/audit` re-review. Closed 2026-11-07 by /audit independent (fresh subagent, target cd06769): blueprint/build-plan.md:36 now lists About, Privacy Policy, Terms of Use, and Cookie Policy with a removal note, matching overview item 15, and the overview source-hash recomputes to the recorded value, so the plan and overview agree and no drift was introduced.

### 21/F-02 [P2] closed - A failed cache write turns a good network response into a fetch failure

**File:** public/sw.js:49
**Found:** 2026-11-07 by /audit independent (scope: current; lens: performance, quality)
**Why it matters:** `cacheFirst` awaits `caches.open` and `cache.put` with no error handling, and its promise is passed straight to `event.respondWith`. If storage rejects the write (for example `QuotaExceededError` while storing the roughly 30 MB `ffmpeg-core.wasm` on a device or profile with little quota), the whole handler rejects, the page sees a network error, and `createEngine` throws `EngineLoadError` even though jsDelivr answered with a valid 200 response. Without the service worker the same visit would have converted fine, so the cache becomes a new way to break the tool online. The same path applies to `/_astro/` files stored on a miss. Awaiting the put also holds the response until the full 30 MB body has been written to the cache.
**Suggested fix:** Keep the response independent of the cache write: wrap the open/match and put in `try`/`catch` (fall back to `fetch(request)` and return the response when caching fails), or move the put into `event.waitUntil(cache.put(...).catch(() => {}))` so it neither blocks nor fails the response. No current requirement would be lost.
**Resolution:** Fixed in feature 21 step 4 (2026-11-07): `cacheFirst` in public/sw.js now falls back to the network when cache storage fails and stores fresh responses in `event.waitUntil` with errors swallowed, so a refused cache write never breaks the response. Awaiting `/audit` re-review. Closed 2026-11-07 by /audit independent (fresh subagent, target cd06769): in public/sw.js:44-64 the cache read is wrapped in try/catch and falls through to `fetch`; the write runs on `response.clone()` inside `event.waitUntil(caches.open(...).then(put).catch(() => {}))` and is never awaited, so the untouched original response is returned even when storage refuses the write. `waitUntil` is called while the `respondWith` promise is still pending, which the spec allows. Both call sites pass the fetch event, no `await cache.put` remains, and a rejected network fetch still propagates so the offline engine path reaches `EngineLoadError` as before. No new defect found in the repair.

## Independent review

**Status:** passed
**Target commit:** cd06769473d29c83a1e2397406da3cd74d8b83f7
**Base commit:** 6849777921552042d23daaebbc89edc46d337d94
**Base ref:** refs/heads/master
**Spec hash:** 2fa230d04d3252fe9775b1fdecba3c0c1e0947367072ac29f9cda89f2f33355f
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-07T20:41:39Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-07T20:44:21Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base HEAD refs/heads/master`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --short`: pass (HEAD, merge base, and spec hash match the request; only review.md differed from the target)
- `PUBLIC_SITE_URL= npm run build`: pass (13 pages; run twice, precache version 71df20d215d5 both times)
- `node --check public/sw.js`: pass
- `node --check dist/sw.js`: pass
- `sips -g pixelWidth -g pixelHeight -g hasAlpha public/icons/*.png`: pass (180 opaque, 192, 512, 512 maskable opaque)
- Typecheck: unavailable (no command configured)
- Tests: unavailable (no test command configured)

### Evidence

- public/sw.js matches the spec contract: install precaches with no skipWaiting; activate deletes only stale `snipgif-*` caches and keeps the engine cache; navigations are network-first with an `ignoreSearch` cached fallback and an inline 503 offline page; `/_astro/` and precached files are cache-first; the engine is matched only under `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/` and stored only for status 200 `basic`/`cors`; other origins and non-GET requests are not intercepted.
- F-02 repair verified: cache read in try/catch with network fallback; write via `event.waitUntil` on a clone with errors swallowed; original response returned unconsumed.
- dist/sw.js precache lists 48 URLs (about 1.2 MB): every page as a clean URL, all `/_astro/` files, fonts, icons, manifest, no `sw.js`, no `.html`, no 404 page that could fail `addAll`.
- dist/manifest.webmanifest parses and matches the contract; description equals the home meta description; `#fafafd` and `#080811` match the light and dark `--background` oklch tokens.
- All 13 built pages link the manifest and touch icon, carry both theme-color metas, and include the PROD-only registration script; the icon PNG shows the film mark on the brand gradient.
- cookies.md and privacy.md describe cache storage and carry `updated: 2026-11-07`; no em dashes, en dashes, or ellipsis characters in the delta.
- vercel.json `cleanUrls` and immutable `/_astro/` headers are consistent with the precache URLs; build-plan item 15 matches overview item 15 and the overview source-hash is current.

### Findings

- F-01 [P3] closed: build-plan item 15 now matches the overview (blueprint/build-plan.md:36)
- F-02 [P2] closed: cache failures no longer break network responses (public/sw.js:44)
- F-03 [P3] open: Cookie Policy says the engine is stored on first conversion, but it is stored on file selection (src/content/pages/cookies.md:22)

### Remaining risk

- No typecheck command is configured, so the delta was not type-checked.
- No test command is configured, so service worker and integration behavior has no automated tests.
- Live installability, offline page loads, offline conversion, update and activation behavior, and real quota failures were not exercised in a browser (no dev or preview server was started, per the review boundary).
- In `networkFirstPage`, a cache read failure while offline is not caught and yields the browser's own error page instead of the inline offline page; no worse than having no service worker.
- Dashboard activity state was not written because this reviewer was limited to findings.md and review.md.

### Handoff

Review the active spec and the complete `6849777921552042d23daaebbc89edc46d337d94..cd06769473d29c83a1e2397406da3cd74d8b83f7` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Try it now

1. Build and serve the production site: `npm run build`, then `npm run preview` (http://localhost:4321). The service worker only runs in production builds.
2. In Chrome, open DevTools > Application > Manifest. Expected: name "Snipgif - Video to GIF", standalone display, and the three icons with no errors; the install icon appears in the address bar.
3. Application > Service workers. Expected: `/sw.js` activated. Under Cache storage, a `snipgif-<version>` cache holds every page and the `/_astro/` files.
4. Choose a short video on the home page. Expected: a `snipgif-engine-0.12.10` cache appears with the two engine files.
5. Tick **Offline** in the Network panel, then reload and visit /about and /blog. Expected: the pages load from the cache. Convert a video. Expected: it works offline.
6. While offline, open a URL that does not exist, such as `/nope`. Expected: the "You are offline" page with a link home.
