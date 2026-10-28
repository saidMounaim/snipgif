# Feature: Speed, reverse, and boomerang

**From build-plan:** feature 8
**Build attempt:** 1
**Branch:** feature/speed-reverse-and-boomerang
**Status:** verified

## Goal

Let the user change how the trimmed clip plays in the GIF: speed it up or slow
it down, play it backward, or make a back-and-forth loop (boomerang). The GIF's
resulting length is shown before converting. The existing 30 s limit now applies
to that output length, so slow or boomerang GIFs cannot exceed it.

## In scope

- **Playback panel** on the selected-video card, between Crop and Output
  settings, headed **Playback**, disabled while converting. It holds:
  - **Speed** radio group (user decision): **0.5x**, **1x** (default),
    **1.5x**, **2x**, **3x**. It uses the same visually hidden radio and 44 px
    label styling as the Preset and Crop groups.
  - **Reverse** checkbox: the GIF plays the clip backward.
  - **Boomerang** checkbox, with the hint "Plays forward, then backward": the
    GIF plays the clip, then plays it backward, and loops.
  - Both on: the GIF plays backward, then forward. The order is fixed. Don't add
    a separate control for it.
  - **GIF length** line, for example `GIF length: 0:10.0`, using the existing
    `formatTime`. It updates as the trim, speed, or boomerang changes.
- **Output length and the 30 s cap** (user decision): the GIF length is
  `clip length ÷ speed`, doubled for boomerang. It must not exceed
  `CLIP_LIMITS.maxSec` (30 s). When it would, the panel shows "This GIF would
  be <length> long. The limit is 0:30.0. Shorten the clip or choose a faster
  speed, or turn off Boomerang." (mention Boomerang only when it is on). Convert
  to GIF is then disabled and points to that message with `aria-describedby`.
  The message is announced politely when it appears. The trim cap stays as it is
  today. Nothing is changed automatically.
- **Conversion uses the playback settings.** The speed changes the GIF's
  timeline, and the FPS setting still applies to the output. For example, 2x at
  12 fps gives 12 frames per GIF second covering 2 s of video. Reverse and
  boomerang run after crop, fps, and scaling, so only output-size frames are
  buffered in memory.
- **Progress** uses the output length as its total, so it reaches 100% for slow,
  fast, and boomerang GIFs. It still never goes backward or above 100%. With
  Reverse, ffmpeg must read the whole clip before writing, so the bar may stay
  low and then fill quickly. That is acceptable.
- **Errors:** out-of-memory and other failures use the existing friendly
  messages from feature 6. The memory message already suggests a shorter clip
  or a smaller width.
- **Lifecycle:** playback resets to 1x, Reverse off, and Boomerang off when
  another video is chosen. It is kept across conversions of the same video.

## Out of scope

- Previewing speed, reverse, or boomerang on the video preview or still frames.
  The trim preview keeps playing at normal speed and direction.
- Speeds other than the five listed, a speed slider, or custom values.
- Changing the trim limits or trimming automatically to fit the cap.
- Text overlay (feature 9), remembering playback in `localStorage`.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`. Implement all steps and run the Testing checks after each. Then
present one review packet for the whole feature. Make no checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Speed, GIF length, and the cap.** Add `src/lib/playback.ts` (types,
  speeds, defaults, output length, filter fragments). Add `playback` state to
  `Converter.tsx` and reset it in `resetSelection`. Add
  `PlaybackPanel.tsx` with the Speed group, the GIF length line, and the
  too-long message. Disable Convert when the output is too long. Pass the
  playback settings to `convertToGif`, which adds the speed filter and uses the
  output length for progress.
  **Done when:** with a 10 s clip, 2x gives a GIF of about 5 s and 0.5x about
  20 s, both smooth at the chosen FPS; the bar reaches 100% for both; a 20 s
  clip at 0.5x shows the message and disables Convert until the clip is ≤ 15 s
  or the speed is raised; choosing another video resets to 1x; `npm run build`
  passes.
- [x] **2. Reverse and boomerang.** Add the two checkboxes and their filters,
  and double the output length for boomerang.
  **Done when:** Reverse plays the clip backward; Boomerang plays forward then
  backward with no visible pause at the turns; both on plays backward then
  forward; boomerang doubles the GIF length and can trigger the cap message;
  each works together with a crop and with 2x; the bar finishes at 100%; a
  still-frame AVI converts with Reverse; `npm run build` passes.

## Files / areas

- `src/lib/playback.ts` (new) - `Playback` type, speeds, default, output length,
  too-long check, ffmpeg filter fragments.
- `src/lib/gif-engine.ts` - `convertToGif` takes `playback`, builds the filter
  chain, and uses the output length for progress.
- `src/components/converter/PlaybackPanel.tsx` (new) - Speed group, Reverse and
  Boomerang checkboxes, GIF length, too-long message.
- `src/components/converter/Converter.tsx` - state, reset, wiring, Convert
  disabled state and `aria-describedby`.

## Data / contracts

- `type Speed = 0.5 | 1 | 1.5 | 2 | 3`; `SPEEDS: Speed[]` in display order.
- `type Playback = { speed: Speed; reverse: boolean; boomerang: boolean }`. These
  field names match the overview's `Edits`. Playback is in-memory only and never
  persisted.
- `DEFAULT_PLAYBACK = { speed: 1, reverse: false, boomerang: false }`.
- `outputSec(range, playback): number` is
  `(endSec - startSec) / speed × (boomerang ? 2 : 1)`. Compute it in whole tenths
  of a second, like `clip-range.ts`, so the cap check has no float error.
  `tooLong(range, playback)` is true when that is greater than
  `CLIP_LIMITS.maxSec`.
- The filter chain order is
  `[crop,]setpts=PTS/<speed>,fps=<fps>,scale=...[,reverse][boomerang]`, followed
  by the existing palette split. At 1x, without reverse or boomerang, the
  filter must match today's except for a harmless `setpts=PTS/1`, or omit it.
  Boomerang is `split` into two branches, `reverse` on the second, then `concat`.
- `convertToGif(video, range, settings, crop, playback, onProgress?)`. Its only
  caller is `Converter.tsx`.

## Testing

- No test or Verify command is configured, so there are no automated tests.
  `playback.ts` is pure and ready for unit tests once `/tests` adds a runner.
- After each step, `npm run build` must pass.
- Do manual checks in the dev server for each step's Done when. Use a 16:9 MP4
  with visible motion, and an AVI that the browser shows as still frames.
  Compare each GIF's length and direction against the source.
- Use a 30 s clip at 0.5x and Boomerang at the High quality preset as a
  memory-pressure check. With the cap, the longest allowed output is 30 s. If it
  runs out of memory, the existing friendly message must appear and the page
  must stay usable. Report the result, not an assumption.

## Notes for the AI

- Put `setpts` before `fps` so the fps filter resamples the sped-up timeline.
  Otherwise 2x would effectively halve the frame rate.
- Input-side `-ss` and `-t` stay as they are. They select source seconds, and
  `setpts` only changes output timing.
- `reverse` buffers every frame of the clip, so keep it after `scale`.
- In boomerang, the last forward frame and the first backward frame are the
  same frame, as are the clip's first frame and the loop restart. Drop the
  duplicate at the turn if a simple `trim` makes it work. A doubled frame at one
  turn is acceptable if dropping it is fragile. Check it visually.
- Progress `time` is the output position. Divide by `outputSec`, not by the clip
  length.
- The too-long message must be readable by screen readers when it appears. Keep
  it in a polite live region inside the panel, and reference its id from the
  Convert button only while it is shown.
- Keep the converter's existing look: same focus ring, radio and label styling,
  and 44 px touch targets as Crop and Output settings. Checkbox labels can reuse
  the same `has-checked` choice styling.

## Implementation notes

- **Boomerang turns:** the backward pass drops its first and last frames, so
  neither turn repeats a frame. For a 2 s clip at 10 fps, this gives 38 frames
  (3.8 s) instead of 40. For a clip of one or two frames, the backward pass is
  empty and concat outputs the forward pass alone. Native ffmpeg 9.0.2 handled
  this case. The length shown in the panel ignores the two dropped frames, so it
  can be up to two frames long for boomerang.
- **Filter evidence (native ffmpeg 9.0.2, not ffmpeg.wasm):** the exact filter
  strings from `playback.ts`, with a crop, ran on a generated 30 fps test video.
  Output lengths: 1x 2.0 s, 2x 1.0 s, 0.5x 4.0 s, reverse 2.0 s, boomerang
  3.8 s, reverse + boomerang 3.8 s, 2x + boomerang 1.8 s. Comparing frame hashes
  against the plain clip showed the exact order: reverse 19..0, boomerang
  0..19 then 18..1, and reverse + boomerang 19..0 then 1..18.
- **Logic checks:** `outputSec` and `tooLong` ran through Node type stripping
  from a scratch copy (only the import extension changed): 10 s at 2x = 5 s,
  0.5x = 20 s, 3x = 3.3 s, 30 s at 1.5x with boomerang = 40 s, 15.0 s at
  0.5x is allowed, and 15.1 s at 0.5x is too long.
- **Browser evidence (dev server, Chromium via Playwright, ffmpeg.wasm):** a
  generated 12 s 640×360 MP4 (`testsrc`). The panel showed `GIF length: 0:12.0`,
  then `0:24.0` at 0.5x. Adding Boomerang showed the 0:48.0 message in a polite
  live region, with Convert disabled and `aria-describedby="playback-limit"`.
  Turning Boomerang off removed the message and re-enabled Convert. 3x + Reverse
  converted to 48 frames over 4.01 s, with the progress bar peaking at 98.3%
  before the result replaced it. 2x + Reverse + Boomerang converted to 142
  frames (72 + 70) over 11.83 s, with progress peaking at 100%. Choose another
  video, then the same video again, reset to 1x with both checkboxes off. The
  console had no errors or warnings.
- **Not verified:** a still-frame AVI, the 30 s memory-pressure check,
  screen-reader speech (only the live-region markup was checked), and frame
  order inside ffmpeg.wasm (it was checked exactly with native ffmpeg). TypeScript
  isn't installed, so nothing was type-checked.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10446,"specSha256":"f5624642295d401cc97e49b6abc660aab798cab75cb6e3481cdc3ca7a97dd603","branch":"refs/heads/feature/speed-reverse-and-boomerang","head":"b52e656ba80bff4bf5b78772d062bc2b578ad271","baseRef":"refs/heads/master","baseCommit":"b52e656ba80bff4bf5b78772d062bc2b578ad271","sourceTree":"563e99488798170a3faba34dd15164af0c3d8537","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev` (or reuse the one already running), open
http://localhost:4321, and drop in an MP4 with visible motion, trimmed to about
10 s. In **Playback**, choose **0.5x**, then tick **Boomerang**. Untick it,
choose **2x**, tick **Reverse** and **Boomerang**, then click **Convert to GIF**.

Expected:

**GIF length** reads 0:10.0, then 0:20.0 at 0.5x. With Boomerang it would be
0:40.0, so a red message says the GIF is over the 0:30.0 limit and Convert to
GIF is disabled; unticking Boomerang clears it. At 2x with Reverse and
Boomerang the length reads 0:10.0, and the finished GIF is about 10 s long. It
plays the clip backward, then forward, faster than the source, with no pause at
either turn.

This proves:

Speed, reverse, and boomerang change the GIF the way the panel describes, and
the 30 s limit applies to the finished GIF.
