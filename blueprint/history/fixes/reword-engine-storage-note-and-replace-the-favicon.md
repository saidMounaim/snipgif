# Fix: Reword engine storage note and replace the favicon

**Type:** Fix
**Status:** verified
**Branch:** fix/reword-engine-storage-note-and-replace-the-favicon
**Fixes:** F-03

## The problem

Two small leftovers after feature 21 (Installable PWA):

1. **F-03 (P3).** `src/content/pages/cookies.md` says the roughly 30 MB converter
   engine "is added the first time you convert a video or compress a GIF". The
   converter (`src/components/converter/Converter.tsx`) and compressor
   (`src/components/compressor/Compressor.tsx`) start loading the engine as soon
   as a file is chosen, so the service worker stores it before any conversion,
   even if the visitor never clicks Convert. The storage disclosure is slightly
   inaccurate. The Privacy Policy wording ("once used the converter engine")
   stays.
2. **Favicon.** `public/favicon.svg` and `public/favicon.ico` are still Astro's
   default starter logo, while the installed app now uses Snipgif's own mark
   (`public/icon.svg`: white film glyph on the brand gradient). The browser tab
   shows a different brand from the app icon.

## The fix

1. In `cookies.md`, change the engine sentence to say it is added the first time
   you choose a video or GIF in one of the tools, so they also work offline
   afterwards. Keep the rest of the list item unchanged. The `updated` date stays
   `2026-11-07` (today).
2. Replace `public/favicon.svg` with the same mark as `public/icon.svg` (same
   gradient, rounded square, and glyph, so it reads well on light and dark tab
   bars). Replace `public/favicon.ico` with an ICO built from that mark at 16, 32,
   and 48 px: render the PNGs with headless Google Chrome (as for the app icons)
   and wrap them in an ICO container with a one-off script in the scratchpad.
   ICO files may embed PNG images directly. Add no project dependency.

Must not break: the existing `<link rel="icon">` tags in `src/layouts/Layout.astro`
(paths stay `/favicon.svg` and `/favicon.ico`), the app icons and manifest, and the
service worker precache (the favicon files stay in the build, so the version simply
changes). No other copy or code changes. The Writing standard applies (no em
dashes, en dashes, or ellipsis characters).

## Build steps

- [x] **1. Reword the Cookie Policy engine note.**
  **Done when:** `npm run build` passes and the built `/cookies` page says the
  engine is added when a video or GIF is chosen, with no mention of "the first
  time you convert"; F-03 is marked `fixed` in `blueprint/context/findings.md`.
- [x] **2. Replace the favicon.**
  **Done when:** `public/favicon.svg` shows the film mark on the brand gradient
  (no Astro path or style left); `public/favicon.ico` is a valid ICO
  (`file public/favicon.ico` reports an icon resource) containing 16, 32, and
  48 px images; `npm run build` passes and `dist/favicon.svg` and
  `dist/favicon.ico` match the new files; the rendered favicon PNGs visibly show
  the film mark.

## Verify

- Open `/cookies`: the engine line says it is saved when you choose a file.
- Restart the dev server or rebuild, then hard-reload any page: the browser tab
  shows the gradient film icon instead of Astro's logo (browsers cache favicons
  aggressively, so a private window may be needed).
- `/audit` re-reviews F-03 before it closes (this fix only marks it `fixed`).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3323,"specSha256":"f2b0749ccf89f08fa2e7e45673af842c6f61d1a62a9638bce7a21b39e3526dba","branch":"refs/heads/fix/reword-engine-storage-note-and-replace-the-favicon","head":"22b32eaad3aa070561c1e2d074d4be1e6a197298","baseRef":"refs/heads/master","baseCommit":"22b32eaad3aa070561c1e2d074d4be1e6a197298","sourceTree":"e1597dc950893ffa09b692cba99cc3e8a56e07f3","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Restart the dev server (`npm run dev`) and open http://localhost:4321 in a private window (browsers cache favicons).
2. Expected: the browser tab shows the gradient film icon instead of Astro's logo.
3. Open http://localhost:4321/cookies. Expected: the cache storage item says the converter engine is added "the first time you choose a video or GIF in one of the tools".
