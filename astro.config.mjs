// @ts-check
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

const PRECACHE_PLACEHOLDER = "self.__PRECACHE__ = { version: 'dev', urls: [] };";

// Writes every built file into dist/sw.js so the service worker can precache the whole site.
// HTML files are listed by the clean URL Vercel serves (`about.html` -> `/about`).
/** @returns {import('astro').AstroIntegration} */
function pwaPrecache() {
  return {
    name: 'pwa-precache',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        const files = (await readdir(root, { recursive: true, withFileTypes: true }))
          .filter((entry) => entry.isFile())
          .map((entry) => relative(root, `${entry.parentPath}${sep}${entry.name}`).split(sep).join('/'))
          .filter((file) => file !== 'sw.js')
          .sort();
        const hash = createHash('sha256');
        const urls = [];
        for (const file of files) {
          hash.update(file).update(await readFile(`${root}${sep}${file}`));
          urls.push(file.endsWith('.html') ? `/${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}` : `/${file}`);
        }
        const swPath = `${root}${sep}sw.js`;
        const sw = await readFile(swPath, 'utf8');
        if (!sw.includes(PRECACHE_PLACEHOLDER)) throw new Error('pwa-precache: placeholder missing from dist/sw.js');
        const precache = { version: hash.digest('hex').slice(0, 12), urls };
        await writeFile(swPath, sw.replace(PRECACHE_PLACEHOLDER, `self.__PRECACHE__ = ${JSON.stringify(precache)};`));
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: (PUBLIC_SITE_URL || 'https://snipgif.vercel.app').replace(/\/+$/, ''),
  // Slash-less URLs match the nav links; `file` output plus `cleanUrls` in vercel.json serves them without a redirect.
  trailingSlash: 'never',
  build: { format: 'file' },

  integrations: [react(), pwaPrecache()],

  vite: {
    plugins: [tailwindcss()],
    // Pre-bundling breaks the worker that @ffmpeg/ffmpeg starts from its own module URL.
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    }
  }
});
