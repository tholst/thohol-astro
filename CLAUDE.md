# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server at localhost:4321
- `npm run build` - Build production site to ./dist/
- `npm run preview` - Preview production build locally
- `npm run astro check` - Type-check Astro files

## Architecture Overview

This is an Astro blog site based on the official blog template with the following architecture:

### Content Management
- Blog posts are stored in `src/content/blog/` as Markdown/MDX files
- Content schema is defined in `src/content.config.ts` with frontmatter validation
- Posts require `title`, `description`, `pubDate` fields; `updatedDate` and `heroImage` are optional
- Use `getCollection('blog')` to retrieve posts programmatically

### Page Structure
- `src/pages/index.astro` - Homepage
- `src/pages/blog/index.astro` - Blog listing page
- `src/pages/blog/[...slug].astro` - Dynamic blog post pages
- `src/pages/rss.xml.js` - RSS feed generation
- `src/pages/about.astro` - About page

### Components & Layouts
- `src/layouts/BlogPost.astro` - Blog post layout wrapper
- `src/components/` - Reusable Astro components (Header, Footer, etc.)
- `src/styles/global.css` - Global styles

### Configuration
- Site constants in `src/consts.ts` (SITE_TITLE, SITE_DESCRIPTION)
- Astro config includes MDX and sitemap integrations
- TypeScript with strict configuration