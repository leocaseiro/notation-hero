# Linting & formatting — runbook

**Ticket:** NH-243 (unified consolidation, PR #85, 2026-06-27)
**Design source:** `docs/superpowers/specs/2026-06-26-unified-linting-formatting-design.md`
**Extracted from:** `AGENTS.md` on 2026-07-15 during the docs-cleanup trim.

## One system across packages

- **ESLint:** shared base `eslint.config.base.mjs` + per-package extends (`client/eslint.config.js`, `server/eslint.config.mjs`, `web/eslint.config.mjs`). Invocation on all three: `eslint . --max-warnings 0`. The base must **not** re-register plugins a generator provides (tanstack: `@typescript-eslint`/`import`/`@stylistic`/`node`); verify with `eslint --print-config`.
- **Prettier:** one root `prettier.config.mjs` (`printWidth: 100`), separate from ESLint (no `eslint-plugin-prettier`).
- **Extra linters:** markdownlint, stylelint, yamllint, cspell, shellcheck, actionlint, editorconfig-checker, sort-package-json.

## Run locally

- `pnpm run fix` — auto-fix everything auto-fixable.
- `pnpm run check:all` — run everything the CI `lint` + `quality` jobs run — but **not** `build` / `a11y` / `vr` / security scans.

## Binary tools

- `pnpm run lint:setup` documents the `brew` / `pip` installs (shellcheck, yamllint, actionlint).
- Local hooks **skip** a missing binary; CI is the hard gate.

## Hooks & CI

- **Hooks:** lefthook auto-fixes staged files on commit, runs the full check on push.
- **CI:** dedicated `lint` job (check-and-block), gated on `code || docs_or_config` paths-filter.
