// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  site: (PUBLIC_SITE_URL || 'https://snipgif.vercel.app').replace(/\/+$/, ''),
  // Slash-less URLs match the nav links; `file` output plus `cleanUrls` in vercel.json serves them without a redirect.
  trailingSlash: 'never',
  build: { format: 'file' },

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    // Pre-bundling breaks the worker that @ffmpeg/ffmpeg starts from its own module URL.
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    }
  }
});
