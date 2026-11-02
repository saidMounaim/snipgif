# Feature: Analytics

**From build-plan:** feature 18
**Build attempt:** 1
**Branch:** feature/analytics
**Status:** verified

## Goal

Measure visits, completed conversions, popular settings, and error types with
Google Analytics 4, without sending any file content or personal data, and
without setting analytics cookies for visitors in the EEA, the UK, or
Switzerland before they consent.

## In scope

- Load the GA4 tag (`gtag.js`) on every page when `PUBLIC_GA_MEASUREMENT_ID` is a
  valid measurement ID; load nothing when it is unset or invalid.
- Google Consent Mode v2 defaults set before the tag loads: all storage types
  `denied` for EEA, UK, and Swiss visitors, `granted` elsewhere. Feature 19's
  consent banner will later update these.
- Automatic GA4 page views and device category (built into GA4, no custom code).
- A tiny `track()` helper that is a safe no-op when the tag is absent or blocked.
- Custom events from the converter and the compressor: conversion started,
  conversion completed with its settings, conversion failed with its error key,
  and file rejected with its validation error key.

## Out of scope

- The consent banner or CMP (feature 19) and AdSense (feature 20).
- A separate event for every preset click; the preset is a parameter on the
  start and complete events instead.
- Events for download, copy, or share; scroll or engagement tracking; custom
  dimensions setup in the GA4 admin UI.
- A privacy-friendly alternative tool (the plan's stack and the published legal
  pages commit to GA4).
- Changes to the Privacy or Cookie Policy text (both already describe GA4, the
  data it measures, and the consent rule).
- A Content Security Policy (none exists today).

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`: no commits per step.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Tag and consent defaults in the layout.**
  In `Layout.astro`, read `import.meta.env.PUBLIC_GA_MEASUREMENT_ID` and accept
  it only when it matches `^G-[A-Z0-9]+$`; anything else counts as unset, like
  `PUBLIC_FORMSPREE_ID` in `contact.astro`. When set, render in `<head>`, before
  `<slot name="head" />`: one `is:inline` script with `define:vars` (so the ID is
  JSON-escaped) that defines `window.dataLayer` and `gtag`, calls
  `gtag('consent', 'default', ...)` with the regions in Data / contracts, then
  `gtag('js', new Date())` and `gtag('config', id)`; followed by
  `<script async src="https://www.googletagmanager.com/gtag/js?id=<id>">`.
  When unset, render neither.
  **Done when:** `PUBLIC_GA_MEASUREMENT_ID=G-TEST123 npm run build` emits both
  scripts on every page with the consent defaults ahead of `config`, and
  `npm run build` with the variable unset (and with `bad-id`) emits no
  `googletagmanager` or `gtag(` anywhere in `dist`.

- [x] **2. `track()` helper and converter events.**
  Add `src/lib/analytics.ts` exporting `track(name, params)`. It calls
  `window.gtag('event', name, params)` only when `typeof window.gtag ===
  'function'`, wraps the call in `try/catch`, and never throws or awaits. In
  `Converter.tsx`, send `file_rejected` from `handleFiles` on a validation error,
  `conversion_start` at the top of `convert()`'s `try`, `conversion_complete`
  after `setConversion('done')`, and `conversion_error` in the `catch` with the
  same error key the UI shows. Parameters exactly as in Data / contracts.
  **Done when:** `npm run build` passes; the diff shows each event fired from
  exactly one place, with only the listed parameters, and no file name, size,
  duration, caption text, or blob data in any call.

- [x] **3. Compressor events.**
  In `Compressor.tsx`, send the same four events with `tool: 'compressor'` and
  the compressor's parameters.
  **Done when:** `npm run build` passes and the diff meets the same rules as
  step 2.

## Files / areas

- `src/layouts/Layout.astro` - measurement ID check, consent defaults, tag.
- `src/lib/analytics.ts` - new, `track()` and the event parameter types.
- `src/components/converter/Converter.tsx` - converter events.
- `src/components/compressor/Compressor.tsx` - compressor events.

## Data / contracts

**Environment:** `PUBLIC_GA_MEASUREMENT_ID` (already listed in the overview's
deployment env vars). Build-time only; must be set in the Cloudflare Pages build
settings for production. Not committed (`.env*` is git-ignored).

**Consent defaults** (run before `config`; the region-specific call wins for
visitors in those regions):

```js
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
  region: [/* EEA + UK + CH, listed below */],
});
gtag('consent', 'default', {
  ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted',
});
```

Regions (ISO 3166-1 alpha-2): the EU 27 (`AT BE BG HR CY CZ DK EE FI FR DE GR HU
IE IT LV LT LU MT NL PL PT RO SK SI ES SE`), plus `IS LI NO` (EEA), `GB`, and
`CH`. Until feature 19 adds a way to grant consent, visitors in these regions
send only GA4's cookieless consent-mode pings, which matches the Privacy and
Cookie Policy.

**Events** (snake_case names; every value is an enum, number, or boolean from
app state, never user content):

| Event                 | Parameters |
| --------------------- | ---------- |
| `file_rejected`       | `tool`, `error` (`'multiple' \| 'empty' \| 'unsupported'`) |
| `conversion_start`    | `tool` + that tool's settings below |
| `conversion_complete` | `tool` + that tool's settings below |
| `conversion_error`    | `tool`, `error` (the existing `ConversionError` / `CompressionError` key) |

`tool` is `'converter'` or `'compressor'`.

Converter settings: `preset` (`'chat' | 'balanced' | 'high' | 'custom'`, where
`null` maps to `'custom'`), `fps`, `width`, `quality`, `format` (source
`VideoFormat`), `crop` (crop aspect or `'none'`), `speed`, `reverse`,
`boomerang`, `caption` (boolean, whether text was added; never the text).

Compressor settings: `colors`, `frame_step`, `resized` (boolean, whether the
width is below the source width).

## Testing

No test or Verify command is configured. Evidence is `npm run build` with the
variable set, unset, and invalid, plus inspection of the built HTML and the
diff. Live event delivery (GA4 DebugView or `window.dataLayer` in a browser) is
not claimed unless `/check` runs it against a dev server the user starts.

## Notes for the AI

- Load `gtag.js` with `async` only; do not add it to any React island or make
  any page wait on it. Feature 14's performance work must not regress.
- `track()` must never break a conversion: no throw, no await, no dependency on
  the tag having loaded (blockers and the unset variable are normal states).
- Keep `track` calls next to the existing state transitions; do not restructure
  `convert()` or `compress()`.
- No new dependencies. No changes to legal copy.
- Follow the Writing standard: no em dashes, en dashes, or ellipsis characters.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7100,"specSha256":"b2981f8e72329f92966e2d7e8a055483e0f02cd836dc3ed77363d4a48f3cf12a","branch":"refs/heads/feature/analytics","head":"b8adea6acfd46f9e6406cd827d28be376897fe75","baseRef":"refs/heads/master","baseCommit":"466393afe33f588b75c0805141d5159304245e74","sourceTree":"7e039d00f6cbaa8abc833af9403034366419c54c","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** b8adea6acfd46f9e6406cd827d28be376897fe75
**Base commit:** 466393afe33f588b75c0805141d5159304245e74
**Base ref:** refs/heads/master
**Spec hash:** b2981f8e72329f92966e2d7e8a055483e0f02cd836dc3ed77363d4a48f3cf12a
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-02T22:31:09Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-02T22:32:39Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base HEAD refs/heads/master`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD, merge base, and spec hash match the request; only review.md differs from the target)
- `npm run build` with PUBLIC_GA_MEASUREMENT_ID unset: pass
- `PUBLIC_GA_MEASUREMENT_ID=bad-id npm run build`: pass
- `PUBLIC_GA_MEASUREMENT_ID='G-ABC"><script>' npm run build`: pass
- `PUBLIC_GA_MEASUREMENT_ID=G-TEST123 npm run build`: pass
- Typecheck: unavailable (no command configured; astro build does not type-check)
- Test command: unavailable (none configured)
- Lint: unavailable (none configured)

### Evidence

- Delta reviewed in full: src/layouts/Layout.astro, src/lib/analytics.ts (new), src/components/converter/Converter.tsx, src/components/compressor/Compressor.tsx, blueprint/context/current-feature.md.
- Measurement ID: Layout.astro accepts only strings matching `^G-[A-Z0-9]+$`. The unset, `bad-id`, and HTML-breaking value builds emit no `googletagmanager` or `gtag(` in any of the 14 HTML files.
- G-TEST123 build: all 14 HTML pages carry exactly one gtag.js script with `async`. In every page head, both `gtag('consent', 'default', ...)` calls come before `gtag('config', ...)`, which comes before the gtag.js script. The ID is JSON-escaped through `define:vars`.
- Region list checked on every page: 32 unique codes matching the EU 27 plus IS, LI, NO, GB, and CH exactly. The denied default is region-scoped and the granted default is global, as the spec contract requires.
- The only `gtag(` text in the unset build is the bundled `track()` helper (`typeof window.gtag === 'function'` guard inside try/catch), which step 2 requires. The step 1 "anywhere in dist" wording is met for all HTML output.
- `track()` returns void, never awaits, checks for the function before calling it, and swallows any throw. Calls happen only in client event handlers.
- Each of the four events fires from exactly one place per tool (8 call sites total). The parameters match the Data / contracts table exactly: preset null maps to 'custom', crop maps to CropAspect or 'none', caption is `hasText()` boolean, and resized is `settings.width < source.width`. No file name, size, duration, caption text, or blob is sent. The error keys are the same values passed to setConversionError/setCompressionError and to the validation error state.
- The catch-block refactor keeps the same error mapping and state transitions. Only the order of setState calls inside the catch changed.
- No new dependencies, no legal copy changes, and no em dash, en dash, or ellipsis characters in added lines.

### Findings

- None

### Remaining risk

- No typecheck command exists (astro build does not type-check). The assignability of the `details` objects to `AnalyticsParams` and the global `Window.gtag` declaration were reviewed by reading only.
- No test command exists, so no automated test covers `track()` or the event call sites.
- No lint command exists.
- Live event delivery (GA4 DebugView, `window.dataLayer` contents, and consent-mode behavior per region) was not observed in a browser, because Check was not required and no dev server was started.

## Try it now

1. Create `.env` with `PUBLIC_GA_MEASUREMENT_ID=G-TEST123`, then start the dev server with `npm run dev` and open http://localhost:4321.
2. View the page source. Expected: in the head, two `gtag('consent', 'default', ...)` calls (the first listing the EEA, UK, and CH regions as denied), then `gtag('config', ...)`, then an async `googletagmanager.com/gtag/js?id=G-TEST123` script.
3. Choose a video, click **Convert to GIF**, and wait for the result. In the DevTools console, run `dataLayer.filter(e => e[0] === 'event')`. Expected: `conversion_start` and `conversion_complete` entries with settings such as `preset`, `fps`, and `format`, and no file name.
4. Drop a non-video file on the drop zone. Expected: a `file_rejected` entry with `error: 'unsupported'`.
5. Remove the variable from `.env` and reload. Expected: no gtag script in the page source, and conversions still work.
