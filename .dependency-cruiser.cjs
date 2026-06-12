/**
 * dependency-cruiser — enforces Hexagonal (Layout 4) dependency direction in CI.
 * Run via `pnpm run depcheck` (part of the required "CI Green" aggregation).
 * See AGENTS.md + docs/decisions/decision-registry.md.
 *
 *   core      → may import: nothing in-repo (pure domain)
 *   adapters  → may import: core
 *   apps      → may import: core, adapters   (runtime composition root; handler may import @core)
 *   infra     → may import: NO in-repo source — IaC wires apps via build output (dist/package),
 *               never a TS import of app/core/adapter source (H9, ADR 2026-06-12 D3)
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
        "H8: app runtime code must never import @pulumi/* (IaC). Covers ALL of apps/ — src/, lib/, " +
        "and flat handlers (apps/<name>/handler.ts) — because apps is pure runtime (registry H2: " +
        "handler never @pulumi) and IaC lives in infra/. Was ^apps/[^/]+/src, which silently missed " +
        "flat/lib handlers; the /src scope was an incidental fixture-path transcription, never a " +
        "decided boundary (PR #25 review #6, ce-sessions-confirmed). Infra references the handler " +
        "BUILD OUTPUT (apps/*/dist), so @pulumi never enters the Lambda bundle.",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "@pulumi/" },
    },
    {
      name: "no-infra-to-app-or-domain-source",
      comment:
        "H9 (widened, ADR 2026-06-12 D3): infra/ is pure IaC — it must never import apps, core, " +
        "or adapters SOURCE. It wires apps via FileArchive(apps/*/dist) + Nx implicitDependencies " +
        "(build output), honoring registry H3 (infra imports @pulumi, never domain source) + H4 " +
        "(references build output, not source). The runtime composition root is apps/ (the handler " +
        "may import @core per H2), NOT infra/. Was ^(apps|libs)/ but libs/ is vestigial (no libs/ " +
        "dir) so it only blocked infra->apps; widened to core+adapters. Shared deploy constants " +
        "live in non-domain config, not core/.",
      severity: "error",
      from: { path: "^infra/" },
      to: { path: "^(apps|core|adapters)/" },
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
      name: "no-core-to-pulumi",
      comment:
        "H10 parity (ADR 2026-06-12 D5): core is pure domain — it must never import @pulumi/* " +
        "(IaC). The spike found depcruise had core->@aws-sdk (H10) and apps->@pulumi (H8) but no " +
        "core->@pulumi (only the ESLint core/ deny-list caught it); this restores symmetry in the " +
        "CI backstop so depcruise's external bans are not asymmetric.",
      severity: "error",
      from: { path: "^core/" },
      to: { path: "@pulumi/" },
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
      name: "no-apps-to-infra",
      comment:
        "H-app↛infra (PR #25 review #7): apps are runtime (the Lambda handler) — they must " +
        "never import infra/ (IaC) SOURCE. That would invert the deploy direction: infra wires " +
        "apps via build output (FileArchive(apps/*/dist) + implicitDependencies), never the " +
        "reverse. Mirrors ADR D3 'app -> core,adapters,apps; never infra' + the " +
        "@nx/enforce-module-boundaries type:app constraint (which omits type:infra) + " +
        "eslint-plugin-boundaries. depcruise is the live CI backstop; the ESLint twins are " +
        "editor/CI-staged.",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^infra/" },
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
