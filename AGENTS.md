# AGENTS.md — Notation Hero

<!-- hand-seeded; superseded when the L8 generated-from-config + drift-check lane lands -->
> Wave 1 hand-authored stub. The L8 lane replaces this with a generated-from-config
> AGENTS.md + a CI drift-check (DACI L8). Until then this file is the agent contract.

## Package tag map (Nx `enforce-module-boundaries`)

Directions below are the **intended** hexagonal boundaries. What
`.dependency-cruiser.cjs` enforces TODAY is narrower: only `core ↛ adapters`,
`core ↛ apps`, `adapters ↛ apps`, plus no-cycles. The file-level bans
(`core ↛ @aws-sdk`/`@pulumi`, `adapters ↛ infra`, `handler ↛ @pulumi`) and the Nx
tag `enforce-module-boundaries` contract are a pending Step-1 / Lane-D item — rows
below mark what is **NOT enforced yet**. Treat unmarked directions as enforced.

| Folder glob | Tag | May import | Never imports |
|---|---|---|---|
| `core/*` | `type:core` | nothing in-repo (pure domain) | adapters, apps *(enforced)*; `@aws-sdk/*`, `@pulumi/*` *(intended — NOT enforced yet, Lane D)* |
| `adapters/*` | `type:adapter` | `type:core` | apps *(enforced)*; infra source *(intended — NOT enforced yet, Lane D)* |
| `apps/*` | `type:app` | `type:core`, `type:adapter` | infra source *(an `apps → @pulumi/*` ban is a pending later Step-1 item, NOT enforced yet)* |
| `infra` | `type:infra` | nothing in-repo — pure IaC; wires `apps` via build output (`FileArchive(apps/*/dist)` + Nx `implicitDependencies`), never a TS import (ADR 2026-06-12 **D3**) | core / adapters / apps **source** *(enforced — depcruise **H9**)*; `infra` must never be imported BY app/adapter/core source. `apps` is the runtime composition root, **not** `infra`. |

**Only `infra` (`@notation-hero/infra`, `type:infra`) exists today** — this foundation ships the nx wiring + the tag convention, **not** example domain packages. The first `core`/`adapter`/`app` packages materialize with their real domains (the **catalog** is first: `core/catalogue` + a Neon-Postgres adapter), each brainstormed/spec'd before code. The `@nx/js` + `@nx/eslint` generators are installed and ready to scaffold them with the right `--tags`.

Naming is `@notation-hero/*` (hyphen — matches root `name: "notation-hero"`).
The DACI's `@notationhero/*` (no hyphen, M-7) is a typo; do not adopt it.
DynamoDB is per-user data only; the song/lesson catalogue lives in Neon
Postgres + JSONB (future `adapters/neon-postgres`, out of Wave 1).

## Targets & how to run them

Every package exposes `lint`, `typecheck`, `test`, `build` as `package.json`
scripts; Nx infers them. Run across the graph with `nx run-many --target=<t>`
or the affected subset with `nx affected -t <target> --base=origin/master --head=HEAD`.

In CI, `nrwl/nx-set-shas@v4` sets `NX_BASE`/`NX_HEAD` to the correct base
SHA across `pull_request`, `push:master`, and `merge_group` events — more
accurate than the local `--base=origin/master` approximation. **When
authoring a new CI workflow job**, always use the composite
`- uses: ./.github/actions/setup-js` (pnpm + Node-from-.nvmrc + frozen
install) AFTER `actions/checkout@v6`; do not inline the pnpm/node setup
steps. For jobs that run `nx affected`, also add `nrwl/nx-set-shas@v4`
right after checkout AND set `fetch-depth: 0` on the checkout step
(`nx-set-shas` needs full git history to resolve the base SHA — without
it the action silently falls back to a degraded base).

- Default branch is `master` (NOT main). Never pass `git commit/push --no-verify`.
- Tests use the zero-dep Node 24 runner (`node --test`); relies on default
  type-stripping (do NOT set `NODE_OPTIONS=--no-experimental-strip-types`).
  Vitest + coverage-ratchet is the deferred L5 lane.
- `typecheck`/`build` use `tsc -b`; `composite: true` + `isolatedDeclarations: true`
  mean every exported function/const needs an explicit return type (TS9007 if missing).
  Relative imports use explicit `.ts` extensions; `allowImportingTsExtensions` +
  `rewriteRelativeImportExtensions` are set so `tsc -b` compiles and rewrites
  `.ts`→`.js` on emit.
- The per-package `lint` script carries `ESLINT_USE_FLAT_CONFIG=false` inline so
  ESLint 9 uses the legacy root `.eslintrc.cjs` (flat config is the L3 lane). This
  toggle does NOT work via `nx.json` `targetDefaults` env — it must stay in the script.
- tsconfig `references`: DACI F-4 targets Nx-managed sync (`nx sync`), but that is
  deferred to Lane A — it is NOT wired yet. The single `apps/player-pwa` reference is
  a hand-authored Wave-1 interim; once `nx sync` lands, stop hand-editing them.
- `depcheck` (`pnpm run depcheck`) is the dependency-cruiser whole-graph cycle +
  boundary scan; it stays a single root script, not an Nx per-project target.
- `@notation-hero/infra` targets are stub echo scripts until infra source lands
  (DACI U9) — green output from them is expected but vacuous.

## Test & story layout — co-located, NEVER `__tests__/`

Tests and stories live **next to the source they cover**, in the same folder —
`Foo.ts` and `Foo.test.ts` side by side. **Never create `__tests__/` or
`stories/` directories**, and never group by file-type; organize by domain
(one folder per unit).

```
core/catalogue/
  CatalogueItem.ts
  CatalogueItem.test.ts     # ✅ co-located, next to source
  Exercise.ts
  Exercise.test.ts
```

❌ `core/catalogue/__tests__/CatalogueItem.test.ts` — forbidden layout.

Locked DACI convention (2026-06-09, §"Conventions — domain-driven, co-located"
in `docs/decisions/2026-06-09-tooling-stack-daci.md`). CI **fails** any `__tests__/`,
`__mocks__/`, or `stories/` path via the layout guard (`tooling/check-layout.sh`, run
in the `quality` job); coverage globs and the `build:dts` excludes
(`*.test.*`, `*.stories.*`) assume this layout.

⚠️ The legacy `docs/plans/2026-06-07-001-feat-cms-k-build-plan.md` predates this
rule and still shows `__tests__/` paths — those are SUPERSEDED; co-locate instead.

## Setup in a fresh worktree / clone

**Node version** — run `nvm use` (or `fnm use` / `asdf install nodejs`) in
the repo root before anything else; `.nvmrc` pins Node 24 to match CI. The
CI composite (`.github/actions/setup-js`) reads the same `.nvmrc` via
`node-version-file:`, so local and CI Node versions stay in sync from one
file. Volta users: `.nvmrc` is not picked up automatically — run
`volta pin node@24` once in the repo root, then Volta uses that pin.
(`asdf install nodejs` requires `legacy_version_file = yes` in
`~/.asdfrc` to read `.nvmrc`; otherwise install via `asdf install nodejs 24`.)

Lefthook git hooks (`pre-commit`, `commit-msg`, `pre-push`) are the local-side
of the CI gates. They must be **installed once per worktree**:

1. `pnpm install` — runs the `prepare` script which calls `lefthook install`.
2. If `pnpm install` fails on the `prepare` step with `core.hooksPath is set
   locally`, the worktree has a stale per-worktree hooks path. Recover with:
   ```sh
   git config --unset-all --local core.hooksPath
   pnpm install --ignore-scripts
   pnpm exec lefthook install
   ```
   (Adding deps in the same recovery state: `pnpm add -D -w <pkg> --ignore-scripts`.)
3. Verify hooks fire: `git config --get core.hooksPath` should be unset (empty
   output); `.git/hooks/pre-commit` should exist. If hooks silently no-op
   after a worktree move, re-run `pnpm exec lefthook install`.

If you skip this, commits land **without** the layout / coverage-ignore /
gitleaks / semgrep / nx-affected checks — CI will still catch them on push,
but local feedback time is gone. Never use `git commit/push --no-verify`.

## Commit & review workflow

**Always `git commit` a coherent, green checkpoint BEFORE asking leocaseiro to
review or approve.** Review happens on the committed diff / PR — never on
uncommitted working-tree changes. Make baby commits at every green step so
progress is visible and any step is one `git revert` away. Never pass
`git commit/push --no-verify`.

## Decision governance

`docs/decisions/decision-registry.md` is the single source of truth for every decision +
its status. Keep it alive:

- **Manual approvals → the register.** Whenever leocaseiro personally approves, ratifies,
  or revises a decision (in conversation, an `AskUserQuestion`, or a review), record it in
  the registry's **Change log** (date, outcome, his reasoning). A decision isn't "ratified"
  until it's in the register.
- **PR merge → update statuses.** Every PR that changes what's enforced updates the register
  in the SAME PR: add a Change-log entry and flip affected decisions' status/enforcement
  (⏳→✅, 📄→🤖, clear the 🟥 gap). The register update travels with the PR so it lands
  atomically on merge.

## Working with leocaseiro

leocaseiro is ADHD-diagnosed; reduce cognitive load and let him drive decisions.
**These conventions apply ONLY to user-facing / orchestrator agents** — agents that
talk to leocaseiro directly and may call `AskUserQuestion`. **Non-interactive
sub-agents** (research, code-review personas, parallel doc-review agents) run to
completion and **return findings as text — they do NOT call `AskUserQuestion`.**
The conventions then apply to the orchestrator that walks leocaseiro through those
findings, not the sub-agent.

### AskUserQuestion conventions (orchestrator agents only)

- **Batch related decisions as SEPARATE sub-questions in one call**, NOT bundled.
  The `questions` field is an array (1-4); each sub-question has its own `options`
  array (2-4); the user answers each independently. NEVER collapse multiple
  decisions into one question's options.

  **Anti-pattern to avoid:**

  ```text
  [Q] Approve sections §4, §5, §6?
     ☐ Approve all   ☐ Approve some   ☐ Reject all
  ```

  → destroys per-decision granularity; the user can't say "approve §4 and §5 but
  defer §6".

  **Correct pattern:** pass an array of separate sub-questions, each with its own
  options:

  ```json
  questions: [
    { "question": "[Q-§4.ack] Approve §4?", "options": [LGTM, Comments, Defer] },
    { "question": "[Q-§5.ack] Approve §5?", "options": [LGTM, Comments, Defer] },
    { "question": "[Q-§6.ack] Approve §6?", "options": [LGTM, Comments, Defer] }
  ]
  ```

  Each sub-question gets its own picker in the desktop UI; the user answers each
  independently.

- **Tag every question** with a stable `[Q-X.Y]` prefix so the user can reply
  `[R: Q-X.Y] yes`.
- **Include a "Defer for later" option** in every question when room allows.
- For each question, provide as CONTEXT (not inside the AskUserQuestion picker):
  - **What's wrong**
  - **Proposed fix** (examples / code snippets if applicable)
  - **Why it works**
