import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    ignores: ['dist/', 'node_modules/', '.astro/', 'src/assets/*.jsx'],
  },
  {
    files: ['scripts/*.js'],
    languageOptions: {
      globals: {
        console: 'writable',
        process: 'writable',
        setTimeout: 'writable',
        __dirname: 'writable',
        module: 'writable',
        require: 'writable',
        exports: 'writable',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
];
