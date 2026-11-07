# Snipgif

A fast, free, private video-to-GIF converter that runs entirely in the browser.
Videos never leave your device: there is no upload, no watermark, and no sign-up.
Snipgif also includes a standalone GIF compressor and how-to guides.

Snipgif is free and open source under the [MIT License](LICENSE). It has no ads
and no paid tier.

Built with [Astro](https://astro.build), React, Tailwind CSS, TypeScript, and
[ffmpeg.wasm](https://ffmpegwasm.netlify.app/) (single-threaded core, loaded on
demand from jsDelivr).

## Requirements

- Node.js 22.23.4 or newer
- npm

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start the dev server at `localhost:4321`     |
| `npm run build`   | Build the production site to `./dist/`       |
| `npm run preview` | Preview the production build locally         |

## Environment variables

All variables are optional and public: they end up in the built HTML, so never
put a secret in them. Set them in a local `.env` file (git-ignored) or in your
host's project settings. A value in the wrong format is treated as unset.

| Variable                   | Purpose                                                                                                 |
| :------------------------- | :------------------------------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`          | Canonical site origin for canonical URLs, the sitemap, and social cards (defaults to `https://snipgif.vercel.app`) |
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID (`G-...`). When unset or invalid, no analytics code loads              |

With a GA4 ID set, visitors in the EEA, the UK, and Switzerland get no analytics
cookies (Google Consent Mode stays denied, cookieless measurement only), so no
consent banner is needed.

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New > Project** and import the repository.
3. Keep the detected framework preset **Astro**, the build command
   `npm run build`, and the output directory `dist`.
4. Add the environment variables above under **Settings > Environment
   Variables**, at least `PUBLIC_SITE_URL` with your Vercel or custom domain.
5. Deploy.

`vercel.json` turns on clean URLs, so `/about` serves `about.html` without a
redirect, and caches the hashed files in `/_astro/` for a year.

## Contributing

Issues and pull requests are welcome. Before opening a pull request, run
`npm run build` and check that it passes.

## License

[MIT](LICENSE)
