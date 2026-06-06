import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared flat ESLint config for every workspace (apps, core, adapters).
 * Browser + Node globals are a harmless superset so the same config serves
 * both the player PWA (browser) and core/adapters (node). Consumers do:
 *   import base from "@config/eslint/base";
 *   export default base;
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
  },
);
