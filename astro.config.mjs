// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const usePolling =
  process.env.VITE_USE_POLLING === '1' || process.env.CHOKIDAR_USEPOLLING === '1';
const pollInterval = Number.parseInt(
  process.env.VITE_POLL_INTERVAL ?? process.env.CHOKIDAR_INTERVAL ?? '120',
  10,
);
const watchInterval = Number.isFinite(pollInterval) && pollInterval > 0 ? pollInterval : 120;

// https://astro.build/config
export default defineConfig({
  site: 'https://thohol.com',
  integrations: [mdx(), sitemap()],
  vite: {
    server: {
      // Polling is slower but more reliable for flaky filesystem events.
      watch: usePolling ? { usePolling: true, interval: watchInterval } : undefined,
    },
  },
});
