# Feature: Theme and site shell

**From build-plan:** feature 11a
**Build attempt:** 1
**Branch:** feature/theme-and-site-shell
**Status:** verified

## Goal

Give both pages one shared look that works in light and dark: semantic color
tokens, a theme that follows the system with a manual System, Light, or Dark
choice that is remembered, a site header with the Snipgif name and navigation
between the two tools, and Inter as the app font. Feature 11 is a polish pass
over the screens that already exist, not a rebuild (resolving the overview's
"Feature 11 ordering" question this way). The step indicator, mobile pass, and
below-the-tool content are 11b and 11c.

## In scope

- **Color tokens** in `global.css` (`@theme`), each with a light and a dark
  value. The names are listed under Data / contracts. Every component and page
  uses the tokens instead of direct `zinc`, `white`, `violet`, `red`, or
  `amber` colors. Exceptions: the black video letterbox, the crop overlay's
  white border and dimming, and the caption swatch fills, which are content and
  stay the same in both themes.
- **Style** (overview): a near-white page background in light mode, near-black
  in dark mode, and violet as the one accent. Cards keep their rounded corners
  and gain a soft shadow in light mode. The primary buttons stay white on
  violet-600 in both themes.
- **Contrast:** every text and background token pair used for text meets WCAG
  AA (4.5:1, or 3:1 for text 24 px and larger) in both themes. Focus rings and
  control borders meet 3:1 against their background.
- **Theme choice** (data model `theme: "system" | "light" | "dark"`, stored in
  `localStorage` under the key `theme`):
  - The default is `system`, which follows `prefers-color-scheme` and updates
    live when the OS setting changes.
  - A small inline script in `<head>` applies the resolved theme before the
    first paint, so there is no flash of the wrong theme. It sets
    `data-theme="light"` or `"dark"` on `<html>` and `color-scheme` to match,
    so native controls and scrollbars follow.
  - Storage reads and writes are wrapped in try/catch. If storage is blocked,
    the theme still works for the visit and falls back to `system` next time.
    An unknown stored value counts as `system`.
- **Theme toggle** in the header: a three-choice radio group labeled
  **Theme**, with **System**, **Light**, and **Dark**. Each choice shows a
  Lucide icon (Monitor, Sun, Moon) and has its name as accessible text, which
  is visually hidden on small screens and shown from `sm` up. It has 44 px
  targets and the visible focus ring, and the current choice is checked.
- **Site header** on both pages, from `Layout.astro`:
  - the **Snipgif** name as a link to `/`
  - a `<nav aria-label="Main">` with **Video to GIF** (`/`) and **GIF
    Compressor** (`/gif-compressor`). The current page's link has
    `aria-current="page"` and a visible current style.
  - the theme toggle
  - At 320 px wide everything fits on one or two rows, with no horizontal
    scroll.
  - The temporary hero links from feature 10 ("Compress a GIF" and "Convert a
    video to GIF") are removed, because the nav replaces them.
- **App font:** Inter, as a self-hosted variable WOFF2 file (Latin, weights
  100–900), set as the default sans font for the whole site through `@theme`
  `--font-sans`. Its family name is `Inter Variable`, so it doesn't collide with
  the caption font's `Inter` FontFace. The system sans stack is the fallback,
  and `font-display: swap` is used.
- **Dependency:** `lucide-react` (user decision), pinned to an exact version.
  The project plan's stack line is already updated to "no shadcn/ui".
- The behavior of both tools is unchanged. Only colors, the font, the header,
  and the removed hero links change.

## Out of scope

- The step indicator, the mobile layout pass, and the broader accessibility
  pass on the tools (11b).
- How it works, highlights, and FAQ (11c).
- A footer, legal links, language switcher, or RTL (features 15 and 17).
- shadcn/ui (user decision: not adopted).
- Remembering `lastSettings` or the language (other features).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`. Implement all steps and run the Testing checks after each. Then
present one review packet for the whole feature. Make no checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Tokens, font, and dark rendering.** Add the color tokens and a
  `dark` custom variant keyed on `<html data-theme="dark">` to `global.css`.
  Add the Inter variable font and `--font-sans`. Add the `<head>` theme script
  to `Layout.astro`, which resolves the stored value or the system setting and
  gives `<body>` the page background and text tokens. Migrate every component
  and page from direct color classes to the tokens.
  **Done when:** with the OS in light mode and then in dark mode (emulated in
  Playwright), both pages show the full converter flow (selected video, all
  panels, the result) and the compressor flow (selected GIF, result) in the
  matching theme, with no leftover light-only surfaces in dark. Screenshots of
  both themes are taken. The token contrast check passes. Inter is the
  rendered font. `npm run build` passes.
- [x] **2. Header, navigation, and theme toggle.** Add the header to
  `Layout.astro`, with the name link, the nav with `aria-current`, and a
  `ThemeToggle` React island. Add the `lucide-react` icons. Persist the choice,
  and follow live system changes while the choice is System. Remove the hero
  links.
  **Done when:** the nav moves between the two pages and marks the current one.
  Choosing Dark or Light applies at once, survives a reload without a flash
  (the attribute is set before first paint), and works on the other page. With
  System chosen, switching the emulated OS scheme switches the page live. With
  `localStorage` throwing, the toggle still works for the visit and no error
  reaches the console. At 320 px there is no horizontal scroll. Keyboard: Tab
  reaches the links and the theme group, and the arrow keys change the theme.
  `npm run build` passes.

## Files / areas

- `src/styles/global.css`: `@theme` tokens, the `@custom-variant dark`, the
  Inter `@font-face`, and `--font-sans`.
- `public/fonts/inter-latin-wght.woff2` (new) and its license. The existing
  `OFL-Inter.txt` covers Inter if it is the same project license; check it.
- `src/layouts/Layout.astro`: the head theme script (`is:inline`), body
  classes, and the header markup.
- `src/components/site/ThemeToggle.tsx` (new): the React island, rendered with
  `client:load` in the header.
- `src/lib/theme.ts` (new): `ThemePreference` type, `readThemePreference`,
  `saveThemePreference`, and `resolveTheme`. The inline head script can't
  import modules, so it repeats the small resolve logic. A comment points
  between the two.
- All components under `src/components/` and both pages: color classes changed
  to tokens. The hero links are removed from `index.astro` and
  `gif-compressor.astro`.
- `package.json` and `package-lock.json`: `lucide-react` (exact version).
- `blueprint/context/coding-standards.md`, Styling section: replace the TODO
  line with how to use the tokens and the `dark` variant, and note that shadcn/ui
  is not used.

## Data / contracts

- `localStorage['theme']` holds `'system' | 'light' | 'dark'`. Anything else,
  or a failed read, means `'system'`. Nothing else is stored by this feature.
- `<html data-theme="light|dark">` is the single switch for dark styles. The
  `dark:` variant is
  `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`.
- Token names (Tailwind color utilities such as `bg-surface` and `text-fg`):
  - `page`: the page background.
  - `surface`: cards and inputs.
  - `surface-muted`: hover fills, placeholders, and inactive tracks.
  - `fg`: primary text.
  - `fg-muted`: secondary text.
  - `line`: card and section borders.
  - `line-strong`: control borders.
  - `accent`: violet buttons, fills, and focus rings.
  - `accent-hover`
  - `accent-fg`: violet text on page and surface.
  - `accent-soft`: checked choice backgrounds and the badge.
  - `danger-fg`: error text.
  - `warning-fg`: warning text.
  - The light values keep today's look: zinc-900 for `fg`, zinc-600 for
    `fg-muted`, and violet-600 for `accent`.
- Token values are defined once with CSS variables in `global.css`. Dark values
  are overridden under `[data-theme=dark]`. The light values are the `:root`
  defaults.
- The theme script runs before any stylesheet-dependent paint and can't throw:
  everything is inside try/catch.

## Testing

- No test or Verify command is configured, so there are no automated tests.
  `theme.ts` is pure apart from `localStorage` and `matchMedia`, and is ready
  for unit tests once `/tests` adds a runner.
- After each step, `npm run build` must pass.
- Do Playwright checks in the dev server for each step's Done when. Use
  `emulateMedia({ colorScheme })`, full-page screenshots of both pages in both
  themes with a video selected and a result shown, and a 320 px viewport check
  (`scrollWidth <= clientWidth`).
- **Contrast check:** compute WCAG ratios for every token pair used for text,
  in both themes, from the computed CSS variable values in the page. Report the
  lowest ratio.
- **No-flash check:** with `theme=dark` stored, load the page with JavaScript
  modules delayed. In Playwright, block the island script and confirm
  `data-theme` is already `dark` from the inline script.

## Notes for the AI

- In Tailwind v4, define the variables under `:root` and `[data-theme=dark]`,
  then map them in `@theme inline` (for example
  `--color-surface: var(--surface);`) so the utilities follow the variable at
  runtime.
- Migrate mechanically and consistently:
  - `bg-white` on cards and inputs becomes `bg-surface`.
  - `text-zinc-900` becomes `text-fg`.
  - `text-zinc-600` and `text-zinc-700` become `text-fg-muted`.
  - `border-zinc-200` becomes `border-line`.
  - `border-zinc-300` becomes `border-line-strong`.
  - `hover:bg-zinc-50` becomes `hover:bg-surface-muted`.
  - `bg-violet-600` becomes `bg-accent`, and `bg-violet-50` or
    `bg-violet-100` becomes `bg-accent-soft`.
  - Violet text and checked text become `text-accent-fg`.
  - `text-red-700` becomes `text-danger-fg`, and `text-amber-800` becomes
    `text-warning-fg`.
  - `outline-violet-600` and `accent-violet-600` become their accent token.
  - `bg-zinc-100` placeholders become `bg-surface-muted`.
  Search afterwards for any leftover `zinc-`, `violet-`, `red-`, `amber-`, or
  `bg-white`, and justify each one that remains (the content exceptions above).
- Native `<progress>` and range inputs follow `accent-color` and
  `color-scheme`. Check that they are visible in dark.
- The `ThemeToggle` island must render the same markup on the server and
  client. Render with the stored choice read in an effect, and avoid a
  hydration mismatch, for example by rendering `system` checked on the server,
  then syncing.
- Fontsource's `@fontsource-variable/inter` package on jsDelivr has
  `files/inter-latin-wght-normal.woff2`. Pin an exact version and don't add it
  as an npm dependency.

## Implementation notes

- **Added token: `accent-line`.** Violet-600 against the dark surface measures
  2.9:1, below the spec's 3:1 for focus rings and borders. `accent-line` is
  violet-600 in light and violet-400 in dark. It is used for focus outlines,
  checked choice borders, and the drop zone's active border. The other tokens
  are as specified.
- **Dark `accent-hover` is violet-700, not lighter.** The first value
  (violet-500) gave white button text only 4.23:1, so it was changed to #6d28d9
  (about 7:1), the same as light mode.
- **`line-strong` light value is #8a8a93**, darker than today's zinc-300, so
  control borders reach 3:1. Controls look slightly crisper than before.
- **Small-screen header:** below `sm`, the name and theme toggle share the first
  row and the nav takes the second, which keeps the header to two rows (109 px)
  at 320 px. On small screens the DOM and tab order (name, nav, toggle) differs
  from the visual order (name, toggle, nav). This is a minor mismatch, noted
  for 11b's accessibility pass.
- **`lucide-react` is pinned to 1.56.0.** The latest release, 1.63.0, was
  published the same day. 1.56.0 was the newest release at least two weeks
  old.
- **Inter variable font:** Fontsource `@fontsource-variable/inter@5.2.8`,
  `inter-latin-wght-normal.woff2` (48 KB). Its license is byte-identical to the
  existing `OFL-Inter.txt`, so no new license file was needed.
- **Browser evidence (dev server, Chromium via Playwright):**
  - Emulated light and dark: on `/`, a full flow (MP4 selected, Square 1:1
    crop, all panels, converted result) and on `/gif-compressor` (GIF selected,
    compressed result) rendered in the matching theme. Full-page screenshots
    were taken of both pages in both themes. A scan of every element's
    background in dark found no near-white surfaces (only the intended content
    exceptions remain).
  - Body font: `"Inter Variable"`, and `document.fonts.check` is true.
  - Contrast, computed from the live CSS variables after the fix. The lowest
    text ratio is 5.7:1 in light (white on accent) and at least 4.5:1 in dark,
    with no failures. The lowest UI ratio is 3.28:1 in light (`line-strong` on
    `page`) and 3.67:1 in dark (`line-strong` on `surface`), with no failures.
  - Nav: `Video to GIF` has `aria-current="page"` on `/`, and
    `GIF Compressor` has it on `/gif-compressor`. The links move between the
    pages.
  - Choosing Dark set `data-theme="dark"` and stored `theme=dark`. Reloading
    with every script request aborted still gave `data-theme="dark"` before any
    island hydrated, so there is no flash. The other page loaded dark with Dark
    checked.
  - Light stayed light when the emulated OS switched to dark. With System
    chosen, the page followed the OS live in both directions.
  - Arrow keys moved the theme choice (System, then Light, then Dark), with a
    visible focus outline. Tab order from the top: Snipgif, Video to GIF, GIF
    Compressor, the theme group, then the drop zone.
  - With `localStorage` throwing on access, the theme still applied for the
    visit, fell back to System after a reload, and logged no console errors.
  - At 320 px, `scrollWidth` equaled `clientWidth` on both pages.
  - The only console errors came from the dev server: Vite's "Outdated
    Optimize Dep" for Astro's dev toolbar after the new dependency was
    installed, and the requests deliberately aborted in the no-flash test.
- **Not verified:** screen-reader speech and type-checking (TypeScript isn't
  installed). The production build was not served and checked in a browser;
  only `npm run build` ran.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14889,"specSha256":"49321e466111ff2342dcf8643ecf0948773a3fe9ca6ee802daf93d1cd9fbd018","branch":"refs/heads/feature/theme-and-site-shell","head":"6f9dbc696b8132a1bf9d096e737d7b3b5f5e1603","baseRef":"refs/heads/master","baseCommit":"6f9dbc696b8132a1bf9d096e737d7b3b5f5e1603","sourceTree":"907de9c4735c73bc2fca6873fc62a532aaa4ab6b","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev` (or reuse the one already running) and open
http://localhost:4321. In the header, click **Dark**, then reload the page.
Click **GIF Compressor** in the nav. Then click **System** and switch your
operating system between light and dark mode. Finally, narrow the window to
phone width.

Expected:

Dark switches the whole page at once (drop zone, panels, badge), and the reload
stays dark with no white flash. The compressor page is dark too, with its nav
link highlighted. With System chosen, the page follows the OS setting
immediately. At phone width the header becomes two rows (name and theme icons,
then the nav) and nothing scrolls sideways.

This proves:

Both tools share one header and theme, the theme choice is remembered across
pages and reloads, and the default follows the device.
