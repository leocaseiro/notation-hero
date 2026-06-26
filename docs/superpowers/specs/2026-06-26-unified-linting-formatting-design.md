# Unified Linting & Formatting — Design Spec

- **Date:** 2026-06-26
- **Status:** Approved (design) — ready for implementation planning
- **Owner:** leocaseiro
- **Consolidates / folds in:** NH-42 (ESLint flat config), NH-43 (Prettier + eslint-config-prettier), NH-168 (jsx-a11y)
- **Related (kept separate):** NH-32 (license + header rule — a licensing decision, only linked), NH-39 (type-coverage ratchet — distinct tool)
- **Already done (context only):** NH-91 (no-escape-hatches ESLint), NH-93 (commitlint), NH-152 (gitleaks), NH-153 (semgrep), NH-125 (structure enforcement)
- **Decision-registry impact:** updates `L3-eslint`, `L3-prettier`, `M4-prettier` (Biome evaluated and rejected with reasons — see §Rejected alternatives)
- **Reference:** `~/Sites/base-skill` (vetted ESLint/lint setup this spec mirrors)

## 1. Context & goals

The repo's linting is functional but uneven and incomplete. ESLint is flat-config on both
packages but the two configs diverge, ESLint auto-fix is not wired into the git hooks, and
only JS/TS + Prettier are covered — Markdown, CSS, YAML, shell scripts, workflows and spelling
are unchecked. Several stale tickets (NH-42/43/168) each owned a slice of this; they are
consolidated here.

**Goals (from the request):**

1. **Consistent ESLint** across client + server — shared rules where the framework generators
   don't dictate, maximal rule coverage on both.
2. **Auto-fix on the git hooks** (commit + push) and **enforcement on CI** when hooks are skipped.
3. **Block PRs** when auto-fix cannot resolve an issue.
4. Extend the same model to **Markdown, CSS, YAML, JSON**.
5. Optional tools folded in: **shellcheck, cspell** (and the suggested **actionlint,
   editorconfig-checker, sort-package-json**).

**Non-goals:** hadolint (no Dockerfiles in the repo — deferred until one exists); lint-staged
(redundant — lefthook already runs on `{staged_files}`); jsonlint (Prettier already formats and
syntax-checks JSON); MegaLinter (rejected — see below); type-coverage ratchet (NH-39, separate).

## 2. Decisions summary

| #   | Decision                 | Choice                                                           | Rationale                                                                                                             |
| --- | ------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| D1  | Orchestration            | **Curated per-tool** into existing lefthook + CI                 | Matches the repo's hand-wired quality lane (gitleaks/semgrep/osv/knip/syncpack); light, controllable, portfolio-clear |
| D2  | Formatter                | **Keep Prettier @ printWidth 100**, separated from ESLint        | Prettier already formats js/ts/json/css/md/yaml; dropping `eslint-plugin-prettier` removes the anti-pattern           |
| D3  | ESLint shape             | **Shared base + per-package extends**                            | One source of truth for shared rules; framework generators keep their own                                             |
| D4  | ESLint rule scope        | **Maximal** — base-skill spine **plus** extra strict plugins now | User wants "as many rules as we can"                                                                                  |
| D5  | Server `no-explicit-any` | **Flip `off` → `error`**                                         | Align with client/base-skill; one-time cleanup of existing `any`                                                      |
| D6  | `unicorn/filename-case`  | **Client `pascalCase` (components) ; server off**                | Client has no filename enforcement today and is already PascalCase; server is covered by `check-layout.sh`            |
| D7  | CI fix behaviour         | **Check-and-block** (no auto-push)                               | Private-proof, no third-party, simplest; hooks already fix locally for a solo dev                                     |
| D8  | Ticket structure         | **One Jira Story + Smart Checklist**                             | User's explicit "combine into a single one"                                                                           |

### Rejected alternatives

- **Biome (formatter/linter):** evaluated in the 2026-06-18 spike (recorded on NH-42). Rejected
  for now because (a) it does **not** format Markdown or YAML — we'd still need those tools, so
  it removes little; (b) it carries a NestJS dependency-injection hazard (`useImportType`); (c)
  adopting it means migrating the working Prettier setup. Prettier kept. Flip condition unchanged
  from the spike (revisit if Biome ships md/yaml + the DI opt-in lands).
- **MegaLinter:** rejected — heavy Docker image (slow CI), overlaps the existing curated security
  lane, opaque for a portfolio repo, awkward in pre-commit.
- **autofix.ci (CI auto-fix-and-push):** rejected — free only for **public** repos, and the
  project plans to go **private** in maintenance mode, which would force a CI re-architecture.
  Also niche/third-party with PR-push access. Check-and-block (D7) is private-proof.

## 3. §1 — ESLint

Three config files: a shared base plus one per package that extends it.

- `eslint.config.base.mjs` (repo root) — **common rules, all packages**
- `client/eslint.config.js` — `import base` + React/TanStack/shadcn specifics
- `server/eslint.config.mjs` — `import base` + NestJS/type-checked specifics
- (`shared/`, `infra/` extend `base` when they grow real source)

### 3.1 Shared base (`eslint.config.base.mjs`) — both packages

Mirrors base-skill's framework-agnostic rules, plus the maximal extras (D4).

| Rule / preset                                       | Setting                                     | Source                      |
| --------------------------------------------------- | ------------------------------------------- | --------------------------- |
| `typescript-eslint` (parser + base)                 | on                                          | base-skill                  |
| `eslint-plugin-unicorn`                             | recommended                                 | base-skill                  |
| `unicorn/filename-case`                             | off here (set per-package, see 3.4)         | —                           |
| `unicorn/prevent-abbreviations`                     | off                                         | base-skill                  |
| `unicorn/no-null`                                   | off                                         | base-skill                  |
| `unicorn/relative-url-style`                        | `['error','always']`                        | base-skill                  |
| `import-x/no-default-export`                        | error (+ per-file overrides)                | base-skill                  |
| `import-x` `import/order`                           | error (groups + alphabetize)                | base-skill                  |
| `import-x/no-cycle`                                 | off (dependency-cruiser owns cycles)        | base-skill                  |
| `eslint-comments/require-description`               | error                                       | base-skill                  |
| `arrow-body-style`                                  | `['error','as-needed']`                     | base-skill                  |
| `@typescript-eslint/array-type`                     | off                                         | base-skill                  |
| `@typescript-eslint/require-await`                  | off                                         | base-skill                  |
| `@typescript-eslint/no-explicit-any`                | **error** (D5)                              | base-skill                  |
| `@typescript-eslint/no-unsafe-assignment`           | error                                       | base-skill                  |
| `@typescript-eslint/no-unused-vars`                 | error, `^_` ignore                          | base-skill                  |
| `@typescript-eslint/explicit-module-boundary-types` | warn (`src/**/*.ts`)                        | base-skill                  |
| `eslint-plugin-sonarjs`                             | recommended                                 | **extra (D4)**              |
| `eslint-plugin-promise`                             | recommended                                 | **extra (D4)**              |
| `eslint-plugin-regexp`                              | recommended                                 | **extra (D4)**              |
| `eslint-config-prettier/flat`                       | **last in chain**                           | base-skill (resolves NH-43) |
| `@stylistic/eslint-plugin`                          | registered, no rules (Prettier owns layout) | base-skill parity           |

### 3.2 Client only (`client/eslint.config.js`)

| Rule / preset                                                  | Setting                                            |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `@tanstack/eslint-config`                                      | preset (client generator)                          |
| `eslint-plugin-react`                                          | recommended + `jsx-runtime`                        |
| `eslint-plugin-react-hooks`                                    | recommended-latest                                 |
| `eslint-plugin-jsx-a11y`                                       | recommended (**folds in NH-168**)                  |
| `react/function-component-definition`                          | error, arrow                                       |
| `react/jsx-max-depth`                                          | warn, max 5                                        |
| `react/no-unstable-nested-components`                          | error                                              |
| `react/no-array-index-key`                                     | warn                                               |
| `react/jsx-props-no-spreading`                                 | off (shadcn/Radix spread)                          |
| `react/no-unknown-property`                                    | error                                              |
| `no-restricted-syntax` (hardcoded-colour ban in inline styles) | error — matches the CSS-var / brand rule           |
| `unicorn/filename-case`                                        | **`pascalCase`** for `src/components/**` (see 3.4) |

### 3.3 Server only (`server/eslint.config.mjs`)

| Rule / preset                             | Setting                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `typescript-eslint`                       | **`strict-type-checked`** (upgrade from recommendedTypeChecked — extra, D4)                |
| `@typescript-eslint/no-floating-promises` | error (keep)                                                                               |
| core-purity `no-restricted-imports`       | keep (hexagon fence)                                                                       |
| `eslint-plugin-n`                         | recommended, **module-resolution rules disabled** (TS/import-x own resolution — extra, D4) |
| `no-explicit-any`                         | inherited `error` from base (server no longer overrides to off)                            |
| `unicorn/filename-case`                   | **off** (D6 — `check-layout.sh` owns server naming)                                        |

### 3.4 `unicorn/filename-case` (D6)

- **Client:** `pascalCase` for `src/components/**` (validates existing `Button.tsx` / `Home.tsx`,
  catches drift). **Ignore** `src/routes/**` (TanStack owns route names: `about.tsx`, `__root.tsx`,
  `$param`), `main.tsx`, `routeTree.gen.ts`.
- **Server:** off — `check-layout.sh` enforces kebab + role-suffix at pre-commit (dotted names like
  `health.controller.ts` would otherwise be edge-cases).
- Note: `filename-case` is **not** auto-fixable (ESLint cannot rename files); the value is earlier,
  in-editor detection on the client, which has no filename enforcement today.

### 3.5 Per-file overrides & ignores (ported from base-skill)

- `import-x/no-default-export` **off** for: config files (`vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `knip` config → client; `nest-cli`-style + `eslint.config.*` → server),
  `*.stories.tsx` + `.storybook/**` + `*.demo.tsx` (client), `*.d.ts`.
- **Ignores:** `eslint.config.*`, `prettier.config.*`, `**/routeTree.gen.ts`, `dist/**`,
  `storybook-static/**`, `playwright-report/**`, `.claude/worktrees/**`, generated files.

### 3.6 Invocation consistency

Both packages: `lint` = `eslint . --max-warnings 0` (check only, warnings block). Remove the
server's inline `--fix`. Fixing moves to the root `fix` script (§6). This resolves the current
split where server lints-with-fix and client does not.

### 3.7 Catalog temp-file carve-out

`server/src/modules/catalog/**` are temporary scaffolding (to be removed soon). Add a scoped
override that **relaxes only the new strict rules** (`strict-type-checked`, `no-explicit-any`)
for that path, with a `// TODO: remove when catalog temp files are deleted` marker. Basic lint
stays on.

## 4. §2 — Formatter (Prettier)

- Keep **Prettier @ `printWidth: 100`** (repo-wide; do **not** adopt base-skill's 72).
- **Drop** `eslint-plugin-prettier` / the `prettier/prettier` rule; **add** `eslint-config-prettier/flat`
  **last** in each ESLint config so ESLint stops fighting Prettier (resolves M4-prettier / NH-43).
- **Consolidate** the three near-identical Prettier configs (`client/prettier.config.js`,
  `server/.prettierrc`, `tooling/.prettierrc`) into **one root `prettier.config.mjs`**:
  `{ semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100 }`.
- Prettier remains the formatter for js/ts/json/css/md/yaml.

## 5. §3 — Linters (curated)

| Tool                                      | Targets                | Config                                | Notes                                                                       |
| ----------------------------------------- | ---------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `markdownlint-cli2`                       | `**/*.md`              | `.markdownlint*`                      | skip `.mdx` (JSX misparse, per base-skill)                                  |
| `stylelint` + `stylelint-config-standard` | `**/*.css`             | `.stylelintrc.yaml` (from base-skill) | Tailwind at-rule allowlist + hardcoded-colour ban; low volume (Tailwind v4) |
| `yamllint`                                | `**/*.{yml,yaml}`      | `.yamllint` (relaxed)                 | Python binary; check-only                                                   |
| `cspell`                                  | code + docs            | `cspell.json` + seeded dictionary     | check-only; tune dictionary to cut noise                                    |
| `shellcheck`                              | `**/*.sh`              | —                                     | autofix `shellcheck -f diff <files> \| git apply`, then check residuals     |
| `actionlint`                              | `.github/workflows/**` | —                                     | embeds shellcheck for `run:` steps                                          |
| `editorconfig-checker`                    | all                    | existing `.editorconfig`              | check-only; Prettier already fixes most items                               |
| `sort-package-json`                       | `**/package.json`      | —                                     | auto-fixable; consistent key order across 4 packages                        |

- **jsonlint:** skipped — Prettier formats and syntax-checks JSON. JSON-Schema validation can be a
  later follow-up.
- **Binary tools** (`yamllint`, `shellcheck`, `actionlint`, `editorconfig-checker`): installed in CI;
  **local hooks skip them if the binary is missing** (so contributors aren't blocked locally — CI is
  the hard gate). A `lint:setup` script documents the `brew`/`pip` installs.

## 6. §4 — Git hooks (lefthook — unchanged tool)

Stay on **lefthook** (no husky/lint-staged switch). Each command is **glob-scoped** (runs only when
matching files are staged/changed).

**pre-commit** (staged files → auto-fix + re-stage; fast):

- `prettier --write` (supported staged files)
- `eslint --fix` (staged ts/tsx/js)
- `stylelint --fix` (staged css)
- `markdownlint-cli2 --fix` (staged md)
- `sort-package-json` (if `package.json` staged)
- `shellcheck -f diff <staged.sh> | git apply` (guarded: skip if shellcheck missing or no diff)
- _unchanged:_ layout-guard, gitleaks, semgrep

**pre-push** (changed files vs `origin/master` → full check; fail push if unclean):

- `prettier --check`, `eslint --max-warnings 0`, `stylelint`, `markdownlint-cli2`, `yamllint`,
  `cspell`, `shellcheck` (residuals), `actionlint`, `editorconfig-checker`
- _unchanged:_ `typecheck`, `test`

**commit-msg:** `commitlint` (unchanged).

## 7. §5 — CI (check-and-block, D7)

- The CI lint job re-runs the **full check suite** (same as pre-push checks) so a skipped hook is
  caught. **No auto-push** — on any unclean or non-auto-fixable result the job goes red and the
  required `ci-green` check **blocks the PR** (req #3).
- Each linter is its **own named step** (clear failure attribution) and emits **GitHub annotations**
  where supported (ESLint, markdownlint, shellcheck, actionlint) so failures surface inline on the
  PR diff.
- **Binaries installed in CI:** `shellcheck` (apt), `yamllint` (pip), `actionlint` (release binary
  or marketplace action), `editorconfig-checker` (release binary or npm wrapper).
- **Widen the CI path filter:** the current filter is code-only, so docs-only / workflow-only PRs
  skip CI. Add `**/*.md`, `**/*.{yml,yaml}`, `**/*.css`, `**/*.sh`, `.editorconfig`, `.github/**`
  so the new linters actually trigger on the files they cover.

## 8. Execution matrix

3 stages: 🪝 pre-commit (staged → auto-fix + re-stage) · 🪝 pre-push (changed → full check, blocks
push) · ☁️ CI (PR → full check, no auto-push; red → `ci-green` blocks merge).

| Tool                 | Files                  | pre-commit             | pre-push             | CI   | Fixable                   |
| -------------------- | ---------------------- | ---------------------- | -------------------- | ---- | ------------------------- |
| Prettier             | js/ts/json/css/md/yaml | ✏️ write + restage     | ✓ check              | ✓ ⛔ | yes                       |
| ESLint               | ts/tsx/js              | ✏️ `--fix`             | ✓ `--max-warnings 0` | ✓ ⛔ | partial                   |
| Stylelint            | css                    | ✏️ `--fix`             | ✓                    | ✓ ⛔ | partial                   |
| markdownlint         | md                     | ✏️ `--fix`             | ✓                    | ✓ ⛔ | partial                   |
| sort-package-json    | package.json           | ✏️ fix                 | ✓                    | ✓ ⛔ | yes                       |
| shellcheck           | `*.sh`                 | ✏️ `diff \| git apply` | ✓ residual           | ✓ ⛔ | partial                   |
| yamllint             | yaml                   | —                      | ✓                    | ✓ ⛔ | no                        |
| cspell               | text/code              | —                      | ✓                    | ✓ ⛔ | no                        |
| actionlint           | workflows              | —                      | ✓                    | ✓ ⛔ | no                        |
| editorconfig-checker | all                    | —                      | ✓                    | ✓ ⛔ | no (Prettier covers most) |
| tsc typecheck        | ts                     | —                      | ✓                    | ✓ ⛔ | no                        |
| vitest               | —                      | —                      | ✓                    | ✓ ⛔ | no                        |

Unchanged: commitlint @ commit-msg · layout-guard/gitleaks/semgrep @ pre-commit · knip/syncpack/depcheck/osv @ CI.

## 9. Debugging a red CI lint job

1. **Which tool?** Each linter is its own named CI step → the red step names the tool. Most also
   post **inline annotations** on the PR diff (exact `file:line`).
2. **Reproduce locally:** every CI check has a 1:1 local script — run the failing one, or
   `pnpm run check:all` to run the whole CI lint suite at once.
3. **Missing a binary?** `pnpm run lint:setup` documents the `brew`/`pip` installs for
   shellcheck/yamllint/actionlint/editorconfig-checker so you can reproduce binary-tool failures.
4. **Fix:** auto-fixable → `pnpm run fix` then commit. Check-only finding → fix the `file:line` by
   hand. Push → CI re-checks.

## 10. New devDependencies

ESLint: `eslint-plugin-unicorn`, `eslint-plugin-import-x` (explicit for server),
`@eslint-community/eslint-plugin-eslint-comments`, `eslint-plugin-sonarjs`, `eslint-plugin-promise`,
`eslint-plugin-regexp`, `eslint-plugin-n`, `eslint-plugin-jsx-a11y` (client),
`eslint-plugin-react` (client; may come via tanstack), `eslint-config-prettier`.
**Remove:** `eslint-plugin-prettier`.

Other linters (npm): `stylelint`, `stylelint-config-standard`, `markdownlint-cli2`, `cspell`,
`sort-package-json`, `editorconfig-checker` (npm wrapper).

Binaries (not npm — documented in `lint:setup`): `shellcheck`, `yamllint` (pip), `actionlint`.

## 11. New / updated scripts

Root:

- `fix` — `prettier --write` + `eslint --fix` + `stylelint --fix` + `markdownlint-cli2 --fix` +
  `sort-package-json` + shellcheck-diff (the full auto-fixer)
- `check:all` — runs every check exactly as CI (lint + format:check + lint:md/css/yaml/spell/shell/actions/editorconfig + typecheck + test)
- `lint:md`, `lint:css`, `lint:yaml`, `lint:spell`, `lint:shell`, `lint:actions`, `lint:editorconfig`
- `lint:setup` — documents/install the non-JS binaries
- keep: `lint`, `format`, `format:check`, `typecheck`, `test`

Per package: `lint` = `eslint . --max-warnings 0` (consistent; no inline `--fix`).

## 12. §6 — Jira consolidation

One **Story** "Unified linting & formatting" in project **NH**, with a **Smart Checklist**
(mandatory items mapped to §3–§7). Suggested checklist slices (each a green PR):

1. ESLint shared base + per-package extends + maximal rules + server `any` flip + filename-case
   (client) + catalog carve-out
2. Prettier separation (`eslint-config-prettier`, single root config)
3. Doc/config linters: markdownlint, stylelint, yamllint, (skip jsonlint)
4. Script/spell/workflow linters: shellcheck (+autofix), cspell, actionlint, editorconfig-checker,
   sort-package-json
5. Hooks (lefthook pre-commit fixers + pre-push checks) + `lint:setup`
6. CI: full check suite, widened path filter, annotations, binary installs, `check:all`
7. Decision-registry + AGENTS.md updates

- **Fold in & close as superseded:** NH-42, NH-43, NH-168 (link to this Story).
- **Keep separate, link:** NH-32 (license), NH-39 (type-coverage).
- **Link as done context:** NH-91, NH-93.

## 13. Acceptance criteria

- `pnpm run check:all` passes on a clean tree and runs every tool in the matrix.
- `pnpm run fix` auto-fixes a deliberately broken sample of each fixable type and re-stages it.
- A staged file with an auto-fixable issue is fixed at pre-commit; a non-fixable issue fails
  pre-push and CI.
- A skipped hook (`--no-verify`) is caught by CI and blocks the PR via `ci-green`.
- Client + server ESLint share the base config; `eslint . --max-warnings 0` is the invocation on both.
- `shellcheck -f diff | git apply` is proven on a real `.sh` file in CI (where shellcheck is present).
- Docs-only / workflow-only PRs trigger the relevant linters (widened path filter).

## 14. Migration / first-run notes

- Enabling `strict-type-checked` + `no-explicit-any: error` + sonarjs on the server will surface
  existing findings on first run. Each ESLint slice includes a **fix-or-scope** step; the catalog
  temp module is carved out (§3.7).
- `eslint-plugin-n` resolver rules are disabled to avoid false positives with TS path resolution.
- Land in the checklist slices above (small PRs), not one mega-PR.

## 15. Out of scope / follow-ups

- hadolint (no Dockerfiles yet), lint-staged (lefthook covers it), MegaLinter, Biome.
- JSON-Schema validation for config files.
- Type-coverage ratchet (NH-39).
- Promoting additional unicorn/sonarjs rules beyond recommended.
