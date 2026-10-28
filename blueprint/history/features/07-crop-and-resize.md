# Feature: Crop and resize

**From build-plan:** feature 7
**Build attempt:** 1
**Branch:** feature/crop-and-resize
**Status:** verified

## Goal

Let the user crop the GIF to a social-media shape (square 1:1, landscape 16:9,
or portrait 9:16) and choose which part of the frame to keep. The crop is shown
on the video preview before converting. Resizing keeps working through the
existing **Max width** setting, which now scales the cropped frame.

## In scope

- **Aspect-ratio picker** on the selected-video card, between the trim timeline
  and Output settings, as one radio group labelled **Crop**: **Original**
  (no crop, the default), **Square 1:1**, **Landscape 16:9**, **Portrait 9:16**.
  It uses the same radio styling as the Preset group and is disabled while
  converting.
- **Centered crop** (user decision): choosing a ratio selects the largest area of
  that shape that fits the frame, centered. Because it is as large as possible, it
  always spans the full width or the full height, so it can move along one axis
  only.
- **Reposition, no resize** (user decision): the user picks which part to keep by
  - dragging the crop box on the preview along its free axis (mouse, pen, or
    touch), and
  - a native range input labelled **Crop position** (0–100%, left→right or
    top→bottom) for keyboard and screen-reader users, kept in sync with the box.
  When the chosen ratio matches the source shape (within 1%), the crop covers the
  whole frame; the position slider is hidden and a short note says
  "This video is already <ratio>."
- **Preview overlay:** while a ratio is chosen, the area that will be cut away is
  dimmed on the video preview (playable videos) or on the **Start** frame
  (videos shown as still frames), with a visible border around the kept area.
  The overlay must line up with the picture itself, not the black letterbox
  bars.
- **Conversion uses the crop:** the ffmpeg filter crops first, then applies the
  existing fps and Max width scaling, so Max width applies to the cropped frame.
  A 1920×1080 video cropped 1:1 at the Balanced preset (480 px) gives a 480×480
  GIF; 9:16 at 480 px gives about 480×853 (user decision: Max width keeps its
  current meaning).
- **Lifecycle:** the crop resets to Original when another video is chosen. It is
  kept across conversions of the same video. Picking a ratio again re-centers it.
- **Unavailable state:** for a still-frame video whose start frame failed to
  load, the shape is unknown, so the Crop group is disabled with the note
  "Crop isn't available for this video." Conversion without a crop still works.

## Out of scope

- Resizing the crop box, corner handles, and a "Free" ratio (user decision; the
  overview's data model lists `"free"`, but it is not built here).
- New size controls or changing what Max width means (user decision).
- Showing the output pixel size.
- Rotate, flip, speed, reverse, boomerang, text (features 8 and 9).
- Remembering the crop in `localStorage`.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: implement all steps, run the Testing checks after each, then present
one review packet for the whole feature. No checkpoint commits; `/complete`
creates the final feature commit.

## Build steps

- [x] **1. Crop math, picker, and conversion.** Add `src/lib/crop.ts` (types and
  pure functions below). Report the source shape from `TrimTimeline` for
  playable videos (`videoWidth`/`videoHeight` in `onPlayable`). Add a `crop`
  state to `Converter.tsx` and a new `CropPanel.tsx` with the radio group.
  Pass the crop to `convertToGif`, which prepends the crop filter.
  **Done when:** with a 16:9 MP4, Square 1:1 produces a square GIF of the center
  of the frame, Portrait 9:16 a tall GIF of the center, and Original is unchanged;
  choosing another video resets to Original; `npm run build` passes.
- [x] **2. Preview overlay and still-frame support.** Size the video preview and
  the Start frame so an absolutely positioned overlay maps exactly onto the
  picture. Add the dimmed overlay with the kept-area border. For still-frame
  videos, take the shape from the Start frame image's natural size, and show the
  unavailable state when it fails.
  **Done when:** for a playable video in a wide card (letterboxed preview) and
  for an AVI shown as still frames, the bordered area sits exactly on the part
  of the picture the GIF keeps (compare with a converted GIF); a frame that
  fails to load disables Crop with the note; `npm run build` passes.
- [x] **3. Reposition.** Add the Crop position slider and pointer dragging along
  the free axis (pointer capture, `touch-action: none` on the box, clamped to the
  frame). Hide the slider and show the "already <ratio>" note when the crop
  covers the whole frame.
  **Done when:** with a 16:9 video at 1:1, dragging the box or pressing the
  arrow keys on Crop position moves the kept area left and right, the GIF shows
  that area, and the box never leaves the frame; a 1:1 source at Square 1:1 shows
  the note and no slider; `npm run build` passes.

## Files / areas

- `src/lib/crop.ts` (new) - crop types, centering, positioning, ffmpeg filter
  string.
- `src/lib/gif-engine.ts` - `convertToGif` takes the crop and prepends its filter.
- `src/components/converter/CropPanel.tsx` (new) - Crop radio group, position
  slider, notes.
- `src/components/converter/TrimTimeline.tsx` - report source shape, size the
  preview and Start frame so the overlay aligns, render the overlay.
- `src/components/converter/Converter.tsx` - crop state, reset, wiring.

## Data / contracts

- `type CropAspect = '1:1' | '16:9' | '9:16'`.
- `type Crop = { aspect: CropAspect; x: number; y: number; w: number; h: number }`,
  where all four numbers are fractions (0–1) of the displayed frame, after any
  rotation the browser and ffmpeg apply. `x + w <= 1` and `y + h <= 1`. In-memory
  only; nothing is persisted. The overview's `aspect: "free"` is intentionally
  not in this type yet.
- `crop: Crop | null` in `Converter.tsx`; `null` means Original.
- `centeredCrop(aspect, sourceWidth, sourceHeight): Crop`,
  `cropPosition(crop): number` and `moveCrop(crop, position): Crop` (position
  0–1 along the free axis), `cropFilter(crop): string`.
- `cropFilter` returns `crop=iw*<w>:ih*<h>:iw*<x>:ih*<y>` with values to 4
  decimals; the conversion filter becomes `<crop>,fps=...,scale=...` when a crop
  is set and is unchanged otherwise.
- `convertToGif(video, range, settings, crop, onProgress?)`; its only caller is
  `Converter.tsx`.

## Testing

- No test or Verify command is configured, so there are no automated tests.
  `crop.ts` is pure and ready for unit tests once `/tests` adds a runner.
- After each step: `npm run build` must pass.
- Manual checks in the dev server for each step's Done when, using a 16:9 MP4, a
  1:1 video, and an AVI that the browser shows as still frames. Compare the
  preview overlay with the converted GIF.
- A rotated phone video (portrait recorded with rotation metadata) is a useful
  extra check that the preview and the GIF crop the same area; report it as not
  verified if no such file is available.

## Notes for the AI

- The largest crop for a ratio `r` (width ÷ height) on a source of ratio `s`:
  if `r < s`, `h = 1` and `w = r / s`; otherwise `w = 1` and `h = s / r`. Center
  with `x = (1 - w) / 2`, `y = (1 - h) / 2`.
- Use the browser's `videoWidth`/`videoHeight` (already upright) and the Start
  frame's natural size (ffmpeg output, already upright). Don't mix in ffprobe's
  stored width/height, which ignore rotation.
- Pointer dragging must convert pixel movement using the overlay's current
  rendered size and must ignore the locked axis.
- Keep the converter's existing look: same focus ring, radio styling, and
  44 px touch targets as Output settings.

## Implementation notes

- **Unblocked.** The still-frame preview hang was fixed separately
  (`6575d49 fix: still-frame previews hang for MPEG-4 AVI`), and the WebM
  missing-duration fix landed too (`424fac5`). `master` was brought into this
  branch by fast-forward with the crop work stashed and reapplied; the only
  conflict, `handleMetadata` in `TrimTimeline.tsx`, keeps both the browser
  duration measurement and the frame size passed to `onPlayable` (also from
  `handleDurationChange`).
- Still-frame half of step 2, observed in Chromium (dev server 4321): on the
  320×240 AVI the Start frame box is 217×163 and the Square 1:1 crop box is
  163×163, centered (27 px offset); converting gives a 240×240 GIF. With Crop
  position at Home the GIF matches the frame's left square (mean difference 23
  vs 388 for the right square); at End it matches the right square (82 vs 403).
  With frame extraction forced to fail, Crop is disabled with "Crop isn't
  available for this video." and Convert stays enabled. `screen-capture.webm`
  still loads (0:00.0–0:16.6) and offers the crop slider at 9:16.
- Steps 1 and 3 and the playable-video half of step 2 were observed in the
  browser (dev server, Chromium): 1:1 → 360×360 and 9:16 → 202×360 GIFs from a
  640×360 MP4; the overlay box sits exactly on the 512×288 picture; Home/End on
  Crop position and pointer dragging move the kept area (GIF pixels match the
  source area within 2 levels); the box clamps to the frame; a 1:1 source shows
  "This video is already 1:1." with no slider; choosing another video resets to
  Original.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9460,"specSha256":"61692c868e64b58bb9bceac9653763da11a196a64a11a024a87c01b515a7f4d4","branch":"refs/heads/feature/crop-and-resize","head":"424fac5d8b862abfd95cdd9ce755e5c640ee431a","baseRef":"refs/heads/master","baseCommit":"424fac5d8b862abfd95cdd9ce755e5c640ee431a","sourceTree":"44957d783f0b5b1e09689bea63f39c33b0032ec6","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev` (or reuse the one already running), open
http://localhost:4321, and drop in a landscape (16:9) MP4. Under **Crop**, pick
**Square 1:1**, drag the bright box on the video to the left edge, then click
**Convert to GIF**.

Expected:

Picking Square 1:1 dims both sides of the video and puts a white border around
a centered square. Dragging moves the square only left and right, and it stops
at the edge of the picture. The **Crop position** slider follows to 0%. The
finished GIF is square and shows the left part of the video you framed.

This proves:

The crop shown on the preview is the area the GIF keeps, and you choose which
part of the frame it covers.
