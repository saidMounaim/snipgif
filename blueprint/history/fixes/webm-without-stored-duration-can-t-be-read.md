# Fix: WebM without stored duration can't be read

**Type:** Fix
**Status:** verified
**Branch:** fix/webm-without-stored-duration-can-t-be-read

## The problem

Screen recordings made by Chrome (for example `screen-capture.webm`, H.264
1920×1080 in WebM, `encoder: Chrome`) store no duration in the file. Snipgif
shows "We couldn't read this video. Please try another video." and Convert to GIF
stays disabled, although the video is fine.

Confirmed with the user's file (`C:\Users\saidm\Downloads\screen-capture.webm`,
frames from 0 to 16.686 s):

- **Browser path** (`handleMetadata` in
  `src/components/converter/TrimTimeline.tsx`): Chrome reports
  `duration = Infinity` on `loadedmetadata`. The code requires a finite
  duration, so it calls `onUnplayable()`. Seeking far past the end makes Chrome
  work out the real duration (it reported 16.686 s).
- **ffmpeg path** (`probeDuration` in `src/lib/gif-engine.ts`): `ffprobe`
  returns −1 and prints `N/A`, and the fallback finds no `Duration: hh:mm:ss`
  line (`Duration: N/A`). It throws, and the app shows the read error.

Both checks rely on a duration stored in the file, and recordings like this
don't have one.

## The fix

1. **Browser path:** when `loadedmetadata` reports `duration === Infinity` with
   a real picture (`videoWidth > 0`), seek the hidden preview far past the end
   so the browser measures the duration. On the first finite `durationchange`,
   seek back to 0 and call `onPlayable(duration)`. If the seek finishes without a
   finite duration, call `onUnplayable()` as today. The preview stays hidden
   (mode `checking`) while this runs, so the user just sees
   "Reading your video..." a little longer.
2. **ffmpeg path:** when neither existing check finds a duration, run one more
   cheap pass that copies the video stream to ffmpeg's null output without
   decoding it (`-map 0:v:0 -c copy -f null -`). Use the last
   `time=hh:mm:ss.xx` value from its log. This covers browsers that can't play
   such a file (for example a WebM with a codec the browser lacks).

It must not break:

- Videos with a stored duration: they take exactly the current path, with no
  extra seek and no extra ffmpeg run.
- Unplayable and unreadable files: still end in the existing read message, with
  no hang. A browser seek that never produces a finite duration must still end in
  `onUnplayable()`.
- The 30 s clip cap and trim behavior once a duration is known.
- The ffmpeg-failure handling from feature 6. The extra pass goes through the
  same `guard` wrapper, so a memory failure is still classified.

Out of scope: rewriting the file with a duration (remuxing), other container
repairs, and a general ffmpeg timeout.

Heads-up for later: feature 7 (Crop and resize, paused in the main checkout) also
changes `handleMetadata`, so it now passes the frame size to `onPlayable`. Expect a
small conflict there when `master` is merged into `feature/crop-and-resize`.

## Build steps

- [x] **1. Measure the duration in the browser when the file doesn't store it.**
  **Done when:** `screen-capture.webm` shows the trim timeline with a
  0:00.0–0:16.6 range and a working video preview, and converts to a GIF; a
  normal MP4 still loads with no extra seek (its preview starts at 0:00.0);
  `npm run build` passes.
- [x] **2. Measure the duration with ffmpeg when the browser can't play the file.**
  **Done when:** a WebM-named Matroska file with no stored duration and a codec
  Chromium can't play (made with local ffmpeg, for example MPEG-4 video written
  with `-f matroska -live 1`) shows the trim timeline with its real length and
  still-frame previews, instead of the read message; the MPEG-4 AVI and a
  non-video file renamed to `.mp4` behave as before; `npm run build` passes.

## Verify

- Run `npm install` in this worktree first. Start a dev server on a free port,
  because 4321 and 4322 are in use by the other checkouts (for example
  `npx astro dev --port 4323`).
- Drop `C:\Users\saidm\Downloads\screen-capture.webm` in. Expect
  "Reading your video..." briefly, then the video preview and timeline
  (about 16.7 s; the default selection is the whole video because it's under
  30 s). Convert it and get a GIF.
- Drop a normal MP4 and confirm nothing changed.
- Drop the no-duration MPEG-4 Matroska test file and confirm still frames and a
  timeline appear.

## Implementation notes

- **Extra root cause found in step 2.** `ffprobe` runs with `-v error`, and the
  log level stays in effect for later calls on the same ffmpeg instance. After
  it, `-i` printed no `Duration:` line and the copy pass printed no `time=`
  lines, so neither fallback could see a number (the existing `Duration:`
  fallback was affected too). `logOf` now passes `-v info` on every
  log-reading call. Confirmed in isolation: the same calls after `ffprobe`
  print `Duration: N/A` and `time=00:00:07.93` once `-v info` is added.
- Observed in Chromium against this worktree's dev server (port 4323, stopped
  afterwards):
  - `screen-capture.webm` (the user's file): video preview and a
    0:00.0–0:16.6 selection; converts to a 480×270 GIF (947 KB).
  - No-duration MPEG-4 Matroska named `.webm`: timeline 0:00.0–0:07.9 instead
    of the read message; converts to 320×240.
  - Unchanged: MP4 (12.0 s, video preview), MPEG-4 AVI (6.0 s), and a text file
    named `.mp4` (read message). Conversion progress still reaches 0.99 for
    still-frame videos. No page errors. `npm run build` passes.
- **Step 2 rechecked after `master` (with the still-frame fix, `6575d49`) was
  brought into this branch** (fast-forward; the uncommitted fix changes were
  stashed and reapplied cleanly). On the 4323 dev server, the no-duration MPEG-4
  file showed its 0:00.0–0:07.9 timeline and real Start/End frames
  (0:00.0 and 0:07.8) 0.35 s later. `screen-capture.webm` (16.6 s, video
  preview), the MPEG-4 AVI (6.0 s, both frames), and the MP4 (12.0 s) behaved
  as expected. No page errors. `npm run build` passes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5986,"specSha256":"b88fbd38eb280adadc71c9ea0571bfa04fe626891ba1a92483a98fc37d151533","branch":"refs/heads/fix/webm-without-stored-duration-can-t-be-read","head":"6575d49aa1619359abecef7fdd521d69ecb7a2a1","baseRef":"refs/heads/master","baseCommit":"6575d49aa1619359abecef7fdd521d69ecb7a2a1","sourceTree":"50f322a34098a58a591a09974790ccc3a0f87441","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:4321, and drop in a Chrome screen
recording with no stored duration (for example `screen-capture.webm`).

Expected:

"Reading your video..." shows briefly, then the video preview and timeline
appear with **Selected 0:00.0 to 0:16.6 (16.6 s)** (for that file). Convert to
GIF is enabled and no red "We couldn't read this video" message appears.

This proves:

Chrome screen recordings that store no duration are now measured and accepted,
instead of being rejected as unreadable.
