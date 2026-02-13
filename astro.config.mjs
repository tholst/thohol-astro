// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://thohol.com',
  integrations: [mdx(), sitemap()],
  vite: {
    server: {
      // If file watching/HMR is flaky (common in Docker, network drives, synced folders),
      // run: `VITE_USE_POLLING=1 npm run dev`
      watch: process.env.VITE_USE_POLLING === '1'
        ? { usePolling: true, interval: 120 }
        : undefined,
    },
  },
});
