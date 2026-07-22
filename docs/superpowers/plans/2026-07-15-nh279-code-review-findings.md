# NH-279 / PR #140 — independent code-review findings (2026-07-15)

> A **second, fresh** whole-branch review, run because the implementation plan
> ([`2026-07-15-nh279-catalog-read-service-boundary.md`](2026-07-15-nh279-catalog-read-service-boundary.md))
> was never reviewed before implementation started. Eleven reviewers ran against the branch diff with
> the earlier [`2026-07-15-nh279-followups.md`](2026-07-15-nh279-followups.md) **filtered out of their
> input**, so F-1…F-7 could not anchor them. Where they land on the same issue, that is genuine
> corroboration, not an echo.
>
> **Verdict: ready with fixes.** Nothing here blocks the architecture — the service boundary itself was
> endorsed by every lens that looked at it. Findings R-1 and R-3 should land before merge; the rest are
> yours to sequence.

## How to read this

- **R-N** = this review. **F-N** = the earlier follow-ups doc.
- _Confidence_ is the reviewers' shared anchor scale: **100** = true by inspection; **75** = verified,
  with a named observable consequence.
- Every finding at 75+ carries the verbatim line that makes it true.

## What the review endorsed (worth knowing before the findings)

These were checked against the **version-exact bundled Next.js 16 docs**, not training data:

- **The caching design is correct.** The combination of `'use cache: remote'` (durable, shared across
  instances), `cacheTag('catalog')`, `cacheLife('days')`, `connection()` and `<Suspense>` matches the
  bundled docs' own example. `revalidate` = 1 day is background/non-blocking; `expire` = 1 week is the only
  synchronous block. The Lambda hop genuinely stays off the hot path.
- **`GET /api/catalog` being unauthenticated is right**, not an oversight. The access boundary is the
  DB-layer `WHERE status='published' AND listable=true AND origin='curated'` — drafts and user uploads
  cannot leak. Adding auth would be wrong.
- **The Lambda Function URL is not bare-public**: `infra/index.ts:65` sets `authorizationType: 'AWS_IAM'`
  with CloudFront OAC. **Implication for deployment: `API_BASE_URL` must point at CloudFront, not at a raw
  Function URL** — the latter 403s without SigV4 signing.
- **Zero security findings.** No credential ever existed in `web` on this base; error paths route through
  `DbExceptionFilter` → `redactConnectionString`; the new public-repo docs carry no secrets.
- **Zero maintainability findings.** Deleting `web/app/lib/db.ts` + `catalog-schema.ts` is a real
  complexity win, and the shared contract is a clean pure-type module.
- **Governance is clean.** The supersession is recorded consistently across the registry, the new ADR, the
  bannered old ADR, and `AGENTS.md`. It closes the exact `ARCH-AUTHZ-1` divergence the registry flagged
  (web's copy of the WHERE had already drifted, missing `origin='curated'`).

---

## R-1 — No timeout on the web→server fetch (P1, confidence 100)

**Corroborated independently by three reviewers** (reliability, performance, correctness) — the strongest
signal in the set.

**What's wrong:** `web/app/lib/catalog.ts:15` — `const response = await fetch(`${base}/api/catalog`);` —
has no `AbortSignal`. The deleted `web/app/lib/db.ts` bounded its Neon read at 8s, and the server still
bounds its own Neon call at 8s (`catalog-db.adapter.ts:22`) _specifically_ so a slow wake returns a clean 503. **That guard does not cover the new web→Lambda leg.** `web/vercel.json` sets no `maxDuration` either.

**Why it matters:** on a cache miss (first load, post-purge, weekly expiry — all real, recurring paths) a
cold or hung Lambda leaves the Vercel function waiting until the _platform_ timeout kills it — which
**bypasses `error.tsx` entirely**, so the user gets a platform error page instead of the friendly retry
this PR built.

**Proposed fix:**

```ts
const response = await fetch(`${base}/api/catalog`, { signal: AbortSignal.timeout(8000) });
```

Mirrors the repo's own 8s convention. The `AbortError` propagates through the existing throw-based design
into `error.tsx`. Existing tests mock `fetch`, so they still pass.

**Same as F-1** — but independently rediscovered and upgraded from "cheap win" to P1.

## R-2 — Deploy skew bakes literal "undefined" into the day-long cache (P1, confidence 75)

Found only by the adversarial lens. **I verified its load-bearing claim directly.**

**What's wrong:** `web/app/lib/catalog.ts:20` — `const data = (await response.json()) as CatalogResponse;`
— a compile-time cast. Nothing normalizes or validates, so a missing `level` passes through as
`undefined` while typed `number | null`, and `LevelPill` renders `String(level)` → the literal text
**"undefined"**.

**Why it matters — this PR's own merge creates the window.** Confirmed from the workflows:

```
deploy.yml:14    workflow_run: types: [completed], branches: [master]   <- server waits for full CI
web/vercel.json  (no CI gate; only an ignoreCommand for gh-pages)       <- Vercel builds immediately
```

So on merge, **Vercel ships the new `web` while the server Lambda is still waiting for CI**. New web asks
for `level`; the old server doesn't send it. One request in that window caches `"undefined"` Level cells
under `cacheLife('days')` — and **no route calls `revalidateTag('catalog')`**, so "Try again" re-reads the
poisoned entry. Only a `web` redeploy (new Build ID) clears it.

**Proposed fix — pick one:**

```ts
// (a) degrade to the existing Ungraded rendering
return data.items.map((item) => ({ ...item, level: item.level ?? null }));

// (b) fail loudly — a throw is never cached, so retry genuinely recovers once the server catches up
if (!Array.isArray(data?.items)) throw new Error('catalog API returned an unexpected body');
```

Or pull the F-2 Zod parse into this PR and let a missing `level` reject. **Sequencing note:** merging the
server _before_ web also sidesteps the window.

**Sharpens F-2** from a general "deploy skew is possible" into a specific, dated consequence.

## R-3 — The deterministic order is pinned by nothing (P1, confidence 100)

**Corroborated by two reviewers** (testing, api-contract), and testing added the fact that makes it P1.

**What's wrong:** `server/src/modules/catalog/catalog.controller.spec.ts:109` —
`expect(spies.orderBy.mock.calls[0]).toHaveLength(2);` — asserts only that **two columns were passed**.
Swap `asc(playable.level), asc(playable.title)` to the wrong columns, wrong order, or `desc(...)` and the
test still passes; the fake chain ignores its arguments.

**Why it matters:** the ordering is a headline promise of this PR, and the only other guard — the
`describe.skipIf(!integrationUrl)` Neon block in the same file — **never runs in CI**. The `quality` job
sets no `DATABASE_URL`; only `deploy.yml` and `seed-catalog.yml` do, and neither runs server unit tests.
**A sort regression has zero safety net today.**

**Proposed fix:** extend the existing DB-gated integration block with 3+ rows spanning distinct
levels/titles and assert `res.items.map(i => i.id)`, then run that block in CI against a Neon branch.
A cheaper interim: snapshot `spies.orderBy.mock.calls[0]`.

**Same as F-3** — but F-3 rated it "low/optional". The never-runs-in-CI fact makes that rating wrong.

## R-4 — Difficulty column sorts alphabetically (P2, confidence 75)

**What's wrong:** `web/app/catalog/catalog-table.tsx:16` —
`{ accessorKey: 'difficulty', header: 'Difficulty', meta: { align: 'center' as const } }` — no
`sortingFn`, so TanStack sorts the **label string**. Clicking "Difficulty" orders Advanced → Beginner →
Debut → Expert → Intermediate: alphabetical, not by difficulty.

**Why it matters:** the column invites a click and returns a meaningless order — directly against the
server's `.orderBy(asc(playable.level), asc(playable.title))` intent. This is user-visible on the page
this PR ships.

**Proposed fix:** sort by the underlying grade, or disable sorting on the column since Level already
provides that ordering:

```ts
sortingFn: (a, b) => compareLevel(a.original.level, b.original.level),
// or: enableSorting: false
```

**New — the first review missed this entirely.**

## R-5 — Level sort puts Ungraded first and is inconsistent for null vs 0 (P2, confidence 75)

**What's wrong:** `web/app/catalog/catalog-table.tsx:11-14` — the `level` column has no `sortingFn`, but
`level` is `number | null` (`shared/src/contracts/catalog.ts:14`). TanStack's default comparator does not
match Postgres `NULLS LAST`, so ascending puts **Ungraded above level 0**.

**Why it matters:** "sort by level" is the table's main affordance and it disagrees with the server's own
ordering.

**Proposed fix:**

```ts
sortingFn: (a, b, id) => {
  const av = a.getValue<number | null>(id);
  const bv = b.getValue<number | null>(id);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return av - bv;
},
```

TanStack negates for desc, so this yields ungraded-first on desc; pinning bottom in both directions needs
the desc flag threaded through.

**New — the first review missed this too.**

---

## Applied in this branch (not deferred)

**`tooling/dev.sh` — the runner lied about its own exit code.** Caught by the agent-native and adversarial
lenses, and **it was my own regression from this session**, so it is fixed rather than filed:

- `exec tmux attach-session` failed with `exit 1` for any **non-TTY** caller (an agent's shell, CI) **and
  from inside an existing tmux session** — while both servers were in fact running detached. The exit code
  said "nothing started". Since Leo works inside a tmux session, `pnpm dev` would have failed for him.
- `select-pane -t "$SESSION:apps.0"` assumed `pane-base-index 0`; with `pane-base-index 1` it errors
  `can't find pane: 0`, and `set -e` then aborted **after** the panes were up — the same class of bug.

Now: attach is attempted and any failure is benign (always exit 0, with attach/log/stop commands printed);
inside tmux it prints `tmux switch-client -t nh-dev`; pane IDs are captured (`%0`, `%1`) instead of
assumed. Verified across all four paths.

## Noted but below the reporting bar (confidence 50 — your call)

| #   | What                                                                                                                                                                                                    | Where                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| R-6 | `API_BASE_URL` with a trailing slash → `//api/catalog`. AWS emits Function URLs **with** a trailing slash, so this is the likely production paste. Fix: `process.env.API_BASE_URL?.replace(/\/+$/, '')` | `web/app/lib/catalog.ts:15` |
| R-7 | A cached wrong-shape 200 leaves `/catalog` stuck on the error page; "Try again" cannot clear it (same root as R-2)                                                                                      | `web/app/lib/catalog.ts:21` |
| R-8 | `web/vercel.json`'s gh-pages `ignoreCommand` (NH-277, commit `f02f78a`) rode along in this NH-279 branch — unrelated ticket, not in the plan's file list                                                | `web/vercel.json`           |
| R-9 | `AGENTS.md` still locks "API contract — **oRPC**", and the hand-rolled contract is reconciled only in code comments + the design spec — **not** in the ADR or registry, the two source-of-truth docs    | `docs/decisions/`           |

## Prose findings (no severity — context, not defects)

- **`.claude/launch.json` wires only half the system.** It declares `web-dev` (port 3002) and nothing for
  the server, so an agent using it to preview `/catalog` gets the error boundary — the second step exists
  only as prose in `AGENTS.md`. Adding a server entry would close it.
- **`client/src/components/About.tsx` is an existing consumer of `GET /api/catalog`** that still
  hand-duplicates its own `CatalogPlayable`/`CatalogResponse` interface. The duplication this ADR claims to
  solve was fixed for `web/` only. Harmless today (additive field, ignored) — but the shared contract is
  not yet universal.
- **`docs/spikes/2026-07-08-nextjs-vercel-free-tier-caching-search.md:94-96` still shows the stale bare
  `'use cache'`** pattern with no correction banner. Anyone reading that spike in isolation copies the
  wrong (per-instance, cold-start-losing) pattern. A one-line banner pointing at the NH-279 plan fixes it.

## Coverage / what this review did NOT cover

- **No cross-model pass.** `codex` is not installed, so no independent peer model reviewed this. Every
  finding comes from one model family — a real limit on this review's independence.
- **Reviewers run:** correctness, security, adversarial, api-contract, performance, reliability, testing,
  maintainability, project-standards, agent-native, learnings (11).
- **Skipped, with reason:** `data-migration` + `deployment-verification` (no migration or schema artifacts
  in the diff); `previous-comments` (the PR's only comments are bots — no human feedback to verify); the
  frontend-races persona (it targets Stimulus/Turbo; this is React).
- **Suppressed:** 5 findings at anchor 50 (listed above). No findings at anchor 25 or below were emitted.
- **Requirements check:** the plan is legacy-shaped (Tasks 1–6, no R-IDs/U-IDs) and was auto-discovered
  rather than linked from the PR, so it is advisory only. Tasks 1–5 are all represented in the diff.
- **Not independently validated:** R-4 and R-5 rest on a single reviewer (correctness). R-2's deploy-order
  claim **was** verified directly against the workflow files.
