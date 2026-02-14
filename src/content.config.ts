import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

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

const techCategory = z.enum([
  'Languages',
  'Databases',
  'Backend',
  'Frontend',
  'Infra',
  'Tooling',
  'AI/Assistants',
]);

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

const stackCategories = z.object({
  Languages: z.array(techRef).default([]),
  Databases: z.array(techRef).default([]),
  Backend: z.array(techRef).default([]),
  Frontend: z.array(techRef).default([]),
  Infra: z.array(techRef).default([]),
  Tooling: z.array(techRef).default([]),
  'AI/Assistants': z.array(techRef).default([]),
});

const stackPeriodEvent = z.object({
  date: z.coerce.date(),
  title: z.string(),
  note: z.string().optional(),
  tech: z.array(techRef).default([]),
});

const stackPeriod = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date().optional(),
    summary: z.string().optional(),
    // New (preferred): a flat list of tech refs, each optionally tagged.
    tech: z.array(techRef).optional(),
    // Backward compatible with the first iteration.
    stack: stackCategories.optional(),
    events: z.array(stackPeriodEvent).default([]),
  })
  .refine(
    (p) => {
      const hasTech = (p.tech?.length ?? 0) > 0;
      const hasStack =
        !!p.stack &&
        Object.values(p.stack).some(
          (items) => Array.isArray(items) && items.length > 0
        );
      return hasTech || hasStack;
    },
    { message: 'Each period needs `tech` (preferred) or a non-empty `stack`.' }
  );

const stacks = defineCollection({
  loader: glob({ base: './src/content/stacks', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    kind: z.enum(['employer', 'personal', 'project']),
    parent: z.string().optional(),
    published: z.boolean().optional().default(true),
    order: z.number().optional().default(100),
    periods: z.array(stackPeriod).min(1),
  }),
});

export const collections = { blog, tools, tech, stacks };
