# thohol

Thomas Holst's personal blog about software development, web technologies, and development practices.

## Features

- ✅ Minimal styling
- ✅ SEO-friendly with canonical URLs and OpenGraph data  
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## Development Commands

All commands are run from the root of the project:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `make dev`                | Alternative: Start development server            |
| `make build`              | Alternative: Build production site               |

## Project Structure

```text
├── public/               # Static assets
├── src/
│   ├── components/      # Reusable components
│   ├── content/
│   │   └── blog/        # Blog posts (Markdown/MDX)
│   ├── layouts/         # Page layouts
│   └── pages/           # Site pages
├── astro.config.mjs     # Configuration
├── Makefile            # Development shortcuts
└── CLAUDE.md           # AI assistant guidance
```

## About

This is the source code for Thomas Holst's personal blog covering topics like React, Docker, web development, and software engineering practices.