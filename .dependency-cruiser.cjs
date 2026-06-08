/**
 * dependency-cruiser — enforces Hexagonal (Layout 4) dependency direction in CI.
 * Run via `bun run depcheck`. The `depcheck` CI job is part of the required
 * "CI Green" aggregation. See docs/cicd-pipeline.md.
 *
 *   core      → may import: nothing in-repo (pure domain)
 *   adapters  → may import: core
 *   apps      → may import: core, adapters
 *   infra     → may import: adapters, apps (composition root)
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-core-to-adapters",
      comment: "core is pure domain — it must not depend on any adapter.",
      severity: "error",
      from: { path: "^core/" },
      to: { path: "^adapters/" },
    },
    {
      name: "no-core-to-apps",
      comment: "core is pure domain — it must not depend on an app.",
      severity: "error",
      from: { path: "^core/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-adapters-to-apps",
      comment: "adapters implement ports — they must not depend on apps.",
      severity: "error",
      from: { path: "^adapters/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-circular",
      comment: "Cyclic dependencies are forbidden.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Non-test modules should be reachable.",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.test\\.(ts|tsx)$", "(^|/)__tests__/"] },
      to: {},
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default"] },
  },
};
