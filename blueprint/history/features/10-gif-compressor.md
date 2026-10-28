# Feature: GIF compressor

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/gif-compressor
**Status:** verified

## Goal

A standalone page at `/gif-compressor` where the user drops an existing GIF and
makes it smaller, on their device, by reducing colors, skipping frames, and
optionally shrinking the width. They then see the before and after sizes and
download, copy, or share the result like a converted GIF.

## In scope

- **Route** `/gif-compressor` (`src/pages/gif-compressor.astro`), using the
  same `Layout` and page shell as `/`. The headline is "Make your GIFs smaller,
  free, fast, and private", with the same "Your files never leave your device"
  badge. The page title is `GIF Compressor - Snipgif`.
- **Links** (user decision): a "Compress a GIF" text link under the hero on `/`,
  and a "Convert a video to GIF" link under the hero on `/gif-compressor`. Both
  are plain `<a>` links with a visible focus ring. Feature 11 may replace them
  with real navigation.
- **Upload:** the existing drop zone, with the text "Drop a GIF here or click to
  choose" and the hint "GIF files". The file picker accepts `.gif,image/gif`.
  Validation follows the video upload rules:
  - one file at a time: "Please drop one GIF at a time."
  - a non-empty file: "This file is empty. Please choose another GIF."
  - a `.gif` extension, or the `image/gif` type when there is no extension:
    "This file type isn't supported. Please choose a GIF."
  - a warning above 200 MB (the same `LARGE_FILE_BYTES`): "This GIF is over
    200 MB. Large GIFs can be slow or fail on some devices, especially phones."
  - Files dropped outside the zone don't navigate away, the same as the
    converter.
- **Selected GIF card:** the file name, size, and pixel size (for example
  `2.4 MB · 480 × 270`). The original animates in an `<img>` (alt
  `Original GIF: <name>`). Below it are the settings, **Compress GIF**, and
  **Choose another GIF**. If the browser can't decode the file, the card says
  "We couldn't read this GIF. Please try another GIF." and only Choose another
  GIF is offered.
- **Settings** (user decisions), using the same radio and slider styling as
  Output settings, disabled while compressing:
  - **Colors** radio group: **256**, **128** (default), **64**, **32**.
  - **Frames** radio group: **Keep all** (default), **Every 2nd**,
    **Every 3rd**. Skipped frames' time goes to the frames that are kept, so the
    GIF's total length and speed stay the same.
  - **Max width** slider: from `min(160, GIF width)` up to the GIF's own width,
    in 1 px steps. The default is the GIF's own width, shown as "Original (W
    px)"; other values show "W px". The height keeps the shape. The GIF is never
    enlarged.
- **Compressing:** **Compress GIF** runs ffmpeg.wasm on the device. During it,
  the status reads "Getting the converter ready..." and then "Compressing your
  GIF...". An indeterminate progress bar is shown, labeled by that status, the
  same pattern as the converter's loading-core state. On success the status
  reads "Your GIF is ready."
- **Result:** the existing result card (Download GIF, plus Copy GIF and Share
  where supported). The file is named `<original name>-compressed.gif`, with
  alt text `Compressed GIF: <name>`. Above the image, a line reads
  `2.4 MB → 1.1 MB (54% smaller)`.
  - **Larger result** (user decision): when the result is not smaller, the line
    reads `2.4 MB → 2.6 MB (8% larger)`, followed by the note "This GIF was
    already well compressed, so the result is larger. Try fewer colors, skipping
    frames, or a smaller width." Download is still offered.
- **Errors** reuse the converter's friendly messages: the converter couldn't
  load, out of memory, can't convert the contents (with "video" replaced by
  "GIF" in this page's copy), and something went wrong. A failed compression
  leaves the settings in place for another try. The selected GIF is kept.
- **Lifecycle:** choosing another GIF clears the result and resets the
  settings (128, Keep all, original width). Changing a setting keeps the last
  result on screen until the next **Compress GIF**. The original's and the
  result's object URLs are revoked when replaced and on unmount.
- The converter's behavior on `/` is unchanged, apart from the new link and the
  shared components taking their text and file name as props.

## Out of scope

- Lossy LZW compression (gifsicle-style), dithering choices, or optimizing
  frame differences beyond what ffmpeg's palette filters do.
- Trimming, cropping, speed, or text on existing GIFs.
- Converting GIFs to other formats (feature 22).
- Several GIFs at once.
- SEO text, FAQ, and meta tags for this page (features 12 and 13), and a site
  header or navigation (feature 11).
- Keeping a play-once GIF play-once. The output loops forever, like converted
  GIFs.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`. Implement all steps and run the Testing checks after each. Then
present one review packet for the whole feature. Make no checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Page, links, upload, and settings.** Add the route and the links.
  Add `src/lib/gif-file.ts` (validation, settings types, defaults, and output
  file name). Generalize `DropZone` (title, hint, and accept as props). Add
  `Compressor.tsx` with upload, validation messages, the selected-GIF card
  showing the original and its pixel size, the unreadable state, and the three
  settings. **Compress GIF** is present but disabled in this step.
  **Done when:** `/gif-compressor` and the two links work. A GIF shows its
  name, size, pixel size, and animation. A PNG, an empty file, and two files
  each show their message. A non-GIF renamed to `.gif` shows the unreadable
  state. The settings default to 128, Keep all, and original width, and reset
  on Choose another GIF. `/` behaves as before. `npm run build` passes.
- [x] **2. Compression and result.** Add `compressGif` to `gif-engine.ts`.
  Generalize `GifResult` (file name and alt as props, plus a slot for the size
  line). Wire compressing, status, progress, the result, the size line, the
  larger-result note, and errors.
  **Done when:** a 256-color test GIF at 128 colors gets smaller and still
  animates. Every 2nd halves the frame count and keeps the total duration
  (checked by decoding the result). Max width at half gives half the width.
  An already tiny GIF shows the larger note with Download still working. A
  corrupt GIF shows the friendly error. The converter's result card still
  works with its old name and alt. `npm run build` passes.

## Files / areas

- `src/pages/gif-compressor.astro` (new); `src/pages/index.astro` (link).
- `src/lib/gif-file.ts` (new): `validateGifFiles`, `GifSettings`, `COLOR_CHOICES`,
  `FRAME_STEPS`, `defaultGifSettings`, `compressedFileName`.
- `src/lib/gif-engine.ts`: `compressGif`. It shares the engine loading, `guard`,
  and the error classes with conversion, but not the video input state.
- `src/components/compressor/Compressor.tsx` (new): the island for the page.
- `src/components/converter/DropZone.tsx` and `GifResult.tsx`: props
  generalized. `Converter.tsx` passes its existing text, file name, and alt.
- `formatFileSize` and `LARGE_FILE_BYTES` are reused from `video-file.ts`.

## Data / contracts

- `type SourceGif = { file: File; name: string; sizeBytes: number }`. Its
  `width` and `height` come from the browser's decode of the `<img>`
  (`naturalWidth` and `naturalHeight`). The data is in memory only.
- `type GifSettings = { colors: 256 | 128 | 64 | 32; frameStep: 1 | 2 | 3;
  width: number }`. The default is `{ colors: 128, frameStep: 1, width: <GIF
  width> }`.
- `validateGifFiles(files)` returns
  `{ ok: true; gif: SourceGif; warning: 'large' | null } | { ok: false; error:
  'multiple' | 'empty' | 'unsupported' }`, mirroring `validateVideoFiles`.
- `compressGif(file, settings, sourceWidth): Promise<Blob>` writes
  `source.gif` to the ffmpeg FS and runs
  `-i source.gif -vf <filter> -loop 0 compressed.gif`. The filter is
  `[select='not(mod(n\,K))',][scale=W:-1:flags=lanczos,]split[a][b];[a]palettegen=max_colors=C[p];[b][p]paletteuse`.
  `select` is included only for K > 1, and `scale` only when W < sourceWidth.
  Both files are deleted after every run, including failures. Errors use the
  existing `EngineLoadError`, `MemoryError`, `UnsupportedVideoError`, and
  `ConversionError` classes.
- `compressedFileName('cat.gif')` is `cat-compressed.gif`. An empty base gives
  `snipgif-compressed.gif`.
- `GifResult` props: `result`, `fileName`, `alt`, `onFeedback`, and optional
  `children` rendered under the heading. The converter passes
  `gifFileName(video.name)` and `GIF made from <name>`, which is today's
  behavior.
- The file name is shown only as React text (never as HTML) and is never put
  into the ffmpeg command line. ffmpeg always reads the fixed name `source.gif`.

## Testing

- No test or Verify command is configured, so there are no automated tests.
  `gif-file.ts` is pure and ready for unit tests once `/tests` adds a runner.
- After each step, `npm run build` must pass.
- Do Playwright or manual checks in the dev server for each step's Done when.
  Generate test GIFs with native ffmpeg: a 256-color animated `testsrc`
  640×360, a tiny 2-color GIF, a PNG, an empty file, and a text file renamed
  `.gif`. Check frame counts, durations, and sizes by decoding the result with
  `ImageDecoder` in the page.
- A GIF with transparency is an extra check: report whether it stays
  transparent. It is not a pass or fail gate.
- Check `/` once after step 2 (convert one video) to confirm the shared
  components still behave.

## Notes for the AI

- In `select`, the comma inside `mod(n\,K)` must stay escaped, and the whole
  expression single-quoted, inside the `-vf` string.
- `select` keeps the original timestamps, so the GIF muxer gives each kept
  frame the time of the skipped ones. Don't add `setpts` or `fps`. Verify the
  duration in step 2.
- The engine must not disturb the converter's `input` and `selected` state.
  `compressGif` uses its own fixed file names and doesn't call `prepareInput`.
- Get the GIF's pixel size from the `<img>` `onLoad`. Its `onError` gives the
  unreadable state, and nothing is sent to ffmpeg for an unreadable file.
- Reuse the converter's window-level drag-and-drop guard pattern rather than
  importing from `Converter.tsx`. A copy of the small effect in `Compressor.tsx`
  is fine.
- Keep the look: the same card, focus ring, choice styling, 44 px targets, and
  slider.

## Implementation notes

- **The `select` quoting in the spec is correct.** With native ffmpeg 9.0.2,
  called without a shell like ffmpeg.wasm, `select='not(mod(n\,2))'` works.
  The unquoted form fails with "No such filter: '2))'". In the TypeScript
  source, the backslash is written `\\,` so the runtime string has `\,`.
- **Every 2nd duration:** native ffmpeg reported 2.9 s against the source's
  3.0 s, because the last kept frame keeps only its own delay. ffmpeg.wasm's
  output decoded in Chromium to 3.0 s. The difference is at most one source
  frame.
- **The result card shows the new size twice:** the existing size line, then
  `before → after`. This is harmless, and keeping it avoids changing the
  converter's card.
- **Browser evidence (dev server, Chromium via Playwright, ffmpeg.wasm):**
  - `/` has a "Compress a GIF" link to `/gif-compressor`. The page title is
    `GIF Compressor - Snipgif`, and it links back to `/`.
  - A PNG, an empty `.gif`, two dropped files, and a text file renamed `.gif`
    each showed their message. The renamed file showed the unreadable state with
    no Compress button.
  - A 640×360, 30-frame, 3 s, 256-color test GIF (340 KB) showed
    `340 KB · 640 × 360`, with defaults 128, Keep all, and "Original (640 px)".
    - 128 colors: 30 frames, 3.0 s, 326 KB (4% smaller).
    - Every 2nd: 15 frames, 3.0 s, 167 KB (51% smaller).
    - Max width 320: 320 px wide, 30 frames, 122 KB (64% smaller).
    - The download is named `anim-compressed.gif`.
  - Choose another GIF reset the settings and cleared the result.
  - A tiny 4-color GIF at 256 colors went from 895 B to 901 B. It showed
    "(1% larger)" with the note, and Download was still offered.
  - A truncated GIF (the first 2000 bytes) loaded in the browser, but ffmpeg
    failed. It showed "Something went wrong compressing this GIF. Please try
    another GIF."
  - Extra check: a transparent GIF kept its transparency (the corner's alpha
    was 0 in both the original and the result).
  - On `/`, the drop zone kept its video text and accept list. Converting an
    MP4 gave a result with alt `GIF made from clip.mp4` and download name
    `clip.gif`, the same as before.
  - A full-page screenshot showed the layout consistent with the converter.
- **Not verified:** the out-of-memory and engine-load failure paths on this page
  weren't forced; they reuse the converter's tested error classes. The
  `UnsupportedVideoError` path ("can't compress this GIF's contents") wasn't
  hit, because the truncated GIF failed without the "Invalid data" log line.
  Screen-reader speech wasn't checked. TypeScript isn't installed, so nothing
  was type-checked.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13348,"specSha256":"4eb427deb1b4475a69ee6dc0f41dfb6b097d8945ec77000358e278be12abdd2b","branch":"refs/heads/feature/gif-compressor","head":"424e6cfde05b0020763ef49c406bf08a940753d4","baseRef":"refs/heads/master","baseCommit":"424e6cfde05b0020763ef49c406bf08a940753d4","sourceTree":"4546ad4f64c595772f187c3be2466a9928cc655c","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev` (or reuse the one already running), open
http://localhost:4321, and click **Compress a GIF**. Drop in an animated GIF,
choose **Every 2nd** under Frames, and click **Compress GIF**.

Expected:

The card shows the GIF's name, size, and pixel size with the original
animating, and the settings start at 128 colors, Keep all, and Original width.
After compressing, "Your GIF is ready." appears with a result card showing a
line like `340 KB → 167 KB (51% smaller)`; the result plays at the same speed,
and **Download GIF** saves `<name>-compressed.gif`. A very small GIF at 256
colors may come out larger: the card then says so and still offers Download.

This proves:

Existing GIFs can be made smaller on the device, and the page shows exactly
how much was saved.
