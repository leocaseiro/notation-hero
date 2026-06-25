// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...tanstackConfig,
  // React-hooks + React Compiler rules (merged into eslint-plugin-react-hooks v7;
  // the standalone eslint-plugin-react-compiler is deprecated). Use the flat-config
  // variant — the bare `configs['recommended-latest']` is the legacy eslintrc shape.
  reactHooks.configs.flat['recommended-latest'],
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'vite.config.ts',
      'vitest.setup.ts',
      'src/routeTree.gen.ts',
      'dist/**',
      'storybook-static/**',
      'test-results/**',
      'playwright-report/**',
      '.storybook/**',
      'playwright.config.ts',
    ],
  },
  ...storybook.configs['flat/recommended'],
  // Run Prettier AS an ESLint rule (mirrors server/eslint.config.mjs) so `pnpm lint`
  // fails on formatting drift — semicolons, printWidth 100, etc. Must come last so the
  // bundled eslint-config-prettier can turn off conflicting stylistic rules.
  eslintPluginPrettierRecommended,
  {
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
];
