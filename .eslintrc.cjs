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
  plugins: ["@typescript-eslint", "@eslint-community/eslint-comments"],
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
