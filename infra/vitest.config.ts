import { defineConfig } from "vitest/config";

// infra/ stack tests run under the default node environment — they construct
// Pulumi resources under runtime mocks (pulumi.runtime.setMocks) and assert on
// the resolved inputs. No DOM, no decorators (so no swc), no path aliases.
// Assertions stay on node:assert/strict; Vitest only supplies the test runner.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
