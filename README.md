# Snipgif

A fast, free, private video-to-GIF converter that runs entirely in the browser.

Built with [Astro](https://astro.build), React, Tailwind CSS, and TypeScript.

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start the dev server at `localhost:4321`     |
| `npm run build`   | Build the production site to `./dist/`       |
| `npm run preview` | Preview the production build locally         |

## Environment variables

| Variable              | Purpose                                                                                       |
| :-------------------- | :-------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`     | Canonical site origin (defaults to `https://snipgif.com`)                                     |
| `PUBLIC_FORMSPREE_ID` | Formspree form ID for the contact form. When unset or invalid, `/contact` shows only the email |
