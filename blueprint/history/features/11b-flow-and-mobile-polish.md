# Feature: Flow and mobile polish

**From build-plan:** feature 11b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/flow-and-mobile-polish

## Goal

Make the converter's one-page flow easy to follow, and make both tools
comfortable on phones and fully accessible. Three parts, from the build plan:
a step indicator for the converter flow, a mobile layout pass, and an
accessibility and contrast pass on both tools (`/` and `/gif-compressor`).

The overview's UI/UX section sets the contract: "upload, trim, adjust, convert,
download with a step indicator and no reloads"; "large touch targets,
thumb-friendly timeline, sticky download button on small screens"; and
"keyboard navigation, visible focus, good contrast, alt text".

## In scope

- **Step indicator (converter only).** An ordered list of the five overview
  steps, Upload, Trim, Adjust, Convert, Download, shown above the converter card
  or drop zone. It only shows where you are and cannot be clicked. The current
  step comes from existing state, with no new state:

  | Converter state | Done | Current |
  |---|---|---|
  | No video selected | none | Upload |
  | Video selected, not converting, no GIF | Upload | Trim and Adjust (one screen, both marked current) |
  | Loading the converter or converting | Upload, Trim, Adjust | Convert |
  | GIF ready | Upload, Trim, Adjust, Convert | Download |
  | Conversion error | Upload | Trim and Adjust (the user fixes settings and retries) |

  Semantics: `<nav aria-label="Steps">` with an `<ol>`. Current items carry
  `aria-current="step"`, and done items carry visually hidden text "(done)".
  It is not a live region, because the existing status line already announces
  progress. At 320 px, all five steps fit on one row with no horizontal scroll.
  Labels may shrink to a numbered dot plus a short label, but every label stays
  visible.
- **Mobile layout pass, both tools, 320 to 430 px wide:**
  - Touch targets of at least 44 × 44 px for the header nav links and the theme
    toggle choices. They are 40 px and 36 px today, after the UI refresh.
  - The trim handles grow from 28 px (WebKit) and 24 px (Firefox) to 32 px, so
    the timeline is easier to use with a thumb. The track and the
    two-native-range design stay.
  - The sticky result actions (already `sticky bottom-4` below `sm`) get a card
    background with blur and padding, so they stay readable over the GIF while
    scrolling. They stay static at `sm` and up.
  - No horizontal page scroll at 320, 375, and 430 px on either page, in every
    state reachable without converting (drop zone, file selected with every
    panel open). The GIF result card is included when conversion is observed.
- **Accessibility and contrast pass, both tools:**
  - Compute the WCAG contrast of every token pair the UI uses, in light and dark
    mode. Text pairs need at least 4.5:1, or 3:1 for large text (the hero `h1`).
    Control borders and focus rings need at least 3:1 against `card` and
    `background`. Pairs to check: `foreground`, `muted-foreground`,
    `secondary-foreground` (on `secondary`), `primary-foreground` (on
    `primary`), white or dark text on the `brand-from` and `brand-via` button
    gradient stops, `destructive` on `card` and on its 10% tint, `warning`, and
    `success`, plus `input` and `ring` for borders and rings. Also check each
    `text-brand` gradient stop on `background` for the large hero text. Fix any
    failing pair by changing only the token value in `global.css`.
  - Respect `prefers-reduced-motion`. Turn off the result card's entrance
    animation, the drop zone's hover lift and scale, and the indeterminate bar
    sliding (replace it with a static partial bar or a pulse-free fill). Color
    and opacity transitions may stay.
  - Give the trim `<video>` preview an accessible name ("Video preview"). Every
    `<img>` already has alt text; confirm it.
  - Keyboard pass. Tab through both tools in every reachable state. Every control
    has a visible focus indicator, focus never lands on a hidden or decorative
    element, and the order follows the visual order inside each card.
  - Header order. On small screens, the DOM order (name, nav, theme) differs from
    the visual order (theme sits on row 1, nav on row 2). This was carried over
    from 11a. Keep the DOM order. It is a logical sequence (site, pages,
    settings), so WCAG 2.4.3 is met. Record the decision in the spec notes
    instead of restructuring the header.

## Out of scope

- How it works, highlights, and FAQ (11c).
- Changing what any step does, the trim, crop, playback, caption, output, or
  compressor logic, error and status copy, or file validation.
- A step indicator for the compressor. The build plan names the converter flow
  only.
- Making steps clickable, or splitting Trim and Adjust onto separate screens.
- RTL and the language switcher (17), legal footer links (15), and ad slots (20).
- Swapping native radios, checkboxes, or ranges for Radix widgets.
- Adding a test runner or browser test harness.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: build every step, then present one review packet. No checkpoint
commits. `/complete` makes the single feature commit.

## Build steps

- [x] **1. Step indicator.** Add `StepIndicator.tsx` and render it from
  `Converter.tsx` with the current step derived from the table above.
  **Done when:** `npm run build` passes. In the browser, the indicator shows
  Upload current before a file is chosen, Trim and Adjust current after
  choosing an MP4, Convert during conversion, Download once the GIF is ready,
  and Trim and Adjust again after "Choose another" then choosing a file. The
  accessibility tree shows a "Steps" navigation list with `aria-current="step"`
  on the current items.
- [x] **2. Mobile layout pass.** 44 px header targets, 32 px trim handles, a
  sticky result action background, and any overflow fixes found at
  320/375/430 px.
  **Done when:** `npm run build` passes. At 320, 375, and 430 px on `/` and
  `/gif-compressor`, `document.documentElement.scrollWidth` equals the viewport
  width in each reachable state, the nav links and theme choices measure at
  least 44 × 44 px, and the trim handles measure 32 px.
- [x] **3. Contrast pass.** Compute the listed pairs from the `oklch` values in
  `global.css` (a one-off script in the scratchpad, not committed) and adjust
  any failing token.
  **Done when:** every listed pair meets its threshold in both themes, and the
  measured ratios are recorded in Notes for the AI, before and after for any
  changed token.
- [x] **4. Motion, names, and keyboard.** Reduced-motion variants, the video's
  accessible name, the alt text check, and the keyboard pass on both tools.
  **Done when:** with reduced motion emulated, the result card, drop zone, and
  indeterminate bar don't move; the video has the name "Video preview"; and a
  full Tab pass through both tools reaches every control in visual order with a
  visible focus ring. The findings are recorded in Notes for the AI.

## Files / areas

- `src/components/converter/StepIndicator.tsx` (new)
- `src/components/converter/Converter.tsx` - renders the indicator; no logic
  changes.
- `src/layouts/Layout.astro` - nav link target size.
- `src/components/site/ThemeToggle.tsx` - choice target size.
- `src/components/converter/TrimTimeline.tsx` - thumb size and video `aria-label`.
- `src/components/converter/GifResult.tsx` - sticky action background and
  reduced-motion entrance.
- `src/components/converter/DropZone.tsx` - reduced-motion hover.
- `src/components/ui/progress.tsx` - reduced-motion indeterminate state.
- `src/styles/global.css` - token values only if a pair fails.
- `src/components/compressor/Compressor.tsx` - only if the keyboard or overflow
  pass finds an issue.

## Data / contracts

No persisted data, routes, or external APIs. The step indicator takes one prop
derived in `Converter.tsx`:

```ts
type FlowStep = 'upload' | 'edit' | 'convert' | 'download';
// 'edit' marks both Trim and Adjust as current.
```

## Testing

No test command is configured (`AGENTS.md`), so there are no unit tests. The
step derivation is a four-way mapping inside `Converter.tsx` with no edge
logic worth a runner. Evidence:

- `npm run build`, and `npx -y -p typescript@5.9.3 tsc --noEmit -p .` (the build
  does not type-check).
- Browser evidence for steps 1, 2, and 4: screenshots, measured sizes and
  scroll widths, the accessibility snapshot, the console, and emulated reduced
  motion. In the last two sessions the user declined the browser tool. If it is
  still declined, these done-whens need the user's own manual check, recorded
  here before the steps are checked. They are not marked done on build output
  alone.
- Step 3's ratios come from a computed script. This is arithmetic, not a visual
  check.

## Notes for the AI

- The UI refresh fix (`blueprint/history/fixes/modern-ui-refresh-with-shadcn-ui.md`)
  shipped without browser verification. Steps 2 and 4 are the first real look
  at it, so expect small overflow or spacing fixes and keep them within this
  spec's areas.
- Shared choice and panel classes live in `src/components/ui/form-styles.ts`.
  Change target sizes there rather than per panel.
- Keep the converter's existing focus return (to the file heading after
  choosing, to the drop zone after "Choose another"). The indicator must not
  take focus.
- Colors only from tokens. No `dark:` color variants (see coding standards).
- Contrast results (step 3). These are WCAG ratios computed from the `oklch`
  tokens: oklab to linear sRGB, gamut clipped, with tints composited in sRGB.
  Three failures were found and fixed:
  - **Light `input` border on `background`: 2.99 → 3.11.** `--input` changed
    from `oklch(0.66 …)` to `oklch(0.65 …)`. On `card` it is now 3.25 (was 3.13).
  - **Dark white icons on the brand gradient: 2.90.** Fixed with a new
    `--brand-foreground` token (light: white, dark: the page background), used
    by the gradient button, the active step dot, and every `bg-brand` icon tile.
    This replaces `text-white` and the button's `dark:text-background`. It goes
    beyond "change only a token value": a token alone could not fix it, because
    the components hard-coded white.
  - **Focus rings at 50% opacity: 2.26 light and 2.54 dark.** The shadcn
    defaults use `ring-ring/50`. They are now solid `ring-ring` (and
    `outline-ring`) across `src/`.

  Final ratios (light / dark), all at or above the minimum:

  | Pair | Min | Light | Dark |
  |---|---|---|---|
  | foreground / background | 4.5 | 17.39 | 18.26 |
  | foreground / card | 4.5 | 18.17 | 16.97 |
  | muted-foreground / card | 4.5 | 6.30 | 8.00 |
  | muted-foreground / background | 4.5 | 6.03 | 8.61 |
  | muted-foreground / muted | 4.5 | 5.68 | 7.14 |
  | secondary-foreground / secondary | 4.5 | 7.84 | 9.38 |
  | accent-foreground / accent | 4.5 | 9.39 | 10.06 |
  | primary-foreground / primary | 4.5 | 5.55 | 5.55 |
  | brand-foreground / brand-from | 4.5 | 5.12 | 6.87 |
  | brand-foreground / brand-via | 4.5 | 5.18 | 7.29 |
  | brand-foreground icons / brand-to | 3 | 3.52 | 9.97 |
  | destructive / card | 4.5 | 5.84 | 6.67 |
  | destructive / destructive 10% on background | 4.5 | 4.66 | 6.48 |
  | warning / card | 4.5 | 6.27 | 11.21 |
  | warning / background | 4.5 | 6.00 | 12.07 |
  | success / card | 4.5 | 5.09 | 9.84 |
  | success / success 15% on card | 3 | 4.12 | 7.44 |
  | hero brand-from / background (large) | 3 | 5.04 | 6.87 |
  | hero brand-via / background (large) | 3 | 5.10 | 7.29 |
  | hero brand-to / background (large) | 3 | 3.46 | 9.97 |
  | input border / card | 3 | 3.25 | 3.96 |
  | input border / background | 3 | 3.11 | 4.26 |
  | ring / card | 3 | 5.71 | 6.55 |
  | ring / background | 3 | 5.46 | 7.05 |
  | primary (checked chip) / card | 3 | 5.71 | 3.24 |
- **Browser evidence** (Chrome DevTools against the dev server on :4321,
  emulated mobile and touch). The test files were a canvas-recorded WebM
  (480×270, 3 s, and a 1.4 s one) and the GIF the converter made from it.
  - Step 1: current steps read `Trim+Adjust` → `Convert` → `Download` across a
    real conversion; after "Choose another" it read `Upload`, with focus on the
    drop zone; after a new file it read `Trim+Adjust`, with focus on the file
    heading. Current `<li>`s carry `aria-current="step"`, done ones read
    "(done)", and the accessibility snapshot shows `navigation "Steps"`. The
    5 steps fit in 288 px at 320 px.
  - Step 2: `scrollWidth` equals the viewport at 320, 375, and 430 on `/`
    (drop zone, every panel open, result) and on `/gif-compressor` (drop
    zone, selected, result), in light and dark. Nav links measure 137×44 and
    theme choices 44×44 at 320. The WebKit thumb rule is `w-8`/`h-8` (32 px).
    The Firefox thumb stays `w-6` plus a 4 px border (= 32 px), not
    browser-checked. The sticky result bar has a `card/90` background with blur
    and keeps Download and Share at 44 px. One fix was found: at 320 px, "GIF
    Compressor" wrapped to two lines, so nav links now use `px-3 sm:px-4` and
    `whitespace-nowrap`.
  - Step 4: with `prefers-reduced-motion: reduce`, the result card's
    `animation-name` is `none`, and the compressor's indeterminate bar is a
    static 1/3 bar (`none`). Without it, the bar animates (`indeterminate`).
    The drop zone scale and icon lift are now `motion-safe:` only. The video's
    `aria-label` is "Video preview". Every `<img>` has alt text (frame
    previews, original, compressed, and result GIFs). Focus pass: each tab stop
    on `/` (24) and `/gif-compressor` (11) was focused with
    `focusVisible: true`, and every one shows a ring. The only order mismatch
    is the documented header one (nav → theme). Real Tab presses from the top
    of the page entered Astro's dev toolbar first. That is dev-only and not in
    the build.
  - Console: no errors or warnings.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14007,"specSha256":"d136e20c1c1241e02aee83ca1c28d0fa9a5ee2e4c14481afd4257f6bca001d37","branch":"refs/heads/feature/flow-and-mobile-polish","head":"b8db863b7136b47f922d4e5eb70cf672c7782668","baseRef":"refs/heads/master","baseCommit":"b8db863b7136b47f922d4e5eb70cf672c7782668","sourceTree":"5b4fc88e40f7ff6b88bb4fda1035b14ecffe1a33","landing":"local-merge","absentOptional":[]} -->


## Try it now

Run or do:

Run `npm run dev`, open http://localhost:4321 at phone width, and choose any
MP4 or WebM.

Expected:

The numbered step row above the card highlights Trim and Adjust. Press Convert
to GIF: Convert highlights, then Download once the GIF appears, with Download and
Share in a frosted bar at the bottom of the screen.

This proves:

The step indicator follows the real conversion flow, and the mobile result
actions stay reachable.
