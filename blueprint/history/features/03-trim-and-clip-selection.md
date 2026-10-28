# Feature: Trim and clip selection

**From build-plan:** feature 3
**Build attempt:** 1
**Branch:** feature/trim-and-clip-selection
**Status:** verified

## Goal

Let the user pick exactly which part of the video becomes the GIF: a timeline
with start and end handles, a preview of the chosen moment, and a hard cap of
30 seconds. Conversion then uses that range instead of "the first 30 seconds"
from feature 2. Everything still happens on the device.

## In scope

- A trim timeline on the selected-video card with **Start** and **End** handles,
  the selected range highlighted, and readouts of start, end, and length.
- **Selection rules** (plan: max GIF length about 30 seconds):
  - Default selection: `0` to `min(duration, 30)` seconds.
  - Length is capped at **30 s** and at least **0.1 s** (one frame at 10 fps).
  - Moving one handle past a limit pushes the other handle to keep both rules,
    and both stay within `0..duration`.
  - Handles move in **0.1 s** steps.
- **Playable videos** (the browser can decode them): a video preview with no
  native controls. Moving Start or End seeks the preview to that time. A
  **Play selection** button plays from Start and pauses at End; it toggles to
  **Pause**.
- **Videos the browser can't play** (user decision: still frames), such as AVI or
  HEVC MOV in Chrome: show two still images, "Start" and "End", grabbed by
  ffmpeg at the handle positions. They refresh shortly after a handle stops
  moving. If a frame can't be grabbed, show "Preview not available" in its place
  and trimming still works.
- Duration comes from the browser for playable videos; otherwise (including a
  WebM whose duration the browser reports as infinite) ffmpeg reads it.
- Status while the duration is being read: "Reading your video...". If the
  duration can't be read at all: error "We couldn't read this video. Please try
  another video." and Convert stays disabled.
- Convert uses the selected range. Replace the "first 30 seconds" note with the
  selection summary.
- Memory: the preview's object URL and the still-frame URLs are revoked when
  replaced, on "Choose another video", and on unmount. The video is written to
  ffmpeg's virtual file system at most once per selection and deleted when the
  user chooses another video.

## Out of scope

- Output settings and presets (feature 4); the conversion stays 10 fps / 480 px.
- Download, copy, share, file size (feature 5).
- Progress percentage, cancelling, low-memory messages (feature 6).
- Crop, speed, reverse, boomerang, text (features 7 to 9).
- A filmstrip of thumbnails along the timeline, frame-accurate stepping buttons,
  and transcoding unplayable videos into a playable preview.
- Final visual design and dark mode (feature 11).

## Build loop

`workflow.stepReview: "feature"`: build all steps, then one review packet for
the whole feature. `workflow.checkpointCommits: "disabled"`: no step checkpoint
commits. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Clip range logic and engine support.** Add `src/lib/clip-range.ts`
  (pure: default range, the move rules, time formatting). In `gif-engine.ts`,
  keep the selected video's file in the virtual FS for reuse (`prepareInput`,
  `releaseInput`), add `probeDuration()` and `extractFrame(atSec)`, and change
  `convertToGif` to take a `ClipRange`.
  *Done when:* `npm run build` and the type-check pass, and a throwaway Node check
  of `clip-range.ts` shows the default, cap, minimum, push, and bounds rules.
- [x] **2. Timeline with playable preview.** Add `TrimTimeline.tsx`. In
  `Converter.tsx`, create the preview object URL on selection, detect
  playability from video metadata, render the preview, handles, readouts, Play
  selection, and the summary, and pass the range to Convert.
  *Done when:* with the dev server running: an MP4, MOV (H.264), and WebM sample
  show the preview; moving Start seeks the preview; the 40 s sample defaults to
  0:00.0 to 0:30.0 and cannot exceed 30 s; converting a 2.0 s to 5.0 s range
  gives a 3.0 s GIF (30 frames); Play selection stops at End.
- [x] **3. Still-frame fallback and errors.** When the video element errors, has
  no video track, or reports a non-finite duration, read the duration with
  ffmpeg and show Start/End still frames instead of the player.
  *Done when:* the AVI sample and an HEVC MOV sample show still frames that update
  after moving a handle and convert the selected range; a WebM written without a
  duration header gets its duration from ffmpeg; the random-bytes `.mp4` shows
  "We couldn't read this video..." with Convert disabled; `npm run build` passes.

## Files / areas

- `src/lib/clip-range.ts` - new: `ClipRange`, `defaultRange`, `moveStart`,
  `moveEnd`, `formatTime`. No DOM, no React.
- `src/lib/gif-engine.ts` - input lifecycle, `probeDuration`, `extractFrame`,
  ranged `convertToGif`.
- `src/components/converter/TrimTimeline.tsx` - new: track, two handles,
  readouts, preview area (video or still frames), Play selection.
- `src/components/converter/Converter.tsx` - preview URL, playability
  detection, duration state, range state, wiring to Convert.

## Data / contracts

In memory only.

```ts
// src/lib/clip-range.ts
export type ClipRange = { startSec: number; endSec: number };
export const CLIP_LIMITS = { maxSec: 30, minSec: 0.1, stepSec: 0.1 } as const;

export function defaultRange(durationSec: number): ClipRange;
// { startSec: 0, endSec: min(durationSec, 30) }, rounded to the step.

export function moveStart(range: ClipRange, startSec: number, durationSec: number): ClipRange;
export function moveEnd(range: ClipRange, endSec: number, durationSec: number): ClipRange;
// Snap to 0.1 s, clamp to 0..duration, then push the other handle so that
// minSec <= end - start <= maxSec. When duration < minSec, the range is 0..duration.

export function formatTime(sec: number): string; // "0:03.2", "1:05.0"
```

```ts
// src/lib/gif-engine.ts (changes)
export function prepareInput(video: SourceVideo): Promise<void>; // write once per video
export function releaseInput(): Promise<void>;                  // delete from virtual FS
export function probeDuration(): Promise<number>;               // seconds, finite and > 0
export function extractFrame(atSec: number): Promise<Blob>;     // image/jpeg, max 480 px wide
export function convertToGif(video: SourceVideo, range: ClipRange): Promise<Blob>;
// convertToGif calls prepareInput itself, so it keeps working without a probe.
```

- **Conversion arguments:** `-ss <start> -t <end - start> -i input.<format>` then
  the existing filter and `-loop 0 output.gif`. Seconds are passed with one
  decimal.
- **Frame arguments:** `-ss <t> -i input.<format> -frames:v 1 -vf "scale='min(480,iw)':-1" -q:v 4 frame.jpg`,
  then delete `frame.jpg`.
- **Duration:** try `ffmpeg.ffprobe` (`-show_entries format=duration`). If the
  pinned core does not support ffprobe, fall back to parsing `Duration:` from
  the log of `-i input.<format>`. A missing, zero, or non-numeric result throws
  `ConversionError`.
- **Concurrency:** ffmpeg runs one command at a time. Frame requests that finish
  after the handle has moved again are discarded. Frames are not requested while
  a conversion runs.

### UI states (additions)

| State | Shows |
|---|---|
| reading duration | "Reading your video..." (polite) |
| ready, playable | video preview, timeline, Play selection |
| ready, still frames | Start and End frames (each with a short loading text until ready), timeline |
| unreadable | alert "We couldn't read this video. Please try another video."; Convert disabled |

Summary text under the timeline: "Selected 0:02.0 to 0:05.0 (3.0 s)".

### Accessibility

- Handles are native `<input type="range">` elements labelled "Start time" and
  "End time", with `step=0.1`, `min=0`, `max=duration`, and `aria-valuetext` set
  to the formatted time, so keyboard and screen readers work without custom key
  handling. Touch targets are at least 44 px tall.
- Moving a handle is not announced beyond the slider's own value text.
- The still images use alt text "Frame at 0:02.0". The Play selection button
  has a text label that changes between Play selection and Pause.

## Testing

No test command is configured, so tests are not a gate. Verify with
`npm run build`, the type-check, a throwaway Node check of `clip-range.ts`, and
browser checks against the user-started dev server. Generate extra samples into
the scratchpad with the local `ffmpeg`: an HEVC `.mov` (`libx265`, which
Chromium can't play) and a WebM piped to stdout so it has no duration header.
Reuse the existing scratchpad samples (H.264 MP4, MOV, VP9 WebM, MPEG-4 AVI,
40 s MP4, random-bytes `.mp4`). Confirm GIF length by counting frames as in
feature 2.

## Notes for the AI

- Read `coding-standards.md` sections Astro, React, Data and Boundaries, and
  Error Handling before coding.
- Keep `clip-range.ts` pure so a unit test can cover it once `/tests` adds a
  runner.
- Playability check: load the object URL in the preview `<video preload="metadata">`.
  Treat it as playable only after `loadedmetadata` with `videoWidth > 0` and a
  finite duration. An `error` event, `videoWidth === 0`, or a non-finite
  duration switches to the still-frame path.
- Seeking a `<video>` to the start handle should not autoplay. Play selection
  pauses on `timeupdate` once `currentTime >= endSec`.
- Debounce still-frame requests (about 300 ms after the last handle change) so
  dragging does not queue dozens of ffmpeg runs.
- `@ffmpeg/ffmpeg` exposes `ffprobe`; check that core 0.12.10 actually runs it
  before relying on it, and keep the log-parsing fallback if it does not.
- Do not log file names or contents to the console.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9728,"specSha256":"fa374486de48907e6b885b72f433a335faa61e6f7130bea0ded8f807293e2f50","branch":"refs/heads/feature/trim-and-clip-selection","head":"dcce0c3a61a43ed10673eb0bdef0f2917c4d2a0f","baseRef":"refs/heads/master","baseCommit":"dcce0c3a61a43ed10673eb0bdef0f2917c4d2a0f","sourceTree":"0fb9343ffb60e7c06fe95afe3b5c98d0c7c4b3a0","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With `npm run dev` running, open http://localhost:4321 and choose any `.mp4`
longer than a few seconds. Drag the **Start** handle to about 2 seconds and the
**End** handle to about 5 seconds, click **Play selection**, then click
**Convert to GIF**.

Expected:

The text under the timeline reads "Selected 0:02.0 to 0:05.0 (3.0 s)" (or close
to your positions). The preview plays from Start and stops at End, and the
button returns to "Play selection". After converting, a GIF of only that
3-second part appears below the card.

This proves:

The timeline selects the part of the video that becomes the GIF, and conversion
uses exactly that range.
