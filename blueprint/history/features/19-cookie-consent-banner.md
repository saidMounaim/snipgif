# Feature: Cookie consent banner

**From build-plan:** feature 19
**Build attempt:** 1
**Branch:** feature/cookie-consent-banner
**Status:** verified

## Goal

Show Google's certified consent message (AdSense Privacy & messaging) to
visitors in the EEA, the UK, and Switzerland, let their choice update Google
Consent Mode for analytics and ads, and give every visitor a "Privacy and cookie
settings" link to change that choice later.

## In scope

- Load the AdSense site code (`adsbygoogle.js`) on every page when
  `PUBLIC_ADSENSE_CLIENT_ID` is a valid AdSense client ID; load nothing when it
  is unset or invalid. Google delivers the European regulations consent message
  through this code, and it is also the code AdSense asks for when the site is
  connected during the application. No ad slots are placed.
- Emit the existing Consent Mode v2 defaults whenever either Google ID is set
  (today they are emitted only with the GA4 ID), ahead of the AdSense code and
  the GA4 tag.
- A footer "Privacy and cookie settings" button, rendered only when the AdSense
  code is configured, that reopens the consent message through Google's
  revocation API.
- One sentence each in the Cookie Policy and Privacy Policy pointing to that
  button, with their "Last updated" dates moved to the build date.

## Out of scope

- Ad slots, `<ins class="adsbygoogle">` units, and `ads.txt` (feature 20). Auto
  ads stay off in the AdSense account until feature 20.
- The separate Funding Choices tag (`fundingchoicesmessages.google.com`), which
  Google documents for ad blocking recovery messages, not consent messages.
- Configuring the message itself in the AdSense UI: creating the European
  regulations message, its wording and styling, and turning on consent mode for
  advertising and analytics purposes. These are account settings the site owner
  changes in AdSense, listed under Notes for the AI so the handoff names them.
- US state privacy messages or any other message type.
- A self-built banner or any consent storage in app code (the overview says the
  CMP owns the consent cookie).
- Changing the consent default regions or values set in feature 18.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`: no commits per step.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Consent defaults for either ID, and the AdSense site code.**
  In `Layout.astro`,
  validate `PUBLIC_ADSENSE_CLIENT_ID` against `^ca-pub-[0-9]{16}$` (anything else
  is unset, like the GA4 and Formspree IDs). Split the current GA4 block so the
  `dataLayer`/`gtag` definition and both `gtag('consent', 'default', ...)` calls
  render when either ID is valid. Then render the AdSense site code when the
  AdSense ID is valid, then `gtag('js')`, `gtag('config')`, and the GA4 script when the
  GA4 ID is valid.
  **Done when:** builds with (a) both IDs, (b) only the AdSense ID, (c) only the
  GA4 ID, and (d) neither or invalid IDs show, in every page head: consent
  defaults present in a, b, and c and absent in d; the AdSense code present
  only in a and b, after the defaults; GA4 present only in a and c, after the
  defaults; and in (d) no `gtag(`, `googletagmanager`, or `adsbygoogle` in any
  HTML file.

- [x] **2. "Privacy and cookie settings" footer button.**
  When the AdSense ID is valid, add a `<button type="button">` labeled "Privacy
  and cookie settings" as the last item of the footer Site navigation, styled
  like the footer links (44 px target, shared focus ring). One small inline
  script attaches its click handler, which runs
  `window.googlefc = window.googlefc || {}; googlefc.callbackQueue =
  googlefc.callbackQueue || []; googlefc.callbackQueue.push(() =>
  googlefc.showRevocationMessage());` so a click before the tag loads is queued,
  not lost or thrown.
  **Done when:** build (a) or (b) shows the button in every page footer with
  its handler script, and builds (c) and (d) show neither.

- [x] **3. Policy copy.**
  In `src/content/pages/cookies.md` (after the consent paragraph) and
  `src/content/pages/privacy.md` (in the consent platform bullet), add that
  visitors can review or change their consent at any time with the "Privacy and
  cookie settings" link at the bottom of every page. Set `updated` to the build
  date in both.
  **Done when:** `npm run build` passes and `/cookies` and `/privacy` show the
  sentence and the new "Last updated" date.

## Files / areas

- `src/layouts/Layout.astro` - AdSense ID check, shared consent defaults, AdSense
  site code, footer button and its handler.
- `src/content/pages/cookies.md`, `src/content/pages/privacy.md` - one sentence
  each and the `updated` date.

## Data / contracts

**Environment:** `PUBLIC_ADSENSE_CLIENT_ID`, already listed in the overview's
deployment env vars, in AdSense's `ca-pub-` plus 16 digits form.
Set it in the Cloudflare Pages build settings for production; feature 20
reuses the same variable.

**AdSense site code** (Google's standard snippet, with the validated client ID):

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

Google's AdSense help says the European regulations message needs only this
code on the site; a separate tag is needed only for ad blocking recovery
messages.

**Head order** (each block only when its ID applies):

1. `dataLayer`/`gtag` definition plus the region-denied and global-granted
   consent defaults from feature 18, unchanged.
2. AdSense site code.
3. `gtag('js')`, `gtag('config', <GA4 ID>)`, async GA4 script.

**Consent flow:** Google's CMP stores the choice in its own cookie and updates
Consent Mode (advanced mode) once consent mode is enabled in the AdSense
European regulations message settings. App code never reads or writes consent.

**Revocation:** `googlefc.showRevocationMessage()` clears the stored EU consent
record and shows the message again. Google requires a revocation link titled
"Privacy and cookie settings" at the bottom of the site.

## Testing

No test or Verify command is configured. Evidence is `npm run build` with the
four ID combinations in step 1 and inspection of the built HTML. Showing the
message, a real consent update, and the revocation flow need a published
AdSense message on the production domain and a browser; they are not claimed
here.

## Notes for the AI

- The AdSense code and GA4 tag stay `async`; nothing may block rendering
  (feature 14).
- Keep the inline scripts `is:inline`, passing the client ID through
  `define:vars` or a validated attribute only, never string-concatenated from
  an unvalidated value.
- The footer button exists only when the AdSense code is configured: a link
  that does nothing is worse than no link.
- The inline handler script must not throw when the tag is blocked; queuing on
  `googlefc.callbackQueue` covers both "not loaded yet" and "blocked".
- Site owner actions to list in the review packet, not code: add the site in
  AdSense, create and publish a European regulations message under Privacy &
  messaging, enable consent mode for advertising and analytics purposes in that
  message's settings, and set `PUBLIC_ADSENSE_CLIENT_ID` in Cloudflare Pages.
- Follow the Writing standard: no em dashes, en dashes, or ellipsis characters.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7398,"specSha256":"dc8bffcab7fad81b2fb1782ba40e5bba8cf512b29d4947bd563f991fdbb60e40","branch":"refs/heads/feature/cookie-consent-banner","head":"9ceddced9b6a74c095192f4445d26d94d688adbb","baseRef":"refs/heads/master","baseCommit":"0237396430a5bc959e1c020d57f2937bb27ef242","sourceTree":"d28e496b4a9d51e6cae1502afa569cb9416ea796","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 9ceddced9b6a74c095192f4445d26d94d688adbb
**Base commit:** 0237396430a5bc959e1c020d57f2937bb27ef242
**Base ref:** refs/heads/master
**Spec hash:** dc8bffcab7fad81b2fb1782ba40e5bba8cf512b29d4947bd563f991fdbb60e40
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-06T14:33:42Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-06T14:35:35Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base master HEAD`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD, merge base, and spec hash match the request; only review.md differs; spec is tracked)
- `PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456 PUBLIC_GA_MEASUREMENT_ID=G-TEST123 npm run build`: pass
- `PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456 npm run build`: pass
- `PUBLIC_GA_MEASUREMENT_ID=G-TEST123 npm run build`: pass
- `npm run build` (neither ID): pass
- `npm run build` with invalid values (`ca-pub-123` with `g-test123`; an AdSense ID with an appended `"><script>` payload with `G-TEST123"x`; `pub-1234567890123456`; `ca-pub-12345678901234567`): pass, all treated as unset
- Node inspection script over every built HTML file per combination: pass
- Node simulation of the built footer handler script: pass
- Final plain `npm run build` with neither variable set: pass
- Typecheck command: unavailable (none configured)
- Test command: unavailable (none configured)

### Evidence

- Both IDs (14 pages): consent defaults, then async `adsbygoogle.js?client=ca-pub-1234567890123456` with `crossorigin="anonymous"`, then `gtag('js')`/`gtag('config')` and the async GA4 script, in that head order; footer button and handler present.
- AdSense only (14 pages): consent defaults then AdSense code; no GA4; button and handler present.
- GA4 only (14 pages): consent defaults then GA4; no AdSense code, no button, no handler.
- Neither and all invalid variants (14 pages each): no `gtag(`, `googletagmanager`, or `adsbygoogle` in any HTML file; no button.
- No `<ins>` or `class="adsbygoogle"` ad slot in any page; AdSense string appears only in the head.
- The moved consent block (src/layouts/Layout.astro:99-126) is identical to feature 18's apart from indentation: same denied values, same 32-region list, same global granted defaults.
- Footer button (src/layouts/Layout.astro:213-221) is a `type="button"` last item of the Site nav, using `FOOTER_LINK` (`min-h-11`) and the shared `FOCUS` ring.
- Handler (src/layouts/Layout.astro:224-235): two clicks before the tag loads queue two callbacks without throwing; draining the queue calls `showRevocationMessage` twice; a missing button does not throw.
- AdSense ID validated with `^ca-pub-[0-9]{16}$` before interpolation into the `src` attribute (src/layouts/Layout.astro:52-53); GA4 ID passed through `define:vars`.
- /cookies and /privacy render the new sentence and "Last updated November 6, 2026"; diff contains no em dash, en dash, or ellipsis characters.
- public/_headers sets only a cache header (no CSP that would block the AdSense code).

### Findings

- None

### Remaining risk

- No typecheck command is configured (`astro build` does not type-check).
- No test command is configured; the AdSense ID validation and handler have no automated tests.
- The real CMP message, a consent update, and the revocation flow were not exercised in a browser; they need a published AdSense European regulations message on the production domain.
- With only the AdSense ID set, `window.gtag` is defined, so `track()` events are pushed to `dataLayer` with no GA4 config consuming them; observed as harmless, not verified against live Google tags.

## Try it now

1. Create `.env` with `PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456` and `PUBLIC_GA_MEASUREMENT_ID=G-TEST123`, then start the dev server with `npm run dev` and open http://localhost:4321.
2. View the page source. Expected: in the head, the two `gtag('consent', 'default', ...)` calls, then the async `adsbygoogle.js?client=ca-pub-1234567890123456` script, then the GA4 config and script.
3. Scroll to the footer. Expected: a "Privacy and cookie settings" button as the last Site link, reachable with Tab and showing the focus ring.
4. Click it, then run `googlefc.callbackQueue` in the DevTools console. Expected: no error, and a queued callback (the test ID loads no real consent message).
5. Open /cookies and /privacy. Expected: the new sentence about the "Privacy and cookie settings" link and "Last updated November 6, 2026".
6. Remove `PUBLIC_ADSENSE_CLIENT_ID` and reload. Expected: no AdSense script and no settings button; GA4 still loads after the consent defaults.

The real consent message and the revocation flow appear only after AdSense approval, with a published European regulations message on the live domain.
