---
title: Migrating This Blog from React/Webpack to Astro
description: A short technical summary of the old architecture, the new Astro setup, and why the migration was worth it.
pubDate: 2026-02-09
published: true
---

This blog started as a custom React app with a Webpack build pipeline. It worked, but over time the setup became heavier than the actual needs of a mostly content-driven site.

## Previous Architecture (React + Webpack)

The old blog used:

- React + React Router for rendering and routing
- Webpack + Babel for bundling/transpilation
- `val-loader` + `glob` + `gray-matter` to build article metadata
- Markdown loading via `mdx-loader`

A simplified version of the old metadata pipeline looked like this:

```js
// makePostList.val.js (simplified)
glob('content/blog/*/+([0-9])_*.md', (_, files) => {
  const posts = files
    .map(matter.read)
    .map((file, i) => ({ ...file.data, filepath: files[i] }))
    .filter((p) => p.published)
    .sort((a, b) => (b.updated || b.date) - (a.updated || a.date));

  resolve({ code: 'module.exports = ' + JSON.stringify(posts) });
});
```

This approach gave full control, but required custom build glue for features that are now common in static site frameworks.

## New Architecture (Astro)

The new blog uses Astro content collections and static generation:

- Astro pages/layouts for routes and rendering
- `src/content/blog/*.md` as source of truth
- Typed frontmatter schema in `content.config.ts`
- Built-in static output + RSS + sitemap

Content loading is now straightforward:

```ts
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog'))
  .filter((post) => post.data.published !== false)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
```

## Why Astro Is a Better Fit Here

For this blog, Astro provides:

- Less custom build logic
- Faster build/runtime model for content pages
- First-class Markdown/content workflows
- Simpler long-term maintenance
