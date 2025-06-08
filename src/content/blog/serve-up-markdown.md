---
title: Serve-Up Markdown
description: How to create a blog from markdown articles
pubDate: 2020-02-07
---

## Marked

does not sanitize -> use DOMpurify

## remark-frontmatter / -toc

plugins for remark that add support for Frontmatter and generation of table of contents

## MDX

Markdown with JSX (React's html-in-javascript syntax)

## remarkjs (unifiedjs eco system)

Markdown processor, use with rehype (HTML processor)?

-> make safe using rehype-sanitize

## react-markdown

React component that renders a markdown string

## gray-matter

NPM package for parsing YAML/TOML frontmatter from a markdown document

    -   `gray-matter`: markdown frontmatter parser

## mdx-js/loader
NPM package and webpack loader for MDX 
by mdx developers

    -   `@mdx-js/loader`: loader for markdown and markdown-with-jsx documents

## mdx-loader

like mdx-js/loader but better
includes toc and frontmatter parsing