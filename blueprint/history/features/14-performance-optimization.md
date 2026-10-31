# Feature: Performance optimization

**From build-plan:** feature 14
**Build attempt:** 1
**Status:** verified
**Branch:** feature/performance-optimization

## Goal

Keep every page fast for first-time visitors and Google. Engine code loads only
when someone actually uses a tool. The UI font is fetched early enough that text
doesn't swap late. Hashed assets are cached on repeat visits. The work is proven
with before and after lab measurements that meet the Core Web Vitals "good"
thresholds.

## In scope

- **Lazy engine code.** `src/lib/gif-engine.ts` imports `@ffmpeg/ffmpeg` and
  `@ffmpeg/util` statically today. `Converter.tsx`, `Compressor.tsx`, and
  `GifResult.tsx` import gif-engine statically too, so the wrapper ships in the
  initial island graph (`gif-engine.*.js` is about 61 KB raw in the current
  build). Move the ffmpeg packages behind a dynamic `import()` that runs inside
  `loadGifEngine`. The ~30 MB core already loads on demand from jsDelivr, and
  that stays as it is.
- **UI font preload.** Geist Variable comes from `@fontsource-variable/geist`
  through `src/styles/global.css`, with `font-display: swap`, five unicode-range
  subsets, and no preload. Preload only the Latin normal subset
  (`geist-latin-wght-normal.woff2`) from `src/layouts/Layout.astro`, using the
  exact hashed URL the built CSS references.
- **Long-lived caching for hashed assets.** Add `public/_headers` for Cloudflare
  Pages, the host named in the overview, so that `/_astro/*` gets
  `Cache-Control: public, max-age=31536000, immutable`.
- **Image audit.** Pages render no content raster images. `og-image.png` is a
  36 KB 1200×630 palette PNG used only for social cards, and icons are inline
  Lucide SVGs. Record that in the baseline and change images only if Lighthouse
  flags a specific image.
- **Measurement.** Take a Lighthouse mobile baseline and a final run on `/`,
  `/mp4-to-gif`, and `/gif-compressor` against `npm run preview`.

## Out of scope

- Splitting converter sub-panels (TrimTimeline, CropPanel, TextPanel, and so
  on) with `React.lazy`. The whole `Converter` chunk is about 30 KB raw. Revisit
  only if the baseline shows high TBT that this would fix.
- Changing `client:load` on `Converter` or `Compressor`. The drop zone is the
  above-the-fold hero and must accept a drop right away. `ThemeToggle` also
  stays `client:load`, since it is tiny and shares the React runtime.
- Switching font providers, subsetting Geist, or changing the on-demand caption
  fonts in `public/fonts/` (`loadCaptionFont`).
- Caching rules for unhashed `public/` files (fonts, favicons, og-image).
- Preconnecting to jsDelivr, self-hosting the ffmpeg core, and PWA caching
  (feature 21).
- Field (CrUX or Search Console) Core Web Vitals, which need a live deployment.
- Ads, analytics, and consent scripts (features 18–20).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`. Implement all steps in order, run each step's check, and present one
review packet at the end. Don't make checkpoint commits. `/complete` creates the
feature commit.

## Build steps

- [x] **1. Baseline.** Run `npm run build` and `npm run preview`. In Chrome
  DevTools, run Lighthouse in mobile mode (the Lighthouse panel, or the
  chrome-devtools performance trace when the panel isn't available) on `/`,
  `/mp4-to-gif`, and `/gif-compressor`. Record the performance score, LCP, CLS,
  TBT, and the list of JS files requested on page load under **Notes for the
  AI → Baseline**. Also note whether `gif-engine.*.js` and the font are in the
  initial requests, and whether any image audit fails. No code changes.
  *Done when:* baseline numbers for all three pages are written in this spec,
  with the tool that produced them.
- [x] **2. Lazy-load the ffmpeg wrapper.** In `src/lib/gif-engine.ts`, replace
  the static `@ffmpeg/ffmpeg` and `@ffmpeg/util` imports with a dynamic import
  inside `loadGifEngine`, cached so it runs once per page. Use `import type` for
  any types that are still needed. Replace `fetchFile(file)` for `File` inputs
  with `new Uint8Array(await file.arrayBuffer())`, which is what `fetchFile`
  does for a Blob (check this against the installed `@ffmpeg/util` source
  before swapping), or take it from the dynamically loaded module. Keep the
  `EngineLoadError` and `MemoryError` mapping. The exported API, error classes,
  and call sites stay unchanged. A failed dynamic import (offline, missing
  chunk) must reject as `EngineLoadError`, so the existing friendly engine-load
  message and retry still work. Keep the `optimizeDeps.exclude` entry in
  `astro.config.mjs`, and confirm the ffmpeg worker still starts from the split
  chunk in both `npm run dev` and `npm run preview`.
  *Done when:* `npm run build` passes. In the preview, the initial network list
  on `/` and `/gif-compressor` has no ffmpeg wrapper or worker code, and it
  appears only after a video or GIF is selected. A full video-to-GIF conversion
  on `/` and a compression on `/gif-compressor` still work. With jsDelivr
  blocked in DevTools, the existing engine-load error appears and Try again
  recovers once it's unblocked.
- [x] **3. Preload the UI font.** In `Layout.astro`, import the Latin normal
  woff2 from `@fontsource-variable/geist/files/` as a Vite `?url` asset and emit
  `<link rel="preload" href={url} as="font" type="font/woff2" crossorigin>` in
  `<head>` before the stylesheet. Confirm that the build dedupes it to the same
  hashed file the CSS `@font-face` references. If it doesn't, use the URL
  that does match, or drop the preload and record why.
  *Done when:* every built page's HTML has exactly one font preload, its `href`
  equals the Latin `src` URL in the built CSS, the network panel shows that
  file downloaded once, and the console has no "preloaded but not used" warning.
- [x] **4. Cache headers.** Add `public/_headers`:
  ```
  /_astro/*
    Cache-Control: public, max-age=31536000, immutable
  ```
  *Done when:* `npm run build` copies it to `dist/_headers` unchanged. Only the
  file is checked. Live header behavior can't be observed until deployment.
- [x] **5. Final measurement.** Rebuild and repeat step 1 on the same three
  pages. Record the results under **Notes for the AI → Result**, next to the
  baseline.
  *Done when:* each page has a Lighthouse mobile performance score of 90 or
  higher, LCP ≤ 2.5 s, CLS ≤ 0.1, and TBT ≤ 200 ms, or any miss is reported
  with its cause and no extra unplanned work is started to fix it.

## Files / areas

- `src/lib/gif-engine.ts`: dynamic ffmpeg import, plus the `fetchFile`
  replacement or deferral
- `src/layouts/Layout.astro`: font preload link
- `public/_headers`: new file
- Read only, for verification: `astro.config.mjs`, `src/styles/global.css`,
  `src/components/converter/Converter.tsx`,
  `src/components/compressor/Compressor.tsx`,
  `src/components/converter/GifResult.tsx`

## Data / contracts

- The gif-engine public API stays exactly as it is. That covers
  `loadGifEngine`, `prepareInput`, `probeDuration`, `extractFrame`,
  `convertToGif`, `compressGif`, `releaseInput`, `EngineLoadError`,
  `MemoryError`, and the `GifResult` type. Callers don't change.
- No persisted data, routes, URLs, or external API changes. Files still never
  leave the device.

## Testing

- No test or Verify command is configured. `npm run build` passing is the
  automated gate.
- Behavior checks are manual, in the browser against `npm run preview`: a
  conversion, a compression, the blocked-CDN engine error and retry, and the
  network and console checks from each step.
- The only performance evidence is Lighthouse lab data from local preview.
  Don't claim field Core Web Vitals or production cache-header behavior.

## Notes for the AI

- The plan says "lazy-load the converter". This spec takes that to mean the
  conversion engine (the ffmpeg wrapper plus the core that already loads on
  demand), not deferring the React island. The island is the above-the-fold
  hero tool and is server-rendered, so its HTML doesn't wait for JS. This is a
  reversible internal choice.
- The overview mentions Inter, but the site uses Geist since the UI refresh fix.
  Keep Geist.
- If step 1 shows a problem these steps don't cover (for example high TBT from
  hydration, or a layout shift), record it and raise it at review instead of
  widening scope.

### Baseline

Tool: Chrome DevTools via the chrome-devtools MCP, against `npm run preview` on
`http://localhost:4322` (4321 was the dev server, so it wasn't used). Emulated
mobile: 412×823 at DPR 1.75, 4× CPU, Slow 4G, cache bypassed. LCP, CLS, and FCP
come from PerformanceObserver. TBT is the sum of (long task − 50 ms) after FCP,
from `longtask` entries. The MCP Lighthouse audit leaves out performance, so
there's no Lighthouse score.

| Page | FCP | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | 1180 ms | 1196 ms | 0 | 0 ms |
| `/mp4-to-gif` | 1196 ms | 1224 ms | 0.003 | 0 ms |
| `/gif-compressor` | 1196 ms | 1224 ms | **0.167** | 0 ms |

- Initial JS on the converter pages: ThemeToggle, client (React DOM),
  Converter or Compressor, react, jsx-runtime, react-dom, and
  `gif-engine.Bco8BaCH.js` (61.1 KB raw). That last one includes the
  `@ffmpeg/ffmpeg` and `@ffmpeg/util` wrapper.
- The font is not preloaded. The browser fetches `geist-latin-wght-normal`
  only after the CSS has parsed.
- The `/gif-compressor` CLS comes from one shift at about 1.76 s. The H1 ("Make
  your GIFs smaller, free, fast, and private") re-wraps when Geist swaps in, so
  the hero paragraph, the drop zone, and the content below move 40 px down.
- Images: nothing flagged. No content raster images are rendered.

### Result

Same tool and settings, after steps 2–4.

| Page | FCP | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | 1216 ms | 1248 ms | 0 | 0 ms |
| `/mp4-to-gif` | 1232 ms | 1264 ms | 0 | 0 ms |
| `/gif-compressor` | 1220 ms | 1252 ms | **0** | 0 ms |

- One earlier run on `/` gave LCP 1464 ms. The rerun gave 1248 ms, so treat
  about ±200 ms as noise at this throttling.
- All pages are within LCP ≤ 2.5 s, CLS ≤ 0.1, and TBT ≤ 200 ms. There's no
  Lighthouse performance score, because the available tool leaves out that
  category.
- The font preload now starts the font at 591 ms, alongside the CSS, so it
  arrives before first paint. That fixed the compressor's CLS.
- The engine wrapper is out of the initial requests. It's now
  `esm.BMJR27Jh.js` (3.0 KB) plus `esm.DnWjBR4N.js` (1.7 KB), which load
  together with `worker-*.js` and the core only after a file is selected. The
  remaining `gif-engine.*.js` (58.5 KB) is code Converter and Compressor share
  that Rollup gave that name. It doesn't include ffmpeg, so the JS saving is
  only about 4.7 KB raw. The spec's 61 KB estimate overstated it.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10838,"specSha256":"3eb4ad4f8ab8df53788534d2d1f51e5ec45a5ea3a1979325fa40f7c53d415bfb","branch":"refs/heads/feature/performance-optimization","head":"a2eb4b3c4937baa79dfea62997007a1d89fd4160","baseRef":"refs/heads/master","baseCommit":"a2eb4b3c4937baa79dfea62997007a1d89fd4160","sourceTree":"b73bf2ce027876e70b267187ebb7c88fbc8ace7f","landing":"local-merge","absentOptional":[]} -->


## Try it now

Run or do:

Run `npm run build`, then `npm run preview` and open
http://localhost:4321/gif-compressor with DevTools → Network open and "Disable
cache" ticked. Reload, then pick any GIF and select Compress.

Expected:

On load there are no `esm.*.js` or `worker-*.js` requests, and
`geist-latin-wght-normal.*.woff2` is requested once with no "preloaded but not
used" console warning. After the GIF is chosen, `esm.*.js`, `worker-*.js`,
`ffmpeg-core.js`, and `ffmpeg-core.wasm` load and the compressed GIF appears.
With Slow 4G throttling, the hero heading paints in its final font without
jumping. `dist/_headers` holds the `/_astro/*` immutable cache rule.

This proves:

The ffmpeg engine loads only when a tool is used, the UI font arrives before
first paint (no layout shift), and hashed assets are marked for long-term caching.
