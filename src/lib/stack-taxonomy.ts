export const STACK_CATEGORIES = [
  'Languages',
  'Frameworks',
  'UI',
  'Data',
  'Identity',
  'Integrations',
  'Platforms/Hosting',
  'Infrastructure',
  'Tooling',
  'AI Tools',
  'AI Models/APIs',
] as const;

export type StackCategory = (typeof STACK_CATEGORIES)[number];

export const STACK_CATEGORY_LABEL: Record<StackCategory, string> = {
  Languages: 'Language',
  Frameworks: 'Frameworks',
  UI: 'UI',
  Data: 'Data',
  Identity: 'Identity',
  Integrations: 'Integrations',
  'Platforms/Hosting': 'Platforms',
  Infrastructure: 'Infrastructure',
  Tooling: 'Tooling',
  'AI Tools': 'AI Tools',
  'AI Models/APIs': 'AI Models',
};
