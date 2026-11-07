# Feature: README and Vercel deployment

**From build-plan:** feature 23
**Build attempt:** 1
**Branch:** feature/readme-and-vercel-deployment
**Status:** verified

## Goal

Put Snipgif live on Vercel from the public GitHub repository and give the
repository a README that explains what Snipgif is, shows it, and lets anyone run
or contribute to it.

## In scope

- A deployment checklist the site owner completes (the actions need their GitHub
  and Vercel accounts), then a read-only verification of the live site.
- Screenshots of the live site, committed to the repository for the README.
- A polished `README.md`: live link, what it does, screenshots, features,
  privacy, tech stack, local setup, environment variables, deploy, project
  layout, contributing, license.
- Keeping the default site URL consistent with the real Vercel address.

## Out of scope

- Running any deploy, Vercel, or GitHub command from this session: there is no
  Vercel or GitHub CLI installed, and publishing is the owner's decision.
- A custom domain, DNS, or a `www` redirect.
- Submitting the sitemap to Google Search Console or Bing (owner, after launch).
- CI, issue templates, a code of conduct, or a CONTRIBUTING file (the README's
  short contributing section covers it for now).
- App code or copy changes beyond the site URL default and README links.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`: no commits per step.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Owner deploys the site (pause for the owner).**
  Confirm `npm run build` passes, then stop and give the owner this checklist,
  and wait for the live URL:
  1. Make `github.com/saidMounaim/snipgif` public and turn on Issues (the site's
     "Questions" links point there). It currently returns 404 to anonymous
     requests.
  2. In Vercel, **Add New > Project**, import the repository, keep the Astro
     preset, build `npm run build`, output `dist`. Prefer the project name
     `snipgif` so the address is `https://snipgif.vercel.app`.
  3. Set `PUBLIC_SITE_URL` to the production address (no trailing slash) and,
     if wanted, `PUBLIC_GA_MEASUREMENT_ID`. Then deploy (or redeploy so the
     variables apply).
  4. Reply with the production URL.
  **Done when:** the owner has replied with the production URL and a request to
  it returns HTTP 200.

- [x] **2. Verify the live site (read-only).**
  With `curl` against the production URL, check: `/`, `/about`, `/blog`, a guide,
  `/gif-compressor`, `/privacy` return 200 directly (no redirect, no `.html` in
  the URL); `/contact` returns 404; a file under `/_astro/` sends
  `Cache-Control: public, max-age=31536000, immutable`; `/sw.js`,
  `/manifest.webmanifest`, `/robots.txt`, and `/sitemap.xml` return 200; the
  canonical URL on `/about` and every `<loc>` in the sitemap use the production
  origin; the GitHub repository URL returns 200 anonymously. Record each result.
  If anything fails, stop and report it with the exact URL and response instead
  of changing code here (a failure becomes a `/fix` or a step added with the
  owner's approval).
  **Done when:** every check passes and the results are recorded in the review
  packet.

- [x] **3. Site URL default.**
  If the production origin is not `https://snipgif.vercel.app`, update the
  fallback in `astro.config.mjs` and every mention in `README.md`,
  `blueprint/project-plan.md`, and `blueprint/context/project-overview.md`
  (refreshing its source-hash) to the real address. If it matches, change
  nothing and say so.
  **Done when:** `npm run build` with `PUBLIC_SITE_URL=` emits canonicals on the
  production origin, and no file still names a different default.

- [x] **4. Screenshots.**
  Capture with headless Google Chrome (already used for the icons; no new
  dependency) from the live site at 1280x800: the home page in light theme, the
  home page in dark theme, and the GIF compressor page. Save them as
  `docs/screenshots/home-light.png`, `home-dark.png`, `compressor.png`, outside
  `public/` so they are not deployed or precached. Keep each under about 400 KB.
  **Done when:** the three PNGs exist at 1280x800, show the real pages (inspect
  them), and `dist/` contains no `docs/` files after a build.

- [x] **5. Polish the README.**
  Rewrite `README.md` with: the name and one-line pitch, a **Live** link to the
  production URL, the three screenshots, what it does (video to GIF with trim,
  crop, presets, speed, reverse, boomerang, captions; GIF compressor;
  installable and offline after first use), privacy (files never leave the
  device; GA4 only, no cookies for EEA, UK, and Swiss visitors), tech stack,
  requirements (Node 22.23.4 or newer, npm), commands, environment variables,
  deploy to Vercel, a short project layout (`src/pages`, `src/components`,
  `src/lib`, `src/content`, `public/sw.js`, `blueprint/`), contributing (issues
  and pull requests welcome, run `npm run build` first, questions via GitHub
  issues), and the MIT license. Every claim must match the shipped code.
  **Done when:** every relative link and image in the README resolves to a file
  in the repository, the live and repository links return 200, and the text has
  no em dashes, en dashes, or ellipsis characters.

## Files / areas

- `README.md` - rewritten.
- `docs/screenshots/home-light.png`, `home-dark.png`, `compressor.png` - new.
- `astro.config.mjs`, `blueprint/project-plan.md`,
  `blueprint/context/project-overview.md` - only if the production URL differs
  (step 3).

## Data / contracts

- **Production environment (set by the owner in Vercel):** `PUBLIC_SITE_URL`
  (required, production origin, no trailing slash) and
  `PUBLIC_GA_MEASUREMENT_ID` (optional, `G-` format).
- **Hosting contract already in the repository:** `vercel.json` (`cleanUrls`,
  `trailingSlash: false`, immutable `/_astro/` cache), `build.format: 'file'`,
  slash-less canonicals, `public/sw.js` served from the root.

## Testing

No test or Verify command is configured. Evidence is `npm run build`, the live
`curl` checks in step 2, the screenshot files, and link checks for the README.
The live checks are real network requests to the owner's deployment and are
read-only. Installing the PWA and offline use on the live site are not part of
this feature's evidence.

## Notes for the AI

- Never run a deploy, `git push`, or any Vercel or GitHub action from this
  feature; step 1 is the owner's, and pushing remains a `/complete` approval.
  After this feature merges and is pushed, Vercel redeploys `master`
  automatically.
- Do not start a dev or preview server; screenshots come from the live site.
- Do not put screenshots in `public/`.
- Wait at step 1 rather than guessing the URL.
- Follow the Writing standard (no em dashes, en dashes, or ellipsis characters).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6892,"specSha256":"c090a90dc6158f14d0acc082969b629ca92e4ee93d8f7956011814ba22eecb56","branch":"refs/heads/feature/readme-and-vercel-deployment","head":"0b271b530db5cc9084029ef1a06a867d8d94e494","baseRef":"refs/heads/master","baseCommit":"0b271b530db5cc9084029ef1a06a867d8d94e494","sourceTree":"2895cae850c74098a6944177db4c4be8977817ae","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Open https://snipgif.vercel.app. Expected: the converter home page, matching the README screenshot.
2. Open https://snipgif.vercel.app/about.html. Expected: it redirects to `/about`.
3. Open https://github.com/saidMounaim/snipgif after this is pushed. Expected: the new README with the live link and three screenshots.
