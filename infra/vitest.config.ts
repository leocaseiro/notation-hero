import { defineConfig } from "vitest/config";

// infra/ stack tests run under Vitest's defaults: a node environment, and
// per-file isolation (pool: forks) — each *.test.ts gets its own module graph,
// so the module-level pulumi.runtime.setMocks() + created[] state cannot bleed
// across files. No DOM, no decorators (so no swc), no path aliases, and no
// custom globs (the default include already matches **/*.{test,spec}.ts).
// Assertions stay on node:assert/strict; Vitest only supplies the test runner.
export default defineConfig({});
