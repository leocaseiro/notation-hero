// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
//  @ts-check
import { tanstackConfig } from '@tanstack/eslint-config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';

import { base } from '../eslint.config.base.mjs';

export default [
  ...tanstackConfig,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  // eslint-plugin-react-hooks v7 flat config (the bare recommended-latest is legacy shape).
  reactHooks.configs.flat['recommended-latest'],
  jsxA11y.flatConfigs.recommended,

  ...base,

  // Client-specific rules (non-layout; safe after eslint-config-prettier in base).
  {
    settings: { react: { version: 'detect' } },
    rules: {
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/jsx-max-depth': ['warn', { max: 5 }],
      'react/no-unstable-nested-components': 'error',
      'react/no-array-index-key': 'warn',
      'react/jsx-props-no-spreading': 'off', // shadcn/Radix spread {...props}
      'react/no-unknown-property': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="style"] > JSXExpressionContainer > ObjectExpression > Property[key.name=/^(color|background|backgroundColor|borderColor|outlineColor|fill|stroke)$/i] > Literal[value=/^(#|rgb|rgba|hsl|oklch)/i]',
          message:
            'Use a CSS variable (var(--...)) instead of a hardcoded colour in inline styles.',
        },
      ],
    },
  },
  // filename-case: PascalCase for components only (spec §3.4). Routes/main/generated excluded.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: { 'unicorn/filename-case': ['error', { case: 'pascalCase' }] },
  },
  // no-default-export carve-outs for config + story/demo files (spec §3.5).
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'knip.config.ts'],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    files: ['**/*.stories.tsx', '.storybook/**/*.{ts,tsx}', 'src/**/*.demo.tsx'],
    rules: { 'import/no-default-export': 'off' },
  },

  ...storybook.configs['flat/recommended'],

  // Client-only ignores. Shared ones (eslint.config.*, prettier.config.*,
  // **/routeTree.gen.ts, dist/**, storybook-static/**, playwright-report/**) live in
  // the base and apply here via `...base` — don't duplicate them.
  {
    ignores: [
      'vite.config.ts',
      'vitest.setup.ts',
      'test-results/**',
      '.storybook/**',
      'playwright.config.ts',
    ],
  },
];
