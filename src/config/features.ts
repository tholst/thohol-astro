const envFlag = (value: string | undefined, defaultValue = true) => {
  if (value === undefined) return defaultValue;
  return value === '1';
};

export const FEATURES = {
  about: envFlag(import.meta.env.PUBLIC_FEATURE_ABOUT, true),
  tools: envFlag(import.meta.env.PUBLIC_FEATURE_TOOLS, true),
  stack: envFlag(import.meta.env.PUBLIC_FEATURE_STACK, true),
} as const;
