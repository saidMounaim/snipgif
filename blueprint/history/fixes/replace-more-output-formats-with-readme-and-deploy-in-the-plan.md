# Fix: Replace more output formats with README and deploy in the plan

**Type:** Fix
**Status:** verified
**Branch:** fix/replace-more-output-formats-with-readme-and-deploy-in-the-plan

## The problem

Feature 22, **More output formats** (export to animated WebP, MP4, and APNG), is
no longer wanted. It is the only unchecked item in `blueprint/build-plan.md`, so
`/feature`, `/continuous`, and `/status` would pick it up as upcoming work. The
work the user wants next is a polished README for the open-source repository and
the Vercel deployment, which has no build-plan item.

The overview repeats the old plan: `blueprint/context/project-overview.md` lists
feature 22 in the feature list, names it in the data-model note ("features 7 to
10, 18, and 22 build on them"), and keeps two open questions that are now stale:
"Features 21 and 22 are not in the project plan MVP" and "PWA offline vs
on-demand CDN core", which feature 21 settled by caching the engine on first use.
`blueprint/project-plan.md` does not mention feature 22.

## The fix

1. **Build plan.** Delete the feature 22 line. Append one new unchecked item
   after item 21, using the next unused number so no completed or removed number
   is reused (17, 20, and 22 stay retired):

   ```markdown
   - [ ] 23. **README and Vercel deployment** - Polish the README for the open-source GitHub repository (what Snipgif is, features, screenshots, local setup, contributing) and deploy the site to Vercel with its production environment variables.
   ```

   No other line changes and nothing is renumbered.
2. **Overview.** Update `project-overview.md` to match the edited plans: replace
   feature 22 in the feature list with feature 23 (one-line purpose, as above);
   drop "and 22" from the data-model note; remove the two stale open questions;
   refresh the `blueprint:source-hash` with the overview skill's
   checkbox-normalized contract. Leave the other open questions as they are.
3. **Project plan.** No change needed: it never mentioned feature 22, and its
   Deployment section already names Vercel and the README-based open-source
   release.

This fix only edits planning documents. It does not change the README, deploy
anything, or touch app code; feature 23 does that later through `/feature 23`,
and the deploy step will need its own explicit approval at that time.
`blueprint/history/` stays untouched. The Writing standard applies (no em
dashes, en dashes, or ellipsis characters).

## Build steps

- [x] **1. Edit the build plan and the overview.**
  **Done when:** `build-plan.md` has no item 22, ends with the unchecked item 23
  exactly as above, and no other line changed; the overview lists feature 23,
  has no mention of feature 22, WebP, APNG, or the two removed open questions,
  and its source-hash matches the recomputed hash of the two plans;
  `npm run build` still passes.

## Verify

- `git diff master -- blueprint/` shows only the build-plan swap, the overview
  edits and hash, and this spec.
- `/status` or `/feature` now points at feature 23, not 22.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3054,"specSha256":"ecb6042bf8c72802840ace3038c5b7e8d182671e888448477dbe0fbcda034fbd","branch":"refs/heads/fix/replace-more-output-formats-with-readme-and-deploy-in-the-plan","head":"c90940a6ce6a3c963b49ed2e08536d09ce91f306","baseRef":"refs/heads/master","baseCommit":"c90940a6ce6a3c963b49ed2e08536d09ce91f306","sourceTree":"7c992ed8d6ee7ca63266088b83115538e6bd732d","landing":"local-merge","absentOptional":[]} -->
