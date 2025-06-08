# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server at localhost:4321
- `npm run build` - Build production site to ./dist/
- `npm run preview` - Preview production build locally
- `npm run check` - Type-check Astro files
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run qa` - Run full quality assurance suite (check + lint + format + build)
- `npm run qa:fix` - Run QA with auto-fixes (lint:fix + format + check)

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

## Quality Assurance

### Code Quality Tools

- **ESLint**: Configured for TypeScript and Astro with recommended rules
- **Prettier**: Automatic code formatting with Astro plugin
- **TypeScript**: Strict type checking via @astrojs/check
- **Pre-commit hooks**: Automatic linting and formatting via Husky + lint-staged

### QA Workflow

1. Before committing: Run `npm run qa:fix` to auto-fix issues
2. Check all passes: Run `npm run qa` to verify everything is clean
3. Pre-commit hooks automatically run on staged files
4. All QA checks must pass for production builds

### Content Management

- **Published/Unpublished Posts**: Use `published: false` in frontmatter to hide posts in production
- **Dev vs Prod**: Unpublished posts visible in dev mode, hidden in production builds
- **Date Handling**: Avoid empty `updatedDate:` fields to prevent 1970 date display

## Workflow Guidance

- Always run `npm run qa` before suggesting commits
- Suggest a commit when all tasks and QA checks are completed
