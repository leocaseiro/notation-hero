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
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { node: true, browser: true, es2022: true },
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
