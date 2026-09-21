import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// `@notation-hero/client` exports raw TypeScript (`./src/index.ts`) — Next transpiles it via
// `transpilePackages`, so a test importing a web component pulls client source in too, and that
// source resolves its own imports through `@/`. web/tsconfig.json already maps `@/*` to
// ../client/src/*; this repeats it for the test runner, which does not read tsconfig paths.
// Anchored with `^@/` so it cannot also swallow scoped package names like @testing-library/react.
const clientSrc = fileURLToPath(new URL('../client/src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${clientSrc}/` }],
  },
  test: {
    // jsdom for the whole package, not just component tests: one lane is simpler than a per-file
    // environment split, and the existing pure-logic test runs unchanged under it.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/e2e/**'],
  },
});
