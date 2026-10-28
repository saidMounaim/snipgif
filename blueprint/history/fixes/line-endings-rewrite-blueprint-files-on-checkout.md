# Fix: Line endings rewrite Blueprint files on checkout

**Type:** Fix
**Status:** verified
**Branch:** fix/line-endings-rewrite-blueprint-files-on-checkout

## The problem

Git for Windows sets `core.autocrlf=true` in its system config
(`C:/Program Files/Git/etc/gitconfig`), and the repo has no `.gitattributes`.
The index stores every text file with LF, but each checkout, branch switch, or
squash merge rewrites touched working files with CRLF. After the Feature 2
merge, 12 tracked files were CRLF on disk, including `blueprint/build-plan.md`,
`blueprint/context/project-overview.md`, both feature archives, and all source
files under `src/`.

Effects:

- The overview fingerprint (`blueprint:source-hash`) is computed from exact
  plan bytes, so CRLF plan files produce a different hash (`ac5f86...`) than the
  real, unchanged plans (`9b1f68...`). `/status` and `/complete` can report plan
  drift that does not exist.
- Completion archives record exact spec bytes; inconsistent working-tree line
  endings make that byte proof depend on which machine checked the file out.

## The fix

Pin line endings in the repository instead of relying on each machine's Git
config:

- Add a root `.gitattributes` with `* text=auto eol=lf`. Git keeps detecting
  binaries (favicons) automatically, and every text file is checked out with LF
  on all platforms, regardless of `core.autocrlf`.
- The index is already LF everywhere, so renormalizing should change no stored
  content. Confirm with `git add --renormalize .` that only `.gitattributes`
  is staged.
- Rewrite the 12 CRLF working files to LF so the working tree matches the
  index. This changes no tracked content.

Must not break: binary files (`public/favicon.ico`), the recorded fingerprint
`9b1f68...`, existing archives (their stored bytes are already LF), or the
build. No other config, tooling, or dependency changes. Editors on Windows
(VS Code) handle LF files without changes.

## Build steps

- [x] **1. Pin LF line endings.** Add `.gitattributes` with `* text=auto eol=lf`,
  run `git add --renormalize .`, and convert the CRLF working files to LF.
  *Done when:* `git ls-files --eol` shows no `w/crlf` entries and no text file
  with a non-LF index entry; `git diff` shows no content change other than the
  new `.gitattributes`; `public/favicon.ico` is still detected as binary
  (`-text`); `npm run build` passes.
- [x] **2. Prove checkouts stay LF.** Switch to a temporary branch and back (or
  check out a file again) and confirm the touched files stay LF, then recompute
  the overview fingerprint with the `/overview` contract.
  *Done when:* after the round trip, `git ls-files --eol` still shows no
  `w/crlf`, and the recomputed fingerprint equals the recorded
  `9b1f684613e5f10d58281c7bacead4475a52727c63f0fd50fddc213e566a611d`. The
  temporary branch is deleted.

## Verify

- `git ls-files --eol | grep crlf` prints nothing, before and after a branch
  round trip.
- The overview fingerprint recomputed from the working tree equals the value
  recorded in `blueprint/context/project-overview.md`.
- `npm run build` passes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3106,"specSha256":"0a3a32e1d8d31195e238afa28ad57cc38042634c1aae3d5735e81c299c4cca84","branch":"refs/heads/fix/line-endings-rewrite-blueprint-files-on-checkout","head":"69d2f750403ff989781311d7d03d19a763e2a223","baseRef":"refs/heads/master","baseCommit":"69d2f750403ff989781311d7d03d19a763e2a223","sourceTree":"3f67fa0686cd28ba32ce6e3d328c439e4a89fc30","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

```text
git ls-files --eol | grep crlf
```

Expected:

No output. Every tracked text file shows `w/lf` and `attr/text=auto eol=lf`,
and `public/favicon.ico` shows `-text`.

This proves:

Git now checks out text files with LF line endings in this repository,
regardless of the system-wide `core.autocrlf=true`.
