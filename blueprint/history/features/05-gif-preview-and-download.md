# Feature: GIF preview and download

**From build-plan:** feature 5
**Build attempt:** 1
**Branch:** feature/gif-preview-and-download
**Status:** verified

## Goal

When a conversion finishes, show the finished GIF with its file size and let the
user save or pass it on: download it, copy it to the clipboard, or share it with
the Web Share API. Everything still happens on the device; the GIF is never
uploaded.

## In scope

- A **result section** below the selected-video card, shown only when a GIF
  exists (`conversion === 'done'`). It replaces the bare `<img>` that
  `Converter.tsx` renders today and contains:
  - A heading ("Your GIF").
  - The animated GIF preview, with alt text `GIF made from <video name>` (as today),
    scaled to fit (`max-w-full h-auto`).
  - The GIF file size, formatted with the existing `formatFileSize`, e.g. `1.4 MB`.
  - A primary **Download GIF** action.
  - A **Copy GIF** action, shown only where the browser can write `image/gif`
    to the clipboard (see Decisions).
  - A **Share** action, shown only where the browser can share GIF files.
- **Download:** an `<a href={objectUrl} download={fileName}>` styled as a button,
  so it works with keyboard, middle-click, and without extra JavaScript. The file
  name is the source video's name with its extension replaced by `.gif`
  (`holiday clip.mp4` -> `holiday clip.gif`). If the remaining base name is empty
  (e.g. `.mp4`), use `snipgif.gif`. The browser sanitizes characters it cannot
  save.
- **Share:** build `new File([blob], fileName, { type: 'image/gif' })` and show the
  button only when `navigator.canShare?.({ files: [file] })` is true. On click,
  call `navigator.share({ files: [file] })`. A user cancel (`AbortError`) is
  silent; any other failure shows a friendly error.
- **Feedback:** success and failure of copy and share are announced through the
  existing live regions: success ("GIF copied to the clipboard.") in the
  `aria-live="polite"` status region, failure ("We couldn't copy this GIF. Use
  Download instead." / "We couldn't share this GIF. Use Download instead.") in
  the existing `role="alert"` error paragraph. The message clears when the user
  converts again, picks another video, or takes another result action.
- **Mobile sticky download:** on small screens (below Tailwind `sm`) the Download
  button sticks to the bottom of the viewport while the result section is on
  screen (`sticky bottom-4 sm:static`), per the overview's UI section. It stays
  inside the result section, so it never covers the upload or settings controls
  when no GIF exists.
- **Result lifecycle:** keep the GIF `Blob` and its size alongside the existing
  object URL (`GifResult` from the overview data model: `blob`, `objectUrl`,
  `sizeBytes`). The existing `replaceGifUrl` revoke behavior stays: the old
  object URL is revoked when a new conversion starts, when another video is
  chosen, and on unmount.
- All actions are disabled while a new conversion is running (the result is
  cleared at conversion start today, so in practice the section is hidden).

## Out of scope

- Progress bar and the wider error-message work (feature 6).
- Changing the conversion, trim, or settings behavior.
- Showing compression stats, before/after comparison, or frame counts.
- Theme, dark mode, and responsive layout pass (feature 11) beyond the sticky
  download button above.
- Analytics events for downloads (feature 18) and ad slots below the result
  (feature 20).
- Other output formats (feature 22).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: implement all steps, run the Testing checks after each, then present
one review packet for the whole feature. No checkpoint commits; `/complete`
creates the final feature commit.

## Build steps

- [x] **1. Keep the GIF result and show its size.** Replace the `gifUrl` state
  and ref in `Converter.tsx` with a `GifResult` (`blob`, `objectUrl`,
  `sizeBytes`), keeping one revoke path. Add `gifFileName(videoName)` to
  `src/lib/video-file.ts`. Create `src/components/converter/GifResult.tsx` that
  renders the heading, preview image, and formatted size, and render it from
  `Converter.tsx` in place of the current `<img>`.
  **Done when:** after converting, the page shows "Your GIF", the animated
  preview, and a size that matches the downloaded file's size; converting again
  or choosing another video removes the old result; `npm run build` passes.
- [x] **2. Download, with sticky mobile button.** Add the Download GIF link using
  `gifFileName`, styled like the existing primary button, with visible focus and
  the `sticky bottom-4 sm:static` behavior.
  **Done when:** clicking Download (and pressing Enter on it) saves
  `<video base name>.gif` that opens as the same animated GIF; at a 375 px wide
  viewport the button stays visible at the bottom while scrolling through the
  result; `npm run build` passes.
- [x] **3. Share via the Web Share API.** Add the Share button, shown only when
  `navigator.canShare({ files })` accepts the GIF file; handle cancel silently
  and other failures with the friendly error.
  **Done when:** in a desktop browser without file sharing (e.g. desktop Firefox)
  the button is absent; where file sharing is supported the system share sheet
  opens with the GIF; cancelling the sheet shows no error; `npm run build` passes.
- [x] **4. Copy to clipboard.** Implement per the answer to the open question
  below, with success and failure announcements.
  **Done when:** the chosen behavior is observable in Chrome (and the hide or
  fallback case is observable where `image/gif` clipboard writes are unsupported);
  a failed write shows the friendly error; `npm run build` passes.

## Files / areas

- `src/components/converter/Converter.tsx` - hold `GifResult`, render the result
  section, route copy/share messages into the existing status and alert regions.
- `src/components/converter/GifResult.tsx` (new) - result preview, size, and the
  three actions.
- `src/lib/video-file.ts` - add `gifFileName`; reuse `formatFileSize`.

## Data / contracts

- `GifResult = { blob: Blob; objectUrl: string; sizeBytes: number }`, in memory
  only, never persisted. `sizeBytes` is `blob.size`.
- `gifFileName(videoName: string): string` - strip the last `.ext` (if any),
  trim, append `.gif`; empty base -> `snipgif.gif`.
- No network requests, storage, or new dependencies. Clipboard and Share are
  native browser APIs.
- The video name is user-controlled text. It reaches the DOM only through React
  text and attributes (`alt`, `download`), never as HTML.

## Testing

- No test command or Verify command is configured, so there are no automated
  tests in this feature. `gifFileName` is a pure function ready for a unit test
  once `/tests` adds a runner.
- After each step: `npm run build` must pass.
- Manual checks in the dev server (`npx astro dev --background`): each step's
  Done when, in Chrome desktop, plus Firefox for the share-hidden case and a
  375 px viewport for the sticky button. Real mobile share sheets need a phone
  or browser that supports file sharing; report it as not verified if none is
  available.

## Notes for the AI

- Clipboard and share failures are island-boundary errors (coding standards,
  Error Handling): catch them and show friendly copy; never let them throw.
- `navigator.share` and `navigator.clipboard.write` need a user gesture: call them
  directly in the click handler, before any other `await`.
- Do not add Lucide or shadcn/ui for this feature; plain buttons match the
  existing converter.
- Keep the existing `Your GIF is ready.` status message.

## Decisions

- **Copy GIF to clipboard** (user decision during `/implement`, resolving the
  overview open question): copy only where supported. Show Copy GIF only when
  `navigator.clipboard.write` exists and `ClipboardItem.supports('image/gif')`
  returns true; hide it elsewhere (including Chrome today). No still-frame
  fallback.
- **Sticky actions:** the whole action row (Download plus Copy/Share when shown)
  is sticky on small screens, because a sticky element cannot leave its parent
  box; Download is first in the row.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8187,"specSha256":"db08a2b9185e9fab4f489a902f731d2132973d68296dd2fc554b21de8929a2a9","branch":"refs/heads/feature/gif-preview-and-download","head":"b1999814d23b563209eaaf13060ab4381a489d96","baseRef":"refs/heads/master","baseCommit":"b1999814d23b563209eaaf13060ab4381a489d96","sourceTree":"c78644d0b9e37b11381ba3e6ce99fd538c77db87","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:4321, drop in a short video (for
example `holiday clip.mp4`), keep the default settings, click **Convert to
GIF**, then click **Download GIF** when it appears.

Expected:

A **"Your GIF"** section appears below the video card, showing the animated GIF
and its file size under the heading (for example `1.4 MB`). The downloaded
file is named `holiday clip.gif`, its size roughly matches the one shown, and
it opens as the same animated GIF.

This proves:

The finished GIF is previewed with its size, and Download saves it under the
video name with `.gif` in place of the original extension.
