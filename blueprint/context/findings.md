# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-03 [P3] open - Cookie Policy says the engine is stored on first conversion, but it is stored on file selection

**File:** src/content/pages/cookies.md:22
**Found:** 2026-11-07 by /audit independent (scope: current; lens: quality)
**Why it matters:** The new Cookie Policy text says the roughly 30 MB converter engine "is added the first time you convert a video or compress a GIF". The Converter (src/components/converter/Converter.tsx:243) and Compressor (src/components/compressor/Compressor.tsx:158) start `loadGifEngine()` as soon as a file is selected, so the service worker stores the engine before any conversion, even when the visitor never clicks Convert. The disclosure about what is stored on the device is slightly inaccurate. The Privacy Policy wording ("once used the converter engine") is fine.
**Suggested fix:** Reword to "the first time you choose a video or GIF in one of the tools" (or similar). No current requirement would be lost.
**Resolution:**
