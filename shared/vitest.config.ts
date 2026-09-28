import { defineConfig } from 'vitest/config';

// `include` matches client's `{test,spec}` pair rather than server's `*.spec.ts` only, so a
// co-located `*.test.ts` beside its source is picked up. Without a `test` script here at all, root
// `pnpm -r --if-present run test` skipped this package silently and any test in it exited 0
// without running — the same vacuous-pass shape AGENTS.md documents for `pnpm -r` targets.
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
