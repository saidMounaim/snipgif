# Feature: In-browser conversion engine

**From build-plan:** feature 2
**Build attempt:** 1
**Branch:** feature/in-browser-conversion-engine
**Status:** verified

## Goal

Turn the video selected in feature 1 into an animated GIF entirely on the
user's device with ffmpeg.wasm. The video never leaves the browser; the only
network traffic is downloading the ffmpeg core from jsDelivr. This gives the
converter its first end-to-end result, with fixed settings until features 3
and 4 add trimming and output controls.

## In scope

- Add `@ffmpeg/ffmpeg` and `@ffmpeg/util` as dependencies, pinned to exact
  versions.
- Load the **single-threaded** ffmpeg core (`@ffmpeg/core@0.12.10`) from jsDelivr
  on demand, starting only after a valid video is selected, so the home page
  stays light. Load it once per page and reuse it.
- A **Convert to GIF** button on the selected-video card.
- Fixed conversion settings (user decision): **10 fps**, **480 px wide** (never
  upscaled; height keeps the aspect ratio), per-video color palette, infinite
  loop.
- Only the **first 30 seconds** are converted (user decision, until feature 3
  adds trimming). The card says so before converting.
- Conversion states with screen-reader announcements: getting the converter
  ready, converting, done, failed.
- On success, show the GIF as an image below the card. Download, copy, share,
  and file size belong to feature 5.
- Friendly, non-technical errors for: the converter failing to download, and
  the conversion failing (for example a corrupt or undecodable file). The user
  can retry after either.
- Release memory: delete files from ffmpeg's virtual file system after each run
  and revoke the GIF object URL when it is replaced or the user picks another
  video.

## Out of scope

- Trim and clip selection (feature 3).
- Adjustable FPS, width, quality, or presets (feature 4).
- Download, copy to clipboard, share, and showing GIF file size (feature 5).
- A percentage progress bar, cancelling a running conversion, and specific
  low-memory or unsupported-codec messages (feature 6).
- The multi-threaded core and any COOP/COEP headers (they break AdSense).
- Bundling or self-hosting the core, offline use (feature 21).

## Build loop

`workflow.stepReview: "feature"`: build all steps, then one review packet for
the whole feature. `workflow.checkpointCommits: "disabled"`: no step checkpoint
commits. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Engine module and dependencies.** Install `@ffmpeg/ffmpeg@0.12.15` and
  `@ffmpeg/util@0.12.2` with exact versions. Exclude both from Vite dependency
  pre-bundling in `astro.config.mjs` (the library starts its worker from its own
  module URL, which pre-bundling breaks). Add `src/lib/gif-engine.ts` with
  `loadGifEngine()` and `convertToGif(video)` per the contracts below.
  *Done when:* `npm run build` passes, the type-check passes, and the built
  output contains the ffmpeg worker as a separate chunk.
- [x] **2. Convert flow in the UI.** In `Converter.tsx`, start loading the engine
  when a valid video is selected, add the Convert button, the 30-second note,
  the status line, the GIF result, and the error messages. While a conversion
  runs, disable Convert and "Choose another video".
  *Done when:* with the dev server running, real MP4, MOV, WebM, and AVI sample
  files each convert to an animated GIF shown on the page, and the browser's
  network log shows no request carrying the video (only GET requests for the
  ffmpeg core from `cdn.jsdelivr.net`).
- [x] **3. Failure paths and cleanup.** Handle the core failing to download (retry
  works on the next click) and a conversion failing (a file of random bytes
  named `.mp4`). Revoke the previous GIF URL on re-convert and on "Choose another
  video"; delete virtual files after success and failure.
  *Done when:* with jsDelivr blocked, Convert shows the download error and a
  later click with jsDelivr allowed succeeds; the random-bytes file shows the
  conversion error and a valid file afterwards still converts; a sample longer
  than 30 seconds produces a GIF of about 30 seconds; `npm run build` passes.

## Files / areas

- `package.json`, `package-lock.json` - two new exact-version dependencies.
- `astro.config.mjs` - `vite.optimizeDeps.exclude` for the two ffmpeg packages.
- `src/lib/gif-engine.ts` - new: core loading and GIF conversion. No React.
- `src/components/converter/Converter.tsx` - convert button, states, result.
- `src/lib/video-file.ts` - reuse `SourceVideo` and `VideoFormat` as is.

## Data / contracts

All in memory. Nothing is persisted, and no user data is sent over the network.

```ts
// src/lib/gif-engine.ts
export const GIF_SETTINGS = { fps: 10, maxWidth: 480, maxSeconds: 30 } as const;

export class EngineLoadError extends Error {}   // core download/initialisation failed
export class ConversionError extends Error {}   // ffmpeg ran but produced no GIF

export function loadGifEngine(): Promise<void>;
// Loads once and caches the promise. On failure the cache is cleared so the
// next call retries.

export function convertToGif(video: SourceVideo): Promise<Blob>;
// Awaits loadGifEngine(), writes the file to the virtual FS, runs ffmpeg,
// reads output.gif, deletes both virtual files (also on failure), and returns
// a Blob of type "image/gif".
```

- **Core URLs:** `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js`
  and `.../ffmpeg-core.wasm`, passed to `ffmpeg.load()` through `toBlobURL` from
  `@ffmpeg/util`. The version is pinned in one constant.
- **Virtual file names:** `input.<format>` (from `SourceVideo.format`, helps the
  demuxer) and `output.gif`.
- **ffmpeg arguments:**
  `-t 30 -i input.<format> -vf "fps=10,scale='min(480,iw)':-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 output.gif`
  passed as an argument array (no shell). Values come from `GIF_SETTINGS`.
- **Failure classification:** `ffmpeg.load()` rejecting means `EngineLoadError`.
  A non-zero `exec` exit code, or a missing or empty `output.gif`, means
  `ConversionError`. Anything else is unexpected and uses the conversion error
  message too, without leaking ffmpeg logs.

### UI states (in `Converter.tsx`)

`ConversionState = "idle" | "loading-core" | "converting" | "done" | "error"`.
The engine begins loading in the background on selection. If the user clicks
Convert before it is ready, the state is `loading-core` until it is.

| State | Visible text | Announced |
|---|---|---|
| idle (selected) | Convert to GIF button; note: "Snipgif uses the first 30 seconds of your video." | - |
| loading-core | Getting the converter ready... | polite |
| converting | Converting your video... | polite |
| done | GIF image, alt "GIF made from {file name}" | "Your GIF is ready." (polite) |
| error (load) | The converter couldn't load. Check your connection and try again. | alert |
| error (convert) | Something went wrong converting this video. Please try another video. | alert |

Errors reuse the existing `role="alert"` region and status messages the
existing `aria-live="polite"` region, so each kind is announced once. Starting a
new conversion clears the previous error and result.

## Testing

No test command is configured, so tests are not a gate. Verify with
`npm run build`, the type-check, and browser checks against the user-started dev
server (`npm run dev`, http://localhost:4321). Generate sample videos with the
locally installed `ffmpeg` into the session scratchpad (not the repo): short
MP4 (H.264), MOV, WebM (VP9), and AVI clips, one clip longer than 30 seconds,
and a random-bytes `.mp4`. Use the browser network log for the privacy check and
request blocking for the download failure. The output GIF's frame rate, width,
and duration can be confirmed with the local `ffprobe`.

## Notes for the AI

- Read `coding-standards.md` sections Astro, React, Data and Boundaries, and
  Error Handling before coding.
- Keep `gif-engine.ts` free of React. Only touch `FFmpeg`, `Worker`, or
  `URL.createObjectURL` from client code paths (the island and functions it calls
  in event handlers or effects), never at module top level, so Astro's build-time
  render stays safe.
- Import the single-threaded core only. Do not add `Cross-Origin-Opener-Policy`
  or `Cross-Origin-Embedder-Policy` headers or `SharedArrayBuffer` code.
- `-t 30` before `-i` limits how much input is read, which also keeps memory
  down on long videos.
- The `scale` expression contains a comma, so keep its single quotes inside the
  filter string; no shell is involved.
- If the Vite worker still fails in dev or build after the exclude, check whether
  `vite.worker.format: "es"` is needed, and record the reason in a short comment.
- Do not log file names or file contents to the console.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8820,"specSha256":"2f25dc504d6685ec5e65c1bce225fc8aaf576ee316c14fc59aa06768d5f4b124","branch":"refs/heads/feature/in-browser-conversion-engine","head":"0033a2dec6b2efe74e98960ec61a9e6c4a1cb0c1","baseRef":"refs/heads/master","baseCommit":"0033a2dec6b2efe74e98960ec61a9e6c4a1cb0c1","sourceTree":"848983c9f7adfaa9c13e6df29068f59967c269aa","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With `npm run dev` running, open http://localhost:4321, choose any short `.mp4`
video, and click **Convert to GIF**.

Expected:

"Getting the converter ready..." and then "Converting your video..." appear
under the card. After a few seconds the text changes to "Your GIF is ready." and
an animated GIF of your video, at most 480 px wide, appears below it.

This proves:

The video is converted to an animated GIF in your browser with the fixed 10 fps,
480 px settings.
