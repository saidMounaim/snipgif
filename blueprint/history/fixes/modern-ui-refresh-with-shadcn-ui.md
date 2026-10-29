# Fix: Modern UI refresh with shadcn/ui

**Type:** Fix
**Status:** verified
**Branch:** fix/modern-ui-refresh-with-shadcn-ui

## The problem

The site shell and both tools (Video to GIF, GIF Compressor) use a plain zinc and
violet look built from hand-rolled Tailwind components. The user asked for a more
modern, more colorful UI and UX, built on shadcn/ui.

The coding standards currently say "shadcn/ui is not used", so this change also
updates that rule.

## The fix

A visual refresh only. No converter or compressor logic, file validation, ffmpeg
calls, or copy for errors and status changes.

- Set up shadcn/ui (radix base, Nova preset) for Astro with the `@/*` path alias,
  `components.json`, and `cn` in `src/lib/utils.ts` (clsx + tailwind-merge).
  Add only the components in use: Button, Card, Badge, Input, Label, Progress.
- Replace the old semantic tokens (`page`, `surface`, `fg`, `line`, `accent-*`,
  `danger-fg`, `warning-fg`) with shadcn tokens in `src/styles/global.css`, plus
  `warning`, `success`, and a violet, pink, and orange brand gradient. Each token
  has a light and a dark value under the existing `data-theme` switch. Text
  pairs keep WCAG AA contrast, and control borders keep 3:1.
- Restyle the header (frosted, pill navigation, gradient logo), add a shared
  `Hero.astro` and a footer, and a decorative gradient glow behind the page.
- Restyle the drop zone, tool cards, settings panels (icon headings, filled
  pill choices), trim timeline, result card, and theme toggle. Shared choice and
  panel classes live in `src/components/ui/form-styles.ts` instead of being
  copied into six files.
- The Progress component supports an indeterminate state for "Getting the
  converter ready" and compression, and passes its value to Radix so it is
  announced.
- Update `blueprint/context/coding-standards.md` (shadcn/ui in use, new token
  names) and remove the unused Inter interface font file. Keep the Inter 700
  caption font.

It must not break:

- Native radio and checkbox choices, labels, `fieldset disabled`, focus
  rings, live regions, `role="alert"` errors, and focus return after choosing a
  file or "Choose another".
- Touch targets of at least 44 px for tool controls and buttons.
- The no-flash theme script and the System, Light, and Dark preferences.
- Static output, no COOP/COEP headers, and files never leave the device.

Out of scope: new features, copy rewrites beyond the hero subtitle, swapping the
native range sliders or radio choices for Radix widgets, and adding a test runner.

## Build steps

- [x] **1. Set up shadcn/ui and the new theme, and restyle every screen.**
  **Done when:** `npm run build` and `tsc --noEmit` pass, and no component uses
  the old token names.
- [x] **2. Update the coding standards and remove the unused font.**
  **Done when:** `coding-standards.md` describes shadcn/ui and the new tokens,
  `public/fonts/inter-latin-wght.woff2` and anything that references only it are
  gone, and the build still passes.
- [x] **3. Browser check and polish.** _Skipped: the user declined browser
  verification and chose to record this step as skipped._
  **Done when:** both pages look right in light and dark mode at desktop and
  375 px width, with no horizontal scroll. A video converts and a GIF compresses
  with the progress bar showing. Download, Choose another, and keyboard focus
  work, and the console has no new errors.

## Verify

- `npm run build` passes, and `npx -p typescript@5.9.3 tsc --noEmit -p .` is clean.
- `npm run dev`, open `/`: the gradient hero, frosted header, and drop zone with
  an upload icon show. Choose an MP4, trim, pick a crop, speed, caption, and
  preset (selected pills fill violet), then Convert. The gradient progress bar
  fills, and the result card shows Download, Copy, or Share.
- Open `/gif-compressor`, choose a GIF, and compress. The indeterminate bar
  slides, and the size change shows green when smaller.
- Switch System, Light, and Dark. Reload and confirm no flash of the wrong theme.
- Tab through a tool. Every control shows a visible focus ring, and choices
  toggle with the arrow keys and Space.
- At 375 px width, the header wraps to two rows, and there is no horizontal
  scroll.

## Outcome

Verified by build and type-check only. No browser session ran, so the visual
result, light and dark themes, 375 px layout, keyboard focus, console, and a live
convert or compress were not observed.

- `npm run build`: passed, 2 pages built.
- `npx -y -p typescript@5.9.3 tsc --noEmit -p .`: exit 0.
- A grep of `src/` for the old token names (`bg-page`, `bg-surface`, `text-fg`,
  `fg-muted`, `border-line`, `line-strong`, `accent-line`, `accent-soft`,
  `accent-fg`, `danger-fg`, `warning-fg`) found none.
- Independent review was not run. The user chose to skip it because this is a
  restyle with no logic, data, or security changes.
- `npx shadcn init` added a bogus `cn` package. It was removed, and
  `src/lib/utils.ts` uses `clsx` and `tailwind-merge`. New dependencies:
  `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`,
  `tw-animate-css`, `shadcn` (for `shadcn/tailwind.css`), and
  `@fontsource-variable/geist`.
- `package-lock.json` already had uncommitted changes before this fix. They
  are included in this commit.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5282,"specSha256":"1e9f7aa46bf88c97d891d5ef21829b1e60c82ec04c879e6fa8414f4abd54a95d","branch":"refs/heads/fix/modern-ui-refresh-with-shadcn-ui","head":"b76e576a973911c6d17fda5f39ebce2a7256f5e7","baseRef":"refs/heads/master","baseCommit":"b76e576a973911c6d17fda5f39ebce2a7256f5e7","sourceTree":"19c6b14179cd4fe09eb76fd414563a1db41295dc","landing":"local-merge","absentOptional":[]} -->


## Try it now

Run or do:

Run `npm run dev`, open http://localhost:4321, then use the Light and Dark
buttons in the header.

Expected:

A frosted header with a gradient Snipgif logo and pill-shaped navigation, a hero
whose last phrase is a violet, pink, and orange gradient, and a drop zone with a
gradient upload icon. Both themes switch instantly.

This proves:

The shadcn/ui theme and restyled site shell render in both themes. It is a manual
look, not verification of conversion or compression.
