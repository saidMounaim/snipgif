---
title: How to Make a GIF for a GitHub README (Screen Recording to GIF) | Snipgif
description: Record your screen, turn the clip into a small, sharp GIF in your browser, and embed it in a GitHub README, issue, or pull request with one line of Markdown.
heading: How to make a GIF for a GitHub README
published: 2026-10-30
tool: /
---

A short animated demo at the top of a README shows what a project does faster than any paragraph. GIFs are the usual choice because they play automatically everywhere Markdown is rendered, with no player and no click. This guide covers the whole path: recording the screen, converting the recording into a GIF that stays readable and small, and embedding it.

## 1. Record your screen

Use the recorder that already comes with your system:

- **macOS:** press `Shift` + `Command` + `5`, choose **Record Selected Portion**, and drag a frame around the window you want. The recording is saved as a MOV file.
- **Windows 11:** open the **Snipping Tool**, switch to video mode, and select an area. The recording is saved as an MP4 file.
- **Linux:** most desktops include a screen recorder (GNOME has one in the screenshot tool), and OBS Studio works everywhere.

Record only the area that matters. A small, focused region gives a sharper GIF at a smaller size than a full-screen recording scaled down. Keep the demo tight: a few seconds per action, no waiting around.

## 2. Convert the recording to a GIF

Snipgif converts in your browser, so a recording of unreleased work or internal tools never leaves your machine.

1. Open the converter and drop your MOV or MP4 file on the drop zone.
2. Trim it with the **Start** and **End** handles. Cut the first second where you reach for the mouse and anything after the last action. A GIF can be up to 30 seconds long.
3. Set the output for screen content (see the next section).
4. Crop away menu bars or empty space if the recording area was larger than it needed to be.
5. Click **Convert to GIF**, check the preview and the file size, then click **Download GIF**.

## Settings that work for screen recordings

Screen recordings are different from camera video. They have sharp text and flat colors, and most of the screen stays still. That changes what matters:

- **Width matters most for text.** If the GIF is narrower than the recording, text gets blurry. Use a width close to the recorded area, up to the 800 px maximum. The **High quality** preset uses 720 px.
- **Frame rate matters less.** Cursor movements and typing look fine at 10 to 12 frames per second, and fewer frames mean a much smaller file. Lower the FPS slider from the High quality preset rather than lowering the width.
- **Quality affects colors.** High quality keeps the full 256-color palette, which helps with syntax highlighting and gradients. Plain terminal output usually looks fine at medium.
- **Speed can tighten a slow demo.** Playing the clip at 1.5x or 2x shortens the GIF and makes typing feel snappier without re-recording.

If the GIF is still heavier than you want, run it through the [GIF compressor](/gif-compressor) and try fewer colors first. Flat screen content often survives 64 colors with no visible change.

## 3. Embed the GIF

Commit the GIF to your repository, for example in a `docs` or `assets` folder, and reference it with a relative path:

```markdown
![Demo of the CLI creating a new project](docs/demo.gif)
```

The text in the brackets is the alt text. Describe what the demo shows, since screen readers announce it and it appears if the image fails to load.

For issues, pull requests, and comments on GitHub, you can also drag the GIF file straight into the comment box. GitHub uploads it and inserts the Markdown for you.

## Keep the repository light

Every time you replace a committed GIF, the old version stays in the Git history and every clone downloads it. A few habits keep that under control:

- Get the GIF right before committing it, rather than committing several drafts.
- Keep README demos short and focused on one workflow each.
- Prefer a small GIF per feature over one long tour.

A good README GIF is short, sharp, and loads quickly. Record a tight area, keep the width, drop the frame rate, and you will usually end up with something that looks crisp and weighs far less than the raw recording.
