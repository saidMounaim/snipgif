# Feature: Blog and guides section

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/blog-and-guides-section
**Status:** verified

## Goal

Add a static `/blog` section of how-to guides, written in Markdown in an Astro
content collection, so Snipgif can rank for long-tail searches such as "how to
make a GIF from a video on iPhone" and send that traffic to the converter and
compressor.

## In scope

- A `blog` content collection with a validated frontmatter schema.
- A guides index at `/blog` listing every guide, newest first.
- One page per guide at `/blog/<slug>`, where the slug is the Markdown filename.
- `BlogPosting` JSON-LD on each guide page.
- Guide URLs in `sitemap.xml` (the current sitemap skips dynamic routes).
- A "Guides" link in the footer Site navigation.
- Three launch guides (see Data / contracts), each ending with a link into the
  matching tool.
- Ordered-list and inline-code styling in the shared prose wrapper so numbered
  steps render properly.

## Out of scope

- Ad slots between paragraphs (feature 20), analytics (feature 18).
- Tags, categories, search, pagination, RSS, author pages, related posts,
  comments, reading time.
- Images or screenshots inside guides, per-guide Open Graph images.
- Drafts or scheduled (future-dated) publishing.
- A custom 404 page.
- Header navigation changes (the header keeps its two tool links).

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`: no commits per step.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Blog collection and the first guide page.**
  Add the `blog` collection to `src/content.config.ts`. Add
  `src/content/blog/how-to-make-a-gif-from-a-video-on-iphone.md`. Add
  `src/pages/blog/[slug].astro` with `getStaticPaths` over `getCollection('blog')`,
  rendering through `Layout` with the guide's `title` and `description`: an
  `h1` from `heading`, a "Published" date (and "Updated" when set) as `<time>`
  formatted in UTC like `TextPage.astro`, the body inside `LandingText`, and a
  closing call-to-action link to the guide's tool. Emit `BlogPosting` JSON-LD
  through `JsonLd`. Extend `LandingText.astro` with `ol` (decimal, padded, gapped
  like `ul`) and inline `code` styles using existing tokens only.
  **Done when:** `npm run build` succeeds and emits
  `dist/blog/how-to-make-a-gif-from-a-video-on-iphone.html` containing the `h1`,
  the published date, the rendered body, a canonical of
  `<site>/blog/how-to-make-a-gif-from-a-video-on-iphone`, and a valid
  `BlogPosting` JSON-LD block.

- [x] **2. Guides index, footer link, and sitemap.**
  Add `src/pages/blog/index.astro`: `h1` "Guides", a short intro, and a list of
  guides sorted by `published` descending (ties by title), each with its heading
  as a link, its description, and its date. If the collection is empty, show a
  plain "No guides yet" message instead of an empty list. Add
  `{ href: '/blog', label: 'Guides' }` as the first `SITE_LINKS` entry in
  `Layout.astro`. Extend `src/pages/sitemap.xml.ts` to append `/blog/<id>` for
  every `blog` entry, deduplicated and sorted with the existing routes. Check the
  built filename of the index under `build.format: 'file'` and confirm its
  canonical is `<site>/blog` (no `.html`, no trailing slash).
  **Done when:** `npm run build` emits the guides index, its canonical is
  `<site>/blog`, every page's footer shows "Guides", and `dist/sitemap.xml`
  lists `/blog` and `/blog/how-to-make-a-gif-from-a-video-on-iphone` exactly
  once each.

- [x] **3. Remaining launch guides.**
  Add `how-to-make-a-gif-for-a-github-readme.md` and
  `how-to-reduce-gif-file-size.md` to `src/content/blog/`.
  **Done when:** `npm run build` emits all three guide pages, the index lists
  them newest first, and the sitemap lists all three.

## Files / areas

- `src/content.config.ts` - add the `blog` collection and export it.
- `src/content/blog/*.md` - new, three guides.
- `src/pages/blog/[slug].astro` - new, guide page.
- `src/pages/blog/index.astro` - new, guides index.
- `src/components/landing/LandingText.astro` - add `ol` and `code` prose styles.
- `src/layouts/Layout.astro` - add the footer "Guides" link.
- `src/pages/sitemap.xml.ts` - append guide URLs.
- Reused unchanged: `src/components/site/JsonLd.astro`, `public/og-image.png`.

If the guide page markup grows past what fits cleanly in the route file, move it
into `src/components/blog/GuidePage.astro`; otherwise keep it in the route.

## Data / contracts

`blog` collection, `glob({ pattern: '*.md', base: './src/content/blog' })`. The
filename (entry `id`) is the URL slug, matching the `landing` and `pages`
collections. Schema:

| Field         | Type                         | Notes                                               |
| ------------- | ---------------------------- | --------------------------------------------------- |
| `title`       | `string`                     | `<title>` and OG title; include "Snipgif" brand like existing pages |
| `description` | `string`                     | meta description and index summary                  |
| `heading`     | `string`                     | visible `h1` and JSON-LD `headline`                 |
| `published`   | `z.coerce.date()`            | required; ISO date in frontmatter (`2026-11-02`)    |
| `updated`     | `z.coerce.date().optional()` | shown as "Updated" when present                     |
| `tool`        | `'/' \| '/mp4-to-gif' \| '/mov-to-gif' \| '/webm-to-gif' \| '/gif-compressor'` | target of the closing call-to-action |

A missing or invalid field fails `astro build` (content collection validation),
which is the intended error behavior for repo-authored content.

`BlogPosting` JSON-LD per guide: `@context`, `@type: 'BlogPosting'`,
`headline` (heading), `description`, `datePublished` and `dateModified`
(`updated` or `published`, as `YYYY-MM-DD`), `mainEntityOfPage` and `url` (the
canonical), `image` (absolute `/og-image.png`), `author` and `publisher` as
`{ '@type': 'Organization', name: 'Snipgif', url: <site root> }`.

Launch guides (slug - tool):

1. `how-to-make-a-gif-from-a-video-on-iphone` - `/` (the plan's example).
2. `how-to-make-a-gif-for-a-github-readme` - `/` (developer persona: screen
   recording to GIF, keep it small, embed with Markdown).
3. `how-to-reduce-gif-file-size` - `/gif-compressor`.

Each guide is original, roughly 500 to 900 words, uses `##` headings (the page
`h1` is the heading field), and includes a numbered step list.

## Testing

No test, typecheck, or Verify command is configured, so there are no automated
gates beyond the build. Each step's evidence is `npm run build` plus inspection
of the emitted HTML and `dist/sitemap.xml`. No browser or visual evidence is
claimed unless `/check` runs it.

## Notes for the AI

- Guides must describe the app as it actually behaves. Before writing each one,
  confirm accepted formats, the size and length limits, preset names, button
  labels, and download, copy, and share behavior from
  `src/lib/video-file.ts`, `src/lib/clip-range.ts`, `src/lib/output-settings.ts`,
  `src/components/converter/*`, and `src/components/compressor/Compressor.tsx`.
  Do not promise behavior the app lacks.
- Do not state third-party numeric limits (Discord, GitHub, iOS) unless certain;
  phrase them generally ("many chat apps cap uploads") instead.
- Keep the privacy promise accurate: conversion runs on the device and files are
  never uploaded.
- Content is repo-authored and trusted; render it with Astro's Markdown pipeline
  and keep all JSON-LD through `JsonLd.astro` (it escapes `<`).
- Follow the Writing standard: no em dashes, en dashes, or ellipsis characters in
  guide copy, comments, or the spec.
- Guide pages and the index ship no JavaScript beyond the existing layout
  (theme toggle). No new dependencies.
- Use only existing color tokens; links in the call-to-action keep a 44 px
  touch target (`min-h-11`) and the shared focus ring style.
- Dates use `timeZone: 'UTC'` so the built date never shifts by a day.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8124,"specSha256":"4dcbaebc05202c8a73d9f726c64b40c28fc901f33bb1ec7ba415dba63d7ab73a","branch":"refs/heads/feature/blog-and-guides-section","head":"10448d794bcde58c9558b2df66c3104b4bf291a6","baseRef":"refs/heads/master","baseCommit":"10448d794bcde58c9558b2df66c3104b4bf291a6","sourceTree":"a92ca47da87c7cc71279f7acf8ea8a5faca77485","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Start the dev server with `npm run dev` and open http://localhost:4321/blog.
2. Expected: a "Guides" heading and three cards in the order iPhone, GitHub README, reduce file size, each with a date.
3. Click the iPhone card. Expected: the guide with "Published November 2, 2026", a numbered step list, and an "Open the video to GIF converter" button at the end that goes to `/`.
4. Open the GitHub README guide. Expected: a formatted Markdown code block and inline code such as `docs`.
5. Scroll to any page's footer. Expected: "Guides" is the first link under the tool links.
6. Toggle dark mode on a guide. Expected: text and list styles stay readable.
