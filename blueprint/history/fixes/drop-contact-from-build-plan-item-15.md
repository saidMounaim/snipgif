# Fix: Drop Contact from build-plan item 15

**Type:** Fix
**Status:** verified
**Branch:** fix/drop-contact-from-build-plan-item-15
**Fixes:** F-01

## The problem

The fix `remove-adsense-and-prepare-an-open-source-vercel-release` removed the
contact page, but `blueprint/build-plan.md` item 15 still reads "About, Contact,
Privacy Policy, Terms of Use, and Cookie Policy." The overview's item 15 already
lists only About, Privacy Policy, Terms of Use, and Cookie Policy, so the plan
and the overview disagree about what the trust pages include (finding F-01, P3).

## The fix

In `blueprint/build-plan.md` item 15, keep it checked and keep its number, list
only the pages that exist now, and add a short note in the style of item 19 that
the later fix removed the contact page:

```markdown
- [x] 15. **Trust and legal pages** - About, Privacy Policy, Terms of Use, and Cookie Policy. The Contact page was removed by fix `remove-adsense-and-prepare-an-open-source-vercel-release` (2026-11-07); questions go to GitHub issues.
```

Then refresh `blueprint/context/project-overview.md`'s `blueprint:source-hash`
using the overview skill's checkbox-normalized hash contract. The overview body
already matches, so only the hash value changes.

Must not break: no other build-plan line changes, no item is renumbered, and
`blueprint/history/` stays untouched. No product code changes. The Writing
standard applies (no em dashes, en dashes, or ellipsis characters).

## Build steps

- [x] **1. Update item 15 and the overview hash.**
  **Done when:** item 15 no longer lists Contact and carries the removal note;
  `git diff blueprint/build-plan.md` shows only that one line changed; the
  overview diff is only the source-hash value, and that value matches the
  recomputed hash of the two plans; `npm run build` still passes.

## Verify

- `git diff master -- blueprint/` shows exactly the item 15 line, the overview
  hash, and the workflow files (`current-feature.md`, `findings.md`).
- The overview and the build plan agree on the item 15 page list.
- `/audit` re-reviews F-01 before it closes (the repair only marks it `fixed`).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2131,"specSha256":"7e085af13d182e43cd07ef3a209fd6f1b91dd3d3b3677b5be41b0c9ba8e44dd4","branch":"refs/heads/fix/drop-contact-from-build-plan-item-15","head":"8f365d7e3db1263b4680e76705b85e2ee92b0e0d","baseRef":"refs/heads/master","baseCommit":"8f365d7e3db1263b4680e76705b85e2ee92b0e0d","sourceTree":"58b023225e19eec1c9fe2d817e9d55474a0c6c49","landing":"local-merge","absentOptional":[]} -->
