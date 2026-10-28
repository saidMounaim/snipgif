# Feature: Output settings and presets

**From build-plan:** feature 4
**Build attempt:** 1
**Branch:** feature/output-settings-and-presets
**Status:** verified

## Goal

Let the user choose how the GIF is made: frame rate, maximum width, and quality.
Three one-click presets set all three at once: "Small for chat", "Balanced",
and "High quality". Conversion uses the chosen settings instead of the fixed
10 fps / 480 px from feature 2. Everything still runs on the device.

## In scope

- An **Output settings** panel on the selected-video card, below the trim
  timeline. It shows once the video's duration is known (a range exists) and is
  hidden while reading, when unreadable, and when no video is selected.
- **Presets** (user decision), as one radio group:

  | Preset | `id` | FPS | Max width | Quality |
  |---|---|---|---|---|
  | Small for chat | `chat` | 10 | 320 px | Low |
  | Balanced (default) | `balanced` | 12 | 480 px | Medium |
  | High quality | `high` | 20 | 720 px | High |

- **Manual controls** (user decision):
  - FPS slider, 5 to 30, step 1. Readout "12 fps".
  - Max width slider, 160 to 800 px, step 10. Readout "480 px", with the hint
    "Smaller videos keep their own size."
  - Quality radio group: Low = 64 colors, Medium = 128 colors, High = 256 colors.
- **Preset matching:** changing a manual control keeps the other two values. If
  the resulting values equal a preset exactly, that preset is selected;
  otherwise no preset is selected and the group shows "Custom". Picking a
  preset sets all three controls.
- **Width is a maximum:** the GIF is never upscaled. A 300 px wide video
  converted at 480 px stays 300 px wide.
- Each new video selection (and "Choose another video") resets the settings to
  Balanced. Settings are not saved between visits (user decision).
- All settings controls are disabled while the core loads or a conversion runs,
  like the timeline.
- Changing settings after a GIF is shown keeps that GIF on screen until the next
  conversion replaces it, as changing the trim range does today.
- Convert passes the settings to the engine. The engine converts with the
  chosen fps, `min(width, source width)`, and palette size.

## Out of scope

- Remembering settings in `localStorage` (`lastSettings`): a later change.
- A file-size estimate, download, copy, share (feature 5).
- Progress percentage, cancelling, and low-memory warnings for heavy settings
  (feature 6).
- Crop, aspect ratio, speed, reverse, boomerang, text (features 7 to 9).
- Analytics "preset chosen" event (feature 18).
- Dithering choices, loop count, and other ffmpeg options beyond fps, width, and
  palette size.
- Final visual design and dark mode (feature 11).

## Build loop

`workflow.stepReview: "feature"`: build all steps, then one review packet for
the whole feature. `workflow.checkpointCommits: "disabled"`: no step checkpoint
commits. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Settings logic and engine support.** Add `src/lib/output-settings.ts`
  (pure: types, limits, presets, quality colors, `presetSettings`,
  `changeSetting`, `matchPreset`). In `gif-engine.ts`, change `convertToGif` to
  take `OutputSettings` and build the filter from it. Replace `GIF_SETTINGS` with
  a frame-preview width constant (480) used only by `extractFrame`. Pass
  `presetSettings('balanced')` from `Converter.tsx` so the app keeps working.
  *Done when:* `npm run build` passes; the type-check passes (use the one from
  feature 3, or record that none could run); a throwaway Node check of
  `output-settings.ts` shows the three presets, clamping and snapping at both
  ends of each range, a manual change that lands on preset values reselecting
  that preset, and an off-preset value giving `preset: null`.
  *Evidence:* build and Node check passed. No type-check ran: TypeScript is not
  installed in `node_modules`.
- [x] **2. Settings panel wired into the converter.** Add
  `OutputSettingsPanel.tsx` with the preset group (plus the "Custom" state), the
  FPS and width sliders with readouts, and the quality group. In `Converter.tsx`,
  hold the settings in state, reset them to Balanced on each selection, disable
  the panel while busy, and pass the settings to `convertToGif`.
  *Done when:* with the dev server running: a new video starts on Balanced
  (12 fps, 480 px, Medium); each preset converts the same 3.0 s range of a
  1280 px wide sample to a GIF with the expected frame count (30 / 36 / 60) and
  width (320 / 480 / 720 px); High quality has more palette colors than Small
  for chat (checked with local `ffprobe`/`ffmpeg` on the output); moving FPS to
  15 shows "Custom" and moving it back to 12 reselects Balanced; a sample
  narrower than 320 px keeps its own width; the panel is disabled during
  conversion; keyboard alone can change every control; `npm run build` passes.
  *Evidence:* `npm run build` passed. Engine output was verified by running the
  exact filter arguments with native ffmpeg (frames, width, palette size). Live
  browser checks were not run: the Playwright browser was locked by another
  session. Run `/check` to cover them.

## Files / areas

- `src/lib/output-settings.ts` - new: `OutputSettings`, `Quality`, `PresetId`,
  `SETTING_LIMITS`, `QUALITY_COLORS`, `PRESETS`, `presetSettings`,
  `changeSetting`, `matchPreset`. No DOM, no React.
- `src/lib/gif-engine.ts` - `convertToGif` signature and filter; `GIF_SETTINGS`
  replaced by a frame-preview width constant.
- `src/components/converter/OutputSettingsPanel.tsx` - new: presets, sliders,
  quality group.
- `src/components/converter/Converter.tsx` - settings state, reset on
  selection, render the panel, pass settings to Convert.

## Data / contracts

In memory only. This locks `OutputSettings` for features 7 to 10, 18, and 22.

```ts
// src/lib/output-settings.ts
export type Quality = 'low' | 'medium' | 'high';
export type PresetId = 'chat' | 'balanced' | 'high';
export type OutputSettings = {
	fps: number;       // integer, 5..30
	width: number;     // max output width in px, multiple of 10, 160..800
	quality: Quality;
	preset: PresetId | null; // null = Custom
};

export const SETTING_LIMITS = {
	fps: { min: 5, max: 30, step: 1 },
	width: { min: 160, max: 800, step: 10 },
} as const;

export const QUALITY_COLORS: Record<Quality, number> = { low: 64, medium: 128, high: 256 };

export const PRESETS: Record<PresetId, { label: string; fps: number; width: number; quality: Quality }> = {
	chat: { label: 'Small for chat', fps: 10, width: 320, quality: 'low' },
	balanced: { label: 'Balanced', fps: 12, width: 480, quality: 'medium' },
	high: { label: 'High quality', fps: 20, width: 720, quality: 'high' },
};

export const DEFAULT_PRESET: PresetId = 'balanced';

export function presetSettings(id: PresetId): OutputSettings;
export function changeSetting(
	settings: OutputSettings,
	change: Partial<Pick<OutputSettings, 'fps' | 'width' | 'quality'>>,
): OutputSettings;
// Snap fps to an integer and width to the nearest 10, clamp both to SETTING_LIMITS,
// then set preset = matchPreset(result).
export function matchPreset(values: Pick<OutputSettings, 'fps' | 'width' | 'quality'>): PresetId | null;
```

```ts
// src/lib/gif-engine.ts (change)
export function convertToGif(video: SourceVideo, range: ClipRange, settings: OutputSettings): Promise<Blob>;
```

- **Conversion filter:**
  `fps=<fps>,scale='min(<width>,iw)':-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=<colors>[p];[b][p]paletteuse`
  where `<colors>` is `QUALITY_COLORS[settings.quality]`. Range arguments and
  `-loop 0` are unchanged from feature 3.
- **Frame preview:** `extractFrame` keeps its 480 px preview width, independent
  of the output width.

### UI states (additions)

| State | Shows |
|---|---|
| no range yet (reading, probing, unreadable, no video) | panel hidden |
| ready | panel with a preset selected, or "Custom" |
| loading core / converting | panel visible, all controls disabled |

### Accessibility

- Presets and quality are native radio inputs in `<fieldset>`s with legends
  "Preset" and "Quality". When no preset matches, no radio is checked and the
  legend area shows "Custom" as visible text.
- FPS and width are native `<input type="range">` with visible labels
  "Frames per second" and "Max width", `min`/`max`/`step` from
  `SETTING_LIMITS`, and `aria-valuetext` "12 frames per second" and
  "480 pixels". The width hint is associated with `aria-describedby`.
- Touch targets are at least 44 px tall; focus is visible, matching the existing
  violet focus outline.
- All labels are fixed strings; no user-controlled text is rendered here.

## Testing

No test command is configured, so tests are not a gate. Verify with
`npm run build`, the type-check if available, a throwaway Node check of
`output-settings.ts`, and browser checks against the user-started dev server.
Generate samples into the scratchpad with the local `ffmpeg`: a 1280 px wide
H.264 MP4 of at least 5 s, and a 240 px wide MP4. Confirm GIF frame count and
width with `ffprobe`, and compare palette size by counting distinct colors in a
frame (for example `ffmpeg -i out.gif -vf palettegen=stats_mode=full` or a
decode-and-count script). Do not claim visual or device-memory evidence that
was not run.

## Notes for the AI

- Read `coding-standards.md` sections React, Data and Boundaries, Error
  Handling, Styling, and Comments before coding.
- Keep `output-settings.ts` pure so a unit test can cover it once `/tests` adds
  a runner. Follow `clip-range.ts` style: small helpers, integer math.
- Match the existing Tailwind classes and violet focus outline used in
  `Converter.tsx` and `TrimTimeline.tsx`.
- Do not persist settings or touch `localStorage` in this feature.
- Do not log file names or contents to the console.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9805,"specSha256":"4859db0f743b59bcd2cf32f297c2052bd0c657fea0a56daae8bbdec4dfd06ef0","branch":"refs/heads/feature/output-settings-and-presets","head":"3ab9480b6a94f646c437d22596a413257f40bfb2","baseRef":"refs/heads/master","baseCommit":"3ab9480b6a94f646c437d22596a413257f40bfb2","sourceTree":"b5b9b5714b06bc654081175548f3c851cc037074","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With `npm run dev` running, open http://localhost:4321 and choose an `.mp4`
wider than 720 px. Under **Output settings**, drag **Frames per second** to 15,
then back to 12. Click **High quality**, then **Convert to GIF**.

Expected:

A new video starts on **Balanced** (12 fps, 480 px, Medium). At 15 fps the
Preset heading shows **Custom**; back at 12, **Balanced** is selected again.
While converting, the settings controls are greyed out. The High quality GIF is
720 px wide and visibly smoother than one made with **Small for chat**.

This proves:

Presets and manual controls set the fps, max width, and palette size the
converter uses, and "Custom" tracks whether the values match a preset.
