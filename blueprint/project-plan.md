# Project Plan

> One of the two planning docs you provide. Use as much detail as the project
> needs, including rationale, constraints, examples, edge cases, and explicit
> exclusions that should guide later feature work. Draft it directly, develop it
> through any AI conversation, or optionally run `/discovery` for a guided deep
> planning session. The content is always yours to direct. When it is filled in,
> run `/overview` to generate the project overview from this plus `build-plan.md`.

## 1. Problem - What problem are we solving?

People want to turn a short moment from a video into a GIF to share in chats,
social media, presentations, or documentation. Existing tools have common
frustrations: they upload private videos to unknown servers, add watermarks,
show aggressive pop-up ads, are slow, or are confusing on mobile.

Snipgif solves this with a fast, free, and private video-to-GIF converter that
runs entirely in the browser. Videos never leave the user's device, there is no
watermark, no sign-up, and the whole flow (upload → trim → convert → download)
takes less than a minute.

Main purpose: become the go-to simple GIF maker that ranks well on Google for
searches like "video to gif", "mp4 to gif", and "make gif from video", and earn
revenue through respectful advertising.

## 2. Users - Who is this for?

- **Casual social users** who want a funny moment from a video as a GIF or meme for
  WhatsApp, Discord, Telegram, X, or Reddit.
- **Content creators and marketers** who need GIFs for social posts, newsletters,
  and email campaigns (email clients support GIF but not video).
- **Developers and technical writers** who record screen captures and convert them
  to GIFs for GitHub READMEs, bug reports, and documentation.
- **Students and teachers** who use short animations in presentations and lessons.

Most users arrive from Google search, use the tool once or occasionally, and
expect it to work instantly without an account. Many visit on mobile phones.
The site is English only.

## 3. Features - What does the MVP need?

- Video upload by drag-and-drop or file picker (MP4, MOV, WebM, AVI)
- In-browser conversion with ffmpeg.wasm (no server upload)
- Trim with a timeline to select start and end
- Output settings: FPS, width, quality, and quick presets
- GIF preview with file size, download, copy, and share
- Progress bar and friendly error messages
- Crop, resize, speed control, reverse, and boomerang
- Text and caption overlay
- Standalone GIF compressor
- Mobile-first responsive UI with dark and light mode
- Technical SEO, landing pages per format, and a blog
- Legal and trust pages, cookie consent, and Google AdSense

**Explicit exclusions for the MVP:**

- No user accounts or login
- No server-side video processing or storage
- No downloading videos from URLs (YouTube, TikTok, Instagram), because it
  violates those platforms' terms of service and creates copyright risk
- No watermark on output, ever (this is a core marketing promise)

## 4. Data - What are we storing?

Snipgif stores no user videos or GIFs. All processing happens in browser memory
and is discarded when the tab closes. There is no database in the MVP.

What is stored:

- **User preferences (browser localStorage):** theme and last-used conversion
  settings
- **Cookie consent choice (cookie):** managed by the consent platform
- **Blog and guide content (Markdown files in the repo):** articles, FAQ text,
  and landing page copy
- **Anonymous analytics (third-party):** page views, conversions started and
  completed, chosen presets, errors, and device type, with no personal data
- **Static config files:** `ads.txt` for AdSense, `sitemap.xml`, `robots.txt`

## 5. Tech - What stack are we using?

- **Framework:** Astro, because it outputs fast static HTML that Google indexes
  easily and has content collections for the blog
- **Interactive converter:** React component loaded as an Astro island, so only
  the converter page ships JavaScript
- **Styling:** Tailwind CSS with the app's own small components (no shadcn/ui)
- **Video processing:** ffmpeg.wasm, using the **single-threaded core**. The
  multi-threaded core needs COOP/COEP headers, which break Google AdSense ads.
- **ffmpeg core hosting:** loaded on demand from jsDelivr CDN (the core file is
  around 30 MB, larger than some static hosts allow per file), and only after
  the user selects a video, so page load stays fast
- **Icons:** Lucide
- **Analytics:** Google Analytics 4 (integrates with AdSense reporting)
- **Consent:** a Google-certified CMP (Google's own Privacy & messaging tool in
  AdSense is free)
- **Contact form:** Formspree or a similar form service (no backend needed)
- **Language:** TypeScript

## 6. Monetize - How will this make money?

**Phase 1 - Google AdSense (launch):**

- Ads placed where they don't interrupt the task: sidebar on desktop, below the
  finished GIF, and between paragraphs on blog posts
- The conversion wait time is a natural moment for a visible ad slot near the
  progress bar
- No pop-ups, no interstitials, and no ads that shift the layout, to protect
  user trust and Core Web Vitals
- Traffic strategy: rank on Google through format landing pages and how-to
  blog posts

**Phase 2 - Optional later ideas (not in MVP):**

- Snipgif Pro: ad-free, larger file limits, batch conversion, and extra export
  formats, as a low monthly price
- Affiliate links in blog guides (screen recorders, video editors)
- Apply to higher-paying ad networks such as Ezoic or Mediavine once monthly
  traffic grows

## 7. UI/UX - How should this look and feel?

**Feeling:** modern, friendly, fast, and trustworthy. A user should understand
what to do within 3 seconds of landing.

- **Hero area:** a large drop zone above the fold with a short headline like
  "Turn any video into a GIF — free, fast, and private" and a privacy badge
  saying "Your files never leave your device"
- **One-page flow:** upload → trim → adjust → convert → download, shown as a
  simple step indicator, with no page reloads
- **Visual style:** clean white or near-black background, one bold accent
  color (for example a vibrant violet or coral), rounded corners, soft shadows,
  and a modern sans-serif font such as Inter or Plus Jakarta Sans
- **Mobile-first:** large touch targets, a timeline that works with thumbs, and
  a sticky download button on small screens
- **Dark and light mode:** follows the system setting with a manual toggle
- **Below the tool:** short "How it works" steps, feature highlights, and an FAQ
  section (good for SEO and for AdSense approval)
- **Accessibility:** keyboard navigation, visible focus states, good color
  contrast, and alt text

Inspiration: the simplicity of Squoosh and Remove.bg, where the tool is the page.

## 8. Deployment - Where and how will this ship?

- **Host:** Cloudflare Pages (free plan allows commercial use and has unlimited
  bandwidth). Note: Vercel's free Hobby plan does not allow commercial use,
  and ads count as commercial.
- **App type:** static site
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:**
  - `PUBLIC_SITE_URL`
  - `PUBLIC_ADSENSE_CLIENT_ID`
  - `PUBLIC_GA_MEASUREMENT_ID`
  - `PUBLIC_FORMSPREE_ID`
- **Database or storage:** none
- **Workers or cron jobs:** none
- **Health check path:** not needed for a static site
- **Domain:** snipgif.com if available (alternatives: snipgif.app, snipgif.io),
  with HTTPS and redirect of www to the root domain
- **Required root files:** `ads.txt`, `robots.txt`, `sitemap.xml`
- **After launch:** submit the sitemap to Google Search Console and Bing
  Webmaster Tools

## 9. Usage model and constraints (optional)

- **Operation:** public, internet-facing website
- **Users:** anonymous visitors with no accounts; no trusted or admin users in
  the app itself
- **Scale:** starting small, with the goal of growing through search traffic.
  Because conversion runs on each user's device, server cost stays near zero
  as traffic grows.
- **Device limits:** browser memory limits large videos, especially on phones.
  Set a recommended input limit (around 200 MB) and a maximum GIF length
  (around 30 seconds), with clear warnings instead of crashes.
- **Privacy and compliance:** GDPR consent for EU/UK visitors (required by
  Google for ads), a clear privacy policy, and compliance with Morocco's data
  protection law 09-08 (CNDP)
- **Security:** small attack surface since there is no backend; protect the
  contact form from spam with the form service's built-in protection
- **Explicit non-requirements:** no accounts, no file storage, no server-side
  processing, no URL video downloading, no enterprise or multi-tenant features
