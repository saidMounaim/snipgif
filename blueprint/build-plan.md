# Build Plan

List the features that make up your project, high level and in rough build order.
Keep each item to one line; the details come later in `/feature`.

Plain bullets are fine. When both planning docs are ready, run `/overview`.
It adds tracking numbers and checkboxes to your feature list before generating
the project overview.

Run `/feature` to spec the next unchecked item, or `/feature 2` to pick one.
Keep completed items checked and append new features as the project grows.
Do not renumber completed features; their archived specs refer to those IDs.

Scaffolding the app and prototyping its look are pre-build steps, not features.
Start with your first real slice of functionality.

## Your features

- [x] 1. **Video upload** - Drag-and-drop or file picker for MP4, MOV, WebM, and AVI with size and format validation.
- [x] 2. **In-browser conversion engine** - Convert video to GIF on the user's device with ffmpeg.wasm, so files are never uploaded to a server (fast, private, and nearly free to host).
- [x] 3. **Trim and clip selection** - Timeline with video preview where users pick start and end points for the GIF.
- [x] 4. **Output settings and presets** - FPS, width, and quality controls, with one-click presets like "Small for chat", "Balanced", and "High quality".
- [x] 5. **GIF preview and download** - Show the finished GIF with its file size, then download, copy to clipboard, or share via the Web Share API.
- [x] 6. **Progress and error handling** - Progress bar during conversion and friendly messages for unsupported files or low-memory devices.
- [x] 7. **Crop and resize** - Crop the frame with an aspect-ratio picker (1:1, 16:9, 9:16) for social media formats.
- [x] 8. **Speed, reverse, and boomerang** - Change playback speed, reverse the clip, or create a back-and-forth loop.
- [x] 9. **Text and caption overlay** - Add meme-style text with font, color, and position options.
- [x] 10. **GIF compressor** - Reduce the size of existing GIFs with color reduction and frame skipping, as a standalone tool.
- [x] 11. **Modern responsive UI** - Mobile-first layout with dark and light mode, a clean one-page workflow, and accessible controls.
  - [x] 11a. **Theme and site shell** - Color tokens, dark/light/system theme toggle, site header with navigation, and the Inter app font.
  - [x] 11b. **Flow and mobile polish** - Step indicator for the converter flow, mobile layout pass, and an accessibility and contrast pass on both tools.
  - [x] 11c. **Below the tool** - How it works, feature highlights, and an FAQ section on the home page.
- [x] 12. **Technical SEO foundation** - Meta tags, Open Graph and Twitter cards, sitemap.xml, robots.txt, canonical URLs, and JSON-LD structured data.
- [x] 13. **SEO tool landing pages** - Dedicated pages for each search intent (MP4 to GIF, MOV to GIF, WebM to GIF, GIF Compressor) with unique text and FAQ schema.
- [x] 14. **Performance optimization** - Lazy-load the converter, optimize images and fonts, and keep Core Web Vitals in the green for better Google rankings.
- [x] 15. **Trust and legal pages** - About, Privacy Policy, Terms of Use, and Cookie Policy. The Contact page was removed by fix `remove-adsense-and-prepare-an-open-source-vercel-release` (2026-11-07); questions go to GitHub issues.
- [x] 16. **Blog and guides section** - How-to articles like "How to make a GIF from a video on iPhone" to attract long-tail search traffic.
- [x] 18. **Analytics** - Track visits, conversions completed, and popular settings with GA4 or a privacy-friendly alternative.
- [x] 19. **Cookie consent banner** - Consent banner for EU and UK visitors. Removed by fix `remove-adsense-and-prepare-an-open-source-vercel-release` (2026-11-07): with no ads, no banner is needed; the Consent Mode defaults stay for GA4.
- [ ] 21. **Installable PWA** - Let users install Snipgif on their phone or desktop and use it offline.
- [ ] 22. **More output formats** - Export to animated WebP, MP4 (GIF to video), and APNG for higher quality at smaller file sizes.
