# Decision Changelog — Notation Hero

> Manual approvals + merge-status updates, newest first. Extracted from
> [`decision-registry.md`](decision-registry.md) on 2026-07-15 to keep the registry
> small (~350 lines of current state per topic) while preserving the full 26-date
> merge history here.

## Change log — manual approvals & merge status updates

Living record (newest first). Per AGENTS.md "Decision governance": every decision leocaseiro manually approves lands here, and every PR merge updates affected statuses here.

> **Merge note (NH-16):** this file is `merge=union` (see `.gitattributes`) — when two PRs each add a change-log entry, git keeps **both** instead of conflicting. Entries may land slightly out of newest-first order after such a merge; re-sort by hand if it matters.

### 2026-07-15 — Docs graveyard cleanup + canonical before-PR runbook + HARD ship-mode freeze (meta)

Session `docs-confusion-review` (worktree `clever-mendel-8e382c`, PR #143) triaged the doc graveyard (30+ `SUPERSEDED` markers), archived 8 shipped-ticket plans + predecessors → `docs/archive/2026-07/`, strengthened 8 partial-supersession banners with explicit "sections still current" lists, and landed `docs/runbooks/before-pr.md` (the 15-step canonical workflow leocaseiro codified: brainstorming → doc-review → plan → doc-review → execute → code-review → audit → merge, with 4 supplemental rules and 8 escape hatches for trivial changes).

- **Ship-mode freeze — HARD, ACTIVE from 2026-07-15.** No new spec/plan/ADR of any kind until leocaseiro explicitly ends the freeze in a change-log entry titled "End ship-mode freeze". Rationale: forcing function against the start-many-finish-few pattern surfaced during this review. Bugfixes, code changes, cleanup PRs, and change-log entries documenting already-decided work are unaffected.
- **Related out-of-PR work in the same session:** 5 dirty worktrees preserved as WIP branches on origin ([issue #142](https://github.com/leocaseiro/notation-hero/issues/142)); 14 worktrees pruned (Tier 1 + Tier 2, 62 → 48).
- **Not in this PR:** deeper Tier 3 worktree cleanup (46 remaining with novel commits / dirty files) — deferred.

**Status:** ✅ ratified · 🟡 partial enforcement — the freeze is prose-only (agent behavior); the runbook is prose-only (agent behavior); the archive move is machine-visible (directory-level signal). Approved by leocaseiro 2026-07-15.

### 2026-07-14 — Catalog read: service boundary (web reads via the server API) (NH-279)

leocaseiro approved having `web/` read the catalog via the server's `GET /api/catalog` (cached) instead of querying Neon directly. Full record: [`docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md`](2026-07-14-catalog-read-service-boundary-adr.md).

- **Why:** PR #140 review found `web/` duplicated the server's Drizzle schema + the ARCH-AUTHZ-1 visibility `WHERE`; the "extract to a shared drizzle table" fix fails the CJS/ESM dual-package hazard (server is CJS `nodenext`, `shared` is ESM). Path 2 dissolves the duplication by deletion — `shared/` carries only a pure TypeScript contract; web sheds `drizzle-orm` + `@neondatabase/serverless`.
- **Scope:** supersedes the direct-Neon read path **for the catalog + Drizzle-schema-dependent reads** only (not a blanket ban); the 2026-07-08 BFF ADR otherwise stands (bannered).
- **Cost accepted:** a Lambda hop on cache-miss reads (bounded, cacheable-away).

**Status:** ✅ decided · 🟡 partial enforcement — the ADR is filed, but the implementation (PR #140) is on hold pending a further brainstorm on the concrete shape. This change-log entry preserves the ratified decision independently of the implementation PR's outcome. Approved by leocaseiro 2026-07-14 (cherry-picked into PR #143 on 2026-07-15).

### 2026-07-12 — Design-system distribution: direct consumption + accept scoped-glob CSS over-generation (NH-275)

leocaseiro ratified how apps consume the design system (`client/` → future `design-system/`). Full record: [`docs/decisions/2026-07-12-design-system-distribution-adr.md`](2026-07-12-design-system-distribution-adr.md). Refines the NH-275 Phase 1 `@source` pattern; pairs with the 2026-07-08 FE-pivot entry.

- **CSS distribution = scoped whole-component `@source` glob; over-generation accepted.** Apps consume directly (JS via the package + `transpilePackages`; CSS via Tailwind scanning the shared source). Tailwind's scanner is filesystem-based, **not** import-aware, so every scanned component ships its CSS whether or not the app imports it — an explicitly accepted, measured trade (~0.2 KB-gzip per unused component; single-digit KB total, cached once) in exchange for never hand-maintaining a per-component `@source` list. Glob is scoped to components and excludes co-located stories/tests: `@source '…/components/ui/**/*.tsx'` + `@source not '…/*.stories.tsx'` + `@source not '…/*.test.tsx'`.
- **Rejected:** a per-import `@source` script (transitive-graph fragility, silent missing-class failures, no off-the-shelf tool); copy-in / shadcn registry as primary (drift + orphans the co-located VR/a11y/unit gates — kept only as an eject hatch); switching to import-aware CSS (vanilla-extract/StyleX/Mantine/Panda — they solve it but require leaving Tailwind / rewriting the 40 `cva` components).
- **Evidence:** a ce-code-review performance pass measured the over-broad `@source '../../client/src'` scanning **882 files** (the client SPA `routes/`/`hooks/` + the test/story harness, not just components) and shipping `Sidebar`/`Sheet`/`Field` classes the app can't import. The scoped-glob fix applied to the NH-275 web PR (#135).
- **Also decided (from the brief):** extract tokens to `@notation-hero/tokens`; the design-system package should own its `@source` so consumers don't hardcode `../../client/src`.

**Status:** ✅ decided (CSS-distribution mechanism + tokens split + direct-consumption model) · ⏳ enforcement pending — flips when the scoped glob lands in #135 and the tokens / `design-system` rename ships (Phase 2). The `client/ → design-system/` rename and the RSC/Capacitor component seam remain **recommended follow-ups** in the ADR, not yet ratified. Approved by leocaseiro 2026-07-12.

### 2026-07-07 — Component library: Radix + cmdk → Base UI (NH-254 pilot)

Full record: [`docs/decisions/2026-07-07-radix-to-base-ui-migration.md`](2026-07-07-radix-to-base-ui-migration.md). leocaseiro decided to consolidate on **Base UI** (`@base-ui/react`, current package name — not the superseded `@base-ui-components/react`) in place of `radix-ui` + `cmdk`, piloted on the NH-254 catalog components (PR #99) before the wider fleet grows more Radix surface area.

- **Headline change:** `FacetFilter`/`TokenPicker`/`Command` move off a hand-rolled `cmdk` combobox onto Base UI's first-class `Combobox` (built-in multi-select chips + `filteredItems`/`filter={null}`/`onInputValueChange` for async filtering) — `cmdk` is dropped entirely.
- **Tabs/RangeSlider/ToggleChipGroup/Popover** map cleanly to Base UI equivalents (`Tabs.List` gains `activateOnFocus`/`loopFocus` for NH-268; `Popover` renders inline by omitting `Popover.Portal`, cleaner than the current Radix workaround).
- **Gap:** `Combobox` has no built-in `loading` boolean — `useTransition`/`aria-busy`/`Combobox.Status` wiring required to keep the existing `loading` prop on the public contract.
- **Freezes** the in-flight NH-262 (#101/#109/#112) and NH-264 primitive PRs at their current Radix state pending redirect to the Base UI mapping in the ADR. _(Resolved 2026-07-09: those PRs migrated to Base UI and merged to master first; #99 then realigned onto them via merge — zero conflicts.)_

**Status:** ✅ decided · 🟡 partial (updated 2026-07-09 — PR #99 merged) — `cmdk` removal is machine-checked by its absence from `package.json`/`pnpm-lock.yaml`; `radix-ui` intentionally **stays** for `Button`/`Badge`'s `Slot` only (ADR scope — migrate only if a later PR needs it), and that Slot-only restriction is prose-only today (no lint rule blocks new `radix-ui` imports).

### 2026-07-08 — FE pivot: Next.js PWA on Vercel + NestJS-on-Lambda (hybrid BFF)

Re-adopts **Next.js** (App Router PWA) as the product FE, hosted on **Vercel** now (optional AWS re-host later — Amplify/EC2, OpenNext skipped); keeps the **NestJS-on-Lambda** backend behind a hidden, OAC-locked
`api.notationhero.com → CloudFront → Lambda` API, with **Vercel as a BFF** for SSR / server-actions
(hybrid topology). Neon (catalog, cached via `"use cache"`) + DynamoDB (per-user) + Cognito +
**Cloudflare R2** blobs + Postgres FTS. ADR `docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`,
spike `docs/spikes/2026-07-08-nextjs-vercel-free-tier-caching-search.md`.

- **Supersedes** `ARCH-FE-1` (Vite + TanStack SPA) and closes the 2026-06-16 no-Next.js chain. The new
  variable that resolves the three-time loop: **Vercel hosting** removes the AWS-SSR $0 objection.
- **$0 at portfolio scale**, hard-stops at caps. Watch-outs: Vercel Hobby is non-commercial (→ Pro
  $20/mo, mitigated by re-hosting on AWS — Amplify/EC2), and the new AWS account closes at 6 months unless
  upgraded to the Paid plan.
- **Open:** v1 offline scope (Dexie in v1 or later) — deferred to v1 planning. Follow-up: update the
  `notation_hero_no_nextjs` project memory (currently records Next.js as rejected).

### 2026-07-08 — VR baselines are Linux-only (NH-189, PR #123)

Visual-regression (VR) baselines are now committed for **Linux only** (`*-chromium-linux.png`); the
81 macOS `*-chromium-darwin.png` baselines were deleted. macOS and Linux rasterize fonts differently
(subpixel vs grayscale antialiasing, different glyph metrics), so every darwin/linux pair differed —
one OS is enough as the source of truth. Supersedes the per-OS setup from the NH-189 design-system
foundation.

- **Enforcement:** `*-chromium-darwin.png` is git-ignored (`client/.gitignore`), so a Mac
  `test:vr:update` can still generate local shots for iteration but can never commit them. 🤖
- **Local runs use Docker:** new root scripts `test:vr:docker` / `test:vr:docker:update` render in
  the pinned `mcr.microsoft.com/playwright:v1.61.1-noble` container — the same image the `vr` CI job
  uses, so local and CI rendering match. Running VR natively on a Mac is no longer a supported path
  (docs updated in `client/README.md` + `AGENTS.md`).
- **CI unchanged:** the `vr` job already compared `-linux` inside the container and stays green.

### 2026-07-07 — NH-262 Part 1 primitives ship on Base UI (not Radix) + Button `link` dark-token fix (PR #101)

Records two changes in PR #101 that the plan and PR body originally mis-described. Part of the wider
**NH-269** Radix→Base UI migration; qualifies the brand-600 link-contrast note in the 2026-06-25
NH-189 entry below.

- **Primitives are built on `@base-ui/react` `1.6.0` — a NEW dependency, not the existing `radix-ui`.**
  `Breadcrumb` uses Base UI `useRender` (was Radix `Slot`); `Tooltip` uses `@base-ui/react/tooltip`.
  The plan's "Radix, not Base UI / no new dependency" decision is reversed: `@base-ui/react` (plus
  `@base-ui/utils`, `reselect`) is added to `client/package.json`; `radix-ui` stays for the
  not-yet-migrated components. This aligns the PR with the NH-269 decision taken after the plan was
  written — the PR moves WITH the migration, so the earlier "hold, builds on Radix" note on it is stale.
- **Button `link` variant dark-mode token corrected.** `dark:text-brand-600` (#0d9488) → `text-primary`
  (both themes) + `hover:text-[color-mix(in_oklch,var(--primary),black_12%)]`. **Why:** the NH-189
  entry recorded brand-600 dark links at 5.27:1, but that was the default dark **background** only.
  Breadcrumb newly renders the same classes on a `--muted` **surface**, where `dark:text-brand-600`
  measures **3.95:1 — fails AA**. `text-primary` clears AA on every surface the components paint
  (resting 7.9–10.6:1, hover 5.6–7.5:1). Read the NH-189 "passes AA on dark bg" note and the
  `styles.css` brand-600 comment as default-background-scoped.
- **Enforcement (🤖 NEW):** `client/src/dark-contrast.ts` + `dark-contrast.test.ts` + a `Button.test.tsx`
  "link variant dark-mode contrast (AA)" block pin AA ratios per token pair, read from the real
  `styles.css` values, so a future token edit fails fast in unit tests on every surface — not just the
  one a story happens to render.
- **Overlap — PR #118 (NH-264, Button+Badge Radix→Base UI):** #118 rewrites `Button.tsx` imports + base
  class + `asChild`→`render` but does NOT touch the `variants.variant` map, so `Button.tsx` merges
  cleanly and this PR's `link` fix survives either merge order. Real rebase conflicts (whichever lands
  second): both PRs independently add `client/src/vr-helpers.ts` (add/add — #118's `statesForStory` API
  is a superset), `Button.vr.ts` (content), 6 `link` snapshot PNGs, and the `@base-ui/react` specifier
  (`1.6.0` exact here vs `^1.6.0` in #118 — align before merge). #101 owns the `link` fix; #118
  reconciles the VR helper on rebase.

### 2026-07-05 — Storybook PR previews on GitHub Pages (NH-266, PR #113)

Per-PR Storybook previews publish to the `gh-pages` branch of this public repo — each PR at
`/pr/<number>/`, latest `master` at the site root — so the component library is reviewable in the
browser with no local setup. Spec `docs/specs/2026-07-05-storybook-pr-preview-design.md`, plan
`docs/archive/2026-07/plans/2026-07-05-storybook-pr-preview-plan.md`.

- **Mechanism = hand-rolled `peaceiris/actions-gh-pages`, NOT `rossjrw/pr-preview-action`.** rossjrw
  hardcodes a `pr-<n>` inner path (verified in its `lib/main.sh`) and cannot produce the required
  bare-number `/pr/<n>/`; peaceiris gives exact `destination_dir` control. Cost: a hand-written
  sticky comment + cleanup-on-close.
- **Classic `gh-pages` BRANCH source, NOT the `actions/deploy-pages` artifact model** — the artifact
  model replaces the whole site per deploy, so independently-accumulating per-PR folders need a
  branch. One-time manual: Settings → Pages → Deploy from a branch → `gh-pages` / root (enabled
  2026-07-05).
- **Storybook base path via `viteFinal`** reading `STORYBOOK_BASE_PATH` (default `/`) — Storybook v10
  has no `--base` CLI flag; the default `/` leaves `dev` / `vr` / `a11y` / `build` unchanged.
- **NOT a `ci-green` required check** — absent from `ci-green`'s `needs:`, so a skip on a
  non-`client` PR never deadlocks merge. The build runs untrusted PR code with **no secrets**; only
  the separate publish + cleanup jobs hold `contents:write` (built-in `GITHUB_TOKEN`, no AWS/OIDC) —
  the NH-206 no-AWS-creds-on-PRs posture is untouched.
- **Enforcement:** 🤖 `actionlint` (CI lint job) + a build-time base-path assertion in the workflow;
  the preview is convenience, not a merge gate. Deferred (plan Scope Boundaries): fork-PR previews
  via `workflow_run`, a reconciliation sweep for the rare cleanup-eviction orphan, `shared/**` in the
  path filter.

### 2026-07-02 — NH-260 markdownlint emphasis/strong styles pinned (MD049/MD050)

`.markdownlint.yaml` now pins `MD049` (emphasis/italic) to `underscore` and `MD050`
(strong/bold) to `asterisk`, replacing markdownlint's default `consistent` mode.
Follow-up from NH-260 / PR #96, where this cascade was first hit.

- **Why:** in `consistent` mode the _first_ emphasis span in a file anchors the
  expected style, so one stray wrong-style span near the top of a doc re-flags every
  pre-existing span far from the edit — a confusing 132-error cascade that looks like a
  version/parity bug but is not. An explicit style makes a wrong span fail at its _own_
  line with `Expected: underscore` instead.
- **Matches repo convention** — verified bold overwhelmingly uses `**` not `__`;
  underscore italics predominant. `pnpm run lint:md` stays green on all 125 `.md` files
  (no file needed fixing), so the pin is consistent repo-wide, not merely predominant.
- **Enforcement:** the existing `lint:md` gate (CI + pre-push) now flags a wrong-style
  span at its own line. Regression-checked: a throwaway asterisk-italic reproduced
  132 → 2 errors, then reverted.

### 2026-07-02 — NH-260 local .env loading (dotenv) + registry corrections

PR #96 wires local-dev env loading via bare `dotenv` and records two registry items.

- **L12-envload (new):** local runtime env loading = `import 'dotenv/config'` in
  `server/src/main.ts` + `server/src/adapters/neon-postgres/seed.util.ts` — local-dev only; Lambda/CI
  inject env (dotenv `override:false` never clobbers). The _loader_, distinct from the still-pending
  typed _validation_ (L12-env). Alternatives weighed + rejected for now: `@nestjs/config` (heavier,
  Nest-coupled), t3-env (validates but doesn't load — needs a loader beneath it).
- **DS-12 (search) status corrected:** the `pg_trgm`/`unaccent`/`tsvector` search decision stays 🔒
  locked, but it is **not** in the current Playable migration (`0000_playable_init`) — implementation
  deferred to **NH-123** (real read API). Reference DDL = `2026-06-10-catalog-schema.md` §4/§9 (old
  `catalog_item` model).

### 2026-07-02 — NH-259 pnpm supply-chain SAST hardening + release-age window 3→7 days

PR #95 clears the 5 blocking Semgrep supply-chain findings that were failing the `sast` gate on master
and every open PR (3 pnpm rules on `pnpm-workspace.yaml`, plus `.npmrc` `npm-missing-minimum-release-age`
and `.github/dependabot.yml` `dependabot-missing-cooldown`).

- **Settings added:** `pnpm-workspace.yaml` — `minimumReleaseAge: 10080` (7 days), `trustPolicy: no-downgrade`
  (+ `trustPolicyExclude` for the two false-positive transitive pins `semver@6.3.1` / `chokidar@4.0.3`),
  `blockExoticSubdeps: true`. `.npmrc` — `min-release-age=7` (inert for this pnpm-only repo; clears the npm
  rule). `.github/dependabot.yml` — `cooldown.default-days: 7`.
- **Release-age window raised 3 → 7 days.** E-renovate-harden (DACI:213/340) previously specified
  `minimumReleaseAge '3 days'`, but the Semgrep pnpm rule mandates **≥ 7 days**, so 3 days can no longer
  satisfy the `sast` gate. Reconciled the DACI + registry to **7 days**; Renovate (NH-89) must use ≥ 7 to
  match pnpm's install-time gate (a shorter Renovate window would open PRs whose frozen install fails until
  day 7).
- **Drift-guard:** the `trustPolicyExclude` / `minimumReleaseAgeExclude` pins are version-exact, so a
  lockfile bump silently un-matches them and re-trips the gate. `tooling/check-supply-chain-pins.mjs`
  (`pnpm run check:supply-chain-pins`, wired into CI lint + pre-push) fails early if any pin drifts from
  `pnpm-lock.yaml`.

### 2026-06-30 — NH-210 catalog table lands: TanStack DataTable + VR/a11y gates

PR #92 ships the NH-210 click-to-sort catalog table: a reusable `ui/DataTable<TData>` TanStack
engine (2-state asc/desc sort, column visibility, card/rows appearance, loading/empty states) plus
the catalog cell components (`ScoreDonut`, `LevelPill`, `Cover`, `Flags`, `KindBadge`, `NewPill`,
`Bpm`, `PlayButton`, `NameCell`) and a thin `catalog/CatalogTable` config. Storybook-tested only —
wiring into a route is deferred (see the spec's "Out of scope").

- **SD-10 (TanStack Table) — FE half now realised + machine-checked.** The `DataTable` engine
  exists and every table view builds on it; the per-component VR (`chromium`, darwin + linux
  baselines) and axe `a11y` Playwright projects are blocking CI gates. The grouped "📄 prose-only
  → 🤖 at Phase 2 (NH-207)" status above still holds for the **backend** `core/catalog` + Neon
  adapter; this entry records that the **front-end** table contract is now enforced in CI.
- **Review fixes (PR #92, ce-code-review):** a row-keydown a11y fix (pressing Enter on the in-row
  Play button no longer also opens the row), dead-code + duplicated class-string cleanups, a shared
  axe a11y helper (`client/src/a11y-helpers.ts`, deduped across 13 suites), and a standalone `Badge`
  harness (its `default` bright-fill variant was previously only axe-tested transitively).

### 2026-06-28 — NH-79 lands: connection keys enforced; CORS deferred to NH-250

Implemented the 2026-06-27 connection-keys design (NH-79): two Neon roles (owner DDL / `nh_app`
DML), both urls as GitHub Actions secrets, a DDL-first Drizzle runner + `0000_playable_init`
migration, a CI migrate-before-`up` step, an idempotent TS-4 seed (`seed.sql` + one-click
`seed-catalog` workflow), the `LambdaWithUrl` env injection, the `robots.txt` `/api/` guard, and a
thin Neon-backed `GET /api/catalog` (Cache-Control header).

- **Status flip:** the 2026-06-27 entry's "⏳ enforcement pending" is now **🤖 enforced** — the CI
  migrate step, the `LambdaWithUrl` env wiring, and the layout/depcheck guards cover it. The
  auto-derived status table below reconciles on the next `docs(registry)` regen; this entry is
  authoritative.
- **CORS deferred -> [NH-250](https://leocaseiro.atlassian.net/browse/NH-250)** (same sprint as the
  backend). The thin read ships only the `Cache-Control` header; the site-origin CORS policy §11
  put in NH-79 moves to NH-250, because the site origin (the CloudFront URL) is a deploy output
  created after the Lambda — injecting it would be circular — and the app is same-origin today.
- **Masked single-voice leaves** are seeded `listable=false`, so the thin read's `WHERE listable`
  hides them as §11 intended.

### 2026-06-27 — Neon connection keys: GitHub-secret keys + CI-first migrate (NH-79)

Brainstorm-approved design for the Pulumi+Neon **connection-key plumbing** — the foundation under the catalog read slice (NH-79 → NH-123). Full design: `docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md`. **Refines a locked decision** (RC-6 / 2026-06-10) — the mechanism only, not the intent.

- **RC-6 mechanism refined — Pulumi config secret → GitHub Actions secrets.** The Neon connection string is no longer a `pulumi config set --secret` value; it lives as two GitHub Actions secrets (`NEON_DATABASE_URL`, `NEON_MIGRATION_URL`). RC-6's _intent_ is unchanged (an env var at rest, **not** SSM, $0). Reasons (leocaseiro, 2026-06-27): GitHub **auto-masks** secrets in a **public** repo (safer than `pulumi config get --show-secrets`, which prints plaintext), and it enables **100% CI/CD** with zero recurring local runs.
- **Two Neon roles (least-privilege).** Owner role = DDL/migrations (`NEON_MIGRATION_URL`, TCP, CI-only); a new least-privilege `nh_app` role = DML/runtime (`NEON_DATABASE_URL`, HTTP `neon-http`, the only url injected into the Lambda env). A leaked Lambda env can read/write rows but cannot alter the schema.
- **Migrate before deploy, in CI.** `deploy.yml` gains a `drizzle-kit migrate` step as the **first** step (needs only Node + the GitHub secret, no AWS), so it runs before `pulumi up`; idempotent; a failure aborts before any AWS mutation. Seed = a one-click `workflow_dispatch` workflow (not the auto deploy).
- **DDL-first Drizzle runner.** The raw 8-table DDL stays the migration source of truth (`ARCH-ORM-1`); `drizzle-kit generate --custom` + `migrate`; `catalog.schema.ts` hand-written for query typing; files under `server/src/adapters/neon-postgres/`.
- **Minimal compute guard.** `robots.txt` disallow `/api/*` + a dev Neon branch + a `Cache-Control` header on the thin read; the CloudFront edge-cache (the real bot/crowd protection) is deferred to **NH-247**. Free-tier verified $0/month current (KMS $0, Lambda/CloudFront perpetual free, Neon 0.5 GB / 100 compute-hours, sleeps after 5 min idle).

**Status:** ✅ decided · ⏳ enforcement pending — flips to 🤖 when NH-79 lands (the migrate CI step, the `nh_app` grants, the `LambdaWithUrl` env injection, the runbook). Approved by leocaseiro in the 2026-06-27 brainstorm; implementation plan deferred (LGTM-pause).

### 2026-06-27 — `playable.slug` friendly URL token + wireframe author-on-UI / column sort (NH-221, NH-223, PR #88)

New decision (leocaseiro, mid-review on PR #88): every playable gets a stored **`slug`** — a friendly URL token separate from the opaque ULID id — addressed by routes (`#/song/yellow`, `#/fill/zoio-de-lula-tom-fill`) with the id as a fallback; `UNIQUE` index + title→slug backfill → `NOT NULL` modelled in the draft seed (validated: 19 playables → 19 distinct slugs). Full record: `docs/decisions/2026-06-27-playable-slug-url-token.md`.

The same **PR #88** wireframe pass also **realises** existing deltas in the low-fi sim (no new decisions): SD-13/SD-33 `author[]`+`author_type` now **surfaced on the catalog rows** (songs = artist, lessons = **teacher**) with an **Author/Artist facet incl. an "Unknown" option** and author-search in lessons; SD-31 kind+context routes; NH-222 structured song lesson; SD-11 flag filters + playback-source toggle; **SD-10 clickable column-header sort** (the sort dropdown moved into "More"). README version log → v1.4/v1.5.

**Status:** ✅ slug decided · ✅ **landed in NH-79** (2026-06-28, PR #90): `slug text NOT NULL` + `UNIQUE` index in `0000_playable_init` + a slug per seed row (19 distinct) + returned by the thin read. PR #88 open. NH-221/NH-223/NH-210/NH-211/NH-222.

### 2026-06-26 — e2e is a required CI gate: Playwright lane + traces (NH-197)

Stood up the first **e2e test lane** and wired it into the required `ci-green` gate (joins `a11y`/`vr` as a blocking Playwright gate; full design + findings: `docs/specs/2026-06-26-nh-197-e2e-traces.md`, plan: `docs/plans/2026-06-26-001-feat-nh-197-e2e-traces-plan.md`).

- **NEW: e2e is a required CI gate.** A new `e2e` job runs Playwright against the **built SPA** (`vite preview`, separate `client/playwright.e2e.config.ts`) — distinct from the Storybook-based `a11y`/`vr` lanes — wired into the `ci-green` aggregate via four edits (needs + var + echo + loop). On failure it uploads `client/playwright-report/` + `client/test-results/` as the `playwright-e2e-report` artifact with `if: ${{ !cancelled() }}` (D5 — keeps flaky-then-passed traces), 7-day retention; `actions/upload-artifact` SHA-pinned (`ea165f8…`, v4.6.2); `trace: 'on-first-retry'`.
- **MSW is the foundation mock layer.** `msw@2.14.6` + `@msw/playwright@0.6.7` intercept `/api/*` at the browser network layer (`context.route`); the smoke test (`client/e2e/smoke.e2e.ts`) is the reusable template future feature tests copy. `pnpm-workspace.yaml` `allowBuilds: msw: false` (MSW's service-worker postinstall is unneeded; otherwise `--frozen-lockfile` fails `ERR_PNPM_IGNORED_BUILDS`).
- **Two spec corrections** (in the spec's "Implementation findings"): `onUnhandledRequest` is the function form scoped to `/api/*` (the bare string `'error'` errors on the `GET /` document load); `vite preview` **does** honor `server.proxy` (an unmocked `/api/*` → 502) — the lane is correct because MSW intercepts before the proxy.

**Escape hatch (D3):** if the lane flakes and blocks unrelated PRs, revert the four `ci-green` edits — the job keeps running but stops gating.

**Overlap note:** open **PR #85** (NH-243 lint) also edits `.github/workflows/ci.yml` + `client/package.json`; these changes are additive (new `e2e` job, `ci-green` needs entry, `test:e2e` scripts, `msw` dep), so conflicts are mechanical. This change-log is `merge=union`, so the registry entry itself won't conflict.

### 2026-06-26 — Unified linting & formatting consolidation (NH-243, PR #85)

Shipped the single linting/formatting system (consolidates NH-42 ESLint flat config, NH-43 Prettier, NH-168 jsx-a11y — all now `Cancelled` as superseded). Lands: shared `eslint.config.base.mjs` + per-package extends (`client/`, `server/`); one root `prettier.config.mjs` (printWidth 100) separated from ESLint (`eslint-config-prettier/flat`, no `eslint-plugin-prettier`); extra linters markdownlint/stylelint/yamllint/cspell/shellcheck/actionlint/editorconfig-checker/sort-package-json; lefthook auto-fix on commit + full check on push; a dedicated CI `lint` job (check-and-block) gated on `code || docs_or_config`. Affected rows already flipped: `L3-eslint`, `L3-prettier`, `M4-prettier`, `L12-a11y`. Post-review hardening on the PR: CI path-filter now covers the 5 root lint configs (eslint/prettier/editorconfig-checker/prettierignore/stylelintignore); `check:all` mirrors the lint+quality jobs; shell tests wired into `test:tooling`; plus quality nits (lint:shell whitespace-safe, actionlint curl retry, sort-pkg in pre-push, deduped ignores). **PR #85.** NH-243.

### 2026-06-26 — `ci-green` gate: collapse 3 job lists → one `toJSON(needs)` pass; deny-list → allow-list (NH-22)

Refactored the `ci-green` aggregation job (the single required status check) in `.github/workflows/ci.yml` to derive its job set from one `jq` pass over `${{ toJSON(needs) }}` instead of three hand-synced lists (the `needs:` array + a per-job `result` var + a `for`-loop). The `needs:` array is now the only list — adding a gate is a one-line edit. Behaviour preserved: the `changes` gatekeeper must `success`; any other job `failure`/`cancelled` fails; `skipped` is OK. The failure check is now an **allow-list** (fail unless `success` or `skipped`) rather than a deny-list, so an unknown future `needs.*.result` value fails **closed** — per ARCH-GUARD-1/CR-1 (prefer allow-lists for fences). Verified by local fixtures + a deliberate live red-run on the branch. Implementation-only; enforcement unchanged. **PR #84.** NH-22.

### 2026-06-26 — L5-vitest re-scoped: `infra/` → Vitest; `tooling/` stays `node --test` (NH-38)

Evaluation of NH-38 ("migrate `node --test` → Vitest") found the repo-wide goal **mostly already done**: `client/` + `server/` ship on **Vitest `^4.1.9`** (arrived with their scaffolds). Only `infra/` (TypeScript, `node --test "*.test.ts"`) and `tooling/` (plain `.mjs`, `node --test tooling/*.test.mjs`) still run `node --test`. leocaseiro approved **re-scoping NH-38 to `infra/` only**:

- **`infra/` → Vitest** — its Pulumi-mock stack tests would match `client`/`server`'s config. The remaining real value of L5-vitest.
- **`tooling/` stays on `node --test`** — _deliberate, documented exception_, not debt. The 3 `tooling/*.test.mjs` gate tests (`pr-checklist*`) are plain JS using no TypeScript / DOM / mocking / snapshots; `tooling/` has **no `package.json`** and is outside the pnpm workspace graph **by design** (dependency-free, its own `.prettierrc`, run as a standalone CI step). Vitest adds churn, not value. Revisit only if `L2-probes` (the planned Vitest probe suite under `tooling/probes/`) ever lands.

The original `L5-vitest` Open Qs (Nx per-project config, `adapters/postgres` Docker) are **moot** — Nx was dropped (ADR 2026-06-17) and the Postgres concern now lives in `server/` (already on Vitest).

**Status:** L5-vitest **now live across all TypeScript packages** — `client/` + `server/` + `infra/` ✅ on Vitest (`infra/` migrated this session: `vitest run`, 10 tests green, commit `df544a1`); `tooling/` ✅ stays `node --test` (deliberate exception — the only package off Vitest, by design). The auto-derived `L5-vitest` row below (still reads "via @nx/vite … deferred") reconciles on the next `docs(registry)` regen; **this entry is authoritative.** NH-38.

### 2026-06-26 — CI deploy role: grant `iam:GetPolicyVersion` for the boundary preflight (NH-242)

Follow-up from NH-235 (PR #79). The deploy role's boundary-verification preflight (`infra/index.ts` → `aws.iam.getPolicy`) logs `warning: Could not verify the CI permissions boundary … (iam:GetPolicy denied)` on every `pulumi up`. The `ReadCiRoleBoundary` statement granted only `iam:GetPolicy`, but the data source also reads the policy **document** + tags → it needs `iam:GetPolicyVersion` and `iam:ListPolicyTags`. (The `(iam:GetPolicy denied)` text is a hardcoded label in the warn string, not the real denied action.) Added both, scoped to the single boundary ARN, in **both** `aws-iam-ci-deploy.json` and `aws-iam-pulumi-local-deploy.json`. Read-only + single-resource → no privilege increase. ⬅ **leocaseiro re-runs `aws-ci-oidc-bootstrap.sh` (admin SSO) + one `pulumi up`; the boundary warning should disappear.** Restores the NH-206 review #6 preflight intent (a genuinely-missing boundary fails fast instead of warning-through).

**Status:** ✅ decided · 🤖 enforced at deploy time — pending leocaseiro's re-apply + deploy (warning clears). NH-242.

### 2026-06-26 — CI deploy role: tighten S3 `s3:*` to enumerated least-privilege (NH-235)

**Implements the D8 follow-up** from the 2026-06-24 "OIDC deploy hardening — review #3" entry below ("leave + follow-up ticket"). The two `s3:*` statements — `SpaBucket` (`site-spa-*`) and `PulumiStateBucket` (`notation-hero-pulumi-state-*`) — are replaced with enumerated actions, split bucket-level vs object-level:

- **SPA bucket** → `SpaBucketManage` + `SpaBucketObjects`: only the writes the stack actually performs (`Create`/`DeleteBucket`, `PutBucketPublicAccessBlock`, `PutBucketOwnershipControls`, `Put`/`DeleteBucketPolicy`, object `Put`/`Get`/`Delete` + tagging) plus the **complete** `aws.s3.Bucket` (v1) refresh read-set (`GetBucketAcl`/`Website`/`Versioning`/`Encryption`/… — generous on harmless reads, strict on writes). Dropped vs `s3:*`: `PutBucketAcl`, `PutBucketVersioning`, `PutEncryptionConfiguration`, `PutReplicationConfiguration`, `PutBucketLogging`/`Website`/`Notification` — none used by the stack, so a poisoned `infra/` dep in the master `up` job can no longer weaken encryption, add an exfil replication rule, or grant a cross-account ACL.
- **State bucket** → `PulumiStateBucket` + `PulumiStateObjects`: the Pulumi S3-backend actions only (`ListBucket` + `GetBucketLocation`; object `Get`/`Put`/`Delete`).
- **CloudFront `Resource:"*"` deliberately kept** — actions are already enumerated; OAC/Function/Distribution ARNs don't exist at plan time and `Create*`/`List*` can't be resource-scoped, so scoping a from-scratch create is high-effort for ~no gain.

Applied to **both** `aws-iam-ci-deploy.json` and the identical `aws-iam-pulumi-local-deploy.json` (no drift). ⬅ **leocaseiro re-applies the updated `aws-iam-ci-deploy.json` to the live `notation-hero-ci-deploy` role (admin SSO — re-run `aws-ci-oidc-bootstrap.sh`) and runs ONE real `pulumi up` to validate before merge** — a missed S3 `Get*` surfaces as `AccessDenied` naming the action; add it and re-validate. Rollback = `git revert` + re-apply the prior JSON.

**Status:** ✅ done · 🤖 enforced at deploy time — **validated 2026-06-26**: re-applied to the live role + Deploy rerun (run 28200803405, attempt 2) went green under the tightened policy (`Resources: 32 unchanged`, no `AccessDenied`). Read/refresh path confirmed; write actions exercise on the next content/config deploy. NH-235.

### 2026-06-26 — Governance: never delete remote branches (NH-241)

AGENTS.md "Commit & review workflow" now forbids deleting a **remote** branch — no `git push origin --delete`, no `gh pr merge --delete-branch`, no GitHub UI/API deletion — even after a PR merges; the user keeps merged branches on GitHub for history. **Local cleanup stays fine:** remove the merged worktree + delete the local branch; only `origin/<branch>` must survive. User instruction (2026-06-26); also captured in agent memory.

### 2026-06-25 — SD-15 voicing by track + bar: detailed design within Thin (NH-213, PR #76)

Refines the 2026-06-24 "SD-15 → stay Thin" resolution below into the actual voicing **design** (brainstorm, leocaseiro). A "partial voicing" is one shape everywhere — `{track, voices[], barRange?}` — all jsonb/runtime, **no DDL**:

- **V-1** Display/consume only → the jsonb section grid `data.sections[].tracks[].voices[]`; **no `section_voice` search table** (song/track search already covered by `drum_profile.kit_pieces[]`; flips only if per-section catalogue search ever becomes real).
- **V-2** Voice vocab = a per-instrument code map: drums `kit_pieces` (hi-hat/snare/kick/crash/ride/tom) + piano `left-hand`/`right-hand` (hands-separate); guitar/bass none (role covers their partial). Enforced in app/ingest, not a DB CHECK (mirrors SD-26/SD-28).
- **V-3** `voices[]` joins the Group D per-(section,track) grid cell `{track, voices[], level?, techniques[]?}`; section-level union derived in code, never stored.
- **V-4** Lessons: **Hybrid, incremental** — reusable/named partials = `pattern` playables via the existing `step` junction (zero schema change); per-song-section / hands-separate drills = inline `step.data.voicing`, added when the first such lesson lands (also lands SD-17 step description). `step.data jsonb` is the only deferred DDL.
- **V-5** Capo is **not** a voice (`voices[]` = which sub-streams sound); per-section settings (capo/tuning) go to `techniques[]` / a `settings{}` bag — deferred, not built.

Applied to the draft seed (Bohemian voices, validated on `nh_tonal_scratch` + poke #8) + the catalog wireframe (Yellow drums + piano-hands per-section render, verified in-browser). Spec: `docs/wireframe/2026-06-25-voicing-by-track-bar-spec.md`. The player runtime voice-filter for "hear just hats+kick" (AlphaTab's mixer is per-track) is flagged as a **player-layer** concern, not catalogue schema.

**Also (enforcement):** new root `.prettierignore` excludes the hand-maintained `docs/wireframe/*.html` sims — a one-line edit otherwise reflows the whole 137 KB file. Prettier stays scoped to real source (`tooling/`, `server/` each have their own `.prettierrc`).

**Status:** ✅ decided · 📄 prose-only (draft DDL — no machine enforcement until the real `core/catalog` + Neon land). Approved by leocaseiro in the 2026-06-25 brainstorm.

### 2026-06-24 — CI deploy role: add missing Lambda read perm; lock-recovery on cancel-only (NH-206 follow-up)

**Follow-up after #64 merged.** The first CI-driven `pulumi up` on master failed with `AccessDeniedException: lambda:GetFunctionCodeSigningConfig` — the aws provider reads a ZIP function's code-signing config on every `aws_lambda_function` update, but the least-privilege deploy role lacked it. Added `lambda:GetFunctionCodeSigningConfig` to `aws-iam-ci-deploy.json` **and** `aws-iam-pulumi-local-deploy.json`. Audited the full provider read-set (provider source + issue #27986): that was the **only** gap — `s3:*` / CloudFront / IAM / logs are already complete; deliberately did **not** add `lambda:GetRuntimeManagementConfig` (not called by `aws_lambda_function`, would over-grant). Also tightened `deploy.yml`'s stranded-lock recovery to fire on `cancelled` (hard-kill) only — a clean `failure` releases the lock, so firing on it was a false alarm. ⬅ **leocaseiro re-applies the updated `aws-iam-ci-deploy.json` to the live `notation-hero-ci-deploy` role (admin SSO)** — also clears the stale `iam:GetPolicy` boundary-read the failed run warned about.

### 2026-06-24 — NH-238 bot-exempt the pr-title commitlint gate (L6)

Dependabot PRs were stuck red: the `pr-title` job (commitlint on the PR title) had no bot exemption, and dependabot capitalizes its subject (`chore(ci): Bump …`), which commitlint rejects via `subject-case` → `pr-title` fails → the required `CI Green` fails. Added `&& github.event.pull_request.user.type != 'Bot'` to the `pr-title` `if:`, mirroring the `pr-checklist` job's existing bot exemption; `CI Green` treats a skipped job as OK, so bot PRs go green. Trade-off (documented in the workflow comment): a dependabot PR's squash subject lands on `master` un-commitlinted — acceptable, since the `chore(ci):` type/scope are valid and dependabot's "Bump" capitalization can't be changed. Relates to NH-16 (PR policy / L6).

### 2026-06-24 — NH-237 PR-checklist auto-inject + resync (extends NH-16, L6)

Closed the "agents paste the checklist by hand" gap. The merge checklist lives in `.github/pull_request_template.md`, but GitHub auto-fills it only in the web "Open a PR" form — PRs opened by agents/CLI via `gh pr create --body` skip it, so the author had to paste all items to pass the `pr-checklist` gate. New `pr-checklist-sync` workflow + `tooling/pr-checklist-sync.mjs` **append only the missing canonical items** to a PR body (additive — never edits existing lines or ticks boxes) on `pull_request: opened`, and **fan out to every open PR** via a `workflow_dispatch` button or a `push` to `master` that changes the template. Shared `tooling/pr-checklist-lib.mjs` gives the sync and the gate one matching function so they can't disagree; `tooling/pr-checklist.mjs` refactored to import it (behavior identical — gate tests incl. #64's infra-preview check stay green, +4 lib +4 sync cases). **Enforcement unchanged** — boxes arrive unticked; the strict gate still requires every box `[x]`. Rejected: `mheap/require-checklist-action` (re-adds the `~~N/A~~` escape removed in v1.1) and comment-delivery (would force a gate rewrite); DangerJS stays the NH-16 v2 backlog. Uses `pull_request` (not `pull_request_target`) — fork PRs aren't auto-injected (read-only token; acceptable for a solo repo). Spec: `docs/specs/2026-06-24-pr-checklist-auto-inject.md`. `AGENTS.md` "PR checklist (CI-gated)" updated.

### 2026-06-25 — Design system foundation: shadcn + preset, Storybook, Playwright VR (NH-189)

First **`tlc-spec-driven`** feature (introduces `.specs/`). Builds the client component foundation on the existing Vite SPA. Full decisions: `.specs/features/design-system-foundation/` (spec/design/tasks) + `.specs/project/STATE.md` (D1–D10). Tracked by **NH-189** ("Build temporary design system"); fulfils the **NH-29** Storybook-scaffold trigger (first `.tsx` component); adjacent to **NH-16** PR-policy.

**Decisions (✅ decided · client-scoped):**

- **shadcn/ui v4 + preset `b5claE9qM`** applied via `shadcn apply --only theme,font` (NOT `--template next` — Next.js stays dropped, `ARCH-FE-1`). Teal theme + Public Sans land in `src/styles.css`; `@remixicon/react` removed.
- **Icons = Material Symbols Outlined**, **self-hosted** via `@fontsource-variable/material-symbols-outlined` (`@import` in `src/styles.css`; was Google Fonts CDN — changed 2026-06-25 for ARCH-SEC-2 CSP `font-src 'self'` + iOS Capacitor offline), NOT the preset's Remix Icon. Icon-only + text+icon Button variants wired.
- **Folder-per-component, PascalCase** — `components/ui/Button/Button.{tsx,test.tsx,stories.tsx,vr.ts}`; **`@/` import alias** (shadcn default — "generators-first"; reverses the initial `#/` choice on 2026-06-25, folder-per-component kept; single quotes + semicolons stay the deliberate exceptions).
- **Storybook v10** (`@storybook/tanstack-react`, docs + a11y addons) + **Playwright visual-regression** (`*.vr.ts`, `toHaveScreenshot`, webServer = Storybook). VR marker is `.vr.ts` (not `.spec`/`.test`) to dodge the Vitest collision + the layout-guard same-name-sibling rule.

**Enforcement (🤖) — what this PR changes:**

- **UPDATE (NH-243):** `eslint-plugin-prettier` was **removed** from both packages (spec D2). Prettier is now separated from ESLint: `eslint-config-prettier/flat` (added last in `eslint.config.base.mjs`) turns off ESLint rules that conflict with Prettier, and a dedicated `prettier --check` step in the CI `lint` job + lefthook pre-push enforces format drift. Client and server Prettier settings (`semi: true`, `printWidth: 100`) are now consolidated in one root `prettier.config.mjs`.
- **NEW: accessibility is a required CI gate.** axe-core (WCAG 2 A+AA) runs over every Storybook story in light + dark via Playwright (`*.a11y.ts`, `test:a11y`); the new `a11y` CI job is wired into the `ci-green` aggregate. Storybook gained a real `.dark` theme toggle (decorator) so a11y reflects the actual rendered colors. Two preset contrast fixes followed: light `--destructive` darkened (soft destructive 3.97 → 5.15:1) and dark-mode links use the mockup teal `#0D9488` (new `brand-600` token, 2.61 → 5.27:1).
- The folder-per-component layout + no-`stories/`-dir + co-located-test-sibling rules are already carried by `tooling/check-layout.sh` (`CONV-1`/`CONV-2`); no guard change needed.

**Deferred (own follow-ups):** VR baselines are local (darwin) only — CI/Docker-Linux baselines + wiring VR into CI are deferred (design.md §D); component set beyond Button is post-foundation.

**Overlap note:** this PR also edits this registry change-log; open **PR #74** (NH-16) is making this section `merge=union` for exactly this reason — low conflict risk.

### 2026-06-24 — CI/CD: OIDC deploy hardening — drop preview-on-PR (NH-206 review #3)

**PR #64.** **Revises** the 2026-06-23 CI/CD entry below: the `pull_request` → `pulumi preview` job and the `pull_request` OIDC trust subject are **removed**. A PR-triggered preview ran arbitrary `infra/*.ts` under the full deploy role (S3 state + SPA `s3:*`, CloudFront `Resource:"*"`, Lambda `UpdateFunctionCode`, + the injected `PULUMI_CONFIG_PASSPHRASE`) — medium-low risk solo, **HIGH** once a collaborator can open a same-repo PR. Approved by leocaseiro 2026-06-24 (brainstorm + 3-agent research; spec `docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md`).

- **Preview is LOCAL-only now.** `deploy.yml` drops the `pull_request` trigger + the `preview` job → **push-to-`master` only**, so **no AWS credentials touch any PR** (and no infra detail leaks into public Actions logs/comments — the repo is public). `pull-requests: write` dropped; the passphrase exposure dissolves with the preview job.
- **Trust narrowed to a master-only `production` GitHub Environment.** `aws-ci-oidc-bootstrap.sh` trust `sub` → `repo:leocaseiro/notation-hero:environment:production` only (was master ref + `pull_request`); the `up` job sets `environment: production`; the environment is restricted to `master` (created via `gh api`, no reviewers) — two independent gates. ⬅ **leocaseiro re-runs the bootstrap script (admin SSO)** to apply it.
- **Agent local-preview safety-net (partial NH-16 v2 diff-aware gate).** New `AGENTS.md` rule: an agent that changes `infra/` runs `pulumi preview` locally and records a classification under `## Pulumi preview` in the PR body, filing a required task (PR checklist **+** Jira mandatory `customfield_10041`) for any destructive/exposure change. `tooling/pr-checklist.mjs` is now **diff-aware** — a PR touching `infra/**` (via the `changes` paths-filter `infra` output) fails on an empty preview section. 4 new `node --test` cases.
- **Hardening:** OIDC `audience: sts.amazonaws.com` pinned (H2); **every GitHub Action SHA-pinned** to a commit, Dependabot-maintained (H3); S3 state-bucket runbook `docs/runbooks/aws-s3-state-hardening.sh` — versioning + block-public + deny-all-except-CI + optional Object Lock (H4). H1 (short STS session) skipped — the ~15–20 min first CloudFront create exceeds a 15-min session.
- **Follow-up (separate NH ticket):** tighten the `ci-deploy` role's `s3:*` / CloudFront `Resource:"*"` to least-privilege actions (no longer PR-reachable; finicky → its own end-to-end-tested PR).
- **`L7-oidc`** stays `✅ done` (OIDC remains deploy-only); the 2026-06-23 entry's "(master ref + same-repo PRs)" trust + "PR → preview" workflow lines are **superseded** by this entry (status table reconciles on the next regen).

### 2026-06-24 — Schema-delta brainstorm: 4 deltas consolidated on the draft (PR #68)

The schema-impacting wireframe deltas were triaged (18 `schema-delta` tickets → **4** that change the catalogue DDL) and decided in one pass, applied to the **fresh draft schema** (`docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` — no DB/Drizzle yet, so edits not a migration), re-validated on `nh_tonal_scratch`. Full decisions: `docs/wireframe/2026-06-24-schema-delta-decisions.md`; grounding spike: `docs/spikes/2026-06-24-instrument-identity-and-role-from-source-formats.md`.

**Decisions (✅ decided · 📄 prose-only — DRAFT DDL, no machine enforcement yet):**

- **SD-28 (NH-219)** — `track.role text` → **`track.roles text[]`** (a track plays N parts; overlap filter `roles && [...]`, GIN). Tri-state instrument/role tree; flat solo/lead siblings; a **display-group config** in shared monorepo code maps roles→labels ("Rhythm (chords)" / "Tabs", UltimateGuitar convention); role stays curated/UGC (no source format carries it), auto-derivable later.
- **SD-26 (NH-218)** — instrument **derived from the AlphaTab General-MIDI program (0–127)**, never UGC (admins pick a controlled vocab, never free-type); `track.instrument` stays `text`. **Instrument family = a code-only map** (`family→[instruments]`) over the existing `instruments[]` GIN — **no column** (don't overload the _musical_ `playable.family[]`). GM is 0-based in AlphaTab (vs the spec's 1-based).
- **SD-25 (NH-217)** — **`track.techniques text[]`** (GIN) for ALL instruments; `drum_profile.techniques` **moved onto `track`** and dropped. Auto-extract from AlphaTab note/beat effects (tap/slap/harmonics/bends/palmMute) + curate the abstract ones.
- **SD-15 (NH-213)** — **stay Thin**: no `note`/`voice_map` tables; voicing = `kit_pieces[]` + jsonb section grid + runtime AlphaTab (~35 ms). Flips only if note-level catalogue search is ever needed.
- **🆕 provenance** — `track.source_instrument_id` + `source_instrument_kind` (`gm-program`｜`musicxml-sound`｜`musescore-id`｜`name-parse`): the instrument derivation is reproducible + auditable (find low-confidence `name-parse` rows; names fail 3/5 real songs).

**Dispositions (no DDL):** SD-22 (NH-216) confirm-and-defer — the `notation` upload seam (`upload_status` + relaxed CHECK + `checksum`) already covers load-and-go; only dep = client-minted ULID (NH-183), findings on NH-216. SD-33 (NH-223) DB already done (`author[]` via SD-13) → wireframe phase. NH-230 origin field rides in PR #68. The remaining 12 `schema-delta` tickets route to DynamoDB-@M1 / UI / policy buckets.

**New tickets:** **NH-232** (`gp-extract.mjs` to read the GM program + percussion + note/beat technique effects) · **NH-233** (spike: confirm GM program suffices; PR AlphaTab + `patch-package` only on a real, non-reconstructable gap).

**Status:** all **✅ decided · 📄 prose-only** (draft DDL; flips to 🤖 when the real `core/catalog` + Neon adapter land, Phase 2 / NH-207). Approved by leocaseiro in the 2026-06-24 brainstorm. **Next:** wireframe alignment (`roles[]`/`techniques`/instrument-from-GM + `author[]`), then the first Drizzle migration.

### 2026-06-23 — Catalog wireframe + extensible tonal/drum schema realised (NH-194, PR #52)

The catalog **wireframe** (`docs/wireframe/`) — a single-file low-fi clickable SPA — pressure-tested the locked **Playable** model + the **extensible tonal/drum schema** before app build. Ships **no production/runtime code**: design docs + draft scratch DDL + seed data only. Working tracker: `docs/wireframe/2026-06-16-schema-deltas.md` (SD-1..37). Pending deltas filed as Jira **NH-208, NH-210..230** (all labelled `schema-delta`).

**Schema decisions realised / locked (✅ decided · 📄 prose-only — DRAFT DDL, no machine enforcement yet):**

- **Playable umbrella** — song/part/lesson/pattern are one `playable` (kind = the role); the score = `notation` (`s3_key` OR inline `notation_alphatex`, exactly-one); ordered steps via one self-ref `step` junction (`parent_id`/`child_id`/`sort_order`/`start_bpm`/`goal_bpm`), shared by lessons + composite patterns. Parts first-class. `lesson_type` dropped (a lesson's kind is derived from its step patterns).
- **Extensible tonal/drum schema (Hybrid C)** — per-domain side-tables `tonal_profile` + `drum_profile`, **per-track** (`track_id`, **SD-27**) → zero cross-domain NULLs; facet model (chords / progression / scales / drum). `musical_key` lives on `tonal_profile`.
- **`playable_link` relation vocabulary (SD-30)** — `uses` (hierarchical, directional: song→beat→rudiment), `variation` (symmetric: e.g. closed vs open hi-hat), `similar` (n-n affinity between any playables).
- **`listable` flag (SD-29)** — building-block playables (composite voice-leaves, song parts) are `listable:false`: reachable in-context + by deep-link, hidden from browse.
- **Group D** (track / media / difficulty) — `track` relation + per-section `data.sections[].tracks[]` grid; resolved 2026-06-20.

**Conventions established:**

- **USA "catalog" spelling** repo-wide (**NH-220**) — `catalogue`→`catalog` swept (prose, comments, examples, S3-key placeholders); spec/decision **filenames renamed** (`2026-06-10-catalogue-schema.md`→`…-catalog-schema.md`, `2026-06-09-catalogue-store-postgres-neon.md`→`…-catalog-store-…`). The future `core/catalog/` + `CatalogFilter` convention follows.
- **DB snake_case ↔ JS camelCase** — Postgres folds unquoted identifiers to lowercase, so columns stay snake_case (`notation_alphatex`); the ORM (Drizzle, `ARCH-ORM-1`) maps to camelCase (`notation_alphaTex`) at the boundary.
- **TanStack Table** = the catalog list + every table view (SD-10 / **NH-210**).

**Status:** all the above are **✅ decided · 📄 prose-only**; **no machine check** — they flip to 🤖 when the real `core/catalog` + Neon adapter are built (Phase 2, **NH-207**). The schema-delta ledger + NH-208/210..230 carry the open items.

**Overlap note:** this PR + the just-merged rename branch (`chore/nh-220-catalogue-to-catalog`, #67) both edit `AGENTS.md` / `README.md` / this registry; open **PR #64** (NH-206 AWS Phase-1 slice) also edits all three — **merge-order / conflict risk**; rebase #64 (or this) after the first lands.

### 2026-06-23 — NH-19 CodeQL deep SAST (out-of-band)

**Status changes (effective on merge):**

- `E-codeql` → **✅ done · 🤖**. New `.github/workflows/codeql.yml` runs CodeQL (`github/codeql-action/init`+`analyze@v3`, `javascript-typescript`, `build-mode: none`) **out-of-band** — `push: [master]` + a weekly `schedule` (+ `workflow_dispatch`), **never on `pull_request`** — so it stays off the PR critical path and is **not** part of the required `ci-green` gate. It layers on top of the always-on Semgrep `sast` job (`E-semgrep`); findings surface as code-scanning alerts in the Security tab.
- `E-codeql-guard-impl` → **✅ done · 🤖**. A `visibility-check` job runs `gh api repos/${{ github.repository }} --jq .visibility`, exports it as a job output, and the `analyze` job is gated `if: needs.visibility-check.outputs.visibility == 'public'` — so CodeQL and its SARIF upload auto-disable on a private transition (no GitHub Advanced Security bill), covering `schedule` events specifically (DACI L9 §215).

**Notes:** `workflow_dispatch` was added beyond the registry's "weekly schedule + push-to-main" text — with no `pull_request` trigger it's the only way to validate a run before the weekly cron. `AGENTS.md` is unchanged: it documents the local pre-commit hooks (gitleaks/semgrep), and CodeQL is CI-only/out-of-band, so it does not belong in that list.

### 2026-06-23 — CI/CD: GitHub-OIDC Pulumi deploy + self-managed S3 backend (NH-206)

**PR #64.** **Revises** the 2026-06-21 entry below: _"`pulumi up` … AWS creds + Pulumi passphrase are local-only, never CI"_ — `pulumi up` now **also runs in CI** (local deploys remain). Approved by leocaseiro 2026-06-23.

- **State backend:** the `dev` stack moved off `file://~` to a private, versioned **S3 bucket** (`s3://notation-hero-pulumi-state-apse2`, pinned in `infra/Pulumi.yaml`). No Pulumi Cloud, **no DynamoDB** — Pulumi locks via the bucket.
- **CI auth:** **GitHub → AWS OIDC** (`aws-actions/configure-aws-credentials@v4`) assumes a least-privileged `notation-hero-ci-deploy` role; trust scoped to `repo:leocaseiro/notation-hero` (master ref + same-repo PRs) — zero long-lived keys. Bootstrap runbook: `docs/runbooks/aws-ci-oidc-bootstrap.sh` (+ `aws-iam-ci-deploy.json`).
- **Secrets:** the passphrase secrets provider is fed to CI via the `PULUMI_CONFIG_PASSPHRASE` Actions secret (the committed `encryptionsalt` is unchanged). **No KMS** (no Pulumi-managed secrets yet).
- **Workflow:** `.github/workflows/deploy.yml` — PR → `pulumi preview` (plan commented on the PR); push to `master` → `pulumi up`. Mirrors `ci.yml` (setup-js, Node 24). Account id kept out of committed files (wildcard ARNs; role ARN in a GH variable, masked in logs).
- **`L7-oidc`** flips `💤 deferred-trigger → ✅ done` (OIDC now live in `deploy.yml`; reconciles into the status table on the next `docs(registry)` regen pass).

### 2026-06-21 — Phase 1 deployable AWS slice: About page end-to-end (NH-206)

**PR #64** (branch `worktree-nh-206-phase1-aws-slice`) implements ADR §11 **Phase 1** on top of #56 — the recruiter-clickable **About page** served end-to-end through AWS. Realizes two previously-📄 ADR decisions in code:

- `ARCH-EDGE-1` (one CloudFront, two origins) → **implemented** (`infra/cloudfront-site.stack.ts`). `/*` → a **private** S3 bucket (Block-Public-Access + BucketOwnerEnforced) reachable only via **OAC**, edge-cached; `/api/*` → the NestJS Lambda **Function URL** via OAC with the managed `AllViewerExceptHostHeader` policy and caching disabled. SPA deep links: 403/404 → `/index.html`.
- `ARCH-LAMBDA-1` (Function URL lockdown) → **implemented**. Function URL flipped **`NONE` → `AWS_IAM`**; CloudFront granted **both** `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`, pinned by `AWS:SourceArn` to the one distribution; wildcard CORS dropped. The raw `*.lambda-url` is no longer publicly invocable.

**Slice shape (leocaseiro, 2026-06-21): option (c)** — the **real** NestJS app runs on Lambda via `@codegenie/serverless-express` (a lambdalith), not a throwaway. `server/build:lambda` = SWC compile (emits decorator metadata — esbuild alone strips it and breaks Nest DI) → esbuild bundle to one CJS file. The About page is a real `client/` SPA route calling `GET /api/catalog` (the first real feature — placeholder data now, Neon-backed in Phase 2) to prove the Lambda leg live; the throwaway `/api/about` was rejected (leocaseiro: build toward the real API, not a stub endpoint).

**Free-tier posture:** plain pay-as-you-go CloudFront (the 1 TB / 10M perpetual tier) — deliberately **not** the Nov-2025 flat-rate "Free" plan (100 GB / 1M); `PriceClass_100`; arm64 Lambda, 10s timeout / 512 MB. Verified by 8 infra unit tests (Pulumi mocks) + `pulumi preview` (26-resource graph). **Deploy (`pulumi up`) + live-URL capture is the local capstone** (AWS creds + Pulumi passphrase are local-only — _revised 2026-06-23: `pulumi up` now also runs in CI via GitHub OIDC + an S3 state backend; see the top Change-log entry_). Deferred to their own tickets (foundation accommodates, zero refactor): Dexie caching, Cognito, Sentry, SRE, the CMS CRUD.

### 2026-06-21 — Foundation Phase 0 implemented + enforcement live (NH-199 / NH-195, PR #56)

The W2-deferred code/config from the 2026-06-18 entry is now executed in **PR #56** (clean-slate redo; **supersedes #50/#51/#59/#60**, which are closed). #56 delivers the **NH-195** Foundation Phase-0 scope under the **NH-199** clean-slate banner. Enforcement flips:

- `ARCH-MONO-1` (Nx → plain pnpm workspaces, `client/server/shared/infra`) → **✅ done · 🤖**. `nx.json`/`.nxignore`/`project.json`/`@nx/*` removed; lefthook/ci/knip/check-layout reconciled; `.gitignore` `.nx/` + `knip.json` `@nx/*` ignores dropped.
- `ARCH-HEX-1` (hexagon = folders under `server/src/`: `core`/`adapters`/`modules`) → **✅ done**. NestJS 11 scaffolded; health module skeleton.
- `ARCH-GUARD-1` (dependency-cruiser folder-level fence + core-purity as a REQUIRED CI check) → **✅ done · 🤖**. **Implemented as the ADR-mandated fail-CLOSED `core-purity` ALLOW-rule** (core/ may import only Node builtins + own-core + zod; everything else errors by default), **not** a deny-list. `tooling/check-core-purity-canary.sh` plants a deliberate `core/ → @nestjs/common` import and asserts the `core-purity` rule fires; wired as a required step in the `quality` job (`pnpm run check:core-purity`). Added `no-adapters-to-modules`. Verified by planting `react`/`drizzle`/`@aws-sdk`/`@pulumi`/`@nestjs` (all FIRE) + `node:`/own-core (PASS).
- `ARCH-NAME-1` (NestJS-native filenames) → **✅ done · 🤖**. `tooling/check-layout.sh` re-scoped from the old top-level `core/adapters/apps/infra` to `server/src/`; `approved_suffix` extended with `module|guard|pipe|interceptor|filter|middleware|strategy|resolver|schema|policy`; `main.ts`/`main.tsx` exempted.

**ce-code-review (mode:agent) caught three pre-merge gaps**, all fixed in #56: **CR-1** the fence was initially a deny-list that adversarially proved fail-open (core→react passed green) → switched to the allow-list above; **CR-2** AGENTS.md still Nx-era → narrowed; **CR-3** this registry entry (the governance rule the PR had skipped). CI false-green guard added to `ci-green` (the `changes` gatekeeper is now a hard dependency).

### 2026-06-21 — NH-16 checklist reworded to past-tense claims (v1.2)

Reworded `.github/pull_request_template.md` from "I am aware I must … (if …)" standing acknowledgements to **past-tense statements of what was done** ("I linked …"; conditional ones as "If this PR changed X, I did Y"). **Enforcement unchanged:** the `pr-checklist` gate still requires every box `[x]` + a real `(NH|KAN)-\d+` key — no `N/A`, no `required:`/`warn:` (both already dropped in v1.1). The conditional phrasing keeps every box always-tickable (vacuously true when its condition doesn't apply) while making a tick a **checkable claim**: ticking "If this PR changed a decision, I updated the decision log" when you did change one and skipped the log is now a false statement, not a true "awareness". No gate/test code change — `tooling/pr-checklist.mjs` reads items dynamically (presence + ticked); `tooling/pr-checklist.test.mjs` stays green.

**Still honesty-based** (presence + ticked, not truth). Verifying the work behind a tick is the deferred **NH-16 v2**: a project-local "checklist auditor" persona that checks each ticked claim against the diff, later promoted to a diff-aware gate. `AGENTS.md` "PR checklist (CI-gated)" updated to v1.2. Reword decided by leocaseiro 2026-06-21: "agents ignore `warn`; say it in the past."

### 2026-06-18 — Architecture ADR approved + foundation supersession ratified (NH-194)

Expert review of `2026-06-17-architecture-decisions.md` complete (6-engineer ce-doc-review panel, NH-194); **leocaseiro approved the ADR.** 20 review findings applied or resolved — incl. **SEC-4:** AlphaTab ships no WebAssembly (verified in `~/Sites/alphaTab`) → no `wasm-unsafe-eval`; **Next.js confirmed dropped** (not a portfolio need + SSR fights the AWS $0 free tier). The W2 deferral (DACI/ADR text rewrites) is now executed:

- **Foundation decisions superseded** (banners added to both legacy docs):
  - `L1` (Nx), `L2-tags` (`@nx/enforce-module-boundaries`), `L7-set-shas` (nx-set-shas), `FOLD-tagmap` (Nx tag map) → **⛔ superseded by `ARCH-MONO-1`** (Nx dropped → plain pnpm workspaces).
  - `FOLD-hex` + `FOLD-serverless` (hexagon/Lambdas as Nx libs/projects) → **⛔ superseded by `ARCH-HEX-1` + `ARCH-LAYOUT-1`** (hexagon = folders in one Nest app; `client/server/shared/infra`).
  - `NAME-suffix` (suffix-everything) → **⛔ superseded by `ARCH-NAME-1`** (NestJS-native filenames).
  - `STRUCT-sibling` (eslint-plugin-boundaries, package/tag form) → **⛔ superseded by `ARCH-GUARD-1`** (rewritten folder-level under `server/src/`).
- **Kept:** `PM-1`/`F6-bun` (pnpm), `D1`/dependency-cruiser (rewritten folder-level), test co-location (`CONV-1`/`CONV-2`).
- **Registry fixes (from the review):** decision count 20 → **21** (added `ARCH-SEC-2`); `L2-tags` removed from the `ARCH-GUARD-1` supersedes list (owned by `ARCH-MONO-1`); `ARCH-OFFLINE-1` corrected RxDB → **plain Dexie**.
- **New spike:** `docs/spikes/2026-06-17-spa-token-storage.md` (in-memory tokens + silent renew + CSP).

**Still deferred:** all code/config (Nx removal, depcruise rewrite, scaffolding) → the implementation PR.

### 2026-06-17 — Architecture decisions (backend·client·auth) + foundation reversal

Brainstorm-approved by leocaseiro (2026-06-17). Decides the 8 open architecture questions and **reopens the DACI-locked foundation** (pre-authorized). Spec: `docs/decisions/2026-06-17-architecture-decisions.md` + companion `docs/specs/2026-06-17-data-layer-requirements.md`. **Pending spec review in a separate session before the DACI/ADR text rewrites + implementation planning** — so the decisions below are ✅ decided but ⏳ enforcement-pending (no code/config changed yet).

**What landed (docs only):** the architecture decision record (21 `ARCH-*` decisions), the data-layer requirements doc (`R1`-`R12`; `R1 created_by` is the one net-new schema requirement), and this entry.

**Decisions (✅ decided · ⏳ enforcement pending-implementation):**

- `ARCH-MONO-1` Drop Nx → plain pnpm workspaces — **supersedes `L1`, `L2-tags`, `L7-set-shas`**.
- `ARCH-PM-1` Keep pnpm; bun stays dropped — **reaffirms `PM-1`, `F6-bun`**.
- `ARCH-LAYOUT-1` `client/ server/ shared/ infra/` — supersedes the Nx `apps/core/adapters/infra` layout.
- `ARCH-HEX-1` Hexagon = folders inside the one Nest app — **supersedes `FOLD-hex`**.
- `ARCH-GUARD-1` Keep dependency-cruiser (rules rewritten folder-level); drop `@nx/enforce-module-boundaries` — **supersedes `H8`-`H14` paths, `STRUCT-sibling`** (`L2-tags` dies with Nx — owned by `ARCH-MONO-1`, not double-listed).
- `ARCH-NAME-1` NestJS-native filenames — **supersedes `NAME-suffix`** (suffix-everything); co-location (`CONV-1`/`CONV-2`) kept.
- `ARCH-BUILD-1` pnpm runner + SWC compiler everywhere; bundler by target (esbuild server / Vite client).
- `ARCH-LAMBDA-1` one API Lambda (`@codegenie/serverless-express` v5 + Function URL + cached singleton); workers via `createApplicationContext`.
- `ARCH-FMT-1` server CJS / client ESM.
- `ARCH-EDGE-1` one CloudFront, two origins (S3 FE + Lambda API).
- `ARCH-CONTRACT-1` oRPC (ts-rest frozen — #797); ditch kanel-zod (drizzle-zod derive+curate).
- `ARCH-ORM-1` Drizzle — **reaffirms `DS-1`**; confirmed over Prisma/TypeORM/Kysely for Neon-HTTP + SWC.
- `ARCH-FE-1` Vite + TanStack Router + TanStack Query — **supersedes the 2026-06-16 Next.js FE ADR (`NH-185`)** (leocaseiro 2026-06-17: explicitly superseding yesterday's Next.js decision).
- `ARCH-OFFLINE-1` plain Dexie + insert-only outbox, sync via API (RxDB rejected — paywalled fast storage).
- `ARCH-MOBILE-1` plain Capacitor (no Ionic).
- `ARCH-AUTH-1` Cognito (Pulumi) + Google federation v1 — **reaffirms Cognito-not-Amplify (NH-193)**; pulls auth early for the admin gate (reverses the feature-freeze Basic-Auth plan).
- `ARCH-ROLE-1` roles via Cognito groups (admin) → `cognito:groups` JWT claim; one pool, admin-now/users-M1.
- `ARCH-AUTHZ-1` `can(user,item,action)` policy port in core (minimal v1).
- `ARCH-OWN-1` add `created_by` (Cognito sub) — net-new catalog requirement (`R1`).
- `ARCH-SEC-1` JWT security model (signature-verified; memory/session storage; short-lived + rotation; CSP).
- `ARCH-SEC-2` CSP baseline (CloudFront Response Headers Policy + native `<meta>` for the Capacitor build).

**Reopened (DACI) — pre-authorized; ADR text edits deferred to the review session:**

- `2026-06-09-tooling-stack-daci.md`: `L1` (Nx) dropped; layout changed; `PM-1`/`F6-bun` unchanged.
- `2026-06-12-file-level-structure-enforcement-adr.md`: `NAME-suffix` relaxed to framework-native; depcruise → folder-level; co-location kept.

**Status (updated 2026-06-18, W2):** the **DACI + file-structure ADR text rewrites are DONE** — both legacy docs now carry supersession banners (see the 2026-06-18 entry above). **Still deferred:** ALL code/config (Nx removal, depcruise rewrite, scaffolding) — land in the implementation PR. The headline §A rows (`L1`/`L2-tags`/`FOLD-hex`/`NAME-suffix`) are flipped to ⛔ below; full table reconciliation lands on the next regen. **The change-log entries remain authoritative.**

**Spikes (2026-06-17):** contract (oRPC vs ts-rest#797), ORM (Drizzle vs Prisma/TypeORM/Kysely), Google federation (Cognito + Google IdP in Pulumi), NestJS-on-Lambda/SWC, React-SPA stack.

**Manual approvals (leocaseiro):** all §1-§4 decisions approved section-by-section via AskUserQuestion this session; `W1` = write docs in a worktree; `W2` = review the spec in a separate session before the DACI/ADR rewrites.

### 2026-06-16 — NH-16 PR-checklist v1.1: all-required acknowledgements (no N/A)

Reframed the `pr-checklist` gate after a real-world miss: PR #40 merged with required boxes left unticked. Root cause (systematic-debugging) — the gate passed _correctly_ per the v1 design (docs PR; the UI item was legitimately `N/A`'d), but `N/A` is a **self-asserted, unverifiable escape** an agent can abuse (e.g. `N/A` the Storybook item on a PR that _does_ change UI). Fix per leocaseiro's model — "an agreement of terms & conditions: no checked, no merge":

- **Every checklist box must be ticked `[x]`; `N/A` and the `required:`/`warn:` severity split are removed.** Items are now standing acknowledgements ("I am aware I must … _if_ …") that stay true regardless of the PR, so they're always tickable. Items expanded to 12 (added: VR-tests-if-UI, README/docs + the "why", self-review, breaking-changes/migrations, no-secrets, no `--no-verify`). The Jira-key grep (`NH`/`KAN`, un-skippable) is unchanged — still the one check with real teeth.
- `tooling/pr-checklist.mjs` rewritten (anti-deletion + all-ticked + key grep, `N/A`/prefix logic deleted); `tooling/pr-checklist.test.mjs` rewritten (12 cases, TDD red→green, incl. "N/A no longer honored"). Branch protection set to **include administrators** so a red gate can't be clicked past. Spec updated: `docs/specs/2026-06-15-pr-merge-checklist.md`.

**Status:** `L6-checklist` stays **✅ done · 🤖** (mechanism evolved, status unchanged). DangerJS smart rules (green-fake, first-use, diff-aware UI/test detection) remain the NH-16 v2 backlog.

### 2026-06-16 — NH-185 FE framework: Next.js (one source → SSR web / static Capacitor)

Reverses the **FE-framework axis** of the 2026-06-02 stack-pick ("Vite + React; Next.js rejected"). Surfaced via `/ce-sessions`: that rejection was of **SSR** Next.js; **static-export + a one-source/two-targets build** was never evaluated, and it resolves the Capacitor conflict while delivering the job-hunt Next.js keyword + an SSR/hydration portfolio piece. ADR: [`2026-06-16-fe-framework-nextjs-adr.md`](2026-06-16-fe-framework-nextjs-adr.md); spike: [`../spikes/2026-06-16-fe-framework-nextjs.md`](../spikes/2026-06-16-fe-framework-nextjs.md).

**Decision:** Next.js (App Router), one source `apps/notation-hero`, two build targets — **SSR web** (OpenNext → Lambda + CloudFront, Pulumi, free-tier) + **static-export** (Capacitor iOS/Android). Catalog routes first. **No Amplify** (keeps Pulumi as the single IaC). **Capacitor + PWA + S3/CloudFront + Pulumi + hexagon all unchanged.**

**Status:** ⛔ **SUPERSEDED 2026-06-17** by `ARCH-FE-1` (Vite + TanStack SPA) — see the 2026-06-17 entry above; leocaseiro chose to supersede this Next.js decision ("superseding whatever we decided yesterday"). [Historical] was 📄 prose-only, tracked in **NH-185** (Story under Epic NH-177); the OpenNext SSR Lambda is **not** being built.

### 2026-06-15 — CMS via catalog reuse (front-end pivot) + Alpha build order

Ratified by leocaseiro 2026-06-15. The admin CMS **reuses the same catalog UI + the same lambdas**, with admin-gated write actions — **no separate admin SPA**. This **supersedes the UI half** of `docs/cms-approach.md` (the React-Admin SPA, Option 1 → effectively its Option 1a "hand-rolled UI"); that doc's AWS **backend** analysis still stands. Already the locked direction in the 2026-06-13 catalog design (`catalog-flow-decisions.md`: _"CMS = the same UI"_). Spec: `docs/specs/2026-06-15-cms-admin.md` (eng-reviewed, CLEARED). Tracked by **NH-122 [K-2]**; **NH-24 folded in + cancelled as duplicate**.

**Eng-review decisions (F1–F3):** F1 — gated admin-read mode on the K-3 read API (same lambda returns all statuses when the password is present); F2 — one public site + in-lambda password on writes (secret in SSM SecureString, never in the repo); F3 — include un-archive (delete = archive, schema §12).

**Build order (leocaseiro, 2026-06-15):** (1) **CRUD for catalog** — K-_bundle: NH-79 Neon adapter → NH-126 [K-1] store → NH-123 [K-3] read API → NH-122 [K-2] CRUD UI; (2) **play a song** (no MIDI, no score) — player core A-1/A-2 + B-1/B-2/B-7; (3) **SRE + Sentry + analytics** — H-7 (NH-52) + H-8 (NH-124) + H-6 (NH-54) / J-8 (NH-51); (4) **MIDI + score** — D-_ (NH-100..32) + C-\* (NH-97..29). Jira rank to be aligned to this order.

No status-table/enforcement changes (front-end approach + sequencing decision; no machine gate).

### 2026-06-15 — NH-16 agent PR merge checklist (v1) + KAN→NH migration

Shipped the first slice of NH-16 (the L6 PR-policy ticket, moved KAN-125 → NH-16). **v1 deliberately uses a custom CI step, NOT DangerJS** — a tick-the-box checklist wants a native task-list gate, not Danger's fail/warn comment (Danger smart rules deferred to the NH-16 v2 backlog). Spec: `docs/specs/2026-06-15-pr-merge-checklist.md`.

**What landed:**

- `tooling/pr-checklist.mjs` + a `pr-checklist` CI job (PR-event only, bot-exempt, non-path-filtered, wired into the required `ci-green` check). Two checks: (1) a real `NH-`/`KAN-` key in the PR title/body/branch — **un-skippable**, the teeth for "every PR is tracked"; (2) the **no-blank-boxes** rule — every `required:`/`warn:` item in the PR body must be `[x]` or `N/A`, so warnings can't be silently ignored.
- `.github/pull_request_template.md` carries the prefixed checklist; supports **both NH- and KAN-** keys.
- `lefthook.yml` pre-push `worktree-reminder` (non-blocking `git worktree list` — the overlap signal CI can't see).
- `CONTRIBUTING.md` updated for KAN→NH (both keys recognized; NH active).

**Clarification (leocaseiro):** "baby steps = many small COMMITS within a PR," NOT a PR-LOC cap. DACI L6's "PR > ~400 lines = fail" is the baby-COMMIT discipline; v1 PR-size is a soft `warn:` self-attest item, never a blocking fail. Mirrored as a clarification note in `2026-06-09-tooling-stack-daci.md`.

**Status changes (effective on merge):**

- NEW `L6-checklist` → **✅ done · 🤖**. PR-checklist gate (Jira-key presence + no-blank-boxes) runs in CI as a required check. Honesty-based for the checkboxes; the Jira-key grep is the one hard check.
- `L6` DangerJS green-fake / first-use / anti-gaming rules → **still ⏳ pending** (NH-16 v2 smart backlog; v1 is intentionally non-Danger).

**Migration:** Jira **KAN → NH** (company-managed). KAN-125 is now **NH-16**; both keys stay valid in branches/commits/PRs and in the checklist regex `(NH|KAN)-\d+`.

**Review hardening (ce-code-review, 2026-06-15):** a post-review pass closed four gate findings — delete-the-checklist bypass (template-anchoring: items are read from the PR template, missing one fails), N/A-in-label false-pass (N/A honored only in the author text after the label), quoted-sample false-fail (strip HTML comments + code fences), and the template's example key satisfying the key check (exclude checklist lines from the key search). Added `tooling/pr-checklist.test.mjs` (13 cases incl. the three regressions) + `pnpm run test:tooling`, run in the CI `quality` job. `pr-checklist` job documents the dep-free `setup-node` exception (AGENTS.md).

### 2026-06-14 — NH-150 first `pulumi up` (hello-world Lambda Function URL)

First real AWS deliverable + the first real Nx packages below the layer dirs (everything was empty stubs before). `apps/handler-hello` (runtime handler, esbuild → cjs/node22) + `infra/` (the `LambdaWithUrl` Pulumi ComponentResource + composition, packaging the handler's build output via `FileArchive`). The `pulumi up` deploy itself is a **human-gated** step run separately. Plan: `docs/plans/2026-06-13-001-feat-kan-119-pulumi-hello-world-plan.md`.

**Component placement (decision):** the `LambdaWithUrl` Pulumi component lives in **`infra/` (type:infra)**, NOT `adapters/aws` as the (stale, pre-ADR) `docs/cicd-pipeline.md` / NH-150 ticket text implied. Rationale: the live depcruise **H9** (`no-infra-to-app-or-domain-source`) forbids `infra → adapters` source imports, **H3** places IaC in `infra/`, and `check-layout.sh` has no `.component` suffix (`.stack` is approved). `adapters/aws` is therefore NOT created here — it lands later with its real runtime feature (the Neon repository).

**Status changes (effective on merge):**

- `FOLD-serverless` → **✅ done · 🟡**. The per-Lambda two-project split is realized: `apps/handler-hello` (type:app) + `infra/` (type:infra), siblings, handler never colocated with IaC. Backstopped by the live depcruise H8 (apps↛@pulumi) + H9 (infra↛apps/core/adapters source); the project-colocation itself stays convention (depcruise can't see intra-project imports).
- `H1` → **✅ done · 🟡**. Handler (`apps/handler-hello`) and IaC (`infra/`) are separate Nx projects; backed by H8/H9.
- `H2` → **✅ done · 🤖**. Handler imports no `@pulumi/*` — enforced live by depcruise H8 (`no-handler-to-pulumi`).
- `H3` → **✅ done · 🤖**. IaC lives in `infra/` (type:infra), imports `@pulumi/*`, never domain source — enforced live by depcruise H9 (`no-infra-to-app-or-domain-source`).
- `H4` → **✅ done · 📄**. `infra/index.ts` packages `FileArchive("../apps/handler-hello/dist")` (build output), never handler source. Prose-grade — the dist-path string is invisible to depcruise/Nx (no machine check).
- `M8-nxignore` → **✅ done · 🟡**. `.nxignore` added with `.pulumi/`; `.gitignore` already covered `.pulumi/` + `*.yaml.bak` + `dist/`. Pulumi stack config (`Pulumi.<stack>.yaml`) stays committed.
- `M5-nvmrc` / `L12-pin` → **Lambda-runtime-match axis CLOSED**. esbuild `--target=node22` matches the Lambda runtime `nodejs22.x` (the deferred half of M5/L12-pin). `.nvmrc` stays Node 24 for the build host (Node 24 is not a Lambda runtime).

**Enforcement-config changes (this PR):**

- `.dependency-cruiser.cjs`: added `exclude: (^|/)dist/` (never cruise esbuild/tsc build output) + two `no-orphans` entry-point exemptions (`infra/index.ts` Pulumi composition root; `apps/handler-hello/src/index.ts` Lambda handler entry) — the rule's own comment sanctions adding these "when app/infra composition roots arrive."
- `knip.json`: `ignoreBinaries: ["pulumi"]` (system CLI, not an npm dep). Knip stays advisory (no CI gate).

**Not done (deferred):** `M2-typecov` / `L4-typecov` (no type-coverage gate yet), `M6-sizelimit` (no per-Lambda size budget yet), `E-pnpm-catalog` (the repo still uses direct version pins everywhere — a catalog migration is its own task; these new deps follow the existing direct-pin style). The actual `pulumi up` + CloudWatch verification is the gated NH-150 completion step. The A–G status tables below still show the pre-NH-150 rows (⏳/🟥) for FOLD-serverless/H1–H4 — they are auto-derived and reconcile on the next `docs(registry)` regen pass; this Change-log entry is authoritative.

### 2026-06-12 — File-level structure enforcement (ADR D1–D7 / PR #25 rework)

Ratified by leocaseiro 2026-06-12. ADR: `docs/decisions/2026-06-12-file-level-structure-enforcement-adr.md` (evidence: the same-dated spike + cross-ecosystem research). Reworks PR #25 from Option A (Pascal/camel + folder-per-entity) to **Option B (kebab-case + role suffix)**. Every rule fixture-verified, not vacuously green.

**Status changes (effective on merge):**

- `L2-tags` → **✅ done · 🟡 (wired, NOT yet CI-enforced — see ⚠️ below)**. `@nx/enforce-module-boundaries` tag rule wired in `.eslintrc.cjs` (PR #25, commit `96ddf1c`); it runs only under ESLint, which has no live CI lint target yet.
- `DEPCR-files` → **✅ done · 🤖**. depcruise file-level bans live: H8 (handler↛@pulumi), H10 (core↛@aws-sdk), H11 (adapters↛apps/infra), **H9 widened** to `^(apps|core|adapters)/` (D3), plus **new `no-core-to-pulumi`** (D5). Top-level paths (`core/`/`adapters/`), not the registry's old `libs/`. Commit `84a2a87`. **Review update:** H8 broadened from `^apps/[^/]+/src` to `^apps/` so flat/lib handlers are covered (#6); **new `no-apps-to-infra`** (`^apps/` ↛ `^infra/`) added (#7). depcruise runs as a direct CI command, so these stay genuinely 🤖.
- `H7`/`H8`/`H9`/`H10`/`H11` → **✅ done · 🤖**. The DACI "keep BOTH depcruise + Nx" is now **empirically confirmed** by the spike — depcruise uniquely does cycles + orphans + graph viz under the legacy eslintrc (ESLint's `no-cycle`/`no-unused-modules` did not fire).
- `CONV-1`/`CONV-2` → **📄→🤖**. `tooling/check-layout.sh` now machine-enforces no-`__tests__`/`__mocks__`/`stories` dirs (Rule 1) + co-located test sibling (Rule 3). **Folder-per-entity DROPPED** (D2) — the role suffix carries the role. Commit `827bee9`.
- NEW `NAME-suffix` → **🟡 partial**. kebab-case filenames + role suffix on every domain/app file. **suffix-PRESENCE** (`check-layout.sh`, ADR F-1, commit `827bee9`) is **CI-live 🤖**; **kebab-CASING** (`check-file` `KEBAB_CASE`, commit `84d5c53`) + the junk-drawer `*.manager`/`*.helper` blocklist run under ESLint and are **NOT yet CI-enforced 🟡** (see ⚠️ below). Pascal-vs-camel DangerJS task dropped (NH-16 comment).
- NEW `STRUCT-sibling` → **🟡 partial · 🟡 (editor-only; NOT yet CI-enforced — see ⚠️ below)**. `eslint-plugin-boundaries` v6 adopted for FILE-level layer direction with editor-realtime feedback (commit `96af4bb`); **sibling/internal isolation DEFERRED** (the v6-clean mechanism `entry-point` mandates per-feature barrels ADR §6.3 forbids; `no-private` is v6-deprecated; no intra-layer structure yet to verify against). Revisit at first-use.
- NEW `STRICT-tiers` → **📄 prose-only**. Enforcement-tier ladder adopted (lint → test → compile); next lever is the tier-a compile wall via TS project references (elevates `L2-projref`, D7).
- `L2-projref` → elevated to the next strictness lever (tier-a compile wall, D7); status unchanged (⏳ — not yet implemented).

> **⚠️ CI-enforcement reality (PR #25 review #1):** Only **depcruise** (H8–H11, `no-core-to-pulumi`, `no-apps-to-infra`) and **`tooling/check-layout.sh`** (Rules 1–3) actually execute in CI today — they run as direct commands in the `quality` job, so they are genuinely 🤖. The **ESLint-delivered** rules — `@nx/enforce-module-boundaries` (`L2-tags`), `check-file` kebab-casing + blocklist (the casing half of `NAME-suffix`), `eslint-plugin-boundaries` (`STRUCT-sibling`) — are **wired but NOT yet CI-enforced** (🟡): `pnpm run lint` = `nx run-many --target=lint` and no project has a real lint target yet (placeholder `echo` scripts; ESLint 9 defaults to flat config with no `eslint.config.*` and `ESLINT_USE_FLAT_CONFIG` unset, so the legacy `.eslintrc.cjs` wouldn't load even if a target ran). They flip to 🤖 when per-package lint scripts (the AGENTS.md `ESLINT_USE_FLAT_CONFIG=false eslint` template) + tagged Nx projects + the flat-config migration (NH-42) land. Until then, `check-layout.sh` carries suffix-PRESENCE and depcruise carries layer-direction as the live CI backstop.

### 2026-06-12 — NH-83 CI architecture + NH-167 .nvmrc (Theme 2 part 1)

**Status changes (effective on merge):**

- `L7-set-shas` → **✅ done · 🤖**. `nrwl/nx-set-shas@v4` added to the `quality` and `build` jobs in `ci.yml` (NH-170). Sets `NX_BASE`/`NX_HEAD` so `nx affected` works correctly across `pull_request`, `push:master`, AND `merge_group` events. `fetch-depth: 0` on the checkout gives the action the history it needs. Pinned to `@v4`. `main-branch-name: master` overrides the action's `main` default.
- `L7-reusable-wf` → **✅ done · 🤖**. Local composite action at `.github/actions/setup-js/action.yml` (pnpm/action-setup + setup-node@v6 with `node-version-file: .nvmrc` + cache pnpm + frozen-lockfile install). Replaces the repeated 4-step prelude in the `quality`, `build`, and `pr-title` jobs (NH-171). Adding a new JS-toolchain gate is now one `- uses: ./.github/actions/setup-js` line. Net diff: +27 composite / −18 workflow.
- `L7-merge-queue` → **✅ wired · 🤖** (CI ready + version-controlled Ruleset; admin runs `tooling/branch-ruleset.sh --apply` once). `merge_group:` event added to `ci.yml` triggers (NH-172); `pr-title` is correctly gated to `pull_request` only and skips on merge_group. **The merge queue is a Rulesets-only feature** — classic Branch Protection (managed by `tooling/branch-protection.sh`) does NOT support it. New `tooling/branch-ruleset.json` + `tooling/branch-ruleset.sh` manage the `master-merge-queue` Ruleset (squash, ALLGREEN strategy, 5-concurrent build, 1-5 group size, 60-min check timeout). Two layers coexist cleanly: classic protection = what's required (CI Green, linear history), Ruleset = how merges happen (the queue itself).
- `L7-plan-tier` → **✅ verified**. Repo is `public`, GitHub Free supports `merge_group`. `gh api repos/leocaseiro/notation-hero --jq '.visibility'` = `public` (logged in PR #22 description).
- `M3-mergegroup` → **✅ done · 🤖**. Tied to `L7-merge-queue` above (workflow side wired; queue-enable is admin step).
- `M5-nvmrc` → **🟡 partial · 🤖**. `.nvmrc` added at repo root with `24`; the composite action's `node-version-file: .nvmrc` now drives CI Node too — single source of truth for local AND CI. pnpm pin via `packageManager: pnpm@11.5.2` was already set (PR #2). Stays partial (not done) because the `M5` intent also includes Lambda-runtime match (esbuild target = Lambda Node version) — a Lambda-domain check that lands when first apps deploy.
- `L12-pin` → **🟡 partial** (was `⏳ pending`). `.nvmrc 24` lands here for the dev/CI parity axis; the Lambda-runtime match (esbuild target = Lambda Node version) still pending first Lambda deploy.
- `NH-98` (nx release / M7-release) **deferred to standalone brainstorm session** — initial dry-run on the skeleton repo surfaced unresolved questions (release-group glob for a single-stub-project workspace, first-release flag flow, CHANGELOG location vs gallant-bardeen's NH-79 future adapter). See NH-98 Jira comment 2026-06-12 for the 7 open Qs. No registry status change (M7-release stays 🔒 locked-active · 📄 prose-only).
- `NH-96` (AGENTS.md generated-from-config + drift-check / L8-1 / L8-2) **deferred to its own PR** — design call between a full generator (200+ LOC) and a minimal drift-check (30 LOC) is large enough to want its own review surface.

### 2026-06-12 — NH-91 no-escape-hatches ESLint + NH-93 commitlint

**Status changes (effective on merge):**

- `F3-noescape` / `L5-no-escape-hatches` → **✅ done · 🤖**. Three layers now enforce no-escape-hatches: (1) `@typescript-eslint/ban-ts-comment` bans `@ts-ignore`/`@ts-nocheck` (PR #9), (2) `@eslint-community/eslint-plugin-eslint-comments`'s `require-description` (active) requires a reason for every `eslint-disable`; ESLint's native `reportUnusedDisableDirectives: true` catches unused disables (replaces the deprecated `no-unused-disable` plugin rule), (3) `tooling/check-no-coverage-ignore.sh` bans both `// istanbul/c8/v8 ignore` (line) AND `/* istanbul/c8/v8 ignore */` (block) directives via `git grep` over the index (CI `quality` job; CI is authoritative — no pre-commit duplicate per gitleaks/semgrep pattern). Hardened in this PR (post code-review) against the xargs whitespace-bypass and single-line-comment-form gaps.
- `L6-4` → **✅ done · 🤖** at TWO levels: (a) `@commitlint/cli` + `@commitlint/config-conventional` validate every local commit message via Lefthook `commit-msg` hook; (b) a CI `pr-title` job pipes the PR title through the same `commitlint.config.cjs` (single source of truth) so multi-commit PRs that squash-merge can't bypass the gate via the PR title (repo `squash_merge_commit_title = COMMIT_OR_PR_TITLE`; for 1-commit PRs the local hook is sufficient). Required by `nx release` (NH-98) needing conventional-commit subjects in master history. `body-max-line-length` relaxed to warn at 200 (not error) for long body lines.
- `commitlint.config.*` added to the CI `code` path-filter so a config-only PR can't false-green; `pr-title` job added to the required `ci-green` gate's `needs:` list.
- New `pnpm run check:layout` + `pnpm run check:coverage-ignore` scripts expose the shell guards as agent-runnable entry-points (parity with `pnpm run depcheck`/`knip`/`syncpack`).
- AGENTS.md "Setup in a fresh worktree / clone" section added — documents the `pnpm install --ignore-scripts` + `pnpm exec lefthook install` recovery path for the per-worktree `core.hooksPath` quirk we hit during this session, plus a verification step.

### 2026-06-12 — fix(registry): resolve committed conflict markers from PR #19 merge

**Status changes (effective on merge):**

- `E-no-orphans-error` conflict markers resolved: → **✅ done · 🤖** (per NH-89/136 change-log).
- `E-osv-scanner` conflict markers resolved: → **🔒 locked-active · 🤖** (per NH-154 change-log).

### 2026-06-12 — NH-89 dependency hygiene (Knip + Syncpack + no-orphans error)

**Status changes (effective on merge):**

- `E-syncpack` → **✅ done · 🤖**. `.syncpackrc.json` + `syncpack` script + a `Dependency versions (Syncpack)` step in the CI `quality` job enforce consistent dependency versions across the workspace (NH-143).
- `E-no-orphans-error` / `CONV-5` → **✅ done · 🤖**. `.dependency-cruiser.cjs` no-orphans flipped WARN→ERROR, with `*.test.*`/`*.spec.*`/`*.stories.*` exempt as entry points; enforced via the existing `depcheck` gate (NH-144). Safe now (0 modules cruised).
- `E-knip` → **🔒 locked-active** (advisory). `knip.json` + `knip` script landed for dead-code/unused-dep detection (NH-142); **advisory, no CI gate** until apps land (per the decision), then flips to error. `ignoreDependencies` covers `@nx/eslint`+`@nx/js` (Nx plugins knip can't trace on a stub repo). Knip's default test/story-as-entry behavior covers `CONV-6` — verify when tests land.
- `knip.json` + `.syncpackrc.json` added to the CI `code` path-filter so a config-only PR can't false-green.

### 2026-06-11 — NH-154 osv-scanner + NH-155/132 security settings

**Status changes (effective on merge):**

- `E-osv-scanner` → **🤖 machine-enforced**. New `deps-cve` CI job runs osv-scanner (pinned `google/osv-scanner-action/osv-scanner-action@v2.3.8`, `--recursive ./`) recursively over the repo tree (picks up the pnpm lockfile), wired into the required **"CI Green"** gate; fails the build on any known dependency CVE. Closes the 🟥 SCA gap.
- `E-gh-secret-scan` → **✅ done · 🤖**. GitHub-native secret scanning **and** push protection enabled on the repo (NH-156, via `gh api`). Layers on top of gitleaks (`E-gitleaks`) while public; auto-off if the repo goes private (needs GHAS).
- `E-dependabot` — Dependabot **alerts** now enabled (NH-155, via `gh api PUT /vulnerability-alerts`). Version-update PRs remain Renovate's job (`E-renovate`); Dependabot security-updates left off to avoid duplicate PRs.

### 2026-06-11 — NH-153 Semgrep SAST

**Status changes (effective on merge):**

- `E-semgrep` → **✅ done · 🤖 machine-enforced**. Semgrep now runs (1) in CI as the `sast` job wired into the required **"CI Green"** gate (`semgrep scan --config auto --error`, free community rulesets, no token; path-filtered on `code`), and (2) locally as a best-effort Lefthook pre-commit hook (`tooling/semgrep-precommit.sh`, scans staged source, graceful skip if semgrep isn't installed). Closes the 🟥 SAST gap. CodeQL deep SAST (`E-codeql`, NH-19) layers on out-of-band.

### 2026-06-11 — NH-152 gitleaks secret scanning

**Status changes (effective on merge):**

- `E-gitleaks` → **✅ done · 🤖 machine-enforced**. gitleaks now runs (1) in CI as the always-on `secret-scan` job wired into the required **"CI Green"** gate (`gitleaks/gitleaks-action@v2`, full-history scan, free on this personal/public repo), and (2) locally as a Lefthook pre-commit hook (`tooling/gitleaks-precommit.sh`, best-effort — graceful skip if gitleaks isn't installed; verified against gitleaks 8.30). Closes the 🟥 secret-scan gap. GitHub-native secret scanning (`E-gh-secret-scan`, NH-156) layers on top while public.

### 2026-06-11 — NH-147 repo-meta (README + CODEOWNERS + Dependabot)

**Status changes (effective on merge):**

- `L6-5` (CODEOWNERS-by-layer + enforcement-file coverage) → CODEOWNERS added at `.github/CODEOWNERS` (single-owner `@leocaseiro`; explicitly lists `.github/workflows/`, `.eslintrc.cjs`, `.dependency-cruiser.cjs`, `lefthook.yml`, `nx.json`, `tsconfig*.json`, `tooling/`, `AGENTS.md`, `docs/decisions/`). Stays **📄 prose-grade** — solo-repo branch protection cannot require CODEOWNERS review (Footgun #2: GitHub forbids self-approval), so this documents ownership, it does not gate merges.
- `E-dependabot` → `.github/dependabot.yml` added, scoped to **github-actions** (weekly) only. npm/pnpm version-update PRs remain owned by **Renovate** (`E-renovate`, lands with NH-89) to avoid duplicate update PRs; Dependabot security _alerts_ stay a repo setting. ⚠️ NH-147's text said "Dependabot pnpm-workspace aware" — **narrowed to actions-only** for registry consistency (E-renovate owns npm); revisit only if Renovate is dropped.
- `README.md` added (root) — no enforcement change.

### 2026-06-11 — PR #9 (guardrails + Jira migration)

**Status changes (effective on merge):**

- `__tests__/` · `__mocks__/` · `stories/` dir ban → **🤖 machine-enforced** by `tooling/check-layout.sh` (CI quality job) — closes the dir-ban lint gap for `CONV-1` / `CONV-coloc` / `L5-test-colocation`; full co-located placement stays a convention.
- `@ts-ignore` · `@ts-nocheck` → **🟡 partial** via ESLint `ban-ts-comment` (`L5-no-escape-hatches` / `F3-noescape`); `eslint-disable`-reason rules land in PR #2.
- `L10a` / `L10b` (Linear MCP + GitHub App) → **⛔ superseded → Jira (KAN, now NH)**; see `2026-06-11-tracker-linear-to-jira.md`.
- **Lefthook git hooks** (`L8-3` / `L6`) → **✅ done**: pre-commit runs the layout guard + `nx affected` lint/typecheck; pre-push adds test — local enforcement _before_ CI. (gitleaks + commitlint deferred to follow-up PRs.)

**Manual approvals (leocaseiro):**

- Issue tracker → migrated **Linear → Jira (KAN → NH)**.
- L3 formatter → **keep ESLint + Prettier** (Nx boundary rule IS `@nx/eslint`; agent-idiomatic).
- L5 test runner → **adopt Vitest at L5** (node:test runs today).
- L5 Stryker mutation testing → **keep**. · L5 coverage ratchet → **keep**.
- L4 `isolatedDeclarations` + type-coverage → **keep the rigor** (stress-tested 3× in prior sessions).
- L9 Renovate → **keep** (vs Dependabot; grouped PRs). · L7 merge-queue → **keep**.
- 9 remaining discretionary decisions (security scanners, AGENTS-from-config, dep-cruiser+Nx, DangerJS, Knip/Syncpack, Sentry, Lefthook) → **bulk-ratified as-is**.
