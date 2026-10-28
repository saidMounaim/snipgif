# Fix: Still-frame previews hang for MPEG-4 AVI

**Type:** Fix
**Status:** verified
**Branch:** fix/still-frame-previews-hang-for-mpeg-4-avi

## The problem

Videos the browser can't play are shown as still Start and End frames, which
`extractFrame` in `src/lib/gif-engine.ts` makes with ffmpeg as JPEGs. For an
MPEG-4 video in an AVI file, both previews stay on "Loading preview..." forever.

`/debug` confirmed the cause. The frame command's `-q:v 4` option makes ffmpeg's
JPEG encoder stall in ffmpeg core 0.12.10 for this input: `exec` never returns
and reports no error, so `extractFrame` never settles. Evidence, all in Chromium
with the installed `@ffmpeg/ffmpeg` 0.12.15 and core 0.12.10 (10 s limit each):

- AVI (mpeg4, yuv420p) with the app's exact arguments: hangs, 3 of 3 runs; the
  log stops right after the MJPEG encoder initializes.
- The same arguments without `-q:v 4`: finishes in 11 ms.
- MP4 (H.264) with the app's exact arguments: finishes.
- No `ffprobe` beforehand: still hangs, so the duration read isn't involved.

The option was added in `3ab9480 feat: trim and clip selection`. The hang also
blocks feature 7 (Crop and resize), which needs a Start frame to learn the
frame's shape for still-frame videos.

## The fix

Remove `'-q:v', '4'` from the `extractFrame` arguments, so the JPEG encoder uses
its default quality. Previews are at most 480 px wide and only used on screen, so
the default quality is enough.

It must not break:

- Still frames for other inputs. Previews keep the 480 px cap and JPEG output,
  so the `image/jpeg` blob type stays correct.
- Duration reading and GIF conversion. They don't use this command and stay
  unchanged.

Out of scope: a general timeout for stalled ffmpeg calls (a known risk recorded
in feature 6), switching previews to PNG, and any crop work (feature 7).

## Build steps

- [x] **1. Drop `-q:v 4` from `extractFrame`.**
  **Done when:** with the MPEG-4 AVI, the Start and End previews show real
  frames within a few seconds of selecting it, and moving a trim handle
  refreshes them; the same AVI still converts to a GIF; `npm run build` passes.

## Verify

- In the dev server, choose the MPEG-4 AVI (one the browser can't play). Both
  previews should show the frame instead of "Loading preview...". Move the start
  handle and the Start preview should update about 0.3 s after it stops.
- Convert it and get a GIF with no error message.
- Choose an MP4 the browser plays and confirm the normal video preview and
  conversion are unchanged.
- This worktree has no `node_modules` yet: run `npm install` in it first. Then
  run the dev server on a free port (for example `npx astro dev --port 4322`),
  because the main checkout's server already uses 4321.

## Implementation notes

Observed in Chromium against this worktree's dev server (port 4322, stopped
afterwards):

- MPEG-4 AVI (320×240): both previews showed real frames 1.7 s after selecting
  the file; moving the start handle produced a new Start image (different
  pixels) about 0.3 s later; converting it gave a 320×240 GIF.
- Playable MP4: the normal video preview is unchanged and it converts to a
  480×270 GIF.
- No page errors. `npm run build` passes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3201,"specSha256":"f38410a3ed2faf3f7dfcaaff480c9bf67599bac1c534562327efe1085081bc83","branch":"refs/heads/fix/still-frame-previews-hang-for-mpeg-4-avi","head":"cb9eecf0b7736966e1ceeeba5c3fd2aa1e2a02d8","baseRef":"refs/heads/master","baseCommit":"cb9eecf0b7736966e1ceeeba5c3fd2aa1e2a02d8","sourceTree":"a994fe033bde81432d360866a86cfd8ed52714bb","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:4321, and drop in an MPEG-4 AVI the
browser can't play (make one with
`ffmpeg -f lavfi -i testsrc=duration=6:size=320x240:rate=15 -c:v mpeg4 sample.avi`).

Expected:

Within a couple of seconds, the **Start** and **End** boxes show real frames of
the colored test pattern with a frame counter, instead of staying on
"Loading preview...".

This proves:

Still-frame previews for MPEG-4 AVI now finish instead of hanging forever.
