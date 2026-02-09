---
title: Migrating This Blog from React/Webpack to Astro
description: A short technical summary of the old architecture, the new Astro setup, and why the migration was worth it.
pubDate: 2026-02-09
published: true
---

This blog started as a custom React app with a Webpack build pipeline. It worked, but over time the build setup became much more complex than the problem it was solving.

## Previous Architecture (React + Webpack)

The old blog used:

- React + React Router for rendering and routing
- Webpack + Babel for bundling/transpilation
- `val-loader` + `glob` + `gray-matter` to build article metadata
- Markdown loading via `mdx-loader`

None of these tools were bad individually, but combining them meant maintaining a lot of glue code. Just to publish Markdown posts reliably, I had to manage:

- file discovery rules
- frontmatter parsing
- publish filtering and sorting
- MDX compilation setup
- loader/interoperability behavior

A simplified part of the old metadata pipeline looked like this:

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

And that was only metadata. On top of that, Webpack + MDX loader integration had to stay healthy across dependency upgrades, config changes, and ecosystem churn.

### Old content pipeline (Markdown/MDX to browser)

1. Author writes a Markdown/MDX file in `content/blog/...`.
2. `glob` finds candidate files and `gray-matter` parses frontmatter.
3. Custom logic filters published posts, sorts them, and generates metadata.
4. `val-loader` injects that generated metadata into the React app at build time.
5. Webpack processes Markdown/MDX through `mdx-loader` into JS modules.
6. React Router maps URLs to the right article module.
7. Browser loads bundled JS; React hydrates and renders article content.

So the final page depended on several custom integration points between file discovery, metadata generation, loader config, routing, and client rendering.

## New Architecture (Astro)

The new blog uses Astro content collections and static generation:

- Astro pages/layouts for routes and rendering
- `src/content/blog/*.md` as source of truth
- Typed frontmatter schema in `content.config.ts`
- Built-in static output + RSS + sitemap

### Minimal Astro blog setup (example)

Minimal folders:

```text
.
├── package.json
├── astro.config.mjs
└── src
    ├── pages
    │   ├── index.astro
    │   └── blog/[...slug].astro
    ├── content
    │   └── blog
    │       └── hello-world.md
    └── content.config.ts
```

Install dependencies:

```bash
npm install astro @astrojs/mdx @astrojs/rss @astrojs/sitemap
```

Content loading is now straightforward (for example in `src/pages/index.astro`):

```ts
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog'))
  .filter((post) => post.data.published !== false)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
```

So the migration decision was easy: much less custom machinery, and the same outcome.

### New content pipeline (Markdown/MDX to browser)

1. Author writes a Markdown/MDX file in `src/content/blog/...`.
2. Astro Content Collections discover files and validate frontmatter schema in `content.config.ts`.
3. `getCollection('blog')` provides typed post data at build time.
4. Astro builds static HTML per route (for list and post pages).
5. RSS and sitemap are generated from the same content source.
6. Browser receives mostly static HTML/CSS (minimal JS), and article content is already rendered.

The key difference: in Astro, the core content pipeline is built-in and typed, instead of being custom glue around Webpack loaders.

## Why Astro Is a Better Fit Here

For this blog, Astro provides:

- Less custom build logic
- Faster build/runtime model for content pages
- First-class Markdown/content workflows
- Simpler long-term maintenance
