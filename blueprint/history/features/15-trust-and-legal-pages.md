# Feature: Trust and legal pages

**From build-plan:** feature 15
**Build attempt:** 1
**Status:** verified
**Branch:** feature/trust-and-legal-pages

## Goal

Add About, Contact, Privacy Policy, Terms of Use, and Cookie Policy pages at
`/about`, `/contact`, `/privacy`, `/terms`, and `/cookies`, and link them from
every page footer. The pages make Snipgif look trustworthy to visitors and meet
Google AdSense's approval requirements. All copy must accurately describe what
the site does today, plus the Google services planned for features 18 to 20.

## In scope

- **Operator identity:** the pages name the operator only as **Snipgif**, never
  a personal name (user decision). Contact goes through one email address
  defined in one shared module (see Open questions).
- **About** (`/about`): what Snipgif is, the privacy model (conversion runs on
  the device with ffmpeg.wasm, files are never uploaded), the no-watermark and
  no-sign-up promises, who it is for, and a link to Contact.
- **Contact** (`/contact`): a short intro, the contact email as a `mailto:`
  link (always shown), and a Formspree form shown only when
  `PUBLIC_FORMSPREE_ID` is set at build time (user decision: Formspree with an
  email fallback).
  - Fields: Email (required, `type="email"`), Name (optional), Message
    (required, up to 5000 characters). Formspree's `_gotcha` honeypot field is
    included, visually hidden, `tabindex="-1"`, and `autocomplete="off"`.
  - States: idle, submitting (button disabled with "Sending..."), sent
    (success message, form reset), failed (friendly error that suggests the
    email address), and invalid (inline field errors).
  - Validation: each field has a visible `<label>`. Errors are linked with
    `aria-describedby`, set `aria-invalid`, move focus to the first invalid
    field on submit, and clear when the field becomes valid. The sent and
    failed messages appear in a polite `aria-live` region.
  - Progressive enhancement: the server-rendered form has a real `action` and
    `method="POST"`, so a submit before hydration still posts to Formspree
    natively.
- **Privacy Policy** (`/privacy`), with a "Last updated" date:
  - Videos and GIFs are processed on the device and never uploaded or stored by
    Snipgif.
  - Third parties that run today:
    - Cloudflare Pages hosting (standard request logs such as IP address and
      user agent).
    - The jsDelivr CDN, which serves the ffmpeg core when a video is selected
      (`src/lib/gif-engine.ts`), so the visitor's IP address reaches jsDelivr.
    - Formspree, which receives the name, email, and message when the contact
      form is used.
  - Device storage today: the `theme` key in `localStorage`.
  - Planned Google services (user decision: disclose them now): Google
    AdSense ads, Google Analytics 4, and Google's consent management platform.
    For each, the policy covers what it collects, the purpose, and how to opt
    out. It links to Google's "How Google uses information from sites or apps
    that use our services" page and Google Ads Settings.
  - Legal bases, retention, and the rights of EU and UK visitors under
    GDPR/UK GDPR, plus Moroccan Law 09-08 and the CNDP (user decision: Morocco
    plus GDPR).
  - Also covered: children, changes to the policy, and how to make a request
    (by email).
- **Terms of Use** (`/terms`), with a "Last updated" date:
  - Acceptance of the terms, and that the service is free with no account.
  - The user keeps the rights to their files and must have the right to convert
    them.
  - Acceptable use: no illegal content and no abuse of the site.
  - No watermark is added to output, and Snipgif claims no rights over it.
  - The service is provided as-is, with a limitation of liability.
  - The site shows third-party ads.
  - Governing law is Morocco.
  - Changes to the terms and how to contact Snipgif.
- **Cookie Policy** (`/cookies`), with a "Last updated" date:
  - Snipgif's own code sets no cookies today. It stores only the `theme`
    preference in `localStorage`.
  - Cookies from the planned Google AdSense, GA4, and consent platform, what
    each is for, and that EU/UK visitors are asked for consent first.
  - How to clear or block cookies and storage in the browser.
- **Footer:** a second footer nav (`aria-label="Site"`) on every page with
  About, Contact, Privacy, Terms, and Cookies. It uses the same 44 px link
  styling as the existing Tools nav.
- **SEO:** each page has a unique title and description and goes through the
  existing Layout (canonical, OG, Twitter). The glob-based sitemap picks the
  pages up automatically; confirm this in the build output.

## Out of scope

- The consent banner, a "manage consent" link, and loading the CMP (feature 19).
- AdSense script, `ads.txt`, and ad slots (feature 20).
- GA4 or any analytics code (feature 18).
- Translations and locale routes (feature 17).
- The blog (feature 16).
- New JSON-LD types (such as Organization or AboutPage).
- Any backend, API route, or server-side form handling.
- Changes to the main header nav, which stays limited to the two tools.

## Build loop

`workflow.stepReview` is `feature`: build all steps in order, keeping each one
working, then present one review packet after the last step. Checkpoint commits
are disabled. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Shared site constants and the text-page collection.**
  - Add `src/lib/site.ts`, exporting `SITE_NAME = 'Snipgif'` and
    `CONTACT_EMAIL` (the value confirmed under Open questions).
  - Add a `pages` content collection in `src/content.config.ts`
    (`src/content/pages/*.md`; the filename is the slug). Schema: `title`,
    `description`, `heading`, and an optional `updated` date (`z.coerce.date()`).
  - Add `src/components/site/TextPage.astro`. It renders an entry inside
    `Layout` with an `<h1>` (the heading), an optional "Last updated" line
    using `<time datetime>`, and the body styled with `LandingText`.
  - Markdown bodies are written in the repo, so Astro's normal rendering is safe
    (no user input).
  - Done when: `npm run build` succeeds with the new collection and an empty
    pages folder is handled. If Astro errors on an empty glob, add the About
    entry in this step instead.
- [x] **2. About page and footer links.**
  - Add `src/content/pages/about.md` and `src/pages/about.astro`, which loads
    the entry with `getEntry('pages', 'about')` and throws if it is missing, in
    the same pattern as `gif-compressor.astro`.
  - Add the `Site` footer nav to `src/layouts/Layout.astro`.
  - Done when: the build writes `dist/about.html` with the right title,
    canonical `https://snipgif.com/about`, and footer links on every built
    page, and `dist/sitemap.xml` lists `/about`.
- [x] **3. Privacy Policy, Terms of Use, and Cookie Policy.**
  - Add `privacy.md`, `terms.md`, and `cookies.md` plus their page files, with
    the content listed in In scope, the email taken from `CONTACT_EMAIL`, and
    each page linking to the others where relevant.
  - The email appears in the Markdown body, so either write it there literally
    or render it in `TextPage` from the constant. Choose one approach and make
    the build fail if the Markdown and the constant could drift; prefer
    rendering a contact line from the constant.
  - Done when: the build writes all three pages, the sitemap lists them, the
    copy contains no em dashes, no personal name, and no `TODO` text, and
    every policy claim matches the current code (jsDelivr URL, `theme` key,
    no first-party cookies).
- [x] **4. Contact page and form.**
  - Add `src/pages/contact.astro`. It reads `import.meta.env.PUBLIC_FORMSPREE_ID`,
    accepts it only if it matches `^[A-Za-z0-9]+$`, and otherwise treats it as
    unset.
  - When the ID is valid, render the `ContactForm` React island
    (`src/components/contact/ContactForm.tsx`, `client:visible`) with the
    endpoint `https://formspree.io/f/<id>` as a serializable prop. The form uses
    the existing `Input`, `Label`, and `Button` components and a textarea
    styled to match `Input`.
  - Submit with `fetch(endpoint, { method: 'POST', body: FormData, headers: {
    Accept: 'application/json' } })`. A 2xx response means sent. A non-2xx
    response or a network error means failed; never show raw error bodies.
  - Without a valid ID, render only the mailto block.
  - Add `PUBLIC_FORMSPREE_ID=` to an `.env.example` only if the repo already
    keeps one. It currently does not, so document the variable in `README.md`
    instead.
  - Done when: with no env var, `dist/contact.html` shows only the email.
    With `PUBLIC_FORMSPREE_ID=test123 npm run build`, the built HTML includes
    a form with `action="https://formspree.io/f/test123"` and `method="post"`,
    and an invalid ID such as `x/../y` renders no form. A manual check in
    `npx astro dev --background` confirms the inline errors, focus on the
    first invalid field, error clearing, and the disabled submitting state.
    Do not claim a live Formspree send unless a real ID was used.
  - Evidence: the build checks pass (no ID: email only; `test123`: form
    with the Formspree action and POST; `x/../y`: no form). Browser check on an
    `astro preview` of the `test123` build, with Formspree stubbed in the page
    (no live send): the hydrated form sets `noValidate`; an empty submit shows
    both errors, sets `aria-invalid` and `aria-describedby`, and focuses Email;
    a bad email shows the format error; each error clears once its field is
    valid; with only the message missing, focus moves to Message; submitting
    shows "Sending..." with the button and fields disabled; a 200 response shows
    the sent message and resets the form; a 422 response and a network error
    both show the friendly failure with the email, keeping the typed text. The
    request carries `name`, `email`, `message`, `_gotcha`, and
    `Accept: application/json`.

- [x] **5. Repair review findings F-01 to F-04.**
  - F-01: the Privacy Policy says jsDelivr serves the engine when a video or a
    GIF is chosen, not only "the first time you choose a video".
  - F-02: the Privacy Policy states retention for every party it names: Snipgif
    keeps no server-side records, and the services keep data under their own
    linked policies.
  - F-03: remove the "Get in touch" section from `about.md`, so the shared
    Contact block is the only contact section.
  - F-04: the contact submit button stays focusable while sending
    (`aria-disabled`, with repeat submits ignored), so keyboard focus is not lost.
  - Done when: `npm run build` passes, `dist/about.html` has one contact
    section, and the Privacy copy matches `Compressor.tsx` and
    `gif-engine.ts`. A browser check on a `test123` preview build with
    Formspree stubbed shows focus staying on the submit button through the
    sending, sent, and failed states, with no second request sent while
    sending. Each finding is marked `fixed` (never `closed`) for `/audit`.

## Files / areas

- New:
  - `src/lib/site.ts`
  - `src/components/site/TextPage.astro`
  - `src/components/contact/ContactForm.tsx`
  - `src/content/pages/{about,privacy,terms,cookies}.md`
  - `src/pages/{about,contact,privacy,terms,cookies}.astro`
- Changed:
  - `src/content.config.ts` (the `pages` collection)
  - `src/layouts/Layout.astro` (the footer Site nav)
  - `README.md` (the `PUBLIC_FORMSPREE_ID` note)
- Reused unchanged:
  - `src/components/landing/LandingText.astro`
  - `src/components/ui/{input,label,button}.tsx`
  - `src/pages/sitemap.xml.ts` (picks the new pages up automatically)

## Data / contracts

- `pages` collection frontmatter: `title: string`, `description: string`,
  `heading: string`, and `updated?: Date` (used on the three policy pages).
- Contact submission: `POST https://formspree.io/f/<PUBLIC_FORMSPREE_ID>`,
  sent as `multipart/form-data` with the fields `email`, `name`, `message`, and
  `_gotcha`, plus `Accept: application/json`. Nothing is stored by Snipgif.
- `PUBLIC_FORMSPREE_ID` is a public build-time value, not a secret.

## Testing

- No test or Verify command is configured, and none ran during spec writing,
  so there is no automated test gate.
- Each step's gate is `npm run build` plus inspecting the built HTML in
  `dist/`, as listed in that step's Done when.
- Step 4 adds a manual browser check of the form states on the dev server. The
  form sends user-entered personal data to a third party, so the
  `when-sensitive` independent review may be selected.

## Notes for the AI

- Follow the Writing standards: no em dashes, en dashes, or ellipsis
  characters. Use "..." in "Sending...".
- Never mention a personal name. The operator is "Snipgif".
- Describe the planned Google services accurately without claiming they are
  live, for example "Snipgif uses or will use the following Google services
  to show ads and measure traffic".
- Text pages ship no JavaScript; only `/contact` with a valid ID loads the
  island.
- Keep the page width at `max-w-3xl` and the spacing consistent with
  `gif-compressor.astro`.

## Resolved decisions

- **`SITE_NAME` dropped:** step 1 listed a `SITE_NAME` export, but nothing
  needed it, so `src/lib/site.ts` exports only `CONTACT_EMAIL`.
- **Contact email address:** `contact@snipgif.com` (confirmed by the user before
  implementation). It must be a real mailbox before launch.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13426,"specSha256":"03288b00f8cb48e45804f4fcf18fcd7b3860685876c10114e4190f50d140d25f","branch":"refs/heads/feature/trust-and-legal-pages","head":"e0a33226e5f6b6b9dea61f5e57a29bb50dad33cc","baseRef":"refs/heads/master","baseCommit":"8032d463947632571f1b9c59409d193900a3f4d0","sourceTree":"4696db8614de5dadcd8b49c972dc58f6170800fd","landing":"local-merge","absentOptional":[]} -->


## Findings

### 15/F-01 [P3] closed - jsDelivr trigger described incompletely

**File:** src/content/pages/privacy.md:30
**Found:** 2026-10-31 by /audit independent current (scope: current; lens: quality)
**Why it matters:** The spec requires every policy claim to match current code.
`src/components/compressor/Compressor.tsx:156` calls `loadGifEngine()` when a
GIF is selected, and `src/lib/gif-engine.ts:76-78` fetches the core from
`https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm` with `toBlobURL`
on every page session, not once. The third party is disclosed, so this is
wording accuracy, not a missing disclosure.
**Suggested fix:** Reword to "When you choose a video or a GIF, your browser
downloads the converter engine (about 30 MB) from jsDelivr." No requirement is
lost.
**Resolution:** Fixed in step 5: the Privacy Policy now says the engine downloads from jsDelivr when you choose a video to convert or a GIF to compress, and says your files are not sent. Checked against Compressor.tsx:156 and gif-engine.ts; build passes. Closed 2026-10-31 by /audit independent current (fresh subagent, target e0a3322): privacy.md:30-34 now names both triggers, matching Converter.tsx:241, Compressor.tsx:156, and the jsDelivr CORE_BASE_URL in gif-engine.ts:14; no new defect.

### 15/F-02 [P3] closed - Retention only partially covered

**File:** src/content/pages/privacy.md:72
**Found:** 2026-10-31 by /audit independent current (scope: current; lens: quality)
**Why it matters:** The spec's Privacy scope names "Legal bases, retention, and
the rights". Only contact-message retention is stated (line 41); hosting logs,
jsDelivr, and Google retention are not addressed.
**Suggested fix:** Add one short sentence that Snipgif keeps no server-side
records of its own, and that Cloudflare, jsDelivr, Formspree, and Google retain
data under their own policies (already linked). No requirement is lost.
**Resolution:** Fixed in step 5: added a "How long data is kept" section. Snipgif keeps no records of visits, contact messages are kept only as long as needed, and Cloudflare, jsDelivr, Formspree, and Google keep data under their own linked policies. Present in dist/privacy.html. Closed 2026-10-31 by /audit independent current (fresh subagent, target e0a3322): privacy.md:72-77 covers retention for every named party and dist/privacy.html contains the section; no new defect.

### 15/F-03 [P3] closed - Duplicate contact sections on About

**File:** src/components/site/TextPage.astro:41
**Found:** 2026-10-31 by /audit independent current (scope: current; lens: quality); also raised by the builder /audit (scope: current; lens: all)
**Why it matters:** Built `dist/about.html` reads "Get in touch ... contact
page. Contact Questions about this page? Email ... or use the contact page."
(`src/content/pages/about.md:36` then the shared block.) The repetition is
harmless but reads as a copy slip on a trust page.
**Suggested fix:** Drop the "Get in touch" section from `about.md` (the shared
block already links Contact). No requirement is lost.
**Resolution:** Fixed in step 5: removed "Get in touch" from about.md; dist/about.html now has one contact section (the shared block). Closed 2026-10-31 by /audit independent current (fresh subagent, target e0a3322): about.md has no "Get in touch" text and the built about.html h2 list ends with the single shared Contact heading; no new defect.

### 15/F-04 [P2] closed - Disabling the focused submit button drops keyboard focus

**File:** src/components/contact/ContactForm.tsx:150
**Found:** 2026-10-31 by /audit (scope: current; lens: all). Originally recorded
as F-02 alongside an F-01 that duplicated F-03 above; both were overwritten by
the concurrent independent review write and restored here under the next free ID.
**Why it matters:** The submit button is disabled while sending, so a keyboard
or screen-reader user who pressed it loses focus to the page body (observed in
the builder browser check: `activeElement` became `BODY` after submit, after
send, and after both failure paths). They must tab from the top of the page to
retry or to reach the fallback email link in the failure message. The
independent receipt lists this as an unverified remaining risk.
**Suggested fix:** Keep the button focusable during submission: replace
`disabled={submitting}` with `aria-disabled={submitting}`, ignore submits in
`handleSubmit` while `status === 'submitting'`, and keep the visual disabled
styling via `aria-disabled:` classes. The fields can stay disabled.
**Resolution:** Fixed in step 5: the submit button uses aria-disabled instead of disabled, and handleSubmit ignores submits while sending. Browser check on a test123 preview with Formspree stubbed: focus stays on the button through sending, sent, 422, and network failure, and a second press while sending sends no request. Closed 2026-10-31 by /audit independent current (fresh subagent, target e0a3322): code review confirms the Button no longer receives `disabled` (ContactForm.tsx:153-160 uses aria-disabled, Button passes props through), handleSubmit returns early while submitting (line 52), FormData is read before fields disable, and the native pre-hydration form is unaffected; browser behavior not re-run in this pass (no servers started); no new defect.


## Independent review

# Independent Review

**Status:** passed
**Target commit:** e0a33226e5f6b6b9dea61f5e57a29bb50dad33cc
**Base commit:** 8032d463947632571f1b9c59409d193900a3f4d0
**Base ref:** master
**Spec hash:** 03288b00f8cb48e45804f4fcf18fcd7b3860685876c10114e4190f50d140d25f
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-31T22:54:42Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-31T22:57:03Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `8032d463947632571f1b9c59409d193900a3f4d0..e0a33226e5f6b6b9dea61f5e57a29bb50dad33cc` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD` / `git merge-base master HEAD` / `git status --porcelain --untracked-files=all` / `shasum -a 256 blueprint/context/current-feature.md`: pass (HEAD equals target, merge base equals base, only review.md dirty, spec hash matches, spec tracked so no snapshot)
- `npm run build`: pass (10 pages; /about, /contact, /privacy, /terms, /cookies in sitemap.xml)
- `PUBLIC_FORMSPREE_ID=test123 npm run build`: pass (form action https://formspree.io/f/test123, method POST, client:visible island, _gotcha with tabindex -1 and autocomplete off)
- `PUBLIC_FORMSPREE_ID='x/../y' npm run build`: pass (no form rendered)
- `npm run build` (final plain rebuild to restore dist/): pass (contact.html has no form)
- Test, lint, typecheck, Verify commands: unavailable (none declared)

## Evidence

- Full delta 8032d46..e0a3322 reviewed: ContactForm.tsx, TextPage.astro, content.config.ts, pages/*.md, page routes, Layout.astro footer, LandingText.astro, site.ts, README.md.
- Policy claims checked against code: jsDelivr core URL in gif-engine.ts:14 loaded on video select (Converter.tsx:241) and GIF select (Compressor.tsx:156); only `theme` in localStorage (theme.ts, Layout.astro inline script); no document.cookie anywhere in src; Cloudflare Pages hosting per project-overview.md.
- Built HTML: every page has one `aria-label="Site"` footer nav, unique titles, correct canonicals; text pages load only the pre-existing ThemeToggle island.
- No em dashes, en dashes, ellipsis characters, TODO text, or personal names in the new copy or code.
- Security: Formspree ID validated by `^[A-Za-z0-9]+$` before building the endpoint; no user-supplied HTML rendered; error bodies never shown; Markdown is repo-owned.
- F-01 to F-04 re-examined against the repaired code and closed in findings.md.

## Findings

- None new. F-01, F-02, F-03, F-04 closed.

## Remaining risk

- No test command declared: ContactForm validation and submit logic have no automated tests.
- No lint, typecheck, or Verify command declared (`astro build` does not type-check).
- Browser behavior of the contact form (focus retention, live region, error clearing) was not re-run in this pass; no dev or preview server was started. Evidence relies on code review plus the builder's recorded browser check.
- No live Formspree send verified (no real form ID); `contact@snipgif.com` must be a real mailbox before launch.
- Legal copy accuracy (GDPR, Moroccan Law 09-08) is reviewed for consistency with the spec and code only, not as legal advice.


## Try it now

Run or do:

Run `npm run dev` and open http://localhost:4321. Scroll to the footer and
follow About, Privacy, Terms, Cookies, and Contact. Then stop the server, run
`PUBLIC_FORMSPREE_ID=test123 npm run build && npm run preview`, open
http://localhost:4321/contact, select Send message with the fields empty, then
fix each field. Do not submit valid data: `test123` is not a real form.

Expected:

Every page shows a second footer row with the five links. The Privacy, Terms,
and Cookie pages show "Last updated October 31, 2026" and end with a Contact
section linking contact@snipgif.com. About has exactly one contact section. On
the plain dev build, Contact shows only the email link; on the `test123`
build, an empty submit shows "Enter your email address." and "Enter a
message.", focus moves to Email, and each error disappears once its field is
filled. `dist/sitemap.xml` lists /about, /contact, /privacy, /terms, and
/cookies.

This proves:

The trust and legal pages are reachable from every page and indexed, the policy
pages render their dates and shared contact line, and the contact form appears
only with a valid Formspree ID and guides the user through validation errors.
