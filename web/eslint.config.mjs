import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import { base } from '../eslint.config.base.mjs';

const eslintConfig = defineConfig([
  // ESLint's own core rules, as server/eslint.config.mjs already does. Neither the Next generator
  // nor base supplies them, so without this `no-debugger` resolves to "NOT SET" and a stray
  // `debugger;` passes lint and CI (NH-279 review F-9). tseslint's layer below deliberately turns
  // off the core rules the compiler already covers (no-dupe-keys, no-unreachable); no-debugger is
  // not one of them.
  eslint.configs.recommended,
  ...nextVitals,
  ...nextTs,
  // base's TS layer includes type-aware rules (e.g. @typescript-eslint/no-unsafe-assignment) that
  // need type information; enable the project service so web/ lints type-aware like client/ + server/.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Shared cross-package rule layer (NH-243 "one system across packages"): unicorn, sonarjs,
  // promise, regexp, eslint-comments, import/order, stricter TS. Spread AFTER the Next generator,
  // which registers the @typescript-eslint + import plugins base's rules attach to (base's
  // composition rule: never re-register a consumer generator's plugins).
  ...base,
  // Next.js App Router requires a default export for route/segment files, metadata files, and
  // config — carve them out of base's `import/no-default-export: error` (NH-275 review, A3).
  {
    files: [
      'app/**/{page,layout,loading,error,not-found,template,default,route,global-error}.{ts,tsx}',
      'app/**/{sitemap,robots,manifest,opengraph-image,twitter-image,icon,apple-icon}.{ts,tsx}',
      'middleware.{ts,tsx}',
      'instrumentation.{ts,tsx}',
      '**/*.config.{js,mjs,cjs,ts,mts}',
    ],
    rules: { 'import/no-default-export': 'off' },
  },
  // base warns @typescript-eslint/explicit-module-boundary-types for backend `src/**/*.ts` only;
  // app/ route + segment components are `.tsx` (base excludes tsx), so don't require explicit return
  // types on them (NH-275 review, A3 — matches how the base treats client/'s own .tsx components).
  {
    files: ['app/**/*.tsx'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
  },
  // The tsconfig `@/*` alias exists ONLY so Turbopack can resolve the transpiled client package's
  // internal `@/lib/utils` import; first-party web app code must use the `@notation-hero/client`
  // package specifier or relative paths (plan D2). Block `@/*` in all web source so it can't reach into
  // client/src and bypass the exports map + Button-only barrel (NH-275 review, F4).
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*'],
              message:
                'Do not use the @/* alias in web app code — it reaches into client/src and bypasses the @notation-hero/client barrel. Import from @notation-hero/client or use a relative path.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
