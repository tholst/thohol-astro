import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { STACK_CATEGORIES } from './lib/stack-taxonomy';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      published: z.boolean().optional().default(true),
    }),
});

const tools = defineCollection({
  loader: glob({ base: './src/content/tools', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date(),
    published: z.boolean().optional().default(true),
    order: z.number().optional().default(100),
  }),
});

const techCategory = z.enum(STACK_CATEGORIES);

const tech = defineCollection({
  loader: glob({ base: './src/content/tech', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      title: z.string(),
      // Backward compatible with the first iteration.
      category: techCategory.optional(),
      // New: allow multiple categories/tags per tech.
      tags: z.array(techCategory).optional(),
      href: z.string().url().optional(),
      order: z.number().optional().default(100),
      published: z.boolean().optional().default(true),
    })
    .refine((t) => t.category || (t.tags && t.tags.length > 0), {
      message: 'Tech needs either `category` or `tags` (or both).',
    }),
});

const techRef = z.union([
  z.string(),
  z.object({
    label: z.string(),
    href: z.string().url().optional(),
    tags: z.array(techCategory).optional(),
  }),
]);

const stackPeriodEvent = z.object({
  date: z.coerce.date(),
  title: z.string(),
  note: z.string().optional(),
  tech: z.array(techRef).default([]),
});

const stackPeriodImage = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

const stackPeriod = z.object({
  from: z.coerce.date(),
  to: z.coerce.date().optional(),
  summary: z.string().optional(),
  // Required: a flat list of tech refs, each optionally tagged.
  tech: z.array(techRef).min(1),
  images: z.array(stackPeriodImage).default([]),
  events: z.array(stackPeriodEvent).default([]),
});

const stacks = defineCollection({
  loader: glob({ base: './src/content/stacks', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    status: z.enum(['current', 'past']).optional().default('current'),
    published: z.boolean().optional().default(true),
    order: z.number().optional().default(100),
    periods: z.array(stackPeriod).min(1),
  }),
});

export const collections = { blog, tools, tech, stacks };
