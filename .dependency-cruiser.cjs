/**
 * dependency-cruiser — enforces the hexagon dependency direction INSIDE the
 * single NestJS app (server/src). Folder-level (Nx tags are gone):
 *
 *   core      → pure domain; imports nothing in-repo, and never @nestjs/@aws-sdk/@pulumi
 *   adapters  → may import core; implements ports against I/O (AWS SDK, Drizzle, ...)
 *   modules   → Nest delivery (controllers/providers); the composition layer
 *
 * Run via `pnpm run depcheck` (a required CI gate). Mirrors the ESLint
 * `no-restricted-imports` ban on core/ (belt-and-suspenders: editor + CI graph).
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-core-to-adapters",
      comment: "core is pure domain — it must not import an adapter.",
      severity: "error",
      from: { path: "^server/src/core" },
      to: { path: "^server/src/adapters" },
    },
    {
      name: "no-core-to-modules",
      comment: "core is pure domain — it must not import a Nest module.",
      severity: "error",
      from: { path: "^server/src/core" },
      to: { path: "^server/src/modules" },
    },
    {
      name: "no-core-to-nestjs",
      comment: "core must stay framework-free — no @nestjs/* imports.",
      severity: "error",
      from: { path: "^server/src/core" },
      to: { path: "@nestjs/" },
    },
    {
      name: "no-core-to-aws-sdk",
      comment:
        "core must not couple to the AWS SDK (that's adapter territory).",
      severity: "error",
      from: { path: "^server/src/core" },
      to: { path: "@aws-sdk/" },
    },
    {
      name: "no-core-to-pulumi",
      comment: "core must never import IaC (@pulumi/*).",
      severity: "error",
      from: { path: "^server/src/core" },
      to: { path: "@pulumi/" },
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
      comment: "Non-test modules should be reachable from an entry point.",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [
          "\\.(test|spec)\\.(ts|tsx)$",
          "\\.stories\\.(ts|tsx)$",
          "^server/src/main\\.ts$",
          "^server/src/entry/",
        ],
      },
      to: {},
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "server/tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)dist/" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
