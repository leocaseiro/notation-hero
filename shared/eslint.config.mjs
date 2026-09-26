// @ts-check
import eslint from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base } from '../eslint.config.base.mjs';

// `shared` is the cross-cutting contract package: framework-free, isomorphic, and imported by
// `client` (Vite), `web` (Turbopack) and `server` (nodenext). It therefore registers no
// environment-specific plugin — notably NOT eslint-plugin-n, which server uses because it is a
// Node service. Anything that would only work under Node does not belong in this package.
export default tseslint.config(
  { ignores: ['eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  // Register import-x (key `import`) so the base's import/* rules resolve here. Per the base's
  // composition rule, the consumer owns this registration — `shared` has no generator that
  // provides it.
  { plugins: { import: importX } },

  ...base,

  {
    languageOptions: {
      globals: globals.es2024,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // no-default-export carve-out for the package's own config files, matching server's.
  {
    files: ['vitest.config.ts'],
    rules: { 'import/no-default-export': 'off' },
  },
);
