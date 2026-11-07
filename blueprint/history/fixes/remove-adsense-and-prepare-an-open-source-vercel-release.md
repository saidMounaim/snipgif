# Fix: Remove AdSense and prepare an open-source Vercel release

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-adsense-and-prepare-an-open-source-vercel-release

## The problem

Snipgif is no longer an ad-supported product. It will be free, open source on
GitHub, with no ads and no paid tier, and deployed to Vercel instead of
Cloudflare Pages. The repository still plans, builds, and documents the old
direction:

- **Plans:** `blueprint/project-plan.md` describes AdSense monetization (section
  6, including a future "Snipgif Pro" tier and affiliate links), `ads.txt`, the
  AdSense CMP, `PUBLIC_ADSENSE_CLIENT_ID`, and Cloudflare Pages hosting (chosen
  because Vercel Hobby forbids commercial use). `blueprint/build-plan.md` lists
  feature 20 (AdSense integration) as upcoming work and mentions AdSense in
  items 15 and 19. `blueprint/context/project-overview.md` repeats all of this.
- **Code:** `src/layouts/Layout.astro` loads the AdSense site code and a footer
  "Privacy and cookie settings" button (feature 19) when
  `PUBLIC_ADSENSE_CLIENT_ID` is set. Comments in `src/lib/gif-engine.ts` and
  `astro.config.mjs` cite AdSense and Cloudflare Pages. `astro.config.mjs`
  defaults the site URL to `https://snipgif.com`.
- **Copy:** `src/content/pages/about.md` ("supported by ads"), `terms.md` (an
  Advertising section and an ads rule), `privacy.md` (Cloudflare hosting,
  AdSense, the consent platform, consent as a legal basis for ads), and
  `cookies.md` (AdSense and consent-platform cookies, the settings link).
- **Standards:** `blueprint/context/coding-standards.md` lists `ads.txt` and
  explains the COOP/COEP rule by AdSense.
- **Hosting files:** `public/_headers` is Cloudflare-only. Vercel needs its own
  config, and the site's slash-less URLs (`build.format: 'file'`) only resolve
  on Vercel with clean URLs enabled.
- **Open source:** there is no `LICENSE`, and the README does not describe the
  project as open source or explain how to deploy it.

## The fix

Decisions made with the user on 2026-11-07:

- **Analytics:** keep GA4 and the feature 18 events and consent defaults
  unchanged. With no Google consent platform, EEA, UK, and Swiss visitors stay at
  `denied` (no analytics cookies, cookieless measurement only), so no banner is
  needed.
- **License:** MIT.
- **Monetization:** free and open source only. No ads, no paid tier, no
  affiliate links.
- **Domain:** the Vercel subdomain for now. The default site URL becomes
  `https://snipgif.vercel.app`, overridable with `PUBLIC_SITE_URL`.
- **Contact:** remove the contact page, the contact form (Formspree), the contact
  email, and every link to them. Questions and privacy requests go to the GitHub
  repository's issues instead. Added at the user's request before the review
  checkpoint.

Changes:

1. **Plans.** Rewrite the affected passages of `project-plan.md`: monetization
   becomes "free and open source, no ads, no paid tier"; drop `ads.txt`, the
   CMP, `PUBLIC_ADSENSE_CLIENT_ID`, and the AdSense reasons (keep the
   single-threaded core, now justified by avoiding COOP/COEP headers that break
   cross-origin loading of the CDN engine); hosting becomes Vercel (Hobby plan,
   non-commercial open-source project). In `build-plan.md`, delete item 20,
   remove the AdSense wording from item 15, and keep item 19 checked with a note
   that this fix removed its consent banner (no ads, so no consent platform) and
   kept the consent defaults for GA4. Do not renumber anything. Then regenerate
   `project-overview.md` by following the installed `overview` skill, which also
   refreshes its plan fingerprint. Remove the overview's feature 22 open question
   about Pro, since there is no paid tier.
2. **Code.** In `Layout.astro`, remove the AdSense ID check, the AdSense script,
   the settings button, and its handler; render the consent defaults only when
   the GA4 ID is valid (the feature 18 behavior), with values and regions
   unchanged. Update the AdSense and Cloudflare comments in `gif-engine.ts` and
   `astro.config.mjs`, and change the default site URL there.
3. **Copy.** Update `about.md`, `terms.md`, `privacy.md`, and `cookies.md`: no ads
   anywhere; hosting is Vercel (with its privacy policy link); Google Analytics 4
   is the only Google service; EEA, UK, and Swiss visitors get no analytics
   cookies and only cookieless measurement; remove the consent platform, the
   settings link, and ads-based legal bases, rights, and links (My Ad Center).
   Mention that the code is open source with a link to the GitHub repository.
   Set `updated` to the build date on the policy pages.
4. **Vercel and open source.** Add `vercel.json` with `cleanUrls: true`,
   `trailingSlash: false`, and the `/_astro/*` immutable cache header ported from
   `public/_headers`, then delete `public/_headers`. Add an MIT `LICENSE`
   (copyright 2026, holder as in the git author name `saidmounaim`, to confirm).
   Update `README.md`: open source and free, MIT license, environment variables
   (`PUBLIC_SITE_URL`, `PUBLIC_GA_MEASUREMENT_ID`, `PUBLIC_FORMSPREE_ID`), and
   deploying to Vercel (import the GitHub repo, framework Astro, build
   `npm run build`, output `dist`, set the env vars).

Must not break:

- GA4 loading, the consent defaults, and every `track()` event (feature 18).
- Slash-less URLs, canonicals, the sitemap, and robots.txt.
- `blueprint/history/` archives stay untouched: they record what was built.
- The iPhone guide's comparison ("other apps show full-screen ads") is about
  other apps, not Snipgif, and stays.

No new dependencies. The Writing standard applies (no em dashes, en dashes, or
ellipsis characters).

## Build steps

- [x] **1. Plans and overview.** Edit `project-plan.md` and `build-plan.md` as
  above, then regenerate `project-overview.md` through the `overview` skill.
  **Done when:** none of the three files mentions AdSense, `ads.txt`, the
  consent platform, Snipgif Pro, or Cloudflare; item 20 is gone, item 19 is
  checked with the removal note, no item is renumbered; the overview's
  source-hash matches the edited plans.
- [x] **2. Code and comments.** Edit `Layout.astro`, `gif-engine.ts`,
  `astro.config.mjs`, and the two `coding-standards.md` lines.
  **Done when:** `npm run build` passes; with
  `PUBLIC_GA_MEASUREMENT_ID=G-TEST123` every page has the consent defaults
  before the GA4 script and no `adsbygoogle` or settings button; with
  `PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456` alone, no page has any
  Google code; with no variables, canonicals use `https://snipgif.vercel.app`.
- [x] **3. Legal and About copy.** Edit the four content pages.
  **Done when:** `npm run build` passes and no built page mentions AdSense,
  advertising, Cloudflare, the consent platform, or "Privacy and cookie
  settings"; `/privacy` names Vercel and GA4; the policy pages show the new
  "Last updated" date.
- [x] **4. Vercel config, license, README.** Add `vercel.json` and `LICENSE`,
  delete `public/_headers`, update `README.md`.
  **Done when:** `vercel.json` is valid JSON with the three settings, `LICENSE`
  is the standard MIT text, `dist/_headers` no longer exists after a build, and
  the README covers license, env vars, and Vercel deploy.

- [x] **5. Remove the contact page and email.** Delete `src/pages/contact.astro`,
  `src/components/contact/ContactForm.tsx`, and `src/lib/site.ts`
  (`CONTACT_EMAIL`). Remove the footer "Contact" link from `Layout.astro` and the
  "Contact" section `TextPage.astro` appends to the About and legal pages,
  replacing it with a line pointing to the GitHub repository's issues. In
  `privacy.md`, remove the contact form and Formspree passages and their
  retention mention, and change "email Snipgif at the address below" to opening
  an issue on GitHub (without personal details in public) or contacting the
  named services directly. Remove `PUBLIC_FORMSPREE_ID` and Formspree from the
  README, `project-plan.md`, and the overview (then refresh its source-hash),
  and drop `/contact` from the overview's routes and item 15's page list there.
  Remove UI components or imports only the contact page used, if any.
  **Done when:** `npm run build` passes and emits no `contact.html`; the
  sitemap has no `/contact`; no built page contains `contact@`, `mailto:`,
  `formspree`, or a link to `/contact`; the About and legal pages end with the
  GitHub issues line; the overview source-hash matches the plans.

## Verify

- `npm run build` with the env combinations in step 2, and a repository-wide
  search (excluding `blueprint/history/`, skill folders, `node_modules`, and
  `dist`) for `adsense`, `adsbygoogle`, `ads.txt`, `cloudflare`, and
  `consent-settings` returns nothing.
- A search of `src/`, the README, and the plans for `formspree`, `CONTACT_EMAIL`,
  and `/contact` returns nothing.
- After the first Vercel deploy (not part of this fix): `/about`, `/blog`, and a
  guide page load without `.html` and without a redirect, `/sitemap.xml` and
  `/robots.txt` load, and a file under `/_astro/` returns the immutable
  `Cache-Control` header.

## Open questions

- **GitHub repository URL.** The pages and README will link to
  `https://github.com/saidMounaim/snipgif` (the current `origin` remote). Confirm
  that is the public repository.
- **License holder name.** Confirm the name for the MIT copyright line
  (default: `saidmounaim`).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9388,"specSha256":"5ec7786240f377b01228cfc3375e6e24f76ecf564871c362d407ad78661cc11f","branch":"refs/heads/fix/remove-adsense-and-prepare-an-open-source-vercel-release","head":"1e52deb64f70dcdfeb1d7f210963a73c5bd95587","baseRef":"refs/heads/master","baseCommit":"4a369c7c8c322f902839c87b643a86992d83942d","sourceTree":"da3d89ff14a1caf824d4492a55983376f5cc7e92","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 1e52deb64f70dcdfeb1d7f210963a73c5bd95587
**Base commit:** 4a369c7c8c322f902839c87b643a86992d83942d
**Base ref:** refs/heads/master
**Spec hash:** 5ec7786240f377b01228cfc3375e6e24f76ecf564871c362d407ad78661cc11f
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-07T20:11:06Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-07T20:14:30Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base HEAD refs/heads/master`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --short`: pass (HEAD, merge base, and spec hash match the request; only review.md differed)
- `git diff 4a369c7..1e52deb` (full delta) and `git diff --stat 4a369c7..1e52deb -- blueprint/history`: pass (history untouched)
- `git grep` over the target tree (excluding history, skill folders, spec, review) for adsense, adsbygoogle, ads.txt, cloudflare, consent-settings, consent platform, Snipgif Pro, formspree, CONTACT_EMAIL, /contact, contact@, mailto:, snipgif.com, My Ad Center, googlefc: pass (only build-plan item 19's fix name and OFL font license text)
- Node script recomputing the overview source-hash (project-plan bytes, zero byte, checkbox-normalized build-plan): pass (d9e98276... matches the marker)
- `PUBLIC_SITE_URL= PUBLIC_GA_MEASUREMENT_ID= PUBLIC_ADSENSE_CLIENT_ID= PUBLIC_FORMSPREE_ID= npm run build`: pass (13 pages, no Google tag in any HTML, canonicals, sitemap, and robots.txt use https://snipgif.vercel.app, no contact.html or _headers)
- `PUBLIC_SITE_URL= PUBLIC_GA_MEASUREMENT_ID=G-TEST123 PUBLIC_ADSENSE_CLIENT_ID= PUBLIC_FORMSPREE_ID= npm run build` plus per-page script: pass (13 of 13 pages have consent defaults before the gtag script, 32 regions, no AdSense code)
- `PUBLIC_SITE_URL= PUBLIC_GA_MEASUREMENT_ID=G-TEST123 PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456 PUBLIC_FORMSPREE_ID= npm run build` plus per-page script: pass (same as GA4 only; AdSense ID has no effect)
- `PUBLIC_SITE_URL= PUBLIC_GA_MEASUREMENT_ID= PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456 PUBLIC_FORMSPREE_ID= npm run build`: pass (no Google code on any page)
- `PUBLIC_SITE_URL= npm run build`: pass (13 pages, default canonical https://snipgif.vercel.app)
- `node -e` load of vercel.json: pass (cleanUrls true, trailingSlash false, /_astro/(.*) immutable Cache-Control)
- Typecheck: unavailable (no command configured)
- Tests: unavailable (no command configured)

### Evidence

- Consent block in src/layouts/Layout.astro is byte-identical to master apart from the comment; it now renders only when gaId is valid; the AdSense ID check, script, settings button, and handler are removed
- astro.config.mjs defaults site to https://snipgif.vercel.app; public/_headers deleted; vercel.json ported the cache rule; LICENSE matches the standard MIT text (Copyright (c) 2026 saidmounaim)
- build-plan.md keeps item numbers (item 20 deleted, 19 checked with the removal note, 21 and 22 unchanged)
- Built about, privacy, terms, and cookies pages end with the GitHub issues line; policy pages show November 7, 2026; privacy names Vercel and GA4; no built page contains contact@, mailto:, formspree, /contact, AdSense, advertising, Cloudflare, or "Privacy and cookie settings"
- Contact removal left no orphans: src/components/contact/ and src/lib/site.ts are gone, no CONTACT_EMAIL import remains, and Input and Label are still used by src/components/converter/TextPanel.tsx
- Policy copy matches code: GA4 is the only third-party cookie source, analytics_storage is denied for the 32 EEA, UK, and CH regions and granted elsewhere, no ads, no forms

### Findings

- F-01 [P3] open: build-plan item 15 still lists Contact (blueprint/build-plan.md:36)

### Remaining risk

- No typecheck command is configured, and `astro build` does not type-check; type errors in the edited .astro and .ts files are unverified
- No test command is configured, so no automated tests cover the changed behavior
- Live Vercel behavior (clean URLs without redirect, trailingSlash handling, the /_astro immutable header, sitemap and robots.txt serving) cannot be tested locally and needs the post-deploy checks in the spec
- The GitHub repository URL and license holder name remain open questions in the spec for the user to confirm
- The developer's local, git-ignored .env still sets PUBLIC_ADSENSE_CLIENT_ID and PUBLIC_FORMSPREE_ID with stale comments; they now have no effect, but the file is outside the reviewed delta

## Try it now

1. Stop any running dev server, clear `PUBLIC_SITE_URL` in `.env` (or set it to your Vercel URL), then run `npm run dev` and open http://localhost:4321.
2. Scroll to the footer. Expected: Guides, About, Privacy, Terms, and Cookies, with no Contact link and no "Privacy and cookie settings" button.
3. Open /about, /privacy, /terms, and /cookies. Expected: no mention of ads, AdSense, Cloudflare, Formspree, or an email address; About says "Free and open source"; Privacy names Vercel as the host; each page ends with a "Questions" line linking to the GitHub issues.
4. Open http://localhost:4321/contact. Expected: a 404, because the contact page no longer exists.
5. View the page source. Expected: no `adsbygoogle` script. With `PUBLIC_GA_MEASUREMENT_ID` set, the consent defaults still come before the GA4 script.
6. Run `npm run build` and open `dist/sitemap.xml`. Expected: no `/contact` entry, and URLs on your `PUBLIC_SITE_URL` (or `https://snipgif.vercel.app` when unset).
