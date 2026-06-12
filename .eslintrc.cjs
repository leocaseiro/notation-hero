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
  plugins: ["@typescript-eslint", "@eslint-community/eslint-comments", "check-file", "import-x", "@nx"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@eslint-community/eslint-comments/recommended",
  ],
  env: { node: true, browser: true, es2022: true },
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
    // generators emit kebab — so the entity generator (KAN #8) won't fight this rule.
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
    {
      // Hexagonal layer boundaries by Nx tag (L2-tags) — the tag-aware layer that fails a
      // cross-layer import even when the dependency is DECLARED, complementing dependency-cruiser
      // (path-based, .dependency-cruiser.cjs) + pnpm's declared-deps gate. Tags live in each
      // project.json; the tag map is documented in AGENTS.md. Direction:
      //   core    -> core only            (pure domain)
      //   adapter -> core + adapter        (implements ports; never apps/infra)
      //   app     -> core + adapter + app  (never infra)
      //   infra   -> anything              (composition root)
      files: ["*.ts", "*.tsx"],
      rules: {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            allow: [],
            depConstraints: [
              { sourceTag: "type:core", onlyDependOnLibsWithTags: ["type:core"] },
              { sourceTag: "type:adapter", onlyDependOnLibsWithTags: ["type:core", "type:adapter"] },
              { sourceTag: "type:app", onlyDependOnLibsWithTags: ["type:core", "type:adapter", "type:app"] },
              {
                sourceTag: "type:infra",
                onlyDependOnLibsWithTags: ["type:core", "type:adapter", "type:app", "type:infra"],
              },
            ],
          },
        ],
      },
    },
  ],
};
