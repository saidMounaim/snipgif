# Feature: SEO tool landing pages

**From build-plan:** feature 13
**Build attempt:** 1
**Branch:** feature/seo-tool-landing-pages
**Status:** verified

## Goal

Give each search intent its own indexable page: `/mp4-to-gif`, `/mov-to-gif`,
and `/webm-to-gif` with the working converter, plus the existing
`/gif-compressor`. Each page has a unique title, description, hero, body text,
and a visible FAQ, with matching `FAQPage` JSON-LD. Copy lives in an Astro
content collection so feature 17 can translate it later.

## In scope

- A `landing` content collection (`src/content.config.ts` plus
  `src/content/landing/*.md`) with four entries: `mp4-to-gif`, `mov-to-gif`,
  `webm-to-gif`, and `gif-compressor`. This settles the "landing page and FAQ
  copy" frontmatter that the overview leaves to feature 13.
- Three new static page files, `src/pages/mp4-to-gif.astro`,
  `src/pages/mov-to-gif.astro`, and `src/pages/webm-to-gif.astro`. Each renders
  the hero, the existing `Converter` island, the entry's body text, and its FAQ.
- `/gif-compressor` reads its title, description, hero, body text, and FAQ from
  its entry. The `Compressor` island stays as it is.
- `FAQPage` JSON-LD on all four pages, built from the same data as the visible
  FAQ. Each page keeps its `WebApplication` JSON-LD, using that page's own URL
  and description.
- `Faq.astro` takes an optional `items` prop so landing pages reuse the home FAQ
  markup. The home page keeps its current FAQ and link answer.
- `Layout.astro`: `current` becomes optional, so format pages do not mark
  "Video to GIF" (`/`) as `aria-current="page"`. A small footer link list
  (MP4 to GIF, MOV to GIF, WebM to GIF, GIF Compressor) links the new pages
  from every page.
- Sitemap: the three new routes appear automatically through the existing
  `import.meta.glob('./**/*.astro')`. No change to `sitemap.xml.ts` is expected.

## Out of scope

- Restricting the drop zone to one format per page. Every converter page still
  accepts MP4, MOV, WebM, and AVI. An `/avi-to-gif` page is also out, because
  the plan names only MP4, MOV, and WebM.
- `FAQPage` JSON-LD on the home page `/`.
- Translations, `lang` fields, locale routes, and hreflang (feature 17).
- Blog collection and guides (feature 16).
- Lazy-loading the converter or other performance work (feature 14).
- New converter or compressor behavior, settings, or presets.
- New dependencies, including `@tailwindcss/typography`.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`, so there are no step
commits. `/complete` creates the single feature commit.

## Build steps

1. [x] **Landing collection and schema.** Add `src/content.config.ts` with a
   `landing` collection, using the `glob` loader over `src/content/landing/*.md`
   and the schema under Data / contracts. Before writing it, check the installed
   Astro 7 API for `defineCollection`, `glob` from `astro/loaders`, the zod
   import path (`astro/zod`), and `getEntry`/`render` from `astro:content`. Add
   the four Markdown entries with final copy (see Notes for the AI).
   **Done when:** `npm run build` succeeds, a deliberately broken frontmatter
   field fails the build with a schema error (try it, then revert), and the
   output is otherwise unchanged.

2. [x] **Shared FAQ data and schema.** Let `Faq.astro` take
   `items?: { question: string; answer: string }[]` and render them as plain
   text, with the home FAQ as the default. Add `src/lib/faq-schema.ts` that maps
   the same items to a `FAQPage` object (`mainEntity` of `Question` with an
   `acceptedAnswer` `Answer`). Use it only from landing pages.
   **Done when:** `npm run build` succeeds and `dist/index.html` has the same
   FAQ markup as before (same questions, and the compressor link still in the
   "How do I make my GIF smaller?" answer).

3. [x] **Format landing pages.** Add a shared `src/components/landing/FormatLanding.astro`
   that takes a collection entry id. It renders `Layout` (no `current`), the
   `Hero` from frontmatter, `<Converter client:load />`, the rendered Markdown
   body in a styled section, and `Faq` with the entry's items. It also emits
   `WebApplication` and `FAQPage` JSON-LD. Add the three page files, each a thin
   wrapper that passes its id. Make `Layout`'s `current` optional.
   **Done when:** `npm run build` writes `dist/mp4-to-gif.html`,
   `dist/mov-to-gif.html`, and `dist/webm-to-gif.html`. Each has a unique
   `<title>`, meta description, and canonical
   (`https://snipgif.com/<slug>`), both JSON-LD blocks parse as JSON, and no
   nav link has `aria-current`. `dist/sitemap.xml` lists all three URLs.

4. [x] **Compressor page and footer links.** Move `/gif-compressor`'s title,
   description, and hero copy into its entry, then render its body and FAQ below
   the `Compressor` island with `FAQPage` JSON-LD. Add the footer link list to
   `Layout.astro`, with visible focus rings and touch targets of at least 44px,
   matching the header links.
   **Done when:** `npm run build` succeeds. `dist/gif-compressor.html` has its
   title, body text, FAQ, and a `FAQPage` block that parses. Every built page's
   footer links to all four landing pages. On a dev-server pass (agent-run
   `npx astro dev --background`), a video converts to a GIF on `/mov-to-gif`,
   and a GIF compresses on `/gif-compressor`, in both themes at 375px and
   desktop width.

## Files / areas

- `src/content.config.ts` (new)
- `src/content/landing/mp4-to-gif.md`, `mov-to-gif.md`, `webm-to-gif.md`,
  `gif-compressor.md` (new)
- `src/components/landing/FormatLanding.astro` (new)
- `src/lib/faq-schema.ts` (new)
- `src/pages/mp4-to-gif.astro`, `mov-to-gif.astro`, `webm-to-gif.astro` (new)
- `src/pages/gif-compressor.astro`
- `src/components/home/Faq.astro`
- `src/layouts/Layout.astro`
- Read only: `src/pages/sitemap.xml.ts`, `src/components/site/JsonLd.astro`,
  `src/components/site/Hero.astro`, `src/lib/video-file.ts`,
  `src/lib/clip-range.ts`, `src/lib/gif-file.ts`

## Data / contracts

`landing` collection frontmatter. The entry id is the URL slug, taken from the
filename:

```ts
z.object({
  title: z.string(),            // <title>, og:title, twitter:title
  description: z.string(),      // meta and og/twitter description, WebApplication description
  appName: z.string(),          // WebApplication name, e.g. "Snipgif MP4 to GIF Converter"
  hero: z.object({
    lead: z.string(),
    highlight: z.string(),
    description: z.string(),
  }),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(3),
})
```

- The Markdown body is the unique page text. Start its headings at `h2`, since
  the hero holds the page's only `h1`.
- FAQ answers are plain text. Astro's `{}` interpolation escapes them, and
  `JsonLd.astro` already escapes `<`. Keep links out of answers.
- `FAQPage` shape: `{ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: [{ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer',
  text } }] }`. The text must match the visible FAQ exactly.
- URLs stay slash-less (`trailingSlash: 'never'`, `build.format: 'file'`). The
  existing `Layout` canonical logic covers the new pages.

## Testing

No test command is configured, so tests are not a gate. Verification is
`npm run build` plus inspecting `dist/` (titles, canonicals, JSON-LD parsed with
`node -e`, sitemap entries, nav `aria-current`), and the dev-server pass in
step 4. Rich-result eligibility in Google is not verified locally.

## Notes for the AI

- Every claim in the copy must match the app as it is now. Facts to cite:
  MP4, MOV, WebM, and AVI input; GIFs up to 30 seconds (`CLIP_LIMITS.maxSec`);
  files over 200 MB may be slow or fail (`LARGE_FILE_BYTES`); conversion runs on
  the device with ffmpeg.wasm, and the engine (about 30 MB) downloads on first
  use; trim, crop, speed, reverse, boomerang, captions, and presets; the
  compressor uses color reduction, frame skipping, and width. Do not promise
  batch mode, other output formats, offline use, or phone support beyond what
  the home FAQ says.
- Make each page's text unique, not one template with the format name swapped.
  Write to the intent: MP4 as the common, widely playable format; MOV as iPhone
  and Mac recordings, where some HEVC clips may show still-frame previews in the
  browser but still convert; WebM as screen recordings and web video; the
  compressor as the fix for GIFs too large for chat or email limits. Aim for
  roughly 250 to 450 words of body text, with 4 to 6 FAQ items per page.
- Follow the Writing section of `coding-standards.md` for copy.
- Style the Markdown body with Tailwind descendant selectors on the wrapper,
  using existing tokens (`text-muted-foreground`, heading sizes from
  `HowItWorks`). Do not add a typography plugin.
- Keep the converter above the fold on format pages, as on `/`: hero, then the
  tool, then the text.
- Since 2023, Google shows FAQ rich results only for a small set of sites. The
  plan still asks for `FAQPage` schema, so add it, but do not claim rich
  results in any copy or review note.

## Open questions

None. Choices made here, all reversible: AVI gets no page (the plan names only
MP4, MOV, and WebM); the home page gets no `FAQPage` schema; the new pages are
linked from the footer only, not the header nav.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9377,"specSha256":"b65bf65276533f2a0b43d321eb725e8e1c90cbf45d3420e80d37e9c11d87aa54","branch":"refs/heads/feature/seo-tool-landing-pages","head":"0e62cdc3724c3f0aba823d63c4a129f634f0019c","baseRef":"refs/heads/master","baseCommit":"0e62cdc3724c3f0aba823d63c4a129f634f0019c","sourceTree":"6aae2da629d7c0e7bdf4d60f649bd2d23bdec13f","landing":"local-merge","absentOptional":[]} -->


## Try it now

Run or do:

Run `npm run dev`, then open http://localhost:4321/mov-to-gif. Drop in any
short video and select Convert to GIF. Scroll down past the converter, then
open http://localhost:4321/gif-compressor and compress the GIF you just made.

Expected:

The MOV page has its own headline, the converter, a few sections of MOV-specific
text, and an FAQ. Neither header link is highlighted. The GIF converts and shows
its file size. The compressor page shows the original and new sizes, for
example "60 KB → 37 KB (39% smaller)", followed by its own text and FAQ. Every
page's footer links to MP4 to GIF, MOV to GIF, WebM to GIF, and GIF Compressor.
After `npm run build`, `dist/sitemap.xml` lists all five pages.

This proves:

Each search intent has its own indexable page with unique copy and matching
FAQ schema, and the tools still work on them.
