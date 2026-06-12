/**
 * dependency-cruiser — enforces Hexagonal (Layout 4) dependency direction in CI.
 * Run via `pnpm run depcheck` (part of the required "CI Green" aggregation).
 * See AGENTS.md + docs/decisions/decision-registry.md.
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
    // ── File/package-level bans (H8–H11) ────────────────────────────────────────────────
    // The finer, package-aware layer Nx's tag rule can't see (registry H7). The Nx tag rule
    // works at the PROJECT level; these work at the FILE/import level — e.g. infra's PROJECT
    // may depend on an app (build-order via dist), but an infra SOURCE FILE must never import
    // app SOURCE (H9). Paths use the repo's top-level core/ adapters/ apps/ infra/ (the
    // registry's H10/H11 rows still say ^libs/* from the generic DACI; adapted here).
    {
      name: "no-handler-to-pulumi",
      comment:
        "H8: Lambda handlers (apps/*/src, runtime code) must never import @pulumi/* (IaC). " +
        "Infra references the handler BUILD OUTPUT (apps/*/dist), so @pulumi never enters the " +
        "Lambda bundle.",
      severity: "error",
      from: { path: "^apps/[^/]+/src" },
      to: { path: "@pulumi/" },
    },
    {
      name: "no-infra-to-app-or-lib-source",
      comment:
        "H9: infra (IaC) references the handler/lib BUILD OUTPUT, never its SOURCE — it wires " +
        "apps via FileArchive(apps/*/dist) + Nx implicitDependencies, not a TS import of source.",
      severity: "error",
      from: { path: "^infra/" },
      to: { path: "^(apps|libs)/" },
    },
    {
      name: "no-core-to-aws-sdk",
      comment:
        "H10: core is pure domain — it must never import @aws-sdk/* (adapter territory). Keeps " +
        "the domain free of cloud-SDK coupling so it stays unit-testable and portable.",
      severity: "error",
      from: { path: "^core/" },
      to: { path: "@aws-sdk/" },
    },
    {
      name: "no-adapters-to-app-or-infra-source",
      comment:
        "H11: adapters are horizontal — they implement ports against @aws-sdk + @core and must " +
        "never import apps or infra source (that would invert the dependency direction).",
      severity: "error",
      from: { path: "^adapters/" },
      to: { path: "^(apps|infra)/" },
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
        "Non-test modules should be reachable. Co-located *.test.* / *.spec.* / *.stories.* " +
        "are exempt (legit entry points). The __tests__/ whitelist was removed — that folder " +
        "layout is banned outright by tooling/check-layout.sh. Flipped WARN->ERROR in KAN-136 " +
        "(E-no-orphans-error / CONV-5); safe now (0 modules) and enforced as source lands. Add " +
        "explicit entry-point exemptions here when app/infra composition roots arrive.",
      severity: "error",
      from: { orphan: true, pathNot: ["\\.(test|spec)\\.(ts|tsx)$", "\\.stories\\.(ts|tsx)$"] },
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
