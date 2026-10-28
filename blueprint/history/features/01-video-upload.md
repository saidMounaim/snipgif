# Feature: Video upload

**From build-plan:** feature 1
**Build attempt:** 1
**Branch:** feature/video-upload
**Status:** verified

## Goal

Let a visitor pick one video from their device, by drag-and-drop or the file
picker, and have Snipgif accept it only if it is an MP4, MOV, WebM, or AVI file.
The file stays in browser memory and is never sent anywhere. This is the first
slice of the converter flow; later features trim and convert the selected video.

## In scope

- Converter island on the home page (`/`) holding the selected-video state.
- Hero area above the fold, per the plan: a short headline ("Turn any video into
  a GIF, free, fast, and private") and a privacy badge ("Your files never leave
  your device").
- A drop zone that accepts drag-and-drop on desktop and opens the native file
  picker on click, tap, Enter, or Space.
- Validation:
  - **Format:** accept MP4, MOV, WebM, AVI. Reject anything else with a friendly
    message naming the supported formats.
  - **Empty file:** reject a 0-byte file.
  - **One file at a time:** if several files are dropped, reject with "Please
    drop one video at a time" and select nothing.
  - **Size (soft limit, user decision):** files over 200 MB are accepted, with a
    visible warning that very large videos may be slow or fail on this device,
    especially on phones.
- Selected state: show the file name, human-readable size, and format, plus a
  "Choose another video" action that returns to the drop zone.
- Drag-over visual state on the drop zone.
- Dropping a file anywhere else on the page does not make the browser navigate
  away to the video.
- Accessible controls: keyboard operable, visible focus, errors and warnings
  announced to screen readers.

## Out of scope

- Video preview player, timeline, trimming (feature 3).
- Loading ffmpeg.wasm or any conversion (feature 2).
- Reading duration or dimensions. Browsers cannot decode AVI and some MOV codecs,
  so metadata belongs with the ffmpeg engine.
- Progress bar and low-memory error handling (feature 6).
- Final visual design, dark/light toggle, shadcn/ui, icons (feature 11).
- SEO meta tags, landing pages, i18n (features 12, 13, 17). Copy is English only.
- Downloading videos from URLs (explicitly excluded by the plan).

## Build loop

`workflow.stepReview: "feature"`: build all steps, then one review packet for
the whole feature. `workflow.checkpointCommits: "disabled"`: no step checkpoint
commits. `/complete` creates the final feature commit.

## Build steps

- [x] **1. File validation logic.** Add `src/lib/video-file.ts` with a pure
  `validateVideoFiles(files)` that takes the dropped or picked file list and
  returns either an error (`multiple`, `empty`, `unsupported`) or the accepted
  `SourceVideo` plus an optional `large` warning. Include a `formatFileSize`
  helper.
  *Done when:* `npm run build` passes and the module has no DOM or React imports.
- [x] **2. Drop zone and selected state.** Add the `Converter.tsx` island and
  `DropZone.tsx`, mount the island in `src/pages/index.astro` with `client:load`
  below the hero headline and privacy badge. Wire drag-and-drop, click/keyboard
  picker, validation messages, the large-file warning, the selected-file card, and
  "Choose another video".
  *Done when:* `npm run build` passes, and in `npm run dev` a valid MP4 shows its
  name, size, and format; a `.txt` file shows the unsupported message; picking
  another valid file after an error clears the error.
- [x] **3. Page-level drop guard and accessibility pass.** Prevent the browser's
  default open-file behavior for drops outside the zone while the island is
  mounted. Confirm focus ring, Enter/Space activation, and `aria-live`
  announcements.
  *Done when:* dropping a video outside the zone leaves the page in place, the
  drop zone is reachable and operable by keyboard alone, and `npm run build`
  passes.

## Files / areas

- `src/lib/video-file.ts` - new: validation, size formatting, `SourceVideo` type.
- `src/components/converter/Converter.tsx` - new: island root, holds
  `SourceVideo | null` and the current error/warning.
- `src/components/converter/DropZone.tsx` - new: drop zone UI and file input.
- `src/pages/index.astro` - replace the placeholder with the hero and island.
- `src/layouts/Layout.astro` - reuse as is.

## Data / contracts

In memory only. Nothing is persisted or sent over the network.

```ts
type SourceVideo = {
  file: File;
  name: string;
  mimeType: string;   // file.type, may be "" on some systems
  sizeBytes: number;
  format: "mp4" | "mov" | "webm" | "avi";
};

type VideoFileResult =
  | { ok: true; video: SourceVideo; warning: "large" | null }
  | { ok: false; error: "multiple" | "empty" | "unsupported" };
```

- **Format detection:** the lowercase file extension decides (`.mp4`, `.mov`,
  `.webm`, `.avi`; other video extensions such as `.m4v` or `.mkv` are not in the
  plan and are rejected). If the extension is missing or unknown,
  fall back to MIME: `video/mp4`, `video/quicktime`, `video/webm`,
  `video/x-msvideo`, `video/avi`, `video/msvideo`. Extension wins because many
  systems report AVI and MOV with an empty or generic MIME type.
- **Large threshold:** `LARGE_FILE_BYTES = 200 * 1024 * 1024`, shown to users as
  "200 MB". Files at or below it get no warning.
- **File input `accept`:** `.mp4,.mov,.webm,.avi,video/mp4,video/quicktime,video/webm,video/x-msvideo`
  (a hint only; validation still runs on every file).
- `SourceVideo` matches the overview's model minus `durationSec`, `width`, and
  `height`, which arrive with the ffmpeg engine in feature 2. Later features
  extend this type rather than replacing it.

### Messages (English)

| Case | Kind | Text |
|---|---|---|
| multiple | error | Please drop one video at a time. |
| empty | error | This file is empty. Please choose another video. |
| unsupported | error | This file type isn't supported. Please choose an MP4, MOV, WebM, or AVI video. |
| large | warning | This video is over 200 MB. Large videos can be slow or fail on some devices, especially phones. |

## Testing

No test command is configured, so tests are not a gate for this feature. Verify
with `npm run build` and a manual browser check in `npm run dev`
(http://localhost:4321): valid file of each format if available, a non-video
file, a 0-byte file, multiple files, keyboard-only use, and a drop outside the
zone. The large-file warning can be checked with any file over 200 MB.
`validateVideoFiles` is pure so a unit test can cover it once `/tests` adds a
runner.

## Notes for the AI

- Read `blueprint/context/coding-standards.md` sections Astro, React, File
  Organization, Styling, and Data and Boundaries before coding.
- Only the island touches `File`, `window`, or drag events; keep `video-file.ts`
  free of DOM globals so it stays build-safe and testable.
- Render the file name as React text, never as HTML.
- The drop zone is a real `<button>` (or a `<label>` tied to the hidden
  `<input type="file">`) so keyboard and screen readers work without custom key
  handling. Associate the message region with `aria-describedby` and use
  `role="alert"` for errors and `aria-live="polite"` for the warning. Clear the
  message on the next successful selection or on "Choose another video".
- Reset the input's value after each pick so choosing the same file again still
  fires `change`.
- Use plain Tailwind classes; no new dependencies.
- Do not call `URL.createObjectURL` yet; feature 3's preview owns that and its
  cleanup.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7513,"specSha256":"269bbe671df95f2cd6b04ced59b271a282b0cc7357c5c2aff70ec909401660b2","branch":"refs/heads/feature/video-upload","head":"afcb605e1c3d363306501c16d614e410c27ca750","baseRef":"refs/heads/master","baseCommit":"afcb605e1c3d363306501c16d614e410c27ca750","sourceTree":"bd24e314a92755d3d2cb0f8841c6fefe266afc60","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With `npm run dev` running, open http://localhost:4321, click **Drop a video
here or click to choose**, and pick any `.txt` file. Then click it again and pick
an `.mp4` video.

Expected:

After the `.txt` file, a red message appears under the drop zone: "This file type
isn't supported. Please choose an MP4, MOV, WebM, or AVI video." After the
`.mp4`, the message disappears and a card shows the video's file name, its size
(for example `12 MB · MP4`), and a **Choose another video** button.

This proves:

The drop zone accepts only the supported video formats, explains a rejected file
clearly, and shows the selected video's details without uploading it anywhere.
