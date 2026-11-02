# Fix: Remove multilingual support from the plan

**Type:** Fix
**Status:** verified
**Branch:** `fix/remove-multilingual-support-from-the-plan`

## The problem

Feature 17, **Multilingual support** (EN, FR, AR with RTL, ES plus hreflang),
is no longer wanted. It is still listed as an unchecked item in
`blueprint/build-plan.md`, so `/feature`, `/continuous`, and `/status` would
pick it up as upcoming work.

The same plan is echoed elsewhere:

- `blueprint/project-plan.md` - target languages (section 2), `language`
  preference and per-language copy (section 4), "built-in i18n routing" as a
  reason for Astro (section 5), and "multilingual pages" in the traffic
  strategy (section 6).
- `blueprint/context/project-overview.md` - generated from the two plans; it
  repeats feature 17, the `language` preference, `lang` blog frontmatter,
  per-language copy, RTL layout, locale route prefixes, and the
  "Language preference" open question.

The shipped code is already English-only (`<html lang="en">`,
`og:locale en_US`) and has no i18n routing, so no source code changes.

## The fix

- Delete the feature 17 line from `blueprint/build-plan.md`.
- **Do not renumber** features 18 to 22. The overview and future specs refer to
  them by ID; a gap at 17 is harmless and avoids churn.
- Remove the multilingual mentions from `blueprint/project-plan.md` so the
  user-owned plans agree (state English as the only language).
- Bring `project-overview.md` in line with the plans (run `/overview`, or apply
  the same removals directly), dropping the "Language preference" open question.
- Must not touch completed features 1 to 15, their archives under
  `blueprint/history/`, or any file in `src/`.

## Build steps

- [x] 1. **Drop multilingual from the plans and overview** - edit the three planning
   files as above.
   *Done when:* `grep -rniE "multilingual|hreflang|RTL|french|arabic|spanish|i18n" blueprint/build-plan.md blueprint/project-plan.md blueprint/context/project-overview.md`
   returns nothing, and features 18 to 22 keep their numbers.

## Verify

- `blueprint/build-plan.md` lists 16 then 18; no item 17.
- `/status` suggests feature 16 next and never mentions multilingual support.
- `npm run build` still succeeds (sanity only; no code changed).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2271,"specSha256":"f16dabc82406c5727da76f6e13be84c784090279f2a3b1e859c945a8701f9663","branch":"refs/heads/fix/remove-multilingual-support-from-the-plan","head":"410e857bcafbb967016bf87989d374adc52fba17","baseRef":"refs/heads/master","baseCommit":"410e857bcafbb967016bf87989d374adc52fba17","sourceTree":"4917346f6d341656d7e85eae5258fab48f9f37a5","landing":"local-merge","absentOptional":[]} -->
