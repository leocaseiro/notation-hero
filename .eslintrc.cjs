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
  plugins: ["@typescript-eslint", "@eslint-community/eslint-comments", "check-file", "import-x"],
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

    // Filenames (CONV-1/CONV-2 + naming decision A/B): bar separators in TS filenames.
    // The custom glob `+([a-zA-Z])*([a-zA-Z0-9])` = start with a letter, then letters/digits
    // only — so it BANS kebab-case (publish-gates.ts) and snake_case (publish_gates.ts) while
    // ALLOWING both PascalCase entities (Brand.ts) and camelCase utilities (publishGates.ts).
    // The PascalCase-entity / camelCase-utility split is a *semantic* judgement (entity vs
    // helper) that no glob can make — it lives in AGENTS.md, backed by naming-convention below.
    // ignoreMiddleExtensions:true so a co-located `Brand.test.ts` is checked as `Brand`, not
    // `Brand.test` (which would fail any single-token convention). check-file v3 ships only
    // flat presets, but its *rules* register fine in this legacy eslintrc (see registry note).
    // NOTE: folder-per-entity (folder name == file basename) is NOT expressible by check-file's
    // folder-match-with-fex (static folder globs only) — tooling/check-layout.sh owns that.
    "check-file/filename-naming-convention": [
      "error",
      { "**/*.{ts,tsx}": "+([a-zA-Z])*([a-zA-Z0-9])" },
      { ignoreMiddleExtensions: true },
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
  ],
};
