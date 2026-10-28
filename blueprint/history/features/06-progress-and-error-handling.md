# Feature: Progress and error handling

**From build-plan:** feature 6
**Build attempt:** 1
**Branch:** feature/progress-and-error-handling
**Status:** verified

## Goal

Show how far a conversion has got, and turn the two failures users hit most on
real devices into clear, actionable messages instead of a generic error or a dead
converter: running out of memory, and a video whose contents ffmpeg can't
convert even though the file type is allowed. After any such failure the
converter keeps working, so the user can change settings and try again without
reloading the page.

## In scope

- **Conversion progress bar.** While `conversion === 'converting'`, show a
  native `<progress>` element with a determinate value from 0 to 1 and a visible
  percentage (`42%`), below the status message. Progress comes from ffmpeg's
  `progress` events, measured against the selected clip length
  (`range.endSec - range.startSec`), clamped to 0–1, and never moves backwards
  within one conversion. It resets to 0 at the start of each conversion and is
  hidden once the conversion is done or fails.
- **Getting-ready indicator.** While `conversion === 'loading-core'`, show the
  same `<progress>` element without a `value` (indeterminate), because the
  shared core download has no per-conversion progress.
- **Accessible progress.** The `<progress>` is labelled by the existing visible
  status text ("Getting the converter ready..." / "Converting your video...").
  The percentage is **not** placed in the `aria-live` region, so screen readers
  aren't flooded; the existing status messages stay the announcements.
- **Out-of-memory failures.** Detect ffmpeg failures caused by memory (the
  rejection message matches `OOM`, `out of memory`, `Cannot enlarge memory`,
  `memory access out of bounds`, or `Array buffer allocation failed`,
  case-insensitive). Then:
  - During conversion, show: "Your device ran out of memory making this GIF.
    Try a shorter clip, a smaller width, or the Small for chat preset."
  - While reading the video with ffmpeg (writing it into the engine or probing
    its duration), show: "This video is too large for your device's memory.
    Try a shorter or smaller video."
- **Engine recovery.** Any ffmpeg call that *rejects* (not a non-zero exit code)
  leaves the wasm module unusable, so the engine module terminates that FFmpeg
  instance and forgets it. The next probe, frame preview, or conversion loads a
  fresh core and writes the selected video again automatically. Clicking
  **Convert to GIF** again after a memory failure must work without choosing the
  video again.
- **Unsupported contents.** When conversion exits with a non-zero code and the
  ffmpeg log for that run contains `Invalid data found when processing input`,
  `Decoder (codec`, `not found`, or `does not contain any stream`, show: "We
  can't convert this video's contents, even though the file type is supported.
  Try another video." Other conversion failures keep the existing generic
  message.
- All new messages use the existing `role="alert"` paragraph (`video-upload-error`)
  and clear when a new conversion starts or another video is chosen, as the
  existing conversion errors do. Raw ffmpeg text is never shown.

## Out of scope

- Cancelling a running conversion.
- Download progress for the ~30 MB ffmpeg core.
- Proactive device checks before converting (for example
  `navigator.deviceMemory`); this feature reacts to real failures only. The
  existing over-200 MB warning stays as it is.
- New upload validation: type, empty-file, multiple-file, and size checks from
  feature 1 are unchanged, and the 30 s clip cap from feature 3 is unchanged.
- A watchdog for a browser that kills the worker or tab without any error. If
  ffmpeg never answers, the UI stays on "Converting your video..." (known
  limitation, see Notes).
- Styling beyond the current converter look (feature 11).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: implement all steps, run the Testing checks after each, then present
one review packet for the whole feature. No checkpoint commits; `/complete`
creates the final feature commit.

## Build steps

- [x] **1. Report conversion progress from the engine.** Add an optional
  `onProgress(fraction)` callback to `convertToGif`. Subscribe to the FFmpeg
  `progress` event only for the duration of that `exec`, unsubscribe in
  `finally`, and convert the event's `time` against the clip length. **Check
  first:** confirm the unit of `time` in `@ffmpeg/ffmpeg` 0.12.15 / core 0.12.10
  (the installed types only say `time: number`) by logging a few events from one
  real conversion in the dev server; remove the log before review. If `time`
  turns out to be unusable, use the `progress` field instead and record that in
  Notes.
  **Done when:** converting a 10 s clip calls `onProgress` with values that
  rise from about 0 to about 1 and never exceed 1; `npm run build` passes.
- [x] **2. Show the progress bar.** In `Converter.tsx`, keep a `progress` number
  in state, reset it to 0 on each conversion, keep the larger of the current and
  new values, and render the `<progress>` element (indeterminate while getting
  ready, determinate with a percentage while converting) labelled by the status
  text.
  **Done when:** in the dev server, a 10 s clip shows an indeterminate bar while
  the core loads (first conversion), then a bar and percentage that climb to
  about 100%; the bar disappears when "Your GIF is ready." appears or a
  conversion fails; Tab never lands on the bar; `npm run build` passes.
- [x] **3. Classify memory failures and recover the engine.** In
  `gif-engine.ts`, wrap ffmpeg calls so a rejected call terminates and forgets
  the instance (and the prepared-input record), keeping the selected video so
  the next call re-prepares it. Throw a new `MemoryError` when the rejection
  message matches the memory patterns above. In `Converter.tsx`, map
  `MemoryError` to the conversion memory message during conversion and the
  read memory message during `readWithFfmpeg`.
  **Done when:** with a temporary dev-only change that makes the conversion
  `exec` reject with `RuntimeError: Aborted(OOM)` (removed before review), Convert
  shows the conversion memory message and no ffmpeg text; after removing the
  change and clicking Convert again with the same video, a GIF is produced
  without re-selecting the file; the same check on `probeDuration` with an AVI
  shows the read memory message; `npm run build` passes.
- [x] **4. Classify unsupported contents.** Collect ffmpeg log lines during the
  conversion `exec` only, and throw a new `UnsupportedVideoError` when the exit
  code is non-zero and a line matches the patterns above. Map it to the
  unsupported message in `Converter.tsx`.
  **Done when:** converting a file renamed to `.mp4` that is not really a video
  (for example a text file) either fails at reading with the existing read
  message or at conversion with the unsupported message, never with raw ffmpeg
  text; a normal video still converts; `npm run build` passes.

## Files / areas

- `src/lib/gif-engine.ts` - progress callback, failure wrapper, engine reset,
  `MemoryError` and `UnsupportedVideoError`.
- `src/components/converter/Converter.tsx` - progress state and bar, new error
  keys and messages for conversion and reading.

## Data / contracts

- `ConversionState` keeps its statuses (`idle | loading-core | converting | done
  | error`). The overview's `progress` (0 to 1) is a new number in component
  state. Nothing is persisted.
- The conversion error keys become `'load' | 'memory' | 'unsupported' | 'convert'`.
  The read failure reasons become `'load' | 'memory' | 'read'`.
- `convertToGif(video, range, settings, onProgress?: (fraction: number) => void):
  Promise<Blob>` - existing callers without `onProgress` still work.
- `MemoryError` and `UnsupportedVideoError` extend the existing
  `ConversionError`, so any code that catches `ConversionError` still catches them.
- Only fixed, app-authored strings reach the page; ffmpeg messages and logs are
  only used for classification.

## Testing

- No test or Verify command is configured, so there are no automated tests in
  this feature. Classification is in small pure checks that a unit test can cover
  once `/tests` adds a runner.
- After each step: `npm run build` must pass.
- Manual checks in the dev server (`npx astro dev --background`) for each step's
  Done when. The memory case cannot be triggered on demand on a desktop, so step
  3 uses a temporary forced rejection that must be removed before review; real
  out-of-memory behavior on a phone stays unverified unless one is available.

## Notes for the AI

- The FFmpeg worker reports a failed call by rejecting with `e.toString()` (a
  string such as `RuntimeError: Aborted(OOM)`), not an `Error`. Classify on
  `String(reason)`.
- After the instance is terminated, pending calls reject with
  `ERROR_TERMINATED`. Treat that as part of the same failure, not a second one.
- Keep `EngineLoadError` handling as it is; a reset engine that then fails to
  load again must still show the existing load message.
- Known limitation: if the browser kills the worker outright, `@ffmpeg/ffmpeg`
  gives no error event, so the conversion never settles. Don't add a timeout
  here; record it as a risk at review.
- Do not log file names, contents, or ffmpeg output to the console in shipped
  code.

## Implementation notes

- **Progress `time` unit confirmed: microseconds.** The code treats the
  progress event's `time` as microseconds of output. `/check` observed it on a
  12 s clip: reported values went 0 → 0.66 → 0.994 and never exceeded 1.
- `Decoder (codec ...) not found` is matched as one phrase, not `not found` on
  its own, so unrelated "not found" log lines don't count as unsupported.
- A failed `ffprobe` now discards the engine like any other rejected call; the
  duration fallback then re-prepares the input on a fresh engine.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10036,"specSha256":"f8e03d18eb7c555aa9e98780b8312c856f0f31db3d710ee36fc789e8c553e1de","branch":"refs/heads/feature/progress-and-error-handling","head":"74e8ff92e5611767b1c88fabe023504a3734ef4a","baseRef":"refs/heads/master","baseCommit":"74e8ff92e5611767b1c88fabe023504a3734ef4a","sourceTree":"4ffdc2bde77358632602eff552cc052c049ff8ab","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev` (or reuse the one already running), open
http://localhost:4321, drop in a video of about 10 seconds, and click **Convert
to GIF**.

Expected:

Under the status line, a thin violet bar appears. While "Getting the converter
ready..." shows (first time only), the bar keeps moving with no percentage.
With "Converting your video...", it becomes a filling bar with a percentage that
climbs to about 100%. The bar disappears when "Your GIF is ready." appears and
the "Your GIF" result shows.

This proves:

Conversion progress is measured against the selected clip and shown as a bar
that only moves forward, then disappears when the conversion ends.
