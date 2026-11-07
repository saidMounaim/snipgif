# Snipgif - Project Overview

<!-- blueprint:source-hash 75f3659c890bfb088b6f0a29401dfe204aa6cc0ebdb05e8af0404760d146053b -->

> A fast, free, private video-to-GIF converter that runs entirely in the browser:
> no upload, no watermark, no sign-up. Upload, trim, convert, download in under a
> minute. Free and open source (MIT), with no ads, grown through Google search.

## Problem

Turning a short video moment into a GIF usually means uploading private videos to
unknown servers, watermarks, aggressive pop-up ads, slow processing, or confusing
mobile UIs. Snipgif does the conversion on the user's device with ffmpeg.wasm, so
files never leave it. The business goal is to rank for searches like "video to
gif", "mp4 to gif", and "make gif from video".

## Users

All users are anonymous; there is one access tier.

- **Casual social users** - funny moments and memes for WhatsApp, Discord,
  Telegram, X, Reddit.
- **Creators and marketers** - GIFs for social posts, newsletters, and email
  (email supports GIF, not video).
- **Developers and technical writers** - screen captures for READMEs, bug
  reports, and docs.
- **Students and teachers** - short animations for presentations and lessons.

Most arrive from Google search, use the tool once or occasionally, expect it to
work instantly without an account, and many are on phones. The site is English
only.

## Usage model

- **Operation:** public, internet-facing static website.
- **Users:** anonymous visitors only; no accounts, no trusted or admin users.
- **Scale:** small start, growth through search. Conversion runs client-side, so
  server cost stays near zero as traffic grows.
- **Device limits:** browser memory caps large videos, especially on phones.
  Recommended input limit about **200 MB**, max GIF length about **30 seconds**,
  with clear warnings instead of crashes.
- **Privacy and compliance:** no analytics cookies for EEA, UK, and Swiss
  visitors (so no consent banner), a clear privacy policy, and Morocco data
  protection law 09-08 (CNDP).
- **Security:** no backend and no forms, small attack surface. No contact page
  or email; questions go to GitHub issues.
- **Non-requirements:** no accounts, no file storage, no server-side processing,
  no downloading videos from URLs (YouTube, TikTok, Instagram: ToS and copyright
  risk), no enterprise or multi-tenant features.
- **Hard promise:** never a watermark on output.

## Features

In build-plan order. The headline is the converter flow, features 1 to 6.

1. **Video upload** - drag-and-drop or file picker for MP4, MOV, WebM, AVI with
   size and format validation.
2. **In-browser conversion engine** - ffmpeg.wasm (single-threaded core) converts
   video to GIF on the device. *Headline feature.*
3. **Trim and clip selection** - timeline with video preview to pick start and end.
4. **Output settings and presets** - FPS, width, quality, plus one-click presets
   ("Small for chat", "Balanced", "High quality").
5. **GIF preview and download** - show the GIF with its file size; download, copy
   to clipboard, or share via the Web Share API.
6. **Progress and error handling** - progress bar during conversion; friendly
   messages for unsupported files and low-memory devices.
7. **Crop and resize** - crop with aspect-ratio picker (1:1, 16:9, 9:16).
8. **Speed, reverse, and boomerang** - playback speed, reversed clip, or
   back-and-forth loop.
9. **Text and caption overlay** - meme-style text with font, color, and position.
10. **GIF compressor** - standalone tool to shrink existing GIFs via color
    reduction and frame skipping.
11. **Modern responsive UI** - mobile-first layout, dark and light mode, clean
    one-page workflow, accessible controls.
12. **Technical SEO foundation** - meta tags, Open Graph and Twitter cards,
    sitemap.xml, robots.txt, canonical URLs, JSON-LD.
13. **SEO tool landing pages** - one page per search intent (MP4, MOV, WebM to
    GIF, GIF Compressor) with unique text and FAQ schema.
14. **Performance optimization** - lazy-load the converter, optimize images and
    fonts, keep Core Web Vitals green.
15. **Trust and legal pages** - About, Privacy Policy, Terms of Use,
    Cookie Policy.
16. **Blog and guides** - how-to articles for long-tail search traffic.
18. **Analytics** - visits, completed conversions, popular settings.
19. **Cookie consent banner** - removed by a later fix: with no ads, no banner is
    needed; the Consent Mode defaults stay for GA4.
21. **Installable PWA** - install on phone or desktop and use offline.
22. **More output formats** - animated WebP, MP4 (GIF to video), and APNG.

## Data model

No database and no server storage. User videos and GIFs live only in browser
memory and are discarded when the tab closes.

### Converter session (in memory, never persisted)

- `SourceVideo` - `file` (File), `name` (string), `mimeType` (string),
  `sizeBytes` (number), `durationSec` (number), `width`/`height` (number)
- `ClipRange` - `startSec` (number), `endSec` (number); length capped near 30 s
- `OutputSettings` - `fps` (number), `width` (number), `quality` (number or
  enum), `preset` (`"chat" | "balanced" | "high" | null`)
- `Edits` (features 7 to 9) - `crop` ({ x, y, w, h, aspect: `"1:1" | "16:9" |
  "9:16" | "free"` } or null), `speed` (number, 1 = normal), `reverse` (boolean),
  `boomerang` (boolean), `textOverlays` ({ text, font, color, position }[])
- `GifResult` - `blob` (Blob), `objectUrl` (string), `sizeBytes` (number)
- `ConversionState` - `status` (`"idle" | "loading-core" | "converting" | "done"
  | "error"`), `progress` (0 to 1), `error` (friendly message key or null)

> Lock `OutputSettings` and `ClipRange` in features 3 and 4; features 7 to 10, 18,
> and 22 build on them. Exact FPS, width, and quality ranges and preset values are
> a TODO for the feature 4 spec.

### User preferences (localStorage)

- `theme` (`"system" | "light" | "dark"`)
- `lastSettings` (`OutputSettings`)

### Content (Markdown in repo, Astro content collections)

- Blog post / guide - `title`, `description`, `slug`, publish date, body.
- Landing page and FAQ copy per format.

> Exact frontmatter fields are a TODO for features 13 and 16.

### Analytics events (third-party, anonymous)

- Page views, conversion started, conversion completed, preset chosen, error
  type, device type. No personal data.

### Static root files

- `robots.txt`, `sitemap.xml`.

## Tech stack

- **Astro** - static HTML output that Google indexes easily, plus content
  collections for blog and copy.
- **React (Astro island)** - the interactive converter; only converter pages ship
  JavaScript.
- **TypeScript** - throughout.
- **Tailwind CSS + shadcn/ui** - styling and UI components (shadcn inside React
  islands).
- **ffmpeg.wasm, single-threaded core** - video processing. The multi-threaded
  core needs COOP/COEP headers, which block third-party resources that do not
  opt in (such as the Google Analytics tag), so it is out.
- **ffmpeg core from jsDelivr CDN** - about 30 MB, loaded on demand only after a
  video is selected, so page load stays fast.
- **Lucide** - icons.
- **Google Analytics 4 with Consent Mode** - analytics; storage stays denied for
  EEA, UK, and Swiss visitors (cookieless measurement only), so no banner.

## Monetization

None. Snipgif is free and open source on GitHub under the MIT license: no ads,
no paid tier, no affiliate links, and every feature free for everyone.

## UI/UX

Modern, friendly, fast, trustworthy; understandable within 3 seconds. Inspired by
Squoosh and Remove.bg, where the tool is the page.

- **Hero:** large drop zone above the fold, headline like "Turn any video into a
  GIF, free, fast, and private", privacy badge "Your files never leave your
  device".
- **One-page flow:** upload, trim, adjust, convert, download with a step
  indicator and no reloads.
- **Style:** white or near-black background, one bold accent (violet or coral),
  rounded corners, soft shadows, Inter or Plus Jakarta Sans.
- **Mobile-first:** large touch targets, thumb-friendly timeline, sticky download
  button on small screens.
- **Theme:** follows the system with a manual toggle.
- **Below the tool:** "How it works", feature highlights, FAQ.
- **Accessibility:** keyboard navigation, visible focus, good contrast, alt text.

Routes (slugs indicative, finalize in each feature spec):

- `/` - converter (hero, flow, how it works, FAQ)
- `/mp4-to-gif`, `/mov-to-gif`, `/webm-to-gif` - format landing pages with the
  converter
- `/gif-compressor` - standalone compressor
- `/blog`, `/blog/<slug>` - guides
- `/about`, `/privacy`, `/terms`, `/cookies` - trust and legal

## Deployment

- **Host:** Vercel, free Hobby plan (non-commercial open-source project, no
  ads).
- **App type:** static site. No database, storage, workers, or cron. No health
  check needed.
- **Build:** `npm run build`, output directory `dist`.
- **Env vars:** `PUBLIC_SITE_URL`, `PUBLIC_GA_MEASUREMENT_ID`.
- **Domain:** the Vercel subdomain (`snipgif.vercel.app`) for now, HTTPS; a
  custom domain can come later.
- **Root files:** `robots.txt`, `sitemap.xml`.
- **After launch:** submit the sitemap to Google Search Console and Bing
  Webmaster Tools.

## Open questions

> Resolve in the plans, then re-run /overview.

- **Features 21 and 22 are not in the project plan MVP.** Section 3 never lists a
  PWA or extra formats. Are they MVP or post-MVP? (There is no paid tier, so
  either way they are free.)
- **PWA offline vs on-demand CDN core.** Offline use (feature 21) needs the ~30 MB
  ffmpeg core cached locally, which conflicts with loading it from jsDelivr only
  on demand.
- **Copy GIF to clipboard (feature 5).** Browser clipboard APIs reliably support
  PNG, not GIF; decide the fallback (copy a static frame, or hide copy where
  unsupported).
- **Feature 11 ordering.** Features 1 to 10 ship UI before the "Modern responsive
  UI" feature. Clarify whether 11 is a polish pass over existing screens or the
  base layout and theme that earlier features should already use.
- **Output ranges and presets.** FPS, width, and quality ranges and what each
  preset sets are not defined.
