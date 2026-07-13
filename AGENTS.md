# AGENTS.md — Notation Hero

<!-- hand-seeded; superseded when the L8 generated-from-config + drift-check lane lands -->

> Wave 1 hand-authored stub. The L8 lane replaces this with a generated-from-config
> AGENTS.md + a CI drift-check (DACI L8). Until then this file is the agent contract.

## Current direction — READ FIRST (snapshot, 2026-06-27)

> 30-second version so you don't act on a superseded doc. **Source of truth:** [`docs/decisions/decision-registry.md`](docs/decisions/decision-registry.md) (newest-first change-log) + the ADR [`docs/decisions/2026-06-17-architecture-decisions.md`](docs/decisions/2026-06-17-architecture-decisions.md). **If any doc conflicts with this snapshot or the registry, the registry wins.**

- **Foundation** — plain **pnpm workspaces** + folders-in-one-app (Nx DROPPED 2026-06-17). One **NestJS** app (hexagon inside); FE = **Next.js 16 App Router on Vercel** (re-adopted, ADR 2026-07-08 — supersedes the 2026-06-18 Vite-SPA decision), consuming the `client/` design system.
- **Data** — **Neon Postgres** (catalog) + **DynamoDB** (per-user, M1). **Drizzle** ORM over the `@neondatabase/serverless` HTTP driver. Schema = the 8-table **Playable** model (notation · playable · track · step · playable_link · media · tonal_profile · drum_profile); profiles **per-track**. Schema design is DONE (draft DDL `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`); **not yet applied to a live DB**.
- **Auth (admin gate, v1)** — **Cognito + Google federation + RBAC via `cognito:groups` (`admin` group) + a framework-free `can(user, item, action)` policy**. NOT CloudFront Basic-Auth, NOT a shared password, NOT deferred to M1. Only **end-user** sign-up + cross-device sync are M1.
- **CMS** — the admin is the **same catalog UI with admin-gated actions**; NO separate React-Admin SPA.
- **API contract** — **oRPC** (ts-rest rejected). **Lint/format** — ESLint + Prettier (Biome rejected).
- **Infra** — **Pulumi** (TS); deploy = **push-to-master only** via GitHub OIDC (no AWS creds on PRs); least-privilege role. **Neon is NOT Pulumi-provisioned** (off-AWS); connection string = **Pulumi-secret → Lambda `DATABASE_URL` env var** (not SSM); migrations in an operator runbook.
- **Tracker** — Jira project **NH** (NH-NN). Linear dead; KAN drained.

> **Superseded (bannered) docs — do not treat as current:** the admin-auth in `feature-freeze.md` / `cms-approach.md` / `specs/2026-06-15-cms-admin.md` (Basic-Auth/password), `spikes/2026-06-16-fe-framework-nextjs.md` (Next.js), and any "pnpm + **Nx**" cliff-banner.

## Hexagon layout & boundaries (pnpm workspaces)

The repo is **plain pnpm workspaces** — Nx was dropped (ADR `ARCH-MONO-1`). Five packages: `client/` (Vite + TanStack — design system + Storybook), `web/` (Next.js 16 App
Router — the product client), `server/` (NestJS), `shared/` (cross-cutting types/contracts),
`infra/` (Pulumi IaC). The hexagon lives as **folders inside the one
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
- `pnpm run test:tooling` — `node --test` over `tooling/*.test.mjs` plus `tooling/*.test.sh` shell tests.
- `pnpm run check:supply-chain-pins` — asserts the version-exact `trustPolicyExclude` /
  `minimumReleaseAgeExclude` pins in `pnpm-workspace.yaml` still resolve in `pnpm-lock.yaml`; a lockfile
  bump silently un-matches them and re-trips pnpm's `no-downgrade` / 7-day `minimumReleaseAge` gate,
  re-breaking installs (NH-259).

**Supply-chain release-age gate (NH-259):** `pnpm-workspace.yaml` sets `minimumReleaseAge` (7 days), so
pnpm holds back versions published < 7 days ago — a plain `pnpm add <pkg>@latest` may resolve an older
version or wait (intentional: it dodges compromised fresh releases). To pull a security patch inside the
window, add its exact `name@version` to `minimumReleaseAgeExclude`, then drop it after the window / next
lockfile refresh.

**When authoring a new CI workflow job**, use `- uses: ./.github/actions/setup-js`
(pnpm + Node-from-`.nvmrc` + frozen install) AFTER `actions/checkout@v6`; do not inline
the pnpm/node setup. **Exception:** a dependency-free Node script (e.g. the `pr-checklist`
gate) may use `actions/setup-node@v6` with `node-version-file: .nvmrc` directly — it needs
no pnpm install; leave an inline comment saying so.

- Default branch is `master` (NOT main). Never pass `git commit/push --no-verify`.
- Server, client, and infra tests run under **Vitest** (DACI L5 / NH-194), not Jest — despite
  `nest new` emitting Jest by default.
- DB migrations (`server/`) are **DDL-first** (`ARCH-ORM-1`): the raw SQL under
  `server/src/adapters/neon-postgres/migrations/` is the source of truth. ALWAYS generate via
  `pnpm --filter @notation-hero/server run db:generate` (it passes `--custom`) — never a bare
  `drizzle-kit generate`, which diffs the intentionally-empty meta snapshot and emits a bogus
  duplicate-`CREATE` migration (NH-79 review F10).
- `@notation-hero/infra` Pulumi ops — **from repo root**: `pnpm pulumi:preview` / `pnpm pulumi:up`
  each run `build:deploy` first (`server`→`dist-lambda` + `client`→`dist`, both required by Pulumi)
  then run Pulumi in `infra/`; `pnpm pulumi:destroy` needs no build. Raw no-prebuild form:
  `pnpm --filter @notation-hero/infra run pulumi:preview`. Uses a self-managed **S3 state backend**
  with a `PULUMI_CONFIG_PASSPHRASE` (no Pulumi Cloud token). `up` runs **in CI** on push to
  `master` only (`.github/workflows/deploy.yml`, via GitHub→AWS OIDC + a master-restricted
  `production` environment). **`preview` is LOCAL-only** (NH-206 review #3): a PR-triggered preview
  ran arbitrary `infra/*.ts` under the deploy role, so PRs carry no AWS creds — run `pulumi preview`
  locally before merging infra changes. See the 2026-06-23 and 2026-06-24 CI/CD entries in
  `docs/decisions/decision-registry.md` and `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`.
- Phase-1+ tooling (flat-config lint lane specifics, coverage-ratchet, size-limit,
  type-coverage, tsconfig project-reference sync) — to be filled in as those lanes land.

### Linting & formatting (NH-243)

One system across packages — see
`docs/superpowers/specs/2026-06-26-unified-linting-formatting-design.md`.

- **ESLint**: shared base `eslint.config.base.mjs` + per-package extends
  (`client/eslint.config.js`, `server/eslint.config.mjs`, `web/eslint.config.mjs`).
  Invocation on all three: `eslint . --max-warnings 0`. The base must **not** re-register plugins a
  generator provides (tanstack: `@typescript-eslint`/`import`/`@stylistic`/`node`);
  verify with `eslint --print-config`.
- **Prettier**: one root `prettier.config.mjs` (`printWidth: 100`), separate from
  ESLint (no `eslint-plugin-prettier`).
- **Extra linters**: markdownlint, stylelint, yamllint, cspell, shellcheck,
  actionlint, editorconfig-checker, sort-package-json.
- **Run locally**: `pnpm run fix` (auto-fix), `pnpm run check:all` (everything the CI `lint` + `quality` jobs run — not `build`/`a11y`/`vr`/security scans).
- **Binary tools**: `pnpm run lint:setup` documents the `brew`/`pip` installs
  (shellcheck, yamllint, actionlint). Local hooks skip a missing binary; CI is the hard gate.
- **Hooks**: lefthook auto-fixes staged files on commit, runs the full check on push.
- **CI**: dedicated `lint` job (check-and-block), gated on `code || docs_or_config`.

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

The client has four test layers (full guide: `client/README.md`):

- **Unit** — Vitest + Testing Library (`*.test.tsx`); runs in the `quality` CI job.
- **a11y** — axe-core over every Storybook story in light + dark, resting + hover
  (`*.a11y.ts`); the `a11y` CI job, **blocks merge**. OS-independent.
- **VR** — Playwright `toHaveScreenshot` over the stories (`*.vr.ts`); the `vr` CI job,
  **blocks merge**. Pixel-exact, so baselines are **Linux-only** (committed `-linux`; CI
  and the local `test:vr:docker` script both render in the Playwright container).
- **e2e** — Playwright against the built SPA (`vite preview`, **not** Storybook), with `/api/*`
  mocked by MSW (`*.e2e.ts`, separate `playwright.e2e.config.ts`); the `e2e` CI job, **blocks
  merge**. On failure it uploads traces + the HTML report (D5: `if: !cancelled()`) so a CI failure
  is replayable locally via `npx playwright show-trace`.

### VR baselines are Linux-only — regenerate them with Docker

Playwright embeds the platform in each snapshot filename, but we commit **only the Linux set**
(`button-default-chromium-linux.png`). macOS and Linux rasterize fonts differently (subpixel vs
grayscale antialiasing, different glyph metrics), so one OS is the source of truth; darwin shots
(`*-chromium-darwin.png`) are git-ignored. **CI compares against `-linux`** in the official
Playwright container — never run VR natively on a Mac against these baselines.

Docker Desktop must be running first — on macOS, start it with `open -a Docker` (no need to open
the app by hand). Then run VR locally through that same container from the repo root:

```bash
pnpm test:vr:docker            # compare against the committed Linux baselines
pnpm test:vr:docker:update     # regenerate them after an intended visual change, then commit
```

Both wrap the Playwright image matching `@playwright/test` (v1.61.1). The anonymous `-v` volumes
shadow node_modules so the local (darwin) install is untouched; `--ignore-scripts` skips the
lefthook `prepare` (its git call can't resolve a worktree's `.git` inside the container). The
`:update` variant expands to:

```bash
docker run --rm \
  -v "$PWD":/work \
  -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
  -v /work/shared/node_modules -v /work/infra/node_modules -v /work/.pnpm-store \
  -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm --filter @notation-hero/client exec playwright test --project=chromium --update-snapshots"
```

The `vr` CI job pins `container: mcr.microsoft.com/playwright:v1.61.1-noble`, so its
rendering matches the Docker-generated `-linux` baselines exactly. Bump that image tag in
lockstep with `@playwright/test`, and regenerate baselines on the bump.

One-time cleanup: `tooling/sweep-darwin-vr-baselines.sh` removes any legacy
`*-chromium-darwin.png` baselines still tracked in git (committed before the Linux-only
switch) and opens a PR. Safe + re-runnable — tracked files only, no-op when none remain.

### e2e tests (Playwright vs the built app)

The e2e lane has its own config (`client/playwright.e2e.config.ts`) and runs against the
production build served by `vite preview` — a different server from the Storybook one VR/a11y use.
MSW intercepts `/api/*` at the browser network layer (Playwright `context.route`) and is the source
of catalog data (`client/e2e/mocks/handlers.ts`); there is no real backend in CI. The fixture's
`onUnhandledRequest` errors on any unmocked `/api/*` call, so a mock miss fails loudly at the
network layer instead of silently falling back to the app's "Could not reach the API" state.

```bash
pnpm --filter @notation-hero/client test:e2e       # build -> preview -> run the smoke test
pnpm --filter @notation-hero/client test:e2e:ui    # interactive UI mode
```

**Debugging a CI failure (traces):** the `e2e` job uploads a `playwright-e2e-report` artifact on
every non-cancelled run (so flaky-then-passed traces are kept too). Download it from the run's
**Artifacts** section, unzip, then open the trace timeline (DOM snapshots, network, console,
action-by-action):

```bash
npx playwright show-trace path/to/test-results/<test>/trace.zip
```

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

## Storybook PR previews (GitHub Pages)

`.github/workflows/storybook-preview.yml` publishes the built Storybook to the
`gh-pages` branch: each PR at `https://leocaseiro.github.io/notation-hero/pr/<n>/`
(sticky-commented on the PR), latest `master` at the site root. Auto on `client/**`
changes; also the **`preview`** label or **Run workflow** (`workflow_dispatch` → PR
number). **Not** a `ci-green` gate, so a skip never deadlocks merge. The build runs
untrusted PR code with **no secrets** (only the separate publish job holds the write
token) — the NH-206 no-AWS-creds-on-PRs posture is untouched. One-time: enable Pages
(**Settings → Pages → Deploy from a branch → `gh-pages` / root**). Full guide:
`client/README.md`.

## Commit & review workflow

**Always `git commit` a coherent, green checkpoint BEFORE asking the user to
review or approve.** Review happens on the committed diff / PR — never on
uncommitted working-tree changes. Make baby commits at every green step so
progress is visible and any step is one `git revert` away. Never pass
`git commit/push --no-verify`.

**NEVER delete a remote branch.** After a PR merges, do **not** delete its remote
branch — no `git push origin --delete`, no `gh pr merge --delete-branch`, no deletion
via the GitHub UI/API. The user keeps merged branches on GitHub for history. **Local
cleanup is fine and expected:** remove the merged worktree (`git worktree remove`) and
delete the **local** branch (`git branch -d`/`-D`); only `origin/<branch>` must survive.

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
   each describing the change so the user cannot blind-merge it.

The `pr-checklist` gate is **diff-aware**: a PR that touches `infra/**` fails unless the
`## Pulumi preview` section is filled (`tooling/pr-checklist.mjs`, `PR_INFRA_CHANGED` from the
`changes` paths-filter). Spec: `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`.

## Decision governance

`docs/decisions/decision-registry.md` is the single source of truth for every decision +
its status. Keep it alive:

- **Manual approvals → the register.** Whenever the user personally approves, ratifies,
  or revises a decision (in conversation, an `AskUserQuestion`, or a review), record it in
  the registry's **Change log** (date, outcome, their reasoning). A decision isn't "ratified"
  until it's in the register.
- **PR merge → update statuses.** Every PR that changes what's enforced updates the register
  in the SAME PR: add a Change-log entry and flip affected decisions' status/enforcement
  (⏳→✅, 📄→🤖, clear the 🟥 gap). The register update travels with the PR so it lands
  atomically on merge.

## Public repo — no personal data in committed files

`leocaseiro/notation-hero` is a **public** repository. Do NOT write personal or
medical detail about the maintainer or contributors into any committed file — no
diagnoses, health status, or similar. Describe working preferences **neutrally**
instead (e.g. "the user prefers low cognitive load and to drive decisions"), never
with a diagnosis label. The GitHub username is unavoidably public — it is required
by `.github/CODEOWNERS`, the pull-request template, and the repo URL — so the handle
itself is fine; this rule is about personal data, not the name.

## Working with the user

These conventions exist to **avoid wasted round-trips**. Follow them and the user
rarely has to re-ask, re-explain, or stop to clarify — which saves tokens and time
for the user and for any contributor working through an agent here. The user works
best with **low cognitive load** and prefers to **drive decisions themselves** (they
are non-neurotypical — keep menus small, context inline, and never decide on their
behalf).

**These conventions apply ONLY to user-facing / orchestrator agents** — agents that
talk to the user directly and may call `AskUserQuestion`. **Non-interactive
sub-agents** (research, code-review personas, parallel doc-review agents) run to
completion and **return findings as text — they do NOT call `AskUserQuestion`.**
The conventions then apply to the orchestrator that walks the user through those
findings, not the sub-agent.

### 1. User context

The user:

- Gets distracted and forgets references (file paths, prior decisions, names mid-thread).
- Gets overwhelmed when there is a lot to read, process, or decide at once.
- Prefers to drive answers themselves — do not decide for them; keep menus small enough to scan.
- Has an **infinite-loop distraction pattern**: gets lost in text → tries to find context → gets distracted → repeats. Always provide context inline; never make them search.
- Needs **verbose-but-not-extensive** — context-rich enough to re-anchor, but not so long it causes reading fatigue.

### 2. Message tagging convention

When the user prefixes a message with one of these tags, honor it:

- **`[REPLY <topic>]`** (alias **`[R: <topic>]`**) — the user has read your prior message and is responding. Honor both forms equally.
- **`[ADD <topic>]`** — the user is adding to their _earlier_ message; they have NOT necessarily read your reply yet.
- **`[Topic: <name>]`** — when YOU introduce a new topic, tag it so the user can write `[ADD <name>]` or `[R: <name>]` later.

If a follow-up arrives without a tag AND does not reference your last response, ask one short clarifying line (_"Is this a reply or an addition?"_) before assuming.

### 3. AskUserQuestion behavior (orchestrator agents only)

- **Every question, decision, or confirmation you put to the user is an `AskUserQuestion` tool call — full stop.** Never ask them to answer in prose — no "reply go", "say go", "reply yes", "answer inline", "confirm below". The ONLY messages that may stand without a picker are **pure notifications that need no answer**.
- **Never announce a picker without sending it in the same turn.** If you are going to ask, the `AskUserQuestion` call goes in THIS turn, right after any lead-in. Saying "I'll ask below/next" and then ending the turn = the picker is **stranded** and never arrives (there is no automatic next message). Emit the tool call.
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

- **Tag every question** with a stable `[Q-X.Y]` prefix so the user can reply `[R: Q-X.Y] yes`.
- **Include a "Defer for later" option** in every question when room allows (≤3 substantive options + defer = 4 total).
- **Keep lead-in text short** (~10 lines) before an AskUserQuestion call — the desktop overlay pushes preceding text into a cramped scrollable region.
- **Option-label glyphs** — prefer keycap numbers (1️⃣ 2️⃣ 3️⃣ 4️⃣) for readability. Avoid filled enclosed letters (🅰 / 🅐, hard to read); if you need letter labels use `A)` `B)` or outline Ⓐ Ⓑ.
- **Confirm before saving memories** — propose memory writes via AskUserQuestion (or prose); save only after a yes.
- **Skills and subagents do NOT suspend these conventions.** As soon as control returns to the orchestrator agent, the next decision MUST use `AskUserQuestion`, never a numbered prose "confirm before I…" list.
- **Always give the user a window to add context before a picker locks in.** With 1–3 real questions, make one card a follow-up catcher: `[Q-add] Anything to add before I act on these?` → _"Nothing — go ahead" / "Added it in Other" / "Hold — more coming."_ With a full 4 real questions, post a brief FYI notification first (not a question), pause ~10–20s, then send the picker. Never solicit or wait for a prose "go"/"yes" — the picker always fires.

For each question, supply decision-critical context **outside** the picker (it is too cramped for long text): **What's wrong** · **Proposed fix** (examples / code snippets if applicable) · **Why it works**.

### 4. AskUserQuestion content depth (chunked reviews)

Decision-critical context belongs WITH the question, but the cramped picker UI makes long context unreadable inside it. **Split by context size:**

- **Short context (1–2 sentences)** → inline in the question; it stands alone.
- **Long context (paragraphs, code, trade-offs)** → put it in the RESPONSE BODY as small labeled chunks (`📖 Chunk A / B / C`, `📖 F-N`, `1️⃣ / 2️⃣ / 3️⃣` per option). The picker stays LEAN and REFERENCES the chunks by name.

**The DECISION is still a picker** — never an appended "answer inline / answer 1–4" prose list. Findings → prose chunk (visible). Decision → `AskUserQuestion` (tool_use). This binds even inside skills.

**Per-option rationale** lives in the chunk as a **What / Why / Cost** mini-section per option. Include a **code POC snippet** when the option concerns code/types/APIs — the snippet makes trade-offs visible that prose cannot.

**Comparing competing alternatives (A vs B vs C):** present it in _layers_, never a bare grid. (1) Depth per option — prose pros/cons (plus What/Why/Cost/POC where it helps). (2) An at-a-glance table as an _addition_ — `Option | Pros | Cons | Best-when`. (3) The decisive trade-off — one line naming the axis the choice turns on. (4) A recommendation + flip condition — _"Recommend 1️⃣ because …; flip to 2️⃣ if …"_. Mark the pick `(Recommended)`. The table never replaces the depth. When the user says **"compare"**, apply this full format.

#### Finding format inside chunks (for reviews)

For chunks that represent **findings** in a doc/plan/code review (`📖 F-N`), use a tight 3-part structure: **What's wrong** (concrete, with line refs if applicable) · **Proposed fix** (the specific change) · **Why it works** (why the fix solves the problem).

#### Review walk-through pattern

1. **Establish all findings in prose** — present each as a labeled chunk:

   ```text
   ### 📖 F-10 — <short title>
   **What's wrong:** …
   **Proposed fix:** …
   **Why it works:** …
   ```

2. **Walk findings in batched lean Qs** — once the chunks exist, ask in 4-batches with lean reference-questions:

   ```text
   [Q-F10] F-10/45 P1 — <short title> (see 📖 F-10). Apply?
      - Apply (Recommended) — …
      - Defer to Open Questions
      - Skip
      - Auto-resolve rest
   ```

   Each finding is explained ONCE (in the establishing message); each Q references its chunk; question text stays under ~150 chars; the option set is consistent across the batch; `Auto-resolve rest` is an escape hatch when the user trusts the recommendations.

**Send the picker in the SAME turn — never strand it.** Write the `📖 F-N` chunks as a text block, then immediately emit the `AskUserQuestion` tool_use in the same turn. Do NOT end your turn after the chunks — there is no automatic "next message", so the promised picker never fires (the #1 stranded-picker bug). Keep the **picker self-sufficient**: its question + option text must be decidable even if the lead-in is hidden; the chunks add depth, not the essentials.

**No ghost references.** If your question says `(see 📖 F-X above)`, the chunk `📖 F-X` MUST exist in the same message OR the immediately-preceding assistant message. Before sending, scroll up — is the chunk actually there? If not, write it in the SAME message before the AskUserQuestion call.

### 5. Async communication channels

- **Out-of-order messages:** you do not see timestamps. When two consecutive user messages arrive and the second does not acknowledge your last response, do not assume it is a reply — ask: _"Is this a reply to my last message, or an addition to your previous one?"_ The user can bypass via `[REPLY]` / `[R:]` / `[ADD]`.
- **The "Other" textarea in AskUserQuestion is a side channel:** the user sometimes adds new, unrelated context there because it lands faster than a separate message. Treat "Other" content as potentially-real content, not just a custom answer.

### 6. Auto-recap on resume

Generate a 3-bullet recap **before** answering anything else when: the user says `"refresh me"` / `"recap"` / `"where were we"` / `"catch me up"`; a long idle pause is detected (> ~15 min); or a message starts mid-thought and does not reference your last response. Format — exactly 3 bullets: **You were here** (what we were working on) · **We decided** (key decisions/state) · **→ Next** (next concrete action, with a clickable link if a file is involved).

### 7. Communication style

- **Structured verbose with headers** — never wall-of-text, never overly terse. Use headers, code blocks for outside-worktree paths, tables for comparisons. Verbose AT the response level, terse WITHIN each bullet/chunk.
- **Detail delivered in small chunks**, not one wall.
- **Reminders inline** for any concept the user might have forgotten — never "Rule 3" alone, always "Rule 3 (the X rule, in file Y)".
- **Expand acronyms inline on first use** per response AND inside every `AskUserQuestion` question text.
- **End every multi-step response with a `→ Next:`** line for clean re-entry after pauses.

### 8. File / path links — clickable inside, plain outside

- **Inside the working directory:** markdown links with relative paths render as clickable — `[foo.ts:42](src/foo.ts:42)`.
- **Outside the working directory** (`~/.claude/`, system locations, other worktrees): markdown links do NOT render as clickable — use plain absolute paths in a code block so the user can paste into Finder (`⌘⇧G`) or a terminal.
- **Offer to `open <path>`** on request for outside-worktree files.

### 9. Visible-progress aids

- **Live checklist** (the TodoWrite tool or equivalent) for any 3+ step task. Mark items completed as you go; update continuously, do not batch.
- **Chapter markers** for major phase shifts within a session (investigation → implementation → verification). Title (< 40 chars) + one-line summary. Do not over-mark (3–8 per session).

### 10. Section-by-section review pattern

For any structured review (doc, plan, code/PR), walk **section by section**. Every section ends with at least one `AskUserQuestion` for explicit ack, even when there are no findings.

- **No findings:** a single `[Q-§X.Y.ack]` _"anything else?"_ with options `LGTM` / `Comments` / `Defer`.
- **Has findings:** each finding as `[Q-§X.Y.N]` first, then the `[Q-§X.Y.ack]` wrap-up.
- The 4-question-per-call cap applies; split large sections across sequential calls under the same `[Q-§X.Y.*]` prefix.

### 11. Decision routing (memory vs doc vs commit vs inline)

When a non-trivial decision lands, do NOT auto-save to memory — classify and propose the right destination: **universal rule** (cross-project) → memory · **project convention** → project memory or this file · **doc-specific decision** → edit the `.md` directly · **code decision** → commit message · **one-off** → acknowledge inline, do not persist. For plan/doc reviews specifically, default to editing the doc.

### 12. Dispatching subagents

When you dispatch an **interactive** subagent (one that can call `AskUserQuestion` directly — typically `general-purpose`), include these conventions in the dispatch prompt: _tag every Q with `[Q-X.Y]`, batch related Qs up to 4 per call, multi-turn rounds when more are needed, include "Defer for later" per Q, section-by-section review with a mandatory `[Q-§X.Y.ack]` per section, and the chunked-review pattern (long context in response-body chunks, lean question references them)._

**Most subagents are non-interactive** — they run to completion and return findings. For those, the conventions apply to **you (the orchestrator)** when you walk the user through findings, not to the subagent:

```text
User ←→ You (handle all UI; ask, structure, walk-through)
        ↓ dispatch (no UI between subagent and user)
        Subagents (do work, return findings)
        ↑ return
User ←→ You (section-by-section walk per §10)
```

### 13. Session references — use the human-readable name

When referencing a prior agent session (relevant only where a session list exists, e.g. a Desktop client), use the **human-readable session name** as the primary identifier — the title shown in the session list and searchable via `/resume`. An auto-generated worktree ID may appear in parentheses as a bonus, never as the primary reference. Format: `"Session Name" (worktree: short-id, branch: branch-name)`.

### Full paths in output

When referencing files in messages, print the **full path including the worktree directory** (e.g. `.claude/worktrees/my-branch/docs/plans/foo.md`), not just the repo-relative path — relative paths are ambiguous across worktrees.

> **Commit before review** is covered above under **Commit & review workflow**: always commit a coherent, green checkpoint before asking the user to review, and review on the committed diff / PR — never the uncommitted working tree.
