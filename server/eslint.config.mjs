// @ts-check
import eslint from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import n from 'eslint-plugin-n';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base } from '../eslint.config.base.mjs';

export default tseslint.config(
  { ignores: ['eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked, // upgrade from recommendedTypeChecked (D4)

  // Register import-x (key `import`) so base's import/* rules resolve on the server
  // (the client gets this via tanstack; the server has no generator).
  { plugins: { import: importX } },
  n.configs['flat/recommended'],

  ...base,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      // eslint-plugin-n module-resolution rules off — TS + import-x own resolution (D4).
      'n/no-missing-import': 'off',
      'n/no-extraneous-import': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      // unicorn/filename-case stays off on server (D6 — check-layout.sh owns naming);
      // base already sets it off, so no per-package rule needed here.
      // Nest's main.ts uses `void bootstrap()`; sourceType is commonjs (above), so
      // top-level await is not available -- the rule is a false positive here.
      'unicorn/prefer-top-level-await': 'off', // CommonJS NestJS runtime
    },
  },
  // NestJS modules are decorated empty classes -- the @Module() decorator is what gives
  // them meaning, so no-extraneous-class is a false positive for the framework idiom.
  {
    files: ['**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' }, // NestJS decorated modules
  },
  // Test helpers are intentionally defined inside their describe block for locality even
  // when they do not close over describe scope -- a test-organisation idiom, not a bug.
  {
    files: ['**/*.spec.ts'],
    rules: { 'unicorn/consistent-function-scoping': 'off' }, // test-helper locality idiom
  },
  // build-lambda.mjs is a plain Node ESM build script outside the TS project, so the
  // type-aware (projectService) parser cannot resolve it -- disable type-checked rules
  // for it (it still gets the non-type unicorn/import rules).
  {
    files: ['build-lambda.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  // no-default-export carve-out for server config files (spec §3.5).
  // (eslint.config.mjs itself is globally ignored above, so it needs no carve-out here.)
  {
    files: ['vitest.config.ts', 'build-lambda.mjs'],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@nestjs/*', '@aws-sdk/*', '@pulumi/*', '../adapters/*', '../modules/*'],
        },
      ],
    },
  },
);
