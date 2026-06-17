/**
 * dependency-cruiser — Hexagonal dependency-direction fence (ARCH-GUARD-1), run via
 * `pnpm run depcheck` (part of the required "CI Green" aggregation). Scans `server shared infra`.
 *
 * The hexagon lives as folders under server/src/ (ARCH-HEX-1):
 *   core/     framework-free domain — may import ONLY Node builtins + core + zod (fail-CLOSED)
 *   adapters/ I/O implementing ports — may import core + adapters (Nest decorators allowed)
 *   modules/  NestJS wiring ("the door") — may import core + adapters + modules
 *   entry/    bootstrap / Lambda entry points — may import anything in server/src
 *   infra/    pure IaC — wires server via build output (FileArchive), never a TS import of server source
 *
 * The `core-purity` rule is fail-CLOSED (it is an allow-list: anything not explicitly permitted
 * errors by default). A canary — tooling/check-core-purity-canary.sh, wired as a REQUIRED CI step
 * in the `quality` job — plants a deliberate `core/ -> @nestjs/common` import and asserts depcruise
 * rejects it, so the fence is verified to fire, not assumed. See AGENTS.md + the decision-registry.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-purity",
      comment:
        "server/src/core is the framework-free domain. It may import ONLY Node builtins, other " +
        "core modules, and the explicit allow-list (zod). Anything else — @nestjs, adapters, " +
        "@aws-sdk, @pulumi, any other package — is an error. FAIL-CLOSED: the `to` is an allow-list " +
        "(pathNot keeps own-core + zod; dependencyTypesNot keeps Node builtins), so any unlisted " +
        "import matches and errors by default. tooling/check-core-purity-canary.sh proves it fires.",
      severity: "error",
      from: { path: "^server/src/core/" },
      to: {
        pathNot: ["^server/src/core/", "node_modules/zod/"],
        dependencyTypesNot: ["core"],
      },
    },
    {
      name: "no-adapters-to-modules-or-entry",
      comment:
        "adapters implement ports against core; they may import core + adapters, but never modules " +
        "(the Nest wiring) or entry — that would invert the hexagon's dependency direction.",
      severity: "error",
      from: { path: "^server/src/adapters/" },
      to: { path: "^server/src/(modules|entry)/" },
    },
    {
      name: "no-modules-to-entry",
      comment:
        "modules (the Nest door) may import core + adapters + modules, but never entry " +
        "(the bootstrap / Lambda entry points compose modules, not the reverse).",
      severity: "error",
      from: { path: "^server/src/modules/" },
      to: { path: "^server/src/entry/" },
    },
    {
      name: "no-infra-to-server-source",
      comment:
        "infra/ is deploy-time IaC — it wires server via build output (a FileArchive of the esbuild " +
        "bundle), never a TS import of server source. infra may still import @pulumi/* (external).",
      severity: "error",
      from: { path: "^infra/" },
      to: { path: "^server/" },
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
      comment:
        "Non-test modules should be reachable. Co-located *.test.* / *.spec.* / *.stories.* are " +
        "exempt (legit entry points). Composition roots / entry points are also exempt: " +
        "infra/index.ts (Pulumi program), server/src/entry/main.ts (Nest bootstrap, invoked at " +
        "runtime — never imported), shared/index.ts (placeholder contract entry, no consumers yet).",
      severity: "error",
      from: {
        orphan: true,
        pathNot: [
          "\\.(test|spec)\\.(ts|tsx)$",
          "\\.stories\\.(ts|tsx)$",
          "^infra/index\\.ts$",
          "^server/src/entry/main\\.ts$",
          "^shared/index\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    // Never cruise build output — dist/ is gitignored esbuild/Vite/tsc emit (server/dist,
    // client/dist), not source; scanning it raises false no-orphans errors on bundled entries.
    exclude: { path: "(^|/)dist/" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default"] },
  },
};
