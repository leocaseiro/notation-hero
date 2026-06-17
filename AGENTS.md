# AGENTS.md — Notation Hero

<!-- hand-seeded; superseded when the L8 generated-from-config + drift-check lane lands -->
> Wave 1 hand-authored stub. The L8 lane replaces this with a generated-from-config
> AGENTS.md + a CI drift-check (DACI L8). Until then this file is the agent contract.

## Layout & layer boundaries (pnpm workspaces, no Nx)

Four workspace packages (ADR §1, ARCH-LAYOUT-1):

| Package | What |
|---|---|
| `client/` | React SPA — Vite + TanStack Router + Query (Capacitor later) |
| `server/` | ONE NestJS app; the hexagon lives as folders in `server/src/` |
| `shared/` | oRPC contract + Zod schemas, imported by client AND server (placeholder today) |
| `infra/` | Pulumi TS — all AWS; imports no app/domain source |

The hexagon (ARCH-HEX-1) is folders inside `server/src/`: `core/` (framework-free
domain), `adapters/` (I/O implementing ports), `modules/` (NestJS wiring — the
"door"), `entry/` (Lambda/bootstrap entry points). Direction is enforced by
`.dependency-cruiser.cjs` (`pnpm run depcheck`). The full folder-level fence
(core imports nothing in-repo; adapters → core; modules → core+adapters; entry →
all) plus a fail-closed core-purity canary is the ARCH-GUARD-1 work (follow-up PR).

Naming is `@notation-hero/*` (hyphen — matches root `name: "notation-hero"`).
DynamoDB is per-user data only; the song/lesson catalogue lives in Neon
Postgres + JSONB (a `server/src/adapters` Drizzle/Neon adapter, later).

## Targets & how to run them

Every package exposes the scripts it has (`lint`, `typecheck`, `test`, `build`)
in its `package.json`. Run across the workspace with the root scripts
(`pnpm run lint` / `typecheck` / `test` / `build`), each of which wraps
`pnpm -r --if-present run <target>`. **Use the single-target form** —
`pnpm -r lint typecheck` runs only `lint` (the rest become positional args).
`depcheck` (`pnpm run depcheck`) is a single root dependency-cruiser cruise over
`server shared infra`, not a per-package target.

**When authoring a new CI workflow job**, use the composite
`- uses: ./.github/actions/setup-js` (pnpm + Node-from-`.nvmrc` + frozen install)
AFTER `actions/checkout@v6`; do not inline the pnpm/node setup. **Exception:** a
dependency-free Node script (e.g. the `pr-checklist` gate) may use
`actions/setup-node@v6` with `node-version-file: .nvmrc` directly — leave an
inline comment saying so.

- Default branch is `master` (NOT main). Never pass `git commit/push --no-verify`.
- Node 24 (`.nvmrc`), `engine-strict=true`.
- `server/` compiles with **SWC** via the nest-cli builder (`nest build`), plus a
  separate `tsc --noEmit` typecheck (SWC does no type-checking); its unit test is
  Jest. `client/` builds with **Vite** (`vite build`); `infra/` + `shared/`
  typecheck with `tsc --noEmit`; `infra`/handler tests use `node --test`.
- Per-package `lint` scripts are `echo` placeholders today; the real flat-config
  ESLint lane is NH-42. The root `.eslintrc.cjs` is the legacy (dormant) config.
- `@notation-hero/infra` Pulumi ops (`pulumi:preview`/`pulumi:up`/`pulumi:destroy`)
  need AWS creds + a Pulumi token, so they run locally only — never in CI.

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
   locally`, the worktree shares a custom hooks path that lefthook won't
   re-install over. Run lefthook's **direct binary** (NOT `pnpm exec`, which
   deadlocks on its own deps-check → `prepare` → `lefthook install`):
   ```sh
   node_modules/.bin/lefthook install --reset-hooks-path
   ```
   This unsets the custom `core.hooksPath` (hooks still resolve to `.git/hooks`)
   and re-installs the shims; `pnpm install` then runs `prepare` cleanly.
3. Verify hooks fire: `git config --get core.hooksPath` should be unset (empty
   output); `.git/hooks/pre-commit` should exist.

If you skip this, commits land **without** the layout / coverage-ignore /
gitleaks / semgrep / lint+typecheck checks — CI will still catch them on push,
but local feedback time is gone. Never use `git commit/push --no-verify`.

## Commit & review workflow

**Always `git commit` a coherent, green checkpoint BEFORE asking leocaseiro to
review or approve.** Review happens on the committed diff / PR — never on
uncommitted working-tree changes. Make baby commits at every green step so
progress is visible and any step is one `git revert` away. Never pass
`git commit/push --no-verify`.

## PR checklist (CI-gated)

Every PR carries an **acknowledgement checklist** (`.github/pull_request_template.md`).
The `pr-checklist` CI job (`tooling/pr-checklist.mjs`, required via *CI Green*) enforces:

- **Every box ticked `[x]` — there is no `N/A`.** The items are standing acknowledgements
  ("I am aware I must … if …"), phrased to stay true whether or not their condition
  applies, so you can always tick them. Any blank `[ ]` fails the gate. No checked, no merge.
- **All canonical items present** — the items are read from the PR template, so deleting
  or rewording them fails the gate (you can't delete the checklist to pass).
- **A real Jira key** — `NH-####` (or legacy `KAN-####`) in the PR title, branch, or a
  prose line (e.g. `Closes [NH-16](…)`). Keys inside HTML comments, code fences, or
  checklist-label examples don't count. Un-skippable — the one check with real teeth.

Bots (dependabot etc.) are exempt. This is v1.1; smart/DangerJS rules (green-fake catch,
first-use triggers, real Jira validation, diff-aware UI/test detection) are the deferred
NH-16 v2 backlog. Spec: `docs/specs/2026-06-15-pr-merge-checklist.md`.

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
