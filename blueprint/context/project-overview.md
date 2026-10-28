# Snipgif - Project Overview

<!-- blueprint:source-hash 9b1f684613e5f10d58281c7bacead4475a52727c63f0fd50fddc213e566a611d -->

> A fast, free, private video-to-GIF converter that runs entirely in the browser:
> no upload, no watermark, no sign-up. Upload, trim, convert, download in under a
> minute. Monetized with respectful AdSense ads and grown through Google search.

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
work instantly without an account, and many are on phones. Languages: English
first, then French, Arabic (RTL), and Spanish.

## Usage model

- **Operation:** public, internet-facing static website.
- **Users:** anonymous visitors only; no accounts, no trusted or admin users.
- **Scale:** small start, growth through search. Conversion runs client-side, so
  server cost stays near zero as traffic grows.
- **Device limits:** browser memory caps large videos, especially on phones.
  Recommended input limit about **200 MB**, max GIF length about **30 seconds**,
  with clear warnings instead of crashes.
- **Privacy and compliance:** GDPR consent for EU/UK visitors (required by Google
  for ads), a clear privacy policy, and Morocco data protection law 09-08 (CNDP).
- **Security:** no backend, small attack surface. Contact form spam protection
  comes from the form service.
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
15. **Trust and legal pages** - About, Contact, Privacy Policy, Terms of Use,
    Cookie Policy (needed for AdSense approval).
16. **Blog and guides** - how-to articles for long-tail search traffic.
17. **Multilingual support** - EN, FR, AR (RTL), ES with hreflang tags.
18. **Analytics** - visits, completed conversions, popular settings.
19. **Cookie consent banner** - Google-certified CMP for EU/UK ad consent.
20. **Google AdSense integration** - non-intrusive slots that never block the
    conversion flow or shift layout.
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
- `language` (`"en" | "fr" | "ar" | "es"`)
- `lastSettings` (`OutputSettings`)

### Consent (cookie)

- Consent choice, owned and stored by the CMP, not by app code.

### Content (Markdown in repo, Astro content collections)

- Blog post / guide - `title`, `description`, `lang`, `slug`, publish date, body.
- Landing page and FAQ copy per format and per language.

> Exact frontmatter fields are a TODO for features 13 and 16.

### Analytics events (third-party, anonymous)

- Page views, conversion started, conversion completed, preset chosen, error
  type, device type. No personal data.

### Static root files

- `ads.txt`, `robots.txt`, `sitemap.xml`.

## Tech stack

- **Astro** - static HTML output that Google indexes easily, built-in i18n
  routing, content collections for blog and copy.
- **React (Astro island)** - the interactive converter; only converter pages ship
  JavaScript.
- **TypeScript** - throughout.
- **Tailwind CSS + shadcn/ui** - styling and UI components (shadcn inside React
  islands).
- **ffmpeg.wasm, single-threaded core** - video processing. The multi-threaded
  core needs COOP/COEP headers, which break AdSense, so it is out.
- **ffmpeg core from jsDelivr CDN** - about 30 MB, loaded on demand only after a
  video is selected, so page load stays fast.
- **Lucide** - icons.
- **Google Analytics 4** - analytics, integrates with AdSense reporting.
- **Google Privacy & messaging (AdSense CMP)** - free Google-certified consent.
- **Formspree (or similar)** - contact form without a backend.

## Monetization

- **Phase 1 (launch): Google AdSense.** Desktop sidebar, below the finished GIF,
  between blog paragraphs, and a visible slot near the progress bar during
  conversion. No pop-ups, no interstitials, no layout-shifting ads.
- **Phase 2 (not MVP):** Snipgif Pro (ad-free, larger limits, batch, extra
  export formats), affiliate links in guides, higher-paying ad networks (Ezoic,
  Mediavine) once traffic grows.

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
- **RTL:** fully mirrored Arabic layout.
- **Below the tool:** "How it works", feature highlights, FAQ.
- **Accessibility:** keyboard navigation, visible focus, good contrast, alt text.

Routes (slugs indicative, finalize in each feature spec; FR/AR/ES under locale
prefixes such as `/fr/`):

- `/` - converter (hero, flow, how it works, FAQ)
- `/mp4-to-gif`, `/mov-to-gif`, `/webm-to-gif` - format landing pages with the
  converter
- `/gif-compressor` - standalone compressor
- `/blog`, `/blog/<slug>` - guides
- `/about`, `/contact`, `/privacy`, `/terms`, `/cookies` - trust and legal

## Deployment

- **Host:** Cloudflare Pages (free plan allows commercial use and unlimited
  bandwidth; Vercel Hobby forbids commercial use, and ads count).
- **App type:** static site. No database, storage, workers, or cron. No health
  check needed.
- **Build:** `npm run build`, output directory `dist`.
- **Env vars:** `PUBLIC_SITE_URL`, `PUBLIC_ADSENSE_CLIENT_ID`,
  `PUBLIC_GA_MEASUREMENT_ID`, `PUBLIC_FORMSPREE_ID`.
- **Domain:** snipgif.com if available (else snipgif.app or snipgif.io), HTTPS,
  www redirects to the root domain.
- **Root files:** `ads.txt`, `robots.txt`, `sitemap.xml`.
- **After launch:** submit the sitemap to Google Search Console and Bing
  Webmaster Tools.

## Open questions

> Resolve in the plans, then re-run /overview.

- **Features 21 and 22 are not in the project plan MVP.** Section 3 never lists a
  PWA or extra formats, and section 6 puts extra export formats under Phase 2
  Pro. Are they MVP, post-MVP free, or Pro?
- **PWA offline vs on-demand CDN core.** Offline use (feature 21) needs the ~30 MB
  ffmpeg core cached locally, which conflicts with loading it from jsDelivr only
  on demand.
- **Analytics choice.** Section 5 says GA4; feature 18 says "GA4 or a
  privacy-friendly alternative".
- **Copy GIF to clipboard (feature 5).** Browser clipboard APIs reliably support
  PNG, not GIF; decide the fallback (copy a static frame, or hide copy where
  unsupported).
- **Feature 11 ordering.** Features 1 to 10 ship UI before the "Modern responsive
  UI" feature. Clarify whether 11 is a polish pass over existing screens or the
  base layout and theme that earlier features should already use.
- **Output ranges and presets.** FPS, width, and quality ranges and what each
  preset sets are not defined.
- **Language preference.** Section 4 stores language in localStorage while
  feature 17 uses locale URLs; confirm the URL is authoritative and storage is
  only a redirect hint.
