# Coding Standards

> Tuned by `/onboard` for the detected stack: Astro 7 (static output) + React 19
> islands + TypeScript (strict) + Tailwind CSS v4, npm, with ffmpeg.wasm and
> Lucide icons (`lucide-react`). shadcn/ui is not used; the app keeps its own
> small Tailwind components.

## TypeScript

- Strict mode enabled (`tsconfig.json` extends `astro/tsconfigs/strict`)
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## Astro

- The site is fully static (`astro build` writes HTML to `dist/`). There is no
  server, no API routes, and no SSR adapter; do not add one without a plan change.
- Pages, layouts, and content are `.astro` components that render to HTML at
  build time and ship no JavaScript by default.
- Use a React island only for real interactivity (the converter, the compressor,
  toggles). Pick the lightest `client:*` directive that works: `client:visible`
  or `client:idle` for below-the-fold or non-critical UI, `client:load` only when
  the island must be interactive immediately.
- Pass only serializable props from `.astro` files into islands.
- Content (blog, guides, landing copy) goes in content collections once those
  features start; define their schema in the collection config.
- Astro 7 may differ from older Astro knowledge. Check https://docs.astro.build
  (routing, framework components, content collections, styling, i18n) before
  using an API you are unsure about.

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks
- Browser APIs (`window`, `File`, `URL.createObjectURL`, ffmpeg.wasm) are touched
  only inside islands, in effects or event handlers, never at module top level of
  code that Astro renders at build time

## File Organization

- Pages and routes: `src/pages/[route].astro`
- Layouts: `src/layouts/LayoutName.astro` (shared `Layout.astro` imports the
  global stylesheet)
- Astro components: `src/components/[feature]/ComponentName.astro`
- React islands: `src/components/[feature]/ComponentName.tsx`
- Logic and utilities: `src/lib/[utility].ts`
- Types: `src/types/[feature].ts`
- Global styles: `src/styles/global.css`
- Static assets served as-is: `public/` (favicons, `robots.txt`, `ads.txt`)

## Naming

- Components: PascalCase (`DropZone.tsx`, `Layout.astro`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Tailwind v4: CSS-first config (`@theme` in `src/styles/global.css`), no
  `tailwind.config.js`; compiled by the `@tailwindcss/vite` plugin in
  `astro.config.mjs`
- No inline styles
- Colors come only from the semantic tokens in `global.css` (`bg-page`,
  `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `bg-accent`,
  `outline-accent-line`, and so on); each has a light and a dark value, so
  components need no `dark:` color variants. Fixed colors are only for content
  that looks the same in both themes (video letterbox, crop overlay, caption
  swatches, white text on the accent)
- Dark mode is `<html data-theme="dark">`, set before first paint by the inline
  script in `Layout.astro`; use the `dark:` variant only for non-color
  differences such as `dark:shadow-none`

## Data and Boundaries

- No backend, database, or file storage. User videos and GIFs stay in browser
  memory; never send them over the network.
- Untrusted input is the user's file: check type, size, and duration before
  handing it to ffmpeg, and fail with a friendly message rather than crashing.
- Persist only small preferences in `localStorage`, wrapped in try/catch so
  private mode or blocked storage never breaks the page.
- Public config comes from `import.meta.env.PUBLIC_*` variables; there are no
  server secrets. Never put a secret in a `PUBLIC_` variable.
- Do not add COOP/COEP headers: they break AdSense, which is why the plan uses
  the single-threaded ffmpeg.wasm core.

## Error Handling

- Catch failures at island boundaries (file reading, ffmpeg load, conversion,
  clipboard, share) and turn them into user-friendly messages
- Never surface raw stack traces or ffmpeg logs to users
- Release large resources (object URLs, ffmpeg files in memory) when no longer
  needed

## Testing

The blueprint installs no test runner; testing is opt-in at the project level,
because the overlay can't know your stack. Adding unit testing is an explicit
setup task the AI can do through the normal workflow, either as a build-plan item
or with `/tests`. The setup should choose the stack-native runner, wire the
scripts or commands, add a small example test, and update the Commands section
of `AGENTS.md`.

When `AGENTS.md` declares a `Verify` command, treat it as the umbrella automated
gate. It combines only the checks this project actually has, in this order when
available: typecheck, tests, then build. The command does not enable an absent
test runner or replace focused evidence. It gives local work and optional CI one
exact command to run. `/ci` owns Verify and CI setup. `/tests` adds the real test
command to Verify when it already exists, but never creates CI only because
testing was configured.

**The opt-in switch is one signal: a `test` command in the Commands section of
`AGENTS.md`.** Declare one and **tests become a gate for logic-bearing steps**,
not an optional extra; leave it out and the loop verifies logic with the evidence
it already uses (run it, a screenshot, the build). Adding the runner is itself a
deliberate step, never a silent mid-step install. This is the single definition
of the switch; the skills and `ai-interaction.md` only point back here.

- **What to test (the scope rule):** pure logic where a wrong answer is possible -
  parsers, formatters, validators, id/slug builders, server actions. These have
  assertable inputs and outputs and real edge cases (empty, missing, malformed).
- **What not to test:** UI components and integration-level surfaces (render or
  export routes, anything driving a real browser or external service). Verify those
  with a screenshot and the build, not brittle unit tests.
- **The gate (when a runner is configured):** a build step that adds in-scope logic
  must ship a passing test in the same reviewable diff. The project's test command
  must be green before the step is approved, before any checkpoint commit, and
  before `/complete` merges. UI and integration-only steps are exempt and ride on
  screenshot plus build evidence.
- **When it's named:** the `/feature` spec's Testing section predicts the coverage,
  `/implement` writes the test with the step, and if a step surfaces logic the spec
  didn't foresee, add a focused test then.
- An empty suite should fail, not pass, so "no tests ran" never looks like "passed".
- Test files live next to source files (for example `feature.test.ts`).
- Run them via the project's test command (see Commands in `AGENTS.md`), not a
  hardcoded tool name.

Stack binding: when `/tests` adds a runner, this TypeScript app should use Vitest,
`vi.mock()` for external dependencies, and `vi.useFakeTimers()` for
time-dependent logic. No runner is configured yet.

## Browser Verification

For UI and integration behavior, prefer real browser evidence over reading the
code and assuming it works.

- Browser automation is separately opt-in through `/tests browser`. That setup
  reuses a compatible runner or prefers Playwright for supported projects, then
  documents the exact command as `Browser tests` in `AGENTS.md`.
- When `Browser tests` is declared, add focused coverage for stable behavioral
  done-whens when it is proportionate, and run the documented command during
  `/check`. Do not assume it proves visual fidelity, real authenticated-profile
  behavior, browser chrome, or another claim the test does not observe.
- If no Browser tests command is declared, do not add a runner silently in the
  middle of an unrelated feature. Use the available dev server, browser
  screenshots, build output, API output, or manual evidence instead.
- Browser tests are not part of the default Verify command or CI unless the user
  separately chooses that slower gate.
- Browser evidence is especially important for flows that click, type, submit,
  navigate, download files, render complex layouts, or depend on client-side
  state.

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.
