# Feature: Text and caption overlay

**From build-plan:** feature 9
**Build attempt:** 1
**Branch:** feature/text-and-caption-overlay
**Status:** verified

## Goal

Let the user add meme-style text to the GIF: a top line and a bottom line, in
one of three fonts, one of six colors with an automatic outline, and one of
three sizes. The text is previewed on the video before converting. The GIF has
exactly what the preview shows.

## In scope

- **Text panel** on the selected-video card, between Playback and Output
  settings, headed **Text**, disabled while converting. It holds:
  - **Top text** and **Bottom text** single-line inputs (user decision), each
    with a visible label. Either or both can be empty. Text that is only
    whitespace counts as empty.
  - **Font** radio group (user decision): **Meme** (Anton, the default),
    **Clean** (Inter), and **Marker** (Permanent Marker). Each label is drawn in
    its own font.
  - **Color** radio group (user decision): **White** (default), **Black**,
    **Yellow**, **Red**, **Blue**, and **Green**. Each choice shows a swatch and
    its name, so it isn't color-only.
  - **Size** radio group (user decision): **Small**, **Medium** (default), and
    **Large**.
  - All choices use the same visually hidden radio and 44 px label styling as
    the Speed, Crop, and Preset groups. Font, color, and size apply to both
    lines.
- **Rendering** (one shared function for preview and GIF): text is drawn on a
  transparent canvas the size of the output frame. The top line is anchored to
  the top edge and the bottom line to the bottom edge. Both are centered, with
  a margin of 4% of the frame height.
  - **Outline** (user decision): black, except white around Black text. Its
    width is 15% of the font size, drawn under the fill with round joins.
  - **Size:** the font size is 8% (Small), 12% (Medium), or 16% (Large) of the
    frame height, with a minimum of 10 px. Words wrap to 90% of the frame width.
    If a single word is still too wide, or a wrapped line block would be taller
    than 40% of the frame height, the font shrinks until it fits. Text is never
    cut off. The case is kept as typed.
- **Preview:** while either line has text, the rendered text is shown over the
  video preview (playable videos) or the **Start** frame (still-frame videos).
  It covers the kept crop area when a crop is set, and the whole picture
  otherwise. The preview canvas is decorative (`aria-hidden`), because the text
  is already in the labeled inputs. It updates as the user types or changes a
  choice.
- **Conversion uses the text:** when either line has text, the engine renders
  the text image at the GIF's exact output size and overlays it on every frame
  after crop and scaling. The text stays put, still upright and readable, with
  Reverse, Boomerang, and every speed. With no text, the conversion is exactly
  as it is today.
- **Fonts** (user decision) are self-hosted WOFF2 files (Latin subset) in
  `public/fonts/`, with their license files. They are declared with
  `@font-face` so the browser downloads one only when it is used. Both the
  preview and the conversion wait for the chosen font to load before drawing.
  Characters missing from a font, such as Arabic, use the browser's fallback
  font for those characters. Shaping and right-to-left order come from the
  browser.
- **Unavailable state:** when the frame size is unknown (a still-frame video
  whose Start frame failed), the Text panel is disabled with the note "Text
  isn't available for this video." Conversion without text still works.
- **Font load failure:** if the chosen font can't be loaded when converting, no
  GIF is made. The alert shows "The text font couldn't load. Check your
  connection and try again." Like the other conversion errors, it clears on the
  next attempt.
- **Lifecycle:** the text and its choices reset (empty, Meme, White, Medium)
  when another video is chosen. They are kept across conversions of the same
  video.

## Out of scope

- More than two lines of text, a Middle position, free placement, or dragging
  text.
- Per-line font, color, or size; a custom color picker; a size slider.
- Animated or timed text (text visible for only part of the GIF).
- Arabic or other non-Latin font files. The browser fallback covers them for
  now. Feature 17 owns language support.
- Remembering the text or choices in `localStorage`.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`. Implement all steps and run the Testing checks after each. Then
present one review packet for the whole feature. Make no checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Fonts, rendering, panel, and conversion.** Add the three WOFF2 files
  and their licenses to `public/fonts/`, and the `@font-face` rules to
  `global.css`. Add `src/lib/caption.ts`: types, choices, defaults, output-size
  math, font loading, and the canvas draw function. Add `TextPanel.tsx` and
  `caption` state in `Converter.tsx` (reset in `resetSelection`, unavailable
  state, font error). Make `convertToGif` take the caption and, when it has
  text, write a PNG of the text at the output size and overlay it.
  **Done when:** with a 16:9 MP4, the GIF shows the top and bottom text in the
  chosen font, color, and size, with the outline, centered and not cut off. A
  long top line wraps or shrinks. Text plus Square 1:1 crop plus Boomerang keeps
  the text upright and inside the square. Empty fields give the same GIF as
  before. Choosing another video resets the panel. With the font file blocked
  in DevTools, the font error appears and no GIF is made. `npm run build`
  passes.
- [x] **2. Preview.** Draw the same rendering on a canvas positioned over the
  picture (inside the crop box when a crop is set) in `TrimTimeline`, for
  playable videos and still frames. Show the unavailable state when the frame
  size is unknown.
  **Done when:** the preview text matches the converted GIF in position, wrap,
  and size, for Original and Square 1:1 crops, on a playable MP4 and on a
  still-frame AVI. Typing updates it immediately. The crop box can still be
  dragged with text showing. `npm run build` passes.

## Files / areas

- `public/fonts/` (new): `anton-latin-400.woff2`,
  `inter-latin-700.woff2`, `permanent-marker-latin-400.woff2`, plus
  `OFL-Anton.txt`, `OFL-Inter.txt`, and `LICENSE-PermanentMarker.txt`. Anton and
  Inter are OFL-1.1, and Permanent Marker is Apache-2.0.
- `src/styles/global.css`: three `@font-face` rules with `font-display: swap`.
- `src/lib/caption.ts` (new): `Caption` type, font, color, and size tables,
  `DEFAULT_CAPTION`, `hasText`, `outputSize`, `loadCaptionFont`, and
  `drawCaption`.
- `src/lib/gif-engine.ts`: `convertToGif` takes the caption and output size;
  it writes, overlays, and deletes the text PNG.
- `src/components/converter/TextPanel.tsx` (new): inputs, choice groups, and the
  unavailable note.
- `src/components/converter/TrimTimeline.tsx`: renders the caption preview canvas
  in the existing overlay slot, alongside the crop overlay.
- `src/components/converter/Converter.tsx`: state, reset, wiring, and the
  `'font'` conversion error.

## Data / contracts

- `type CaptionFont = 'meme' | 'clean' | 'marker'`, mapped to CSS families
  `Anton`, `Inter` (weight 700), and `Permanent Marker`, each with a generic
  `sans-serif` or `cursive` fallback.
- `type CaptionColor = 'white' | 'black' | 'yellow' | 'red' | 'blue' | 'green'`,
  with fills `#ffffff`, `#000000`, `#ffe600`, `#ff3b30`, `#2f80ed`, and
  `#34c759`. The outline is `#000000`, except `#ffffff` for black.
- `type CaptionSize = 'small' | 'medium' | 'large'` maps to 0.08, 0.12, and
  0.16 of the frame height.
- `type Caption = { top: string; bottom: string; font: CaptionFont; color:
  CaptionColor; size: CaptionSize }`. It is in memory only and never persisted.
  The overview's `textOverlays[]` shape is not used. Two fixed lines cover the
  chosen top-plus-bottom layout, and nothing stores or exchanges this data.
- `outputSize(frameSize, crop, settings): FrameSize`: the cropped size is
  `frameSize × crop.w/h`, or the whole frame without a crop. Its width is capped
  at `settings.width`, and its height keeps the shape. Values are rounded to
  whole pixels. ffmpeg's own rounding may differ by 1 px. The overlay goes at
  `0:0`, and that difference is acceptable.
- `drawCaption(ctx, caption, size)` draws on a context already sized to `size`.
  It is pure apart from the canvas, and it is the only text-rendering code.
- `convertToGif(video, range, settings, crop, playback, caption, onProgress?)`.
  It receives `caption` only when `hasText(caption)` and the output size is
  known; otherwise it receives `null`. With a caption, the command adds
  `-i text.png` after the video input and uses `-filter_complex`:
  `[0:v]<crop,speed,fps,scale>[base];[base][1:v]overlay=0:0,<direction><palette>`.
  Without one, the command stays as it is today. `text.png` is deleted after
  every run, including failures.
- User text reaches the page only as canvas drawing and React-controlled input
  values. It is never inserted as HTML or put into the ffmpeg command line.

## Testing

- No test or Verify command is configured, so there are no automated tests.
  The wrap and size math in `caption.ts` is pure and ready for unit tests once
  `/tests` adds a runner.
- After each step, `npm run build` must pass.
- Do manual or Playwright checks in the dev server for each step's Done when.
  Use a 16:9 MP4 and an AVI that the browser shows as still frames. Compare a
  screenshot of the preview with the converted GIF's first frame.
- Type a mixed Latin and Arabic line as an extra check that it renders
  (shaping and fallback font). Report what is seen; this check isn't a pass or
  fail gate.

## Notes for the AI

- Get the font files from the Fontsource packages on jsDelivr. Use the
  `files/<family>-latin-<weight>-normal.woff2` paths for exact versions, and copy
  each license from the same package. Don't add npm dependencies.
- In canvas, `ctx.font` must name the loaded family. Wait for
  `document.fonts.load('<weight> <px>px "<Family>"')`, then confirm it with
  `document.fonts.check(...)` before drawing for the GIF. A load that resolves
  without the face (an empty array) counts as a failure.
- Wrap by measuring words with `measureText`. Shrink by stepping the font size
  down (for example by 5%) until the block fits. Keep it simple; there is no
  hyphenation.
- Draw the outline with `strokeText` (`lineJoin = 'round'`), then `fillText`.
  Use `textBaseline = 'top'` for the top block and lay out the bottom block from
  its total height.
- Create the PNG with `canvas.toBlob(…, 'image/png')`. If you use an
  `OffscreenCanvas`, use `convertToBlob`. Don't use `toDataURL` for the GIF.
- `-ss` and `-t` stay before the video input only. The PNG input has no
  `-loop`, because overlay repeats its single frame for the whole clip.
- The preview canvas sits over the picture and must not block the crop box's
  pointer events (`pointer-events-none`). Size its backing store from its
  rendered box times `devicePixelRatio` so it stays sharp.
- Keep the converter's existing look: the same focus ring, the choice styling,
  and 44 px touch targets.

## Implementation notes

- **Deviation: font loading uses `FontFace`, not CSS `@font-face`.** The first
  version used `@font-face` in `global.css`. A browser test showed that once a
  CSS font face fails (font file blocked), it stays `error` for the life of the
  page. "Try again" could then never succeed without a reload. `loadCaptionFont`
  now creates a `FontFace` from `CAPTION_FONTS[font].url` and adds it to
  `document.fonts` on success. It forgets a failed load, so the next attempt
  fetches again. `global.css` is unchanged.
- **All three fonts download when the Text panel appears** (about 72 KB). The
  panel appears only after a video is selected. This is needed because each
  Font choice is drawn in its own font. A failed load only leaves that button in
  the fallback font.
- **Deviation: `convertToGif` takes `textImage: Blob | null`** instead of the
  caption and size. `Converter.tsx` renders the PNG with `renderCaptionPng`
  (which waits for the font), so the engine stays free of canvas code. The
  command shape is as specified: `-i text.png` after the video input, then
  `-filter_complex [0:v]…[base];[base][1:v]overlay=0:0,…`. Without text, it
  is the same `-vf` string as before.
- **Deviation: preview sharpness.** The preview canvas's backing store is the
  GIF's exact pixel size, scaled by CSS. It does not use `devicePixelRatio`.
  This makes the preview the same pixels as the GIF instead of a re-layout at
  another size.
- **Browser evidence (dev server, Chromium via Playwright, ffmpeg.wasm):**
  - 16:9 640×360 MP4, top text "when the code compiles on the first try" and
    bottom text "nobody:", Meme font, Yellow, Large. The GIF was 480×270, the
    same size as the preview canvas. Mean absolute difference over the
    preview's 28,314 opaque text pixels was 6.9/255 on the first and last
    frames (palette quantization).
  - Square 1:1 plus Boomerang: the GIF was 360×360 with 142 frames, and the
    difference was 6.5 on the first and last frames, so the text is static and
    upright. A screenshot showed the text inside the crop box, with the top line
    wrapped to three lines.
  - Clean font, Black text: the preview has a white outline, and the difference
    was 3.5. All three Font buttons rendered in their own font
    (`document.fonts.check`).
  - Still-frame MPEG-4 AVI: the panel was reset from the previous video
    (empty, Meme, White, Medium). Marker font with "Hello مرحبا" gave a 480×270
    GIF with a difference of 4.7. A screenshot showed the Arabic shaped,
    right-to-left, in the fallback font.
  - Fonts blocked with a Playwright route: Convert showed "The text font
    couldn't load. Check your connection and try again." and made no GIF.
    After unblocking, Convert cleared the alert and made the GIF.
  - The crop box stays on top of the preview canvas (`elementFromPoint` hits
    the box, and the canvas has `pointer-events: none`), so dragging still
    works.
- **Not verified:** the unavailable state ("Text isn't available for this
  video.") was not triggered, because no failing-frame fixture was available. It
  uses the same condition as Crop's verified unavailable state. Screen-reader
  speech was not checked. TypeScript isn't installed, so nothing was
  type-checked.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14617,"specSha256":"9b2c4551e8a925b81095ea53e6539a43ca9bf9d566868f87a1adcc444b0b02b1","branch":"refs/heads/feature/text-and-caption-overlay","head":"39abc416b4008b47f9bbc9a9b8e76e061a3b7895","baseRef":"refs/heads/master","baseCommit":"39abc416b4008b47f9bbc9a9b8e76e061a3b7895","sourceTree":"5e028048d691d0a0766dd2bcd5d6e05178997f54","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev` (or reuse the one already running), open
http://localhost:4321, and drop in a landscape MP4. Under **Text**, type
"when the code compiles on the first try" as Top text and "nobody:" as Bottom
text, choose **Yellow** and **Large**, then pick **Square 1:1** under Crop,
tick **Boomerang**, and click **Convert to GIF**.

Expected:

The preview shows yellow text with a black outline at the top and bottom of
the picture, the long top line wrapping to fit; with Square 1:1 the text moves
inside the square. The finished GIF is square and shows the same text in the
same place on every frame, upright through the forward and backward passes.
Choosing another video empties the Text fields and resets to Meme, White, and
Medium.

This proves:

The text you preview is the text the GIF gets, styled with your font, color,
and size choices, and it works together with crop and playback options.
