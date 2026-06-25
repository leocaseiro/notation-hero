# AGENTS.md — Notation Hero

<!-- hand-seeded; superseded when the L8 generated-from-config + drift-check lane lands -->

> Wave 1 hand-authored stub. The L8 lane replaces this with a generated-from-config
> AGENTS.md + a CI drift-check (DACI L8). Until then this file is the agent contract.

## Hexagon layout & boundaries (pnpm workspaces)

The repo is **plain pnpm workspaces** — Nx was dropped (ADR `ARCH-MONO-1`). Four
packages: `client/` (Vite + TanStack), `server/` (NestJS), `shared/` (cross-cutting
types/contracts), `infra/` (Pulumi IaC). The hexagon lives as **folders inside the one
NestJS app** (`ARCH-HEX-1`), under `server/src/`:

| Folder (`server/src/`) | May import                                                            | Never imports                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`                | Node builtins + own-core + the explicit allow-list (`zod`) ONLY       | anything else — `@nestjs`, adapters, modules, `@aws-sdk`, `@pulumi`, react, any other package _(enforced — `core-purity`, a fail-CLOSED allow-rule)_ |
| `adapters/`            | `core` + `adapters` (Nest decorators allowed)                         | `modules` _(enforced — `no-adapters-to-modules`)_                                                                                                    |
| `modules/`             | `core` + `adapters` + `modules` — the Nest "door" / composition layer | —                                                                                                                                                    |

Enforcement is **live in CI** (`ARCH-GUARD-1`): `.dependency-cruiser.cjs`
(`pnpm run depcheck`) carries the layer directions as the fail-closed `core-purity`
allow-rule (per the ADR — a deny-list would silently pass green on an unlisted import)
plus `no-adapters-to-modules`, no-cycles, no-orphans; `tooling/check-core-purity-canary.sh`
(`pnpm run check:core-purity`, a REQUIRED CI step) proves the fence actually rejects a
violation. `tooling/check-layout.sh` (`pnpm run check:layout`) enforces role-suffix
filenames under `server/src/` (`ARCH-NAME-1`).

Naming is `@notation-hero/*` (hyphen — matches root `name: "notation-hero"`).
The DACI's `@notationhero/*` (no hyphen, M-7) is a typo; do not adopt it.
`core/`/`adapters/` are still empty skeletons; the first real domains land with their
specs (the **catalog** is first: `core/catalog` + a Neon-Postgres adapter), each
brainstormed/spec'd before code. DynamoDB is per-user data only; the song/lesson
catalog lives in Neon Postgres + JSONB (future `server/src/adapters/neon-postgres`).

## Targets & how to run them

Each package exposes `lint`, `typecheck`, `test`, `build` as `package.json` scripts.
Run across all packages from the repo root with `pnpm -r --if-present run <target>`.
**Never** chain targets as `pnpm -r lint typecheck` — that runs `lint` with `typecheck`
as a positional arg, silently skipping the second. Chain root scripts instead:
`pnpm run lint && pnpm run typecheck`.

Root-level checks — each is a named script AND a CI gate, so run any locally:

- `pnpm run depcheck` — dependency-cruiser hexagon fence over `server/src`. Stays a
  single root `depcruise` call, NOT a `pnpm -r` per-package target (a `pnpm -r` form
  finds zero `depcheck` scripts and exits 0 vacuously, silently killing the fence).
- `pnpm run check:core-purity` — core-purity canary (proves the fence fires).
- `pnpm run check:layout` — role-suffix + no-`__tests__/` layout guard.
- `pnpm run check:coverage-ignore` — bans istanbul/c8/v8 coverage-ignore directives.
- `pnpm run syncpack` — cross-package dependency-version consistency.
- `pnpm run test:tooling` — `node --test` over `tooling/*.test.mjs`.

**When authoring a new CI workflow job**, use `- uses: ./.github/actions/setup-js`
(pnpm + Node-from-`.nvmrc` + frozen install) AFTER `actions/checkout@v6`; do not inline
the pnpm/node setup. **Exception:** a dependency-free Node script (e.g. the `pr-checklist`
gate) may use `actions/setup-node@v6` with `node-version-file: .nvmrc` directly — it needs
no pnpm install; leave an inline comment saying so.

- Default branch is `master` (NOT main). Never pass `git commit/push --no-verify`.
- Server AND client tests run under **Vitest** (DACI L5 / NH-194), not Jest — despite
  `nest new` emitting Jest by default.
- `@notation-hero/infra` Pulumi ops — `pulumi:preview`/`pulumi:up`/`pulumi:destroy`
  (run from `infra/`, or `pnpm --filter @notation-hero/infra run pulumi:preview`) — use a
  self-managed **S3 state backend** + a `PULUMI_CONFIG_PASSPHRASE` (no Pulumi Cloud token).
  `up` runs **in CI** on push to `master` only (`.github/workflows/deploy.yml`, via GitHub→AWS
  OIDC + a master-restricted `production` environment). **`preview` is LOCAL-only** (NH-206
  review #3): a PR-triggered preview ran arbitrary `infra/*.ts` under the deploy role, so PRs
  carry no AWS creds — run `pulumi preview` locally before merging infra changes. See the
  2026-06-23 and 2026-06-24 CI/CD entries in `docs/decisions/decision-registry.md` and
  `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`.
- Phase-1+ tooling (flat-config lint lane specifics, coverage-ratchet, size-limit,
  type-coverage, tsconfig project-reference sync) — to be filled in as those lanes land.

## Test & story layout — co-located, NEVER `__tests__/`

Tests and stories live **next to the source they cover**, in the same folder —
`Foo.ts` and `Foo.test.ts` side by side. **Never create `__tests__/` or
`stories/` directories**, and never group by file-type; organize by domain
(one folder per unit).

```
core/catalog/
  CatalogItem.ts
  CatalogItem.test.ts     # ✅ co-located, next to source
  Exercise.ts
  Exercise.test.ts
```

❌ `core/catalog/__tests__/CatalogItem.test.ts` — forbidden layout.

Locked DACI convention (2026-06-09, §"Conventions — domain-driven, co-located"
in `docs/decisions/2026-06-09-tooling-stack-daci.md`). CI **fails** any `__tests__/`,
`__mocks__/`, or `stories/` path via the layout guard (`tooling/check-layout.sh`, run
in the `quality` job); coverage globs and the `build:dts` excludes
(`*.test.*`, `*.stories.*`) assume this layout.

⚠️ The legacy `docs/plans/2026-06-07-001-feat-cms-k-build-plan.md` predates this
rule and still shows `__tests__/` paths — those are SUPERSEDED; co-locate instead.

## VR & a11y testing (`client/` — Storybook + Playwright)

The client design system has three test layers (full guide: `client/README.md`):

- **Unit** — Vitest + Testing Library (`*.test.tsx`); runs in the `quality` CI job.
- **a11y** — axe-core over every Storybook story in light + dark, resting + hover
  (`*.a11y.ts`); the `a11y` CI job, **blocks merge**. OS-independent.
- **VR** — Playwright `toHaveScreenshot` over the stories (`*.vr.ts`); the `vr` CI job,
  **blocks merge**. Pixel-exact, so baselines are **per-OS**.

### VR baselines are per-OS — regenerate the Linux set with Docker

Snapshots embed the platform (`button-default-chromium-darwin.png` vs `…-linux.png`).
Local Macs compare against `-darwin`; **CI compares against `-linux`** (run in the official
Playwright container). After any intended visual change, regenerate **both** and commit them:

```bash
# macOS (local) — darwin baselines:
pnpm --filter @notation-hero/client test:vr:update

# Linux (CI) baselines — via the Playwright image matching @playwright/test (v1.61.1).
# The anonymous -v volumes shadow node_modules so the local (darwin) install is untouched;
# --ignore-scripts skips the lefthook `prepare` (its git call can't resolve a worktree's
# .git inside the container).
docker run --rm \
  -v "$PWD":/work \
  -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
  -v /work/shared/node_modules -v /work/infra/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm --filter @notation-hero/client exec playwright test --project=chromium --update-snapshots"
```

The `vr` CI job pins `container: mcr.microsoft.com/playwright:v1.61.1-noble`, so its
rendering matches the Docker-generated `-linux` baselines exactly. Bump that image tag in
lockstep with `@playwright/test`, and regenerate baselines on the bump.

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
gitleaks / semgrep checks — CI will still catch them on push,
but local feedback time is gone. Never use `git commit/push --no-verify`.

## Commit & review workflow

**Always `git commit` a coherent, green checkpoint BEFORE asking leocaseiro to
review or approve.** Review happens on the committed diff / PR — never on
uncommitted working-tree changes. Make baby commits at every green step so
progress is visible and any step is one `git revert` away. Never pass
`git commit/push --no-verify`.

## PR checklist (CI-gated)

Every PR carries a **checklist of past-tense claims** (`.github/pull_request_template.md`).
The `pr-checklist` CI job (`tooling/pr-checklist.mjs`, required via _CI Green_) enforces:

- **Every box ticked `[x]` — there is no `N/A`.** Each item states what you DID; the
  conditional ones ("If this PR changed X, I did Y") stay true even when the condition
  doesn't apply, so every box is always tickable. Any blank `[ ]` fails the gate. Tick only
  what is TRUE — a tick whose condition applied but whose work you skipped is a false claim
  (caught by review + the NH-16 v2 gate, not by this presence-only check).
- **All canonical items present** — the items are read from the PR template, so deleting
  or rewording them fails the gate (you can't delete the checklist to pass).
- **A real Jira key** — `NH-####` (or legacy `KAN-####`) in the PR title, branch, or a
  prose line (e.g. `Closes [NH-16](…)`). Keys inside HTML comments, code fences, or
  checklist-label examples don't count. Un-skippable — the one check with real teeth.

**You no longer paste the checklist by hand.** The `pr-checklist-sync` workflow
(`.github/workflows/pr-checklist-sync.yml`) appends any **missing** items to the PR body when a
PR is opened, and resyncs every open PR when you run its `workflow_dispatch` button or when
`.github/pull_request_template.md` changes on `master`. It only **adds** missing items — it
never edits your text or ticks boxes — so you still tick each box yourself before merge. Fork
PRs are the exception (read-only token): add the checklist manually there. Spec:
`docs/specs/2026-06-24-pr-checklist-auto-inject.md` (NH-237).

Bots (dependabot etc.) are exempt. This is v1.2 — items are past-tense claims, not "I am
aware" acknowledgements, so a ticked box is a checkable statement. Smart/DangerJS rules
(green-fake catch, first-use triggers, real Jira validation, diff-aware UI/test detection)
remain the deferred NH-16 v2 backlog. Spec: `docs/specs/2026-06-15-pr-merge-checklist.md`.

### Infra changes — local-preview safety-net (NH-206)

`pulumi preview` no longer runs on PRs (it ran arbitrary `infra/*.ts` under the deploy role —
NH-206 review #3). An agent that changes anything under `infra/` MUST recover that safety net:

1. Run `pulumi preview` locally (from `infra/`, with an AWS SSO session). With no SSO session,
   write _"preview not run — review locally before merge"_ under `## Pulumi preview` in the PR
   body and still do step 3 for anything you cannot rule out.
2. Record a one-line **classification** under the `## Pulumi preview` heading in the PR body —
   `safe`, or `destructive`/`exposure` + a short note. **Classification only — never paste
   resource IDs, ARNs, or URLs (the PR is public).**
3. If preview shows a **destructive** change (`replace`/`delete` of an existing resource) or an
   **exposure** change (public access enabled, Function-URL/API auth weakened, or a new
   wildcard/admin IAM grant), file a **required merge-blocker task in BOTH**: the PR-checklist
   item, and a Jira Smart Checklist mandatory task (`customfield_10041`, `-!`) on the NH issue —
   each describing the change so leocaseiro cannot blind-merge it.

The `pr-checklist` gate is **diff-aware**: a PR that touches `infra/**` fails unless the
`## Pulumi preview` section is filled (`tooling/pr-checklist.mjs`, `PR_INFRA_CHANGED` from the
`changes` paths-filter). Spec: `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`.

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
