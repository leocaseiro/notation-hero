# Unified Linting & Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the repo's linting + formatting into one consistent, maximal, auto-fixing, CI-blocking system across `client` + `server` (and `shared`/`infra` as they grow), extended to Markdown / CSS / YAML / shell / workflows / spelling — per spec `docs/superpowers/specs/2026-06-26-unified-linting-formatting-design.md` and Jira NH-243.

**Architecture:** A shared ESLint flat-config **base** (`eslint.config.base.mjs`, repo root) holds framework-agnostic rules; each package's config imports it and adds generator-specific rules. Prettier stays the formatter (separated from ESLint, one root config). Extra linters (markdownlint, stylelint, yamllint, cspell, shellcheck, actionlint, editorconfig-checker, sort-package-json) are wired **curated per-tool** into the existing lefthook hooks (auto-fix on commit, full check on push) and a **dedicated CI `lint` job** (check-and-block, no auto-push). Land in 7 slices, each a green PR.

**Tech Stack:** ESLint v9 (flat config), `typescript-eslint`, `@tanstack/eslint-config` (client generator), Prettier 3, lefthook 2, pnpm 11 workspaces, Node 24, GitHub Actions CI.

## Global Constraints

These apply to **every** task. Values copied verbatim from the spec.

- **Branch base:** all slices stack on `claude/flamboyant-tharp-3af1c8` (PR #83, the spec). Each slice is its own PR / baby commit.
- **Prettier:** keep `printWidth: 100` repo-wide (do **not** adopt base-skill's 72). Canonical config object: `{ semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100 }`.
- **ESLint invocation, both packages:** `eslint . --max-warnings 0` (check only; warnings block). No inline `--fix` in package `lint` scripts.
- **ESLint composition rule (spec §3):** the shared base must **not re-register** plugins a consumer's generator already provides. `@tanstack/eslint-config` (client) registers `@typescript-eslint`, `import` (= `eslint-plugin-import-x`), `@stylistic`, and `node` (= `eslint-plugin-n`); `typescript-eslint`'s `tseslint.config()` (server) registers `@typescript-eslint`. So the base registers **only** plugins nobody else provides (`unicorn`, `sonarjs`, `promise`, `regexp`, `eslint-comments`) and supplies `@typescript-eslint` + `import-x` **rules without re-declaring those plugin keys**. **Verify with `eslint --print-config` on BOTH packages — no `Cannot redefine plugin`.**
- **eslint-config-prettier** is installed and used in **Slice 1** (the base chain needs it), not Slice 2.
- **CI = check-and-block (D7):** no auto-push. Red → required `ci-green` blocks the PR.
- **CI path filter (spec §7):** do **not** widen the existing `code` filter (it gates six heavy jobs). Add a **second** filter output `docs_or_config` and a **dedicated `lint` job** gated on `code || docs_or_config`, added to `ci-green`'s `needs`.
- **Binary tools pinned in CI** (match the osv/gitleaks SHA-pin posture): `shellcheck` (apt, pinned), `yamllint` (`pip install yamllint==<ver>`), `actionlint` (marketplace action pinned by full commit SHA), `editorconfig-checker` (npm wrapper via lockfile). Resolve every "or" to one pinned form before merge.
- **Local binary tools degrade gracefully:** local hooks skip a binary tool if its binary is missing (CI is the hard gate). A `lint:setup` script documents the installs.
- **Never** `git commit/push --no-verify`. Commit a green checkpoint before requesting review. Every commit message is conventional and ends with the trailer:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- **Node 24** (`.nvmrc`), **pnpm@11.5.2**. Root is a pnpm workspace (`client`, `server`, `shared`, `infra`); root-level dev tools install with `pnpm add -Dw <pkg>`.

---

## File Structure

New / changed files across all slices (exact paths, repo-root-relative):

| File                                                                     | Slice   | Responsibility                                                                                    |
| ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| `eslint.config.base.mjs`                                                 | 1       | Shared ESLint rules; registers only non-generator plugins; exports `base` array.                  |
| `client/eslint.config.js`                                                | 1       | tanstack + React/a11y/storybook + `...base` + client overrides. **Rewrite.**                      |
| `server/eslint.config.mjs`                                               | 1       | `tseslint.config` strict-type-checked + import-x + n + `...base` + server overrides. **Rewrite.** |
| `package.json` (root)                                                    | 1,3,4,6 | Root devDeps for base plugins + extra linters; `fix` / `check:all` / `lint:*` scripts.            |
| `client/package.json`                                                    | 1       | Add jsx-a11y/react; remove eslint-plugin-prettier; `lint` script.                                 |
| `server/package.json`                                                    | 1       | Add import-x/n; remove eslint-plugin-prettier + redundant eslint-config-prettier; `lint` script.  |
| `prettier.config.mjs` (root)                                             | 2       | Single canonical Prettier config.                                                                 |
| `client/prettier.config.js`, `server/.prettierrc`, `tooling/.prettierrc` | 2       | **Deleted** (consolidated).                                                                       |
| `.markdownlint.yaml`, `.markdownlintignore`                              | 3       | Markdown lint config + ignores.                                                                   |
| `.stylelintrc.yaml`, `.stylelintignore`                                  | 3       | CSS lint config + ignores.                                                                        |
| `.yamllint`                                                              | 3       | YAML lint config (relaxed).                                                                       |
| `cspell.json`                                                            | 4       | Spell-check config + project dictionary.                                                          |
| `tooling/shellcheck-fix.sh`                                              | 4       | Scope-checked shellcheck autofix helper.                                                          |
| `tooling/shellcheck-fix.test.sh`                                         | 4       | Test for the helper.                                                                              |
| `lefthook.yml`                                                           | 5       | Pre-commit fixers + pre-push checks (glob-scoped).                                                |
| `tooling/lint-setup.sh`                                                  | 5       | Documents/install the non-JS binaries.                                                            |
| `.github/workflows/ci.yml`                                               | 6       | `docs_or_config` filter output + dedicated `lint` job + `ci-green` wiring.                        |
| `docs/decisions/decision-registry.md`                                    | 7       | Update `L3-eslint`, `L3-prettier`, `M4-prettier`, `L12-a11y` statuses.                            |
| `AGENTS.md`                                                              | 7       | Document the unified lint workflow + commands.                                                    |

---

## Task 1 — Slice 1: ESLint shared base + per-package extends

**Goal:** One shared base config; client + server both import it; maximal rules; server `no-explicit-any` flipped to `error`; client `filename-case` PascalCase; `eslint-config-prettier` added last; `eslint-plugin-prettier` removed. `eslint . --max-warnings 0` is green on both packages with **no `Cannot redefine plugin`**.

**Files:**

- Create: `eslint.config.base.mjs`
- Rewrite: `client/eslint.config.js`, `server/eslint.config.mjs`
- Modify: `package.json` (root), `client/package.json`, `server/package.json`

**Interfaces:**

- Produces: `eslint.config.base.mjs` exports a named `base` (a flat-config array) **and** `default base`. Consumers import `{ base }` and spread `...base`. The base **does not** register `@typescript-eslint`, `import`, `@stylistic`, or `node`.

- [ ] **Step 1: Install Slice-1 dependencies**

Root gets the plugins the base file imports; client/server get their generator-specific plugins; remove `eslint-plugin-prettier`.

```bash
# Base plugins (imported by the root eslint.config.base.mjs) → root workspace dev deps
pnpm add -Dw \
  eslint-config-prettier \
  eslint-plugin-unicorn \
  eslint-plugin-sonarjs \
  eslint-plugin-promise \
  eslint-plugin-regexp \
  @eslint-community/eslint-plugin-eslint-comments

# Client-specific plugins (some may already arrive via tanstack; install explicit per spec §10)
pnpm --filter @notation-hero/client add -D \
  eslint-plugin-jsx-a11y \
  eslint-plugin-react

# Server-specific plugins
pnpm --filter @notation-hero/server add -D \
  eslint-plugin-import-x \
  eslint-plugin-n

# Remove the deprecated prettier-as-eslint-rule plugin from both packages
pnpm --filter @notation-hero/client remove eslint-plugin-prettier
pnpm --filter @notation-hero/server remove eslint-plugin-prettier eslint-config-prettier
```

Note: the server's old direct `eslint-config-prettier` dep is removed — the base file (at repo root) imports `eslint-config-prettier/flat`, resolved from root `node_modules`. The server's eslint run loads `../eslint.config.base.mjs`, whose imports resolve relative to the root file's location.

- [ ] **Step 2: Write the shared base config**

Create `eslint.config.base.mjs`:

```js
// eslint.config.base.mjs — shared ESLint base for all notation-hero packages.
//
// COMPOSITION RULE (spec §3): this base must NOT register plugins a consumer's
// generator already provides. @tanstack/eslint-config (client) registers
// @typescript-eslint, import (import-x), @stylistic, node (eslint-plugin-n);
// typescript-eslint's config() (server) registers @typescript-eslint. So this base
// registers ONLY plugins nobody else provides (unicorn, sonarjs, promise, regexp,
// eslint-comments) and supplies @typescript-eslint + import-x RULES without
// re-declaring those plugin keys. Verify with `eslint --print-config` on BOTH
// packages (must not throw "Cannot redefine plugin").
//
// @ts-check
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import promise from "eslint-plugin-promise";
import regexp from "eslint-plugin-regexp";
import sonarjs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

/** Flat-config array shared by every package. Spread as `...base` AFTER the
 *  package's generator + plugin configs and BEFORE package-specific overrides. */
export const base = [
  // Plugins NOT provided by any consumer generator — safe to register here.
  eslintPluginUnicorn.configs.recommended,
  sonarjs.configs.recommended,
  promise.configs["flat/recommended"],
  regexp.configs["flat/recommended"],
  {
    plugins: { "eslint-comments": eslintComments },
    rules: {
      // Applies to every eslint-disable line (incl. unicorn/*) — forces a reason.
      "eslint-comments/require-description": "error",
    },
  },

  // Shared rule layer. @typescript-eslint/* and import/* rules are declared WITHOUT
  // a `plugins` block — the consumer (tanstack on client; tseslint + explicit
  // import-x on server) owns those plugin registrations.
  {
    rules: {
      "unicorn/filename-case": "off", // set per-package (spec §3.4)
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-null": "off",
      "unicorn/relative-url-style": ["error", "always"],
      "arrow-body-style": ["error", "as-needed"],
      "import/no-default-export": "error",
      "import/no-cycle": "off", // dependency-cruiser owns cycles
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  // TypeScript rules — require the TS parser (set up by the consumer's generator).
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-explicit-any": "error", // D5 (server no longer overrides off)
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.ts", "!src/**/*.tsx"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "warn",
    },
  },

  // Shared no-default-export carve-out: ambient declarations are type-only.
  {
    files: ["**/*.d.ts"],
    rules: { "import/no-default-export": "off" },
  },

  // eslint-config-prettier MUST come last among rule-bearing configs — turns off
  // every layout rule Prettier owns (resolves M4-prettier / NH-43). Package-specific
  // overrides added after `...base` are non-layout, so this stays effectively last.
  eslintConfigPrettier,

  // Shared ignores (spec §3.5). Package configs add their own on top.
  {
    ignores: [
      "eslint.config.*",
      "prettier.config.*",
      "**/routeTree.gen.ts",
      "dist/**",
      "storybook-static/**",
      "playwright-report/**",
      ".claude/worktrees/**",
    ],
  },
];

export default base;
```

> **On `@stylistic`:** spec §3.1 lists `@stylistic/eslint-plugin` as "registered, no rules (base-skill parity)". This plan deliberately does **not** register it in the base — the base sets no `@stylistic` rules, and tanstack already registers `@stylistic` on the client, so registering it here would risk `Cannot redefine plugin`. The composition rule (§3, the hardened gotcha) supersedes the parity note. Do not add `@stylistic` back to the base.

> If `eslint --print-config` (Step 5) errors on one of the recommended-config imports (e.g. `sonarjs.configs.recommended` / `regexp.configs['flat/recommended']`), the plugin's current major exports the flat config under a different key — check the installed plugin's README and adjust the accessor. These four lines are the only version-sensitive spots.

- [ ] **Step 3: Rewrite the client config**

Replace `client/eslint.config.js` entirely:

```js
// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
//  @ts-check
import { tanstackConfig } from "@tanstack/eslint-config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";

import { base } from "../eslint.config.base.mjs";

export default [
  ...tanstackConfig,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  // eslint-plugin-react-hooks v7 flat config (the bare recommended-latest is legacy shape).
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,

  ...base,

  // Client-specific rules (non-layout; safe after eslint-config-prettier in base).
  {
    settings: { react: { version: "detect" } },
    rules: {
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "arrow-function",
          unnamedComponents: "arrow-function",
        },
      ],
      "react/jsx-max-depth": ["warn", { max: 5 }],
      "react/no-unstable-nested-components": "error",
      "react/no-array-index-key": "warn",
      "react/jsx-props-no-spreading": "off", // shadcn/Radix spread {...props}
      "react/no-unknown-property": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'JSXAttribute[name.name="style"] > JSXExpressionContainer > ObjectExpression > Property[key.name=/^(color|background|backgroundColor|borderColor|outlineColor|fill|stroke)$/i] > Literal[value=/^(#|rgb|rgba|hsl|oklch)/i]',
          message:
            "Use a CSS variable (var(--...)) instead of a hardcoded colour in inline styles.",
        },
      ],
    },
  },
  // filename-case: PascalCase for components only (spec §3.4). Routes/main/generated excluded.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: { "unicorn/filename-case": ["error", { case: "pascalCase" }] },
  },
  // no-default-export carve-outs for config + story/demo files (spec §3.5).
  {
    files: [
      "vite.config.ts",
      "vitest.config.ts",
      "playwright.config.ts",
      "knip.config.ts",
    ],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: [
      "**/*.stories.tsx",
      ".storybook/**/*.{ts,tsx}",
      "src/**/*.demo.tsx",
    ],
    rules: { "import/no-default-export": "off" },
  },

  ...storybook.configs["flat/recommended"],

  // Client ignores (on top of base's shared ignores).
  {
    ignores: [
      "eslint.config.js",
      "prettier.config.js",
      "vite.config.ts",
      "vitest.setup.ts",
      "src/routeTree.gen.ts",
      "dist/**",
      "storybook-static/**",
      "test-results/**",
      "playwright-report/**",
      ".storybook/**",
      "playwright.config.ts",
    ],
  },
];
```

- [ ] **Step 4: Rewrite the server config**

Replace `server/eslint.config.mjs` entirely:

```js
// @ts-check
import eslint from "@eslint/js";
import importX from "eslint-plugin-import-x";
import n from "eslint-plugin-n";
import globals from "globals";
import tseslint from "typescript-eslint";

import { base } from "../eslint.config.base.mjs";

export default tseslint.config(
  { ignores: ["eslint.config.mjs"] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked, // upgrade from recommendedTypeChecked (D4)

  // Register import-x (key `import`) so base's import/* rules resolve on the server
  // (the client gets this via tanstack; the server has no generator).
  { plugins: { import: importX } },
  n.configs["flat/recommended"],

  ...base,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      // eslint-plugin-n module-resolution rules off — TS + import-x own resolution (D4).
      "n/no-missing-import": "off",
      "n/no-extraneous-import": "off",
      "n/no-unpublished-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
      // unicorn/filename-case stays off on server (D6 — check-layout.sh owns naming);
      // base already sets it off, so no per-package rule needed here.
    },
  },
  // no-default-export carve-out for server config files (spec §3.5).
  {
    files: ["eslint.config.mjs", "vitest.config.ts", "build-lambda.mjs"],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@nestjs/*",
            "@aws-sdk/*",
            "@pulumi/*",
            "../adapters/*",
            "../modules/*",
          ],
        },
      ],
    },
  },
);
```

- [ ] **Step 5: Verify the composition rule — `eslint --print-config` on BOTH packages (THE Slice-1 gate)**

```bash
pnpm --filter @notation-hero/client exec eslint --print-config src/main.tsx > /dev/null && echo "CLIENT print-config OK"
pnpm --filter @notation-hero/server exec eslint --print-config src/main.ts > /dev/null && echo "SERVER print-config OK"
```

Expected: both print `... OK`, **no `Cannot redefine plugin` / `TypeError` / `Definition for rule '...' was not found`**.

Failure → fix:

- `Cannot redefine plugin "X"` → the base registered a plugin a generator already owns. Remove that `plugins: { X }` entry from `eslint.config.base.mjs` (keep its rules).
- `Definition for rule '@typescript-eslint/...' was not found` (server) → `strictTypeChecked` didn't register; confirm `...tseslint.configs.strictTypeChecked` is spread before `...base`.
- `Definition for rule 'import/...' was not found` (server) → the `{ plugins: { import: importX } }` block is missing or after `...base`.

- [ ] **Step 6: Prove the new rules are live (deliberately-broken sample)**

```bash
# no-explicit-any must now error on the SERVER (was 'off' before D5)
printf "export const bad = (x: any): any => x;\n" > server/src/__any_probe.ts
pnpm --filter @notation-hero/server exec eslint src/__any_probe.ts ; echo "exit=$?"
rm server/src/__any_probe.ts
```

Expected: ESLint reports `@typescript-eslint/no-explicit-any` and `exit=1` (non-zero). Then the file is removed.

- [ ] **Step 7: Update the package `lint` scripts**

In `client/package.json` set:

```json
"lint": "eslint . --max-warnings 0",
```

In `server/package.json` set (drop the inline `--fix` and the `{src,test}` glob):

```json
"lint": "eslint . --max-warnings 0",
```

- [ ] **Step 8: Run the real lint gate + fix-or-scope first-run findings**

```bash
pnpm -r --if-present run lint
```

Expected: exits `0`. `strictTypeChecked` + `sonarjs` + server `no-explicit-any: error` may surface findings on first run (spec §14). For each finding: **fix it** if it's a real issue; if it's a genuine false positive on a throwaway file, add a narrowly `files`-scoped override and a `-- <reason>` comment (spec §14). The 3 catalog temp files were pre-checked clean — `any` stays banned everywhere.

Likely server-only findings to expect (the base's `unicorn` recommended + `sonarjs` are new there):

- `unicorn/prefer-module` / `unicorn/prefer-node-protocol` can fire on the CommonJS Nest server (e.g. `__dirname`, bare `path` imports). If they fire and the idiom is correct for the server, turn the specific rule **off in `server/eslint.config.mjs`** (not the base) with a `-- CommonJS NestJS runtime` reason. Do not blanket-disable `unicorn`.
- `sonarjs/*` cognitive-complexity / duplicate-string findings: fix where cheap; otherwise scope narrowly. Keep `no-explicit-any` everywhere.

- [ ] **Step 9: Confirm formatting still passes (eslint-plugin-prettier was removed)**

```bash
pnpm run format:check
```

Expected: exits `0` (Prettier still formats; it's just no longer an ESLint rule). Note: from this slice until Slice 6, CI's `pnpm run lint` no longer catches Prettier drift — the lefthook pre-commit `prettier --write` still fixes it locally; CI re-adds `prettier --check` in Slice 6.

- [ ] **Step 10: Commit**

```bash
git add eslint.config.base.mjs client/eslint.config.js server/eslint.config.mjs \
  package.json client/package.json server/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(lint): shared ESLint base + per-package extends (NH-243)

Add eslint.config.base.mjs (shared maximal rules, no generator-plugin
re-registration), wire client + server to import it, flip server
no-explicit-any to error, add client filename-case (PascalCase), add
eslint-config-prettier last, drop eslint-plugin-prettier.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Slice 2: Consolidate Prettier into one root config

**Goal:** One `prettier.config.mjs` at the root; the three per-package configs deleted; the root `.prettierignore` extended to cover generated/scratch files; and the pre-existing repo-wide Prettier drift (91 files at slice-1 HEAD) formatted once so `prettier --check .` is green (required before slice 6 adds the CI `prettier --check` step).

**Files:**

- Create: `prettier.config.mjs`
- Modify: `.prettierignore` (root — add generated/scratch entries)
- Delete: `client/prettier.config.js`, `server/.prettierrc`, `tooling/.prettierrc`
- Reformat (one-time `prettier --write .`): the pre-existing unformatted docs/config files

**Interfaces:**

- Consumes: nothing from Slice 1 at runtime (independent), but builds on the Slice-1 branch.
- Note: slice 1 removed `eslint-plugin-prettier`, so Prettier is now the sole formatter; this slice makes the repo baseline clean for it.

- [ ] **Step 1: Create the root Prettier config**

Create `prettier.config.mjs`:

```js
//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  printWidth: 100,
};

export default config;
```

- [ ] **Step 2: Extend the root `.prettierignore` for generated/scratch files**

`prettier --check .` run from the root does **not** read `client/.prettierignore`, so generated/scratch files (e.g. `routeTree.gen.ts`, the SDD scratch dir) get flagged. Append to the root `.prettierignore` so the repo-wide check is meaningful (keep the existing wireframe-HTML line):

```text
# Generated — must match the generator, never hand-format.
**/routeTree.gen.ts

# Lockfile + build output + reports (also gitignored; listed for local check parity).
pnpm-lock.yaml
dist/
storybook-static/
playwright-report/
test-results/

# Agent scratch (SDD briefs/reports/ledger; not committed source).
.superpowers/
```

- [ ] **Step 3: Delete the three per-package configs**

```bash
git rm client/prettier.config.js server/.prettierrc tooling/.prettierrc
```

- [ ] **Step 4: Format the repo baseline (one-time) and verify clean**

There is pre-existing Prettier drift (91 files at slice-1 HEAD) that nothing was enforcing. Now that Prettier is the sole formatter and slice 6 will add a CI `prettier --check`, format the whole repo once:

```bash
pnpm exec prettier --write .
```

Then verify clean:

```bash
pnpm exec prettier --check .
```

Expected: exits `0`. The consolidated root config (`semi`, `singleQuote`, `trailingComma: all`, `printWidth: 100`) matches the three deleted per-package configs, so no file changes _style_ — only previously-unformatted files get normalized. This is a large but purely-mechanical diff (whitespace/quotes/wrapping). Before committing, confirm it is formatting-only: `git diff --stat` to see the spread, and spot-check 2-3 files (e.g. a `.ts` and a `.md`) to confirm no semantic change.

- [ ] **Step 5: Verify ESLint still resolves (root config now exists)**

```bash
pnpm --filter @notation-hero/client exec eslint --print-config src/main.tsx > /dev/null && echo OK
pnpm --filter @notation-hero/server exec eslint --print-config src/main.ts > /dev/null && echo OK
```

Expected: both `OK`. The base already ignores `prettier.config.*`, so the new root file is not linted.

- [ ] **Step 6: Commit**

The diff spans the new config, the three deletions, the extended `.prettierignore`, and all reformatted files — stage everything:

```bash
git add -A
git status --short | head        # sanity: config + deletions + .prettierignore + formatted files
git commit -m "$(cat <<'EOF'
refactor(format): consolidate Prettier config + format repo baseline (NH-243)

Replace client/prettier.config.js, server/.prettierrc, tooling/.prettierrc
(identical settings) with a single root prettier.config.mjs @ printWidth 100.
Extend root .prettierignore for generated/scratch files. Run a one-time
prettier --write across the repo so the pre-existing 91-file drift is clean
before slice 6 adds the CI prettier --check (formatting-only changes).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Slice 3: Doc/config linters (markdownlint, stylelint, yamllint)

**Goal:** Markdown, CSS, and YAML are linted by dedicated tools with config mirrored from base-skill. Each has a `lint:<type>` script. (jsonlint skipped — Prettier already formats + syntax-checks JSON.)

**Files:**

- Create: `.markdownlint.yaml`, `.markdownlintignore`, `.stylelintrc.yaml`, `.stylelintignore`, `.yamllint`
- Modify: `package.json` (root) — add `lint:md`, `lint:css`, `lint:yaml` scripts + npm deps

- [ ] **Step 1: Install the npm linters**

```bash
pnpm add -Dw markdownlint-cli2 stylelint stylelint-config-standard
```

(`yamllint` is a Python binary — not npm; installed in CI + documented in `lint:setup` in Slice 5.)

- [ ] **Step 2: Add markdownlint config**

Create `.markdownlint.yaml`:

```yaml
default: true
MD013: false
MD024: false
MD033: false
MD036: false
MD040: false
MD041: false
MD051: false
```

Create `.markdownlintignore`:

```text
node_modules/
dist/
storybook-static/
playwright-report/
test-results/
.claude/worktrees/
pnpm-lock.yaml
```

- [ ] **Step 3: Add stylelint config**

Create `.stylelintrc.yaml` (from base-skill — Tailwind v4 at-rule allowlist + hardcoded-colour ban):

```yaml
extends:
  - stylelint-config-standard
rules:
  at-rule-no-unknown:
    - true
    - ignoreAtRules:
        - theme
        - plugin
        - custom-variant
        - apply
        - layer
        - tailwind
        - utility
        - variant
        - source
  import-notation: string
  property-no-unknown: true
  color-no-invalid-hex: true
  declaration-block-no-duplicate-properties: true
  color-named: "never"
  declaration-property-value-disallowed-list:
    - "/^(color|background|background-color|border-color|outline-color|fill|stroke)$/":
        - "/^#/"
        - "/^rgb/"
        - "/^rgba/"
        - "/^hsl/"
        - "/^oklch/"
```

Create `.stylelintignore`:

```text
dist/
storybook-static/
.claude/worktrees/
```

- [ ] **Step 4: Add yamllint config (relaxed)**

Create `.yamllint`:

```yaml
extends: relaxed
rules:
  line-length: disable
  document-start: disable
  comments:
    min-spaces-from-content: 1
  trailing-spaces: enable
ignore: |
  node_modules/
  dist/
  pnpm-lock.yaml
  .claude/worktrees/
```

- [ ] **Step 5: Add the lint scripts**

In root `package.json` scripts, add:

```json
"lint:md": "markdownlint-cli2 \"**/*.md\"",
"lint:css": "stylelint \"**/*.css\"",
"lint:yaml": "yamllint -c .yamllint .",
```

(`markdownlint-cli2` reads `.markdownlintignore`; `stylelint` reads `.stylelintignore`; `yamllint` reads the `ignore:` block.)

- [ ] **Step 6: Run each linter; fix findings**

```bash
pnpm run lint:md ; echo "md exit=$?"
pnpm run lint:css ; echo "css exit=$?"
command -v yamllint >/dev/null && pnpm run lint:yaml && echo "yaml exit=$?" || echo "yamllint not installed locally — CI gates it (Slice 6)"
```

Expected: `md` and `css` exit `0` after fixing any findings. Auto-fix where possible:

```bash
pnpm exec markdownlint-cli2 --fix "**/*.md"
pnpm exec stylelint --fix "**/*.css"
pnpm exec prettier --write "**/*.md" "**/*.css"
```

Re-run until clean. (`yamllint` is check-only; fix YAML by hand if it reports.)

- [ ] **Step 7: Commit**

```bash
git add .markdownlint.yaml .markdownlintignore .stylelintrc.yaml .stylelintignore .yamllint package.json pnpm-lock.yaml
# plus any md/css files auto-fixed above
git commit -m "$(cat <<'EOF'
feat(lint): add markdownlint, stylelint, yamllint (NH-243)

Doc/config linters with base-skill config (Tailwind v4 at-rule allowlist,
hardcoded-colour ban, relaxed yamllint). jsonlint skipped (Prettier covers JSON).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Slice 4: Script/spell/workflow linters

**Goal:** shellcheck (with a scope-checked autofix helper), cspell, actionlint, editorconfig-checker, sort-package-json are installed with check scripts. Binary tools degrade gracefully when missing locally.

**Files:**

- Create: `cspell.json`, `tooling/shellcheck-fix.sh`, `tooling/shellcheck-fix.test.sh`
- Modify: `package.json` (root) — add `lint:spell`, `lint:shell`, `lint:actions`, `lint:editorconfig`, `lint:sort-pkg` scripts + npm deps

- [ ] **Step 1: Install the npm-based tools**

```bash
pnpm add -Dw cspell editorconfig-checker sort-package-json
```

(`shellcheck` + `actionlint` are binaries — installed in CI + documented in `lint:setup` in Slice 5.)

- [ ] **Step 2: Add cspell config + seed dictionary**

Create `cspell.json`:

```json
{
  "version": "0.2",
  "language": "en",
  "useGitignore": true,
  "ignorePaths": [
    "pnpm-lock.yaml",
    "dist/**",
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",
    ".claude/worktrees/**",
    "**/routeTree.gen.ts"
  ],
  "words": [
    "notation",
    "alphatab",
    "alphatex",
    "tanstack",
    "tseslint",
    "lefthook",
    "commitlint",
    "gitleaks",
    "semgrep",
    "osv",
    "syncpack",
    "depcruise",
    "shadcn",
    "Radix",
    "Pulumi",
    "Cognito",
    "DynamoDB",
    "Neon",
    "pnpm",
    "vitest",
    "markdownlint",
    "stylelint",
    "yamllint",
    "actionlint",
    "cspell",
    "editorconfig",
    "noble",
    "knip"
  ]
}
```

> The `words` list is the starting seed. During Step 6, add real project terms that cspell flags; do not silence whole files.

- [ ] **Step 3: Write the scope-checked shellcheck autofix helper**

Create `tooling/shellcheck-fix.sh`:

```bash
#!/usr/bin/env bash
# tooling/shellcheck-fix.sh — scope-checked shellcheck autofix for .sh files.
# For each target: produce shellcheck's unified diff, assert it touches ONLY that
# file, then `git apply --reject`. Guarded: no-op if shellcheck is missing or the
# diff is empty. `--reject` makes a malformed/partial patch fail loudly.
# Usage: tooling/shellcheck-fix.sh <file.sh> [<file.sh> ...]
set -euo pipefail

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck not installed — skipping autofix (CI is the hard gate)"
  exit 0
fi

status=0
for f in "$@"; do
  case "$f" in
  *.sh) ;;
  *) continue ;;
  esac
  [ -f "$f" ] || continue

  diff="$(shellcheck -f diff "$f" 2>/dev/null || true)"
  [ -z "$diff" ] && continue

  # Assert every `+++ b/<path>` header in the patch equals the target file.
  targets="$(printf '%s\n' "$diff" | sed -n 's#^+++ b/##p' | sort -u)"
  if [ "$targets" != "$f" ]; then
    echo "shellcheck-fix: refusing out-of-scope patch for $f (touches: ${targets:-none})"
    status=1
    continue
  fi

  printf '%s\n' "$diff" | git apply --reject - || {
    echo "shellcheck-fix: git apply --reject failed for $f"
    status=1
  }
done
exit "$status"
```

Make it executable:

```bash
chmod +x tooling/shellcheck-fix.sh
```

- [ ] **Step 4: Write the helper's test**

Create `tooling/shellcheck-fix.test.sh`:

```bash
#!/usr/bin/env bash
# Test tooling/shellcheck-fix.sh: a fixable issue is applied in-scope.
set -euo pipefail

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "SKIP: shellcheck not installed"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
git init -q

# A shellcheck-fixable issue: SC2086 (unquoted $var) has a safe diff suggestion.
cat > sample.sh <<'SH'
#!/usr/bin/env bash
x=1
echo $x
SH
git add sample.sh
git commit -qm "seed"

bash "$OLDPWD/tooling/shellcheck-fix.sh" sample.sh

if grep -q 'echo "\$x"' sample.sh; then
  echo "PASS: shellcheck-fix applied the in-scope patch"
else
  echo "FAIL: expected \$x to be quoted"
  cat sample.sh
  exit 1
fi
```

- [ ] **Step 5: Run the helper test**

```bash
bash tooling/shellcheck-fix.test.sh
```

Expected: `PASS: shellcheck-fix applied the in-scope patch` (or `SKIP` if shellcheck isn't installed locally — then rely on CI in Slice 6).

- [ ] **Step 6: Add the check scripts + run them**

In root `package.json` scripts, add:

```json
"lint:spell": "cspell --no-progress \"**/*.{ts,tsx,js,mjs,cjs,md,json,yml,yaml}\"",
"lint:shell": "shellcheck $(git ls-files '*.sh')",
"lint:actions": "actionlint",
"lint:editorconfig": "editorconfig-checker",
"lint:sort-pkg": "sort-package-json --check \"package.json\" \"client/package.json\" \"server/package.json\" \"shared/package.json\" \"infra/package.json\"",
```

Run (each tool guarded by availability):

```bash
pnpm run lint:spell ; echo "spell exit=$?"
pnpm run lint:editorconfig ; echo "editorconfig exit=$?"
pnpm run lint:sort-pkg ; echo "sort-pkg exit=$?"
command -v shellcheck >/dev/null && pnpm run lint:shell && echo "shell ok" || echo "shellcheck not local — CI gates"
command -v actionlint >/dev/null && pnpm run lint:actions && echo "actions ok" || echo "actionlint not local — CI gates"
```

Fix findings: add real words to `cspell.json`; `pnpm exec sort-package-json package.json client/package.json server/package.json shared/package.json infra/package.json` to fix key order; fix editorconfig/shell issues by hand or via the helper.

- [ ] **Step 7: Commit**

```bash
git add cspell.json tooling/shellcheck-fix.sh tooling/shellcheck-fix.test.sh package.json pnpm-lock.yaml
# plus any package.json key-order fixes
git commit -m "$(cat <<'EOF'
feat(lint): add shellcheck/cspell/actionlint/editorconfig-checker/sort-package-json (NH-243)

Script, spelling, and workflow linters with a scope-checked shellcheck
autofix helper (+ test). Binary tools degrade gracefully when missing locally.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Slice 5: Git hooks + `lint:setup`

**Goal:** lefthook pre-commit auto-fixes staged files across all fixable tools (and re-stages); pre-push runs the full check suite and fails the push if unclean. `lint:setup` documents the binary installs.

**Files:**

- Modify: `lefthook.yml`
- Create: `tooling/lint-setup.sh`
- Modify: `package.json` (root) — add `lint:setup` + the root `fix` script

**Interfaces:**

- Consumes: the `lint:*` scripts (Slices 3–4), `tooling/shellcheck-fix.sh` (Slice 4), package `lint` scripts (Slice 1).

- [ ] **Step 1: Write `lint:setup` helper**

Create `tooling/lint-setup.sh`:

```bash
#!/usr/bin/env bash
# tooling/lint-setup.sh — document/install the non-npm lint binaries.
# These are HARD-gated in CI; locally they're optional (hooks skip when missing).
set -euo pipefail

echo "Notation Hero — local lint binaries (optional; CI is the hard gate):"
echo
echo "  shellcheck   — shell script linter"
echo "  yamllint     — YAML linter (Python)"
echo "  actionlint   — GitHub Actions workflow linter"
echo
echo "macOS (Homebrew):"
echo "  brew install shellcheck yamllint actionlint"
echo
echo "Linux (apt + pip):"
echo "  sudo apt-get install -y shellcheck"
echo "  pip install --user yamllint==1.37.1"
echo "  # actionlint: download the pinned release binary, or `go install`"
echo
echo "editorconfig-checker is installed via pnpm (npm wrapper) — no extra step."
```

Make executable:

```bash
chmod +x tooling/lint-setup.sh
```

- [ ] **Step 2: Add the `lint:setup` + `fix` scripts**

In root `package.json` scripts, add:

```json
"lint:setup": "bash tooling/lint-setup.sh",
"fix": "prettier --write --ignore-unknown . && pnpm -r --if-present run lint -- --fix ; stylelint --fix \"**/*.css\" ; markdownlint-cli2 --fix \"**/*.md\" ; sort-package-json package.json client/package.json server/package.json shared/package.json infra/package.json",
```

> `fix` is the full local auto-fixer (best-effort; non-fixable tools like yamllint/cspell are check-only and not included). The shellcheck autofix runs via the pre-commit hook on staged files (Step 3); `fix` deliberately leaves shell autofix to the scoped hook helper.

- [ ] **Step 3: Rewrite `lefthook.yml`**

Replace `lefthook.yml` with the glob-scoped fixers + full pre-push checks:

```yaml
# lefthook — pnpm workspaces (no Nx).
# pre-commit: auto-fix + re-stage STAGED files (fast, glob-scoped).
# pre-push: full check vs origin/master; fails the push if unclean.
# Skipped on merge/rebase so conflict-resolution / history-rewrite commits don't fight hooks.
# Binary tools (shellcheck) are guarded inside their scripts — missing binary = skip locally.

pre-commit:
  parallel: false
  commands:
    layout-guard:
      run: bash tooling/check-layout.sh
      skip: [merge, rebase]
    secret-scan:
      run: bash tooling/gitleaks-precommit.sh
      skip: [merge, rebase]
    sast:
      run: bash tooling/semgrep-precommit.sh
      skip: [merge, rebase]
    prettier:
      glob: "*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml,css,html}"
      run: pnpm exec prettier --write --ignore-unknown {staged_files}
      stage_fixed: true
      skip: [merge, rebase]
    eslint:
      glob: "*.{ts,tsx,js,jsx,mjs,cjs}"
      run: pnpm exec eslint --fix {staged_files}
      stage_fixed: true
      skip: [merge, rebase]
    stylelint:
      glob: "*.css"
      run: pnpm exec stylelint --fix {staged_files}
      stage_fixed: true
      skip: [merge, rebase]
    markdownlint:
      glob: "*.md"
      run: pnpm exec markdownlint-cli2 --fix {staged_files}
      stage_fixed: true
      skip: [merge, rebase]
    sort-package-json:
      glob: "*package.json"
      run: pnpm exec sort-package-json {staged_files}
      stage_fixed: true
      skip: [merge, rebase]
    shellcheck-fix:
      glob: "*.sh"
      run: bash tooling/shellcheck-fix.sh {staged_files}
      stage_fixed: true
      skip: [merge, rebase]

commit-msg:
  commands:
    commitlint:
      run: pnpm exec commitlint --edit {1}
      skip: [merge, rebase]

pre-push:
  parallel: false
  commands:
    format:
      run: pnpm exec prettier --check --ignore-unknown .
      skip: [merge, rebase]
    lint:
      run: pnpm -r --if-present run lint
      skip: [merge, rebase]
    lint-css:
      run: pnpm run lint:css
      skip: [merge, rebase]
    lint-md:
      run: pnpm run lint:md
      skip: [merge, rebase]
    lint-spell:
      run: pnpm run lint:spell
      skip: [merge, rebase]
    lint-editorconfig:
      run: pnpm run lint:editorconfig
      skip: [merge, rebase]
    lint-yaml:
      run: command -v yamllint >/dev/null 2>&1 && pnpm run lint:yaml || echo "yamllint missing — skipped (CI gates)"
      skip: [merge, rebase]
    lint-shell:
      run: command -v shellcheck >/dev/null 2>&1 && pnpm run lint:shell || echo "shellcheck missing — skipped (CI gates)"
      skip: [merge, rebase]
    lint-actions:
      run: command -v actionlint >/dev/null 2>&1 && pnpm run lint:actions || echo "actionlint missing — skipped (CI gates)"
      skip: [merge, rebase]
    typecheck:
      run: pnpm -r --if-present run typecheck
      skip: [merge, rebase]
    test:
      run: pnpm -r --if-present run test
      skip: [merge, rebase]
```

- [ ] **Step 4: Reinstall hooks + verify pre-commit fixers fire**

```bash
lefthook install --reset-hooks-path

# Prove a fixer runs + re-stages: stage a deliberately mis-formatted TS file.
printf "export const x=1\n" > client/src/__fix_probe.ts
git add client/src/__fix_probe.ts
lefthook run pre-commit
# After the hook, the staged copy should be prettier-formatted (semicolon added).
git show :client/src/__fix_probe.ts
git restore --staged client/src/__fix_probe.ts && rm client/src/__fix_probe.ts
```

Expected: the staged blob shows `export const x = 1;` (formatted + re-staged).

- [ ] **Step 5: Verify pre-push runs clean on the current tree**

```bash
lefthook run pre-push
```

Expected: every command passes (binary-tool steps print a "skipped" line if the binary is missing locally). Fix anything that fails before committing.

- [ ] **Step 6: Commit**

```bash
git add lefthook.yml tooling/lint-setup.sh package.json
git commit -m "$(cat <<'EOF'
feat(hooks): lefthook auto-fix on commit + full check on push (NH-243)

pre-commit fixes + re-stages staged files (prettier/eslint/stylelint/
markdownlint/sort-package-json/shellcheck); pre-push runs the full check
suite. Add lint:setup (binary install docs) + root fix script.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Slice 6: CI — dedicated lint job + `docs_or_config` filter

**Goal:** A dedicated CI `lint` job runs the full check suite as named, annotated steps with pinned binaries; gated on `code || docs_or_config` via a **new** filter output (the `code` filter and its heavy jobs stay untouched); added to `ci-green`. A `check:all` script mirrors the suite locally.

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `package.json` (root) — add `check:all`

**Interfaces:**

- Consumes: all `lint:*` scripts (Slices 3–5), package `lint` scripts (Slice 1), `format:check` (existing).

- [ ] **Step 1: Add the `check:all` script**

In root `package.json` scripts, add (the single local command equal to the CI suite):

```json
"check:all": "pnpm run format:check && pnpm -r --if-present run lint && pnpm run lint:md && pnpm run lint:css && pnpm run lint:yaml && pnpm run lint:spell && pnpm run lint:shell && pnpm run lint:actions && pnpm run lint:editorconfig && pnpm run lint:sort-pkg && pnpm -r --if-present run typecheck && pnpm -r --if-present run test",
```

- [ ] **Step 2: Add the `docs_or_config` filter output (do NOT touch `code`)**

In `.github/workflows/ci.yml`, in the `changes` job's `dorny/paths-filter` `filters:` block, add a **second** output below the existing `code:` and `infra:` blocks. Leave `code:` exactly as-is.

```yaml
docs_or_config:
  - "**/*.md"
  - "**/*.yml"
  - "**/*.yaml"
  - "**/*.css"
  - "**/*.sh"
  - ".editorconfig"
  - ".github/**"
  - ".markdownlint*"
  - ".stylelintrc*"
  - ".yamllint"
  - "cspell.json"
```

> Guard (spec §7 gotcha): the `code` filter gates the six heavy jobs (`quality`, `build`, `a11y`, `vr`, `sast`, `deps-cve`). Widening it would run the whole pipeline on a README-only PR. The new `docs_or_config` output gates **only** the new `lint` job.

- [ ] **Step 3: Move ESLint out of `quality` into the new `lint` job**

In the `quality` job, delete the `- name: Lint` / `run: pnpm run lint` step (it moves to the `lint` job to avoid duplication and to get per-tool attribution). Leave the rest of `quality` (layout, coverage-guard, typecheck, depcheck, core-purity, syncpack, test, tooling tests) unchanged.

- [ ] **Step 4: Add the dedicated `lint` job**

Add this job to `.github/workflows/ci.yml` (after `quality`). Each linter is its own named step; binaries are pinned; annotations surface inline where supported.

```yaml
lint:
  needs: changes
  if: ${{ needs.changes.outputs.code == 'true' || needs.changes.outputs.docs_or_config == 'true' }}
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
    - uses: ./.github/actions/setup-js
    - name: Install pinned lint binaries
      run: |
        # ubuntu-latest ships shellcheck preinstalled; apt ensures presence (pin the
        # version here if the runner image offers a versioned apt candidate).
        sudo apt-get update
        sudo apt-get install -y --no-install-recommends shellcheck
        python3 -m pip install --user yamllint==1.37.1
        echo "$HOME/.local/bin" >> "$GITHUB_PATH"
    - name: Prettier (format check)
      run: pnpm run format:check
    - name: ESLint
      run: pnpm -r --if-present run lint
    - name: Stylelint
      run: pnpm run lint:css
    - name: Markdownlint
      run: pnpm run lint:md
    - name: yamllint
      run: pnpm run lint:yaml
    - name: cspell
      run: pnpm run lint:spell
    - name: shellcheck
      run: pnpm run lint:shell
    - name: actionlint
      # PIN BEFORE MERGE: replace the ref with raven-actions/actionlint's current
      # release resolved to its full 40-char commit SHA (match the osv/gitleaks
      # SHA-pin posture). The deliberately-invalid ref below blocks an accidental
      # merge with an unpinned/fake SHA — resolve it with:
      #   gh api repos/raven-actions/actionlint/git/refs/tags/<tag> --jq .object.sha
      uses: raven-actions/actionlint@RESOLVE-TO-FULL-SHA # vX.Y.Z
    - name: editorconfig-checker
      run: pnpm run lint:editorconfig
    - name: sort-package-json (check)
      run: pnpm run lint:sort-pkg
```

> Resolve the version "or"s before merge: `yamllint==1.37.1` (pin to the then-current release), `shellcheck` via apt (pin if the runner image allows a versioned apt install), `actionlint` via the SHA-pinned marketplace action above, `editorconfig-checker` via the lockfile (pnpm). Confirm each pin matches the existing osv/gitleaks posture.

> **Inline annotations (spec §7, "where supported"):** named steps already give failure attribution (the red step names the tool). For inline `file:line` annotations on the PR diff: `actionlint` (the marketplace action above) annotates natively; for **ESLint** add a problem matcher (`echo "::add-matcher::.github/eslint-matcher.json"` before the step, or run `eslint` with a GitHub-compatible reporter) and for **markdownlint**/**shellcheck** the respective steps support GH-format output. Annotations are a refinement, not a `ci-green` gate (not in the §13 acceptance list) — if any reporter wiring proves fiddly, ship named-step attribution and follow up. Do not silently drop it: leave a `# TODO(NH-243): inline annotations` only if deferred, and note the deferral in the PR.

- [ ] **Step 5: Wire `lint` into `ci-green`**

In the `ci-green` job, add `lint` to the `needs:` array, and add it to the result-checking loop. Concretely:

```yaml
needs:
  [
    changes,
    quality,
    lint,
    build,
    a11y,
    vr,
    secret-scan,
    sast,
    deps-cve,
    pr-title,
    pr-checklist,
  ]
```

And in the verify step, capture + check the new result (mirror the existing pattern):

```bash
        l="${{ needs.lint.result }}"
```

add `lint:$l` to the `for job in ... ` list and `lint=$l` to the `echo` summary line.

- [ ] **Step 6: Validate the workflow YAML locally**

```bash
command -v actionlint >/dev/null && actionlint .github/workflows/ci.yml && echo "actionlint OK" || echo "install actionlint to validate locally"
pnpm run lint:yaml || true   # the workflow file is YAML too
```

Expected: `actionlint OK` (no syntax/expression errors). Run `pnpm run check:all` once to confirm the aggregate command is green:

```bash
pnpm run check:all ; echo "check:all exit=$?"
```

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml package.json
git commit -m "$(cat <<'EOF'
feat(ci): dedicated lint job + docs_or_config path filter (NH-243)

Add a second changes-filter output (docs_or_config) and a dedicated lint
job gated on code||docs_or_config — each linter a named step, binaries
pinned, added to ci-green. The existing code filter + heavy jobs untouched.
Add check:all (local mirror of the CI suite).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Prove the gotcha on the PR (docs-only trigger, heavy jobs skip)**

After pushing the slice PR, verify on the PR's checks: a docs-only change runs `lint` but **skips** `build`/`vr`/`a11y`/`sast`/`deps-cve` (they stay gated on `code`). If the heavy jobs run on a docs-only diff, the `code` filter was widened by mistake — revert that and keep them on `code` only.

---

## Task 7 — Slice 7: Decision-registry + AGENTS.md updates

**Goal:** The decision registry reflects the shipped lint system; AGENTS.md documents the workflow + commands. Closes the paper trail (no code change).

**Files:**

- Modify: `docs/decisions/decision-registry.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the decision-registry entries**

In `docs/decisions/decision-registry.md`:

- `L3-eslint` (≈ line 427): status stays `🔒 locked-active`; flip the enforcement glyph `🟡 → 🤖` and append a note: ESLint flat config now shipped as a shared base + per-package extends, CI-enforced via the dedicated `lint` job (NH-243).
- `L3-prettier` (≈ line 428): append a note: Prettier kept @ printWidth 100, consolidated to one root `prettier.config.mjs`, separated from ESLint (Biome evaluated + rejected — see spec §2). Remove/_strike_ the stale "Leo note: We should use Biome" now that Biome is formally rejected with reasons.
- `M4-prettier` (≈ lines 626 + 721): flip status `⏳ pending → ✅ done` and glyph `📄 → 🤖`; note `eslint-config-prettier/flat` added last in the shared base (NH-243, supersedes NH-43).
- `L12-a11y` (≈ lines 535 + 687): flip status `⏳ pending → ✅ done` and glyph `📄 → 🤖`; note `eslint-plugin-jsx-a11y` recommended folded into the client config (NH-243, supersedes NH-168).
- The line-78 note ("client Prettier formatting is now ESLint-enforced" via `eslint-plugin-prettier/recommended`): update to reflect that `eslint-plugin-prettier` was **removed** and replaced by `eslint-config-prettier` + a separate `prettier --check` step (CI lint job + pre-push), per spec D2.

> Match the existing table/row format exactly; do not restructure the registry. Keep edits surgical to these rows + the line-78 prose.

- [ ] **Step 2: Document the workflow in AGENTS.md**

Add a "Linting & formatting" subsection to `AGENTS.md` (place it near the existing tooling/quality docs — find the section with the current lint references via `grep -n -i lint AGENTS.md`). Content:

```markdown
### Linting & formatting (NH-243)

One system across packages — see `docs/superpowers/specs/2026-06-26-unified-linting-formatting-design.md`.

- **ESLint**: shared base `eslint.config.base.mjs` + per-package extends
  (`client/eslint.config.js`, `server/eslint.config.mjs`). Invocation on both:
  `eslint . --max-warnings 0`. The base must **not** re-register plugins a
  generator provides (tanstack: `@typescript-eslint`/`import`/`@stylistic`/`node`);
  verify with `eslint --print-config`.
- **Prettier**: one root `prettier.config.mjs` (`printWidth: 100`), separate from
  ESLint (no `eslint-plugin-prettier`).
- **Extra linters**: markdownlint, stylelint, yamllint, cspell, shellcheck,
  actionlint, editorconfig-checker, sort-package-json.
- **Run locally**: `pnpm run fix` (auto-fix), `pnpm run check:all` (everything CI runs).
- **Binary tools**: `pnpm run lint:setup` documents the `brew`/`pip` installs
  (shellcheck, yamllint, actionlint). Local hooks skip a missing binary; CI is the hard gate.
- **Hooks**: lefthook auto-fixes staged files on commit, runs the full check on push.
- **CI**: dedicated `lint` job (check-and-block), gated on `code || docs_or_config`.
```

- [ ] **Step 3: Verify the docs lint clean**

```bash
pnpm run lint:md
pnpm run lint:spell
pnpm run format:check
```

Expected: all exit `0` (add any new project terms surfaced by cspell to `cspell.json`).

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/decision-registry.md AGENTS.md cspell.json
git commit -m "$(cat <<'EOF'
docs(lint): update decision-registry + AGENTS.md for unified linting (NH-243)

Flip L3-eslint/M4-prettier/L12-a11y to done+automated, record Prettier
consolidation + Biome rejection, document the lint workflow + commands.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Close out NH-243's checklist + linked tickets**

After all slices merge: tick the seven Smart-Checklist items on NH-243; close NH-42, NH-43, NH-168 as superseded (link to NH-243); verify the acceptance criteria (spec §13) — especially `eslint --print-config` clean on both packages, `pnpm run check:all` green, a `--no-verify` commit caught by CI, and a docs-only PR triggering only the `lint` job.

---

## Acceptance Criteria (spec §13 — verify before final merge)

- [ ] `pnpm run check:all` passes on a clean tree and runs every tool in the matrix.
- [ ] `pnpm run fix` auto-fixes a deliberately-broken sample of each fixable type and re-stages it (pre-commit).
- [ ] A staged file with an auto-fixable issue is fixed at pre-commit; a non-fixable issue fails pre-push and CI.
- [ ] A skipped hook (`--no-verify`) is caught by CI and blocks the PR via `ci-green`.
- [ ] Client + server ESLint share the base config; `eslint . --max-warnings 0` is the invocation on both.
- [ ] `eslint --print-config` resolves on **both** packages with no `Cannot redefine plugin` error.
- [ ] `shellcheck -f diff | git apply` is proven on a real `.sh` file (the helper test); the patch is asserted in-scope, `--reject` fails loudly on a malformed patch.
- [ ] Docs-only / workflow-only PRs trigger the `lint` job but **not** the heavy `code`-gated jobs.
