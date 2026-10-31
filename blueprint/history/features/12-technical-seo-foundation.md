# Feature: Technical SEO foundation

**From build-plan:** feature 12
**Build attempt:** 1
**Branch:** feature/technical-seo-foundation
**Status:** verified

## Goal

Make every page Google- and share-ready: a unique title and description, a
canonical URL, Open Graph and Twitter card tags with a share image, JSON-LD
structured data, and root `robots.txt` and `sitemap.xml` files generated from the
real page list at build time.

## In scope

- Absolute site URL from `PUBLIC_SITE_URL` (overview Deployment env var), wired
  into Astro's `site` so canonicals, OG URLs, robots, and sitemap use one source.
- URL shape: no trailing slash (`/`, `/gif-compressor`), matching existing nav
  links and the overview routes.
- Shared head tags in `Layout.astro`: `description`, `canonical`, Open Graph
  (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`,
  `og:image` + width/height/alt, `og:locale`), and Twitter
  (`summary_large_image`, title, description, image, image alt).
- One static 1200x630 PNG share image used by every page.
- Unique titles and descriptions for `/` and `/gif-compressor`.
- JSON-LD: `WebSite` on `/`, `WebApplication` on `/` (video to GIF) and on
  `/gif-compressor`.
- `robots.txt` (allow all, absolute `Sitemap:` line) and `sitemap.xml` listing
  every static page, both generated at build time.

## Out of scope

- FAQ schema and format landing pages (feature 13).
- Image/font performance work (feature 14), trust pages (feature 15), blog
  (feature 16), hreflang and locales (feature 17), `ads.txt` (feature 20).
- Per-page share images, `lastmod` dates, Search Console submission, and domain
  or www-redirect setup on the host (deployment work).
- A 404 page.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. Checkpoint commits are disabled. `/complete` creates the final commit.

## Build steps

- [x] **1. Site URL and URL shape.** In `astro.config.mjs`, set
  `site` from `PUBLIC_SITE_URL` read with Vite's `loadEnv` (so both `.env` files
  and the host's build env work), falling back to `https://snipgif.com`. Strip a
  trailing slash from the value. Set `trailingSlash: 'never'` and
  `build: { format: 'file' }` so pages build to `dist/index.html` and
  `dist/gif-compressor.html` and serve at slash-less URLs on Cloudflare Pages.
  Done when: `npm run build` passes, `dist/gif-compressor.html` exists, and
  both nav links still work in `npm run preview`.

- [x] **2. Share image.** Add `public/og-image.png`, 1200x630, under ~150 KB:
  Snipgif name, the Film mark, and "Turn any video into a GIF — free, fast, and
  private" on the brand gradient with readable contrast. Render it once from an
  SVG with the installed `sharp` (one-off command, not a build step or new
  dependency); commit only the PNG.
  Done when: the file exists at exactly 1200x630 (checked with `sharp` metadata
  or `file`) and is visually legible.

- [x] **3. Head tags in Layout.** Add a required `description` prop to
  `src/layouts/Layout.astro`. Compute `canonical = new URL(Astro.url.pathname,
  Astro.site)` and the absolute image URL from `Astro.site`. Emit the tags listed
  in In scope; `og:title`/`twitter:title` reuse `title`. Add a named
  `<slot name="head" />` at the end of `<head>` for page-specific tags. Change
  viewport to `width=device-width, initial-scale=1`. Update both pages:
  - `/` title: `Snipgif - Free Video to GIF Converter, Private and Fast`;
    description: `Turn any MP4, MOV, WebM, or AVI video into a GIF right in your
    browser. Trim, crop, add captions, and resize. No upload, no watermark, no
    sign-up.`
  - `/gif-compressor` title: `GIF Compressor - Snipgif`; description: `Make
    GIFs smaller right in your browser. Cut colors, skip frames, or shrink the
    width. No upload, no watermark, no sign-up.`
  Done when: the built HTML for both pages contains one `<title>`, one
  description, one canonical (`https://<site>/` and
  `https://<site>/gif-compressor`), and the full OG/Twitter set with absolute
  URLs.

- [x] **4. JSON-LD.** Add `src/components/site/JsonLd.astro` that takes a
  `data` object and renders
  `<script type="application/ld+json" set:html={...} />` with
  `JSON.stringify(data).replace(/</g, '\\u003c')` so content can never close the
  script tag. Pages pass it through `slot="head"`:
  - `/`: `WebSite` (`name`, `url`) and `WebApplication` (`name`: "Snipgif Video
    to GIF Converter", `url`, `description`, `applicationCategory`:
    "MultimediaApplication", `operatingSystem`: "Any", `browserRequirements`:
    "Requires JavaScript and WebAssembly", `isAccessibleForFree`: true,
    `offers`: `{ "@type": "Offer", price: "0", priceCurrency: "USD" }`).
  - `/gif-compressor`: `WebApplication` with the same shape, its own name, URL,
    and description.
  Done when: each built page's JSON-LD blocks parse with `JSON.parse`, contain
  `@context: "https://schema.org"`, and URLs match the canonical.

- [x] **5. robots.txt and sitemap.xml.** Add static endpoints
  `src/pages/robots.txt.ts` and `src/pages/sitemap.xml.ts` (`GET` with the
  `site` from the API context).
  - robots: `User-agent: *`, `Allow: /`, `Sitemap: <site>/sitemap.xml`.
  - sitemap: discover pages with `import.meta.glob('./**/*.astro')` in
    `src/pages`, map file paths to slash-less routes (`index` -> `/`), skip
    dynamic (`[`) and underscore-prefixed files, emit a sorted `<urlset>` with
    absolute `<loc>` entries, XML-escaped, served as `application/xml`.
  Done when: `dist/robots.txt` and `dist/sitemap.xml` exist, the sitemap lists
  exactly `/` and `/gif-compressor` with absolute URLs, and both match the
  canonicals. A build with `PUBLIC_SITE_URL=https://example.test` changes every
  absolute URL in HTML, robots, and sitemap.

## Files / areas

- `astro.config.mjs` - `site`, `trailingSlash`, `build.format`
- `src/layouts/Layout.astro` - `description` prop, head tags, `head` slot
- `src/components/site/JsonLd.astro` - new
- `src/pages/index.astro`, `src/pages/gif-compressor.astro` - copy, JSON-LD
- `src/pages/robots.txt.ts`, `src/pages/sitemap.xml.ts` - new
- `public/og-image.png` - new

## Data / contracts

- `PUBLIC_SITE_URL`: origin without trailing slash, e.g. `https://snipgif.com`.
  Public, not a secret. Fallback `https://snipgif.com` (see Open questions).
- Canonical URL = site origin + page path, no trailing slash except `/`. The
  sitemap, `og:url`, and JSON-LD `url` all use this same value.
- Share image path is stable at `/og-image.png` (features 13 and 16 may add
  per-page images later through an optional prop; not now).
- All metadata is author-written static text; no user input reaches the head.

## Testing

No test or Verify command is configured, so evidence is:

- `npm run build` passes (no Verify command exists; build is the gate).
- Inspect `dist/index.html`, `dist/gif-compressor.html`, `dist/robots.txt`, and
  `dist/sitemap.xml` for the done-when values; parse each JSON-LD block with
  Node.
- Rebuild with `PUBLIC_SITE_URL=https://example.test` and grep that every
  absolute URL changed.
- `npm run preview`: both pages load, nav works, `/robots.txt` and
  `/sitemap.xml` are served.
- Share-card and Rich Results validators need a public URL, so they are not
  claimed here; list them as post-deploy checks.

## Notes for the AI

- Check Astro 7 docs for `site`, `trailingSlash`, `build.format`, static
  endpoints, and `loadEnv` usage in config before writing them.
- `astro preview` may treat trailing slashes differently from Cloudflare Pages;
  judge the URL shape from the `dist/` file layout, not only from preview.
- Keep comments to the why (e.g. the `<` escaping, the slash-less URL choice).
- Do not add `@astrojs/sitemap` or any dependency; the glob endpoint covers the
  current page set and picks up later pages automatically.

## Open questions

- **Production domain.** The overview says snipgif.com "if available". The spec
  falls back to `https://snipgif.com` when `PUBLIC_SITE_URL` is unset. Not
  blocking, since the env var overrides it, but confirm the domain before deploy
  so canonicals never point at the wrong host.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8145,"specSha256":"72a7558d781f4eec2d0e704f1def42df5cd042223f17e6735ba51151b7011daa","branch":"refs/heads/feature/technical-seo-foundation","head":"31bc74155239540caea20e40aca5e9d84d81663d","baseRef":"refs/heads/master","baseCommit":"31bc74155239540caea20e40aca5e9d84d81663d","sourceTree":"6636082a25a479b528ee0cf04d93d3eee51c3bf5","landing":"local-merge","absentOptional":[]} -->


## Try it now

Run or do:

Run `npm run build && npm run preview`, then open
http://localhost:4321/robots.txt and http://localhost:4321/sitemap.xml. On the
home page, view the page source.

Expected:

robots.txt shows `Allow: /` and `Sitemap: https://snipgif.com/sitemap.xml`.
The sitemap lists exactly `/` and `/gif-compressor`. The home page `<head>`
has the new title, a description, `<link rel="canonical"
href="https://snipgif.com/">`, the `og:` and `twitter:` tags pointing at
`https://snipgif.com/og-image.png`, and two `application/ld+json` blocks.

This proves:

The SEO metadata, share image, robots.txt, and sitemap are generated at build
time from one site URL.
