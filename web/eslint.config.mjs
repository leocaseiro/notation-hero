import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import { base } from '../eslint.config.base.mjs';

const eslintConfig = defineConfig([
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
  // Two import fences, both on the TYPE-AWARE extension rule.
  //
  // `@/*` (unchanged intent, NH-275 review F4): the tsconfig alias exists only so Turbopack can
  // resolve the transpiled client package's internal '@/lib/utils'; app code must go through the
  // @notation-hero/client barrel.
  //
  // `@coderline/alphatab` (v0 spec §5): type imports only. One VALUE import — even of an enum —
  // makes Turbopack bundle AlphaTab a second time. A component can then drive the bundled copy,
  // whose worker lookup is broken, and playback dies silently while notation still renders.
  // Runtime values come from the namespace object awaited in lib/alphatab/engine.ts.
  //
  // The @typescript-eslint version is required for `allowTypeImports`, and it needs the core rule
  // OFF or both fire.
  //
  // Neither no-restricted-imports rule sees a DYNAMIC import: both match import/export
  // declarations only, so `await import('@coderline/alphatab')` walks through the fence and the
  // second bundled copy comes back with lint green (verified 2026-09-16 against this exact block —
  // the value probe errored, the dynamic probe exited 0). The no-restricted-syntax selector below
  // closes that hole on the ImportExpression node itself. loadAlphaTabEngine()'s own dynamic import
  // holds its URL in a const, so it carries no `source.value` literal and cannot match.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/^@coderline.alphatab/]',
          message:
            'Do not dynamically import @coderline/alphatab. It bundles AlphaTab a second time just as a value import does, and the no-restricted-imports fence cannot see it. Get runtime values from the namespace object returned by loadAlphaTabEngine() in lib/alphatab/engine.ts.',
        },
      ],
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*'],
              message:
                'Do not use the @/* alias in web app code — it reaches into client/src and bypasses the @notation-hero/client barrel. Import from @notation-hero/client or use a relative path.',
            },
            {
              group: ['@coderline/alphatab', '@coderline/alphatab/*'],
              allowTypeImports: true,
              message:
                'Import @coderline/alphatab with `import type` only. A value import makes Turbopack bundle AlphaTab a second time and silently breaks playback — get runtime values from the namespace object returned by loadAlphaTabEngine() in lib/alphatab/engine.ts.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  // `public/alphatab/**` is vendored third-party dist (AlphaTab's classic build, self-hosted so its
  // web worker can `importScripts()` it — see docs/spikes/2026-09-10-alphatab-in-nextjs-app-router.md).
  // `eslint .` otherwise walks public/ and reports ~11k problems in a minified bundle we don't author.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/alphatab/**',
    'spike-out/**',
  ]),
]);

export default eslintConfig;
