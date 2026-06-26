// eslint.config.base.mjs — shared ESLint base for all notation-hero packages.
//
// COMPOSITION RULE (spec §3): this base must NOT register plugins a consumer's
// generator already provides. @tanstack/eslint-config (client) registers
// @typescript-eslint, import (import-x), @stylistic, node (eslint-plugin-n);
// typescript-eslint's config() (server) registers @typescript-eslint. So this base
// registers ONLY plugins nobody else provides (unicorn, sonarjs, promise, regexp,
// eslint-comments) and supplies @typescript-eslint + import-x RULES without
// re-declaring those plugin keys. Verify with `eslint --print-config` on BOTH
// packages (must not throw "Cannot redefine plugin").
//
// @ts-check
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

/** Flat-config array shared by every package. Spread as `...base` AFTER the
 *  package's generator + plugin configs and BEFORE package-specific overrides. */
export const base = [
  // Plugins NOT provided by any consumer generator — safe to register here.
  eslintPluginUnicorn.configs.recommended,
  sonarjs.configs.recommended,
  promise.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  {
    plugins: { 'eslint-comments': eslintComments },
    rules: {
      // Applies to every eslint-disable line (incl. unicorn/*) — forces a reason.
      'eslint-comments/require-description': 'error',
    },
  },

  // Shared rule layer. @typescript-eslint/* and import/* rules are declared WITHOUT
  // a `plugins` block — the consumer (tanstack on client; tseslint + explicit
  // import-x on server) owns those plugin registrations.
  {
    rules: {
      'unicorn/filename-case': 'off', // set per-package (spec §3.4)
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/relative-url-style': ['error', 'always'],
      'arrow-body-style': ['error', 'as-needed'],
      'import/no-default-export': 'error',
      'import/no-cycle': 'off', // dependency-cruiser owns cycles
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // TypeScript rules — require the TS parser (set up by the consumer's generator).
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'error', // D5 (server no longer overrides off)
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.ts', '!src/**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
    },
  },

  // Shared no-default-export carve-out: ambient declarations are type-only.
  {
    files: ['**/*.d.ts'],
    rules: { 'import/no-default-export': 'off' },
  },

  // eslint-config-prettier MUST come last among rule-bearing configs — turns off
  // every layout rule Prettier owns (resolves M4-prettier / NH-43). Package-specific
  // overrides added after `...base` are non-layout, so this stays effectively last.
  eslintConfigPrettier,

  // Shared ignores (spec §3.5). Package configs add their own on top.
  {
    ignores: [
      'eslint.config.*',
      'prettier.config.*',
      '**/routeTree.gen.ts',
      'dist/**',
      'storybook-static/**',
      'playwright-report/**',
      '.claude/worktrees/**',
    ],
  },
];

export default base;
