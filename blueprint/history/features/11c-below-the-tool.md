# Feature: Below the tool

**From build-plan:** feature 11c
**Build attempt:** 1
**Status:** verified
**Branch:** feature/below-the-tool

## Goal

Add the content below the converter on the home page (`/`): a short "How it
works" section, feature highlights, and an FAQ. The overview lists these under
UI/UX ("Below the tool: How it works, feature highlights, FAQ") and the route
map (`/` - converter, hero, flow, how it works, FAQ). The project plan says the
section is "good for SEO and for AdSense approval". It explains the tool to
first-time visitors and gives search engines real text to index.

## In scope

- **How it works.** Four numbered steps that match the converter's step
  indicator: 1 Choose a video, 2 Trim and adjust, 3 Convert, 4 Download or
  share. Each step has one short sentence.
- **Feature highlights.** A grid of six cards, each with a Lucide icon, a short
  title, and one sentence. Every claim comes from the overview or from shipped
  behavior:
  1. **Private by design**: conversion runs in your browser, and your video is
     never uploaded.
  2. **Free, no watermark**: no sign-up, and never a watermark on your GIF.
  3. **Trim and crop**: pick the exact moment and crop to 1:1, 16:9, or 9:16.
  4. **Speed, reverse, boomerang**: change playback speed, play it backward, or
     loop it back and forth.
  5. **Add captions**: meme-style top and bottom text in three fonts and six
     colors.
  6. **Presets and compression**: one-click presets, plus a link to the GIF
     Compressor (`/gif-compressor`) to shrink existing GIFs.
- **FAQ.** Native `<details>`/`<summary>` items, so it is keyboard and
  screen-reader accessible with no JavaScript. Answers must match shipped
  behavior:
  1. *Is Snipgif free?* Yes. There is no sign-up and no watermark.
  2. *Are my videos uploaded anywhere?* No. The video is converted on your device
     with ffmpeg.wasm. The converter engine (about 30 MB) is downloaded the
     first time you choose a video. Your files are not.
  3. *Which video formats can I use?* MP4, MOV, WebM, and AVI. Some videos your
     browser can't play still convert, with still-frame previews.
  4. *How long can a GIF be?* Up to 30 seconds, after speed and boomerang
     changes. Videos over 200 MB can be slow or fail on some devices.
  5. *How do I make my GIF smaller?* Choose the "Small for chat" preset, lower
     the frames per second or width, or run it through the GIF Compressor (a
     link).
  6. *Does it work on my phone?* Yes, in modern mobile browsers. Long or very
     large videos may run out of memory on phones. A shorter clip or a smaller
     width helps.
- **Placement and markup.** Static Astro components rendered on `/` after the
  converter island, inside `<main>`. Each section is a `<section>` with an `h2`
  (`aria-labelledby`). Step and highlight titles are `h3`. No JavaScript is
  shipped for this feature.
- **Layout.** Mobile first: one column at 320 px, and two or three columns from
  `sm`/`md`. Style matches the UI refresh (cards, `bg-brand` icon tiles,
  tokens only). Light and dark mode, no horizontal scroll.

## Out of scope

- FAQ JSON-LD or any structured data (12 Technical SEO, 13 landing pages).
- Content collections for this copy (see Notes for the AI).
- Translations and RTL (17).
- The same sections on `/gif-compressor` or the format landing pages (13).
- Ads, analytics, legal links, and a fuller footer (15, 18, 20).
- Any converter or compressor behavior change.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: build every step, then present one review packet. No checkpoint
commits. `/complete` makes the single feature commit.

## Build steps

- [x] **1. How it works and highlights.** Add `HowItWorks.astro` and
  `Highlights.astro` under `src/components/home/`, and render both on `/`
  below the converter.
  **Done when:** `npm run build` passes, and `dist/index.html` contains both
  `h2`s, the 4 steps, and the 6 highlight titles as static HTML. In the
  browser at 320 and 1280 px, in light and dark mode, the sections render with
  no horizontal scroll and the Compressor link goes to `/gif-compressor`.
- [x] **2. FAQ.** Add `Faq.astro` with the six items as `<details>`, rendered
  after the highlights.
  **Done when:** `npm run build` passes, and the six questions and answers are
  in `dist/index.html`. In the browser, each item opens and closes with Enter
  and Space on its summary, with a visible focus ring, and the open or closed
  state shows in the accessibility tree. The page's heading outline reads h1,
  then the converter's headings, then How it works, Highlights, and FAQ as
  `h2`s.

## Files / areas

- `src/components/home/HowItWorks.astro` (new)
- `src/components/home/Highlights.astro` (new)
- `src/components/home/Faq.astro` (new)
- `src/pages/index.astro` - render the three after `<Converter client:load />`.
- Lucide icons via `lucide-react`, rendered statically in Astro like
  `Hero.astro` already does. No new dependencies.

## Data / contracts

No data, routes, or APIs. The copy lives as typed constants inside each
component's frontmatter (for example `const FAQ: { question: string; answer:
string }[]`). An answer that contains a link (the Compressor) is written as
markup in the template, not as raw HTML in a string, so no `set:html` is
needed.

## Testing

No test command is configured, and this feature has no logic. Evidence:

- `npm run build`, `npx -y -p typescript@5.9.3 tsc --noEmit -p .`, and a grep of
  `dist/index.html` for the headings and FAQ questions.
- Browser checks at 320 and 1280 px in both themes: screenshots,
  `scrollWidth`, keyboard toggling of `<details>`, the accessibility snapshot's
  heading outline, and the console.

## Notes for the AI

- **Copy storage decision.** The coding standards say landing copy belongs in
  content collections, and the overview leaves the exact frontmatter fields as
  a TODO for features 13 and 16. Defining a collection schema here would lock
  in that design early, for English-only home-page copy. Keep the copy in
  component constants for now. Feature 13 (landing pages with FAQ schema) or 17
  (translations) moves it into a collection once the schema is decided.
- Keep every claim truthful to shipped behavior: the 30 s limit
  (`CLIP_LIMITS.maxSec`), the 200 MB warning (`LARGE_FILE_BYTES`), the four
  formats, three fonts, six colors, the presets' names, and on-demand ~30 MB
  engine loading. Don't promise offline use (21) or extra formats (22).
- No em dashes in copy (writing standard). Colors from tokens only, and no
  `dark:` color variants.
- `<details>` and `<summary>`: give the summary a 44 px min height, a visible
  `focus-visible` ring, and a chevron icon that rotates when open. Use
  `motion-safe:` for the rotation transition, as 11b did.
- These are static `.astro` components, so they ship no JavaScript (coding
  standards: an island only for real interactivity).
- **Evidence** (Chrome DevTools against the dev server on :4321):
  - `npm run build` passed, and `tsc --noEmit` exit 0. `dist/index.html`
    contains each `h2` ("How it works", "Everything you need", "Frequently
    asked questions"), the step and highlight titles, and the FAQ questions.
  - At 320 px (light) and 1280 px (dark), `scrollWidth` equals the viewport.
    It is one column at 320, a 2-column step grid and 3-column highlights at
    1280. Both Compressor links point to `/gif-compressor`.
  - Heading outline: h1, then the converter's headings, then three `h2`s with
    their `h3`s. The accessibility snapshot shows three named regions and six
    "DisclosureTriangle" items.
  - Keyboard: the focused summary shows a ring. Enter opened item 2 and Space
    opened item 5, and both show "expanded" in the accessibility tree with their
    answers exposed. Summaries measure 48 to 72 px tall.
  - Fixed during the check: the highlight link read "plus aGIF Compressor"
    because Astro collapsed the line break. It now has an explicit `{' '}`.
  - The Highlights `h2` reads "Everything you need" rather than the working
    name "Highlights".
  - Console: no errors or warnings.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8168,"specSha256":"17106b5163666498b47c3a689d86c23aa86b1ff685f6257bca308424b48f87c2","branch":"refs/heads/feature/below-the-tool","head":"054de7282605af6582f84d053253c913d06b59bf","baseRef":"refs/heads/master","baseCommit":"054de7282605af6582f84d053253c913d06b59bf","sourceTree":"984ccbe6768562d245d93c801e32c47bbcde3bd2","landing":"local-merge","absentOptional":[]} -->


## Try it now

Run or do:

Run `npm run dev`, open http://localhost:4321, and scroll below the drop zone.
Press Tab until a question in "Frequently asked questions" is focused, then
press Enter.

Expected:

"How it works" shows 4 numbered steps, "Everything you need" shows 6 cards with
a GIF Compressor link, and the focused question expands to show its answer,
with the chevron flipped.

This proves:

The below-the-tool content renders, and the FAQ works from the keyboard
without JavaScript.
