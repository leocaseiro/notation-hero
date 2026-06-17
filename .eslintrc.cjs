/**
 * Legacy (eslintrc) config — run via `ESLINT_USE_FLAT_CONFIG=false eslint`.
 * dependency-cruiser is the primary layer-boundary enforcement (see
 * .dependency-cruiser.cjs); these `no-restricted-imports` rules are a fast
 * belt-and-suspenders block on the worst violations inside core/.
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint", "@eslint-community/eslint-comments", "check-file", "import-x", "boundaries"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@eslint-community/eslint-comments/recommended",
  ],
  env: { node: true, browser: true, es2022: true },
  // eslint-plugin-boundaries (STRUCT-layer; ADR 2026-06-12 D4) — file/import-level layer
  // direction with EDITOR-realtime feedback, complementing dependency-cruiser (CI backstop) and
  // the Nx tag rule (PROJECT-level). Each immediate subfolder of a layer is one element of that
  // layer's type (mode:folder). The node resolver is given TS extensions so it can map a resolved
  // import to its element (without this, .ts targets resolve to "unknown"). JS-only resolver — no
  // native unrs-resolver build (keeps `allowBuilds` clean; see NH-42).
  settings: {
    "import/resolver": {
      node: { extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] },
    },
    "boundaries/elements": [
      { type: "core", pattern: "core/*", mode: "folder" },
      { type: "adapters", pattern: "adapters/*", mode: "folder" },
      { type: "apps", pattern: "apps/*", mode: "folder" },
      { type: "infra", pattern: "infra/*", mode: "folder" },
    ],
  },
  // ESLint-native equivalent of the plugin's (deprecated since v4.7.0) `no-unused-disable`.
  // Same effect, no plugin v5.0.0 removal risk. See decision-registry F3-noescape.
  reportUnusedDisableDirectives: true,
  rules: {
    // No-escape-hatches (decision-registry F3-noescape / L5-no-escape-hatches — enforced
    // via this rule set + tooling/check-no-coverage-ignore.sh; see PR #21):
    //  - ban @ts-ignore / @ts-nocheck; @ts-expect-error needs a reason
    //  - every eslint-disable needs a description
    //  - unused eslint-disable directives caught by `reportUnusedDisableDirectives` above
    "@typescript-eslint/ban-ts-comment": [
      "error",
      { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": "allow-with-description" },
    ],
    "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }],

    // Filenames (NAME-suffix; ADR 2026-06-12 D2 — kebab-case everywhere + role suffix).
    // KEBAB_CASE bans PascalCase (Brand.entity.ts), camelCase (catalogueItem.entity.ts), and
    // snake_case (catalogue_item.ts), allowing only kebab (catalogue-item.entity.ts). Kebab is
    // the idiomatic hexagonal-Nx choice (NestJS + the 12k★ domain-driven-hexagon repo suffix in
    // kebab), it dodges the macOS case-insensitive-FS collision (Brand vs brand), and Nx
    // generators emit kebab — so the entity generator won't fight this rule.
    // ignoreMiddleExtensions:true is LOAD-BEARING: it strips ALL middle extensions, so a stacked
    // `catalogue-item.entity.test.ts` is checked as `catalogue-item` (both `.entity` AND `.test`
    // dropped) → one rule covers source AND co-located tests. Side effect: check-file cannot see
    // the role suffix, so suffix-PRESENCE is owned by tooling/check-layout.sh (ADR F-1).
    "check-file/filename-naming-convention": [
      "error",
      { "**/*.{ts,tsx}": "KEBAB_CASE" },
      { ignoreMiddleExtensions: true },
    ],

    // Ban junk-drawer role suffixes (ADR D2). `*.manager.ts` / `*.helper.ts` are catch-alls
    // that hide missing domain modelling — steer to a real role (`*.service.ts`) or, for
    // genuinely generic pure functions, the narrow `*.util.ts`. The approved-suffix VOCABULARY
    // (entity/port/adapter/…) is enforced positively by tooling/check-layout.sh.
    "check-file/filename-blocklist": [
      "error",
      {
        "**/*.manager.{ts,tsx}": "*.service.{ts,tsx}",
        "**/*.helper.{ts,tsx}": "*.util.{ts,tsx}",
      },
    ],

    // Identifiers (naming decision B): domain nouns are PascalCase — classes, interfaces,
    // type aliases, enums, type parameters. Utility *values* stay camelCase via TS defaults;
    // we only pin the type-level surface here to keep the rule low-noise on a pre-source repo.
    "@typescript-eslint/naming-convention": [
      "error",
      { selector: "typeLike", format: ["PascalCase"] },
    ],

    // Imports (naming decision B: NO default exports). Named exports keep the domain surface
    // greppable and refactor-safe — a default export lets an agent silently rename it at each
    // import site. eslint-plugin-import-x is the maintained fork of eslint-plugin-import; we
    // register only the two rules the bundle needs, not the full `recommended` preset (which
    // pulls in resolver-backed rules we don't want on a pre-source repo).
    "import-x/no-default-export": "error",
    // Deterministic, AUTOFIXABLE import order so the pipeline repairs ordering mechanically:
    // builtin -> external -> internal -> parent -> sibling -> index, blank line between groups,
    // alphabetised within each group.
    "import-x/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],

    // Concise arrow bodies — AUTOFIXABLE, so the pipeline strips redundant `{ return x }`
    // wrappers to `=> x` mechanically. Low-stakes style the agent never has to think about.
    "arrow-body-style": ["error", "as-needed"],

    // Layer direction at the FILE/import level with editor-realtime feedback (ADR D4). Mirrors
    // the hexagon: core→core only; adapters→core,adapters; apps→core,adapters,apps; infra→infra
    // only (pure IaC — never core/adapters/apps SOURCE; matches the widened H9 / depcruise +
    // the Nx tag rule; infra wires apps via build output, not imports — ADR D3). infra→infra is
    // allowed for IaC composition (a shared infra lib), same self-layer pattern as core→core.
    // v6 object-selector syntax. The dependencies rule governs IN-REPO element imports only —
    // infra can still import external @pulumi/* (that's boundaries/external's domain), so IaC is
    // unaffected. depcruise is the CI backstop; Nx tags the PROJECT-level rule; this is editor-realtime.
    // DEFERRED (ADR D4 scoped down 2026-06-12): sibling/internal isolation (core/lesson-b ↛
    // core/lesson-a internals) is NOT wired — the v6-clean mechanism (boundaries/entry-point)
    // mandates per-feature index.ts barrels that ADR §6.3 forbids, no-private is v6-deprecated, and
    // there's no intra-layer structure yet (core/ is .gitkeep). Revisit at first-use.
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        rules: [
          { from: { type: "core" }, allow: { to: { type: ["core"] } } },
          { from: { type: "adapters" }, allow: { to: { type: ["core", "adapters"] } } },
          { from: { type: "apps" }, allow: { to: { type: ["core", "adapters", "apps"] } } },
          { from: { type: "infra" }, allow: { to: { type: ["infra"] } } },
        ],
      },
    ],
  },
  ignorePatterns: ["dist", "node_modules", "*.cjs", "*.config.js", "*.config.ts"],
  overrides: [
    {
      // core/ is pure domain — no AWS, no React, no HTTP, no adapters/apps.
      files: ["core/**/*.ts", "core/**/*.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              { name: "react", message: "core is pure domain — no React." },
              { name: "react-dom", message: "core is pure domain — no React." },
              { name: "aws-sdk", message: "core is pure domain — no AWS SDK." },
            ],
            patterns: [
              { group: ["@aws-sdk/*", "@pulumi/*"], message: "core is pure domain — no AWS/Pulumi." },
              { group: ["@adapters/*", "@apps/*"], message: "core must not import adapters or apps." },
            ],
          },
        ],
      },
    },
  ],
};
