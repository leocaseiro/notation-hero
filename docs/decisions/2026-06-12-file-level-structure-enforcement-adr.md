# ADR — File-level structure contract & enforcement-tier strategy

- **Status:** ♻️ **Partially superseded (2026-06-18, NH-194)** by [`2026-06-17-architecture-decisions.md`](2026-06-17-architecture-decisions.md): **`NAME-suffix` (suffix-everything) → relaxed to NestJS-native filenames** (ARCH-NAME-1; `core/` keeps the strict pure-domain subset `entity|value-object|aggregate|event|specification|port|policy`), and the **depcruise rules move from package/tag-level to folder-level** under `server/src/` (ARCH-GUARD-1). **Kept:** `D1` (depcruise earns its place) and test co-location. Original: ✅ Accepted (ratified by leocaseiro, 2026-06-12), never implemented.
- **Date:** 2026-06-12
- **Driver / Approver:** leocaseiro
- **Evidence:**
  - Empirical spike — [docs/spikes/2026-06-12-file-level-structure-enforcement.md](../spikes/2026-06-12-file-level-structure-enforcement.md) (29 fixtures, PR #25 bundle as system-under-test, capability matrix)
  - Cross-ecosystem research — [docs/research/2026-06-12-file-naming-and-layer-strictness-cross-ecosystem.md](../research/2026-06-12-file-naming-and-layer-strictness-cross-ecosystem.md)
  - Live config under test — PR [#25](https://github.com/leocaseiro/notation-hero/pull/25) `claude/agent-aligned-enforcement`
- **Scope:** the **file-level** structure contract layered on top of the **locked** hexagon (`core/ adapters/ apps/ infra/`, `FOLD-hex`). This ADR does **not** reopen hexagon layering, pnpm+Nx, or test co-location.

---

## Context

The monorepo shape is locked. What was still open: the **file-level** contract — suffix convention, import strictness below the package/layer line, the deferred file-level bans (H8–H11), and whether **dependency-cruiser earns its place** alongside Nx tags + ESLint. The trigger was the Xebia "frontend architecture with dependency-cruiser" article, which only benchmarked bare `no-restricted-imports` + `eslint-plugin-import` and therefore overstated depcruise's exclusivity.

A spike built throwaway fixtures for every violation class and ran them against the PR #25 enforcement bundle **and** a candidate pure-ESLint stack; two research passes grounded the conventions across Nx/Angular/NestJS/DDD/.NET/JVM/Go/Rust. The decisions below are the result.

---

## Decisions

### D1 — KEEP dependency-cruiser

**Decision:** Keep dependency-cruiser. It is **not** redundant.

**Rationale (empirical):**

- Neither tool is a superset. depcruise uniquely provides **today**: cycle detection, orphan detection, and **graph visualization** (Mermaid/Dot — no linter can do this).
- The candidate ESLint stack (`import-x/no-cycle`, `import-x/no-unused-modules`) **did not fire** under the repo's legacy `.eslintrc.cjs` despite a working resolver (verified via `no-unresolved`). import-x 4 is flat-config-first; its graph rules are unreliable until the flat-config migration (`L3-eslint`/NH-42).
- depcruise's **path/external bans (H8–H11 + layer) ARE reproducible** in ESLint at equal precision (`import-x/no-restricted-paths` matched relative + alias + workspace-package), so the overlap is **deliberate belt-and-suspenders**, not waste — and depcruise additionally guards files **not yet in an Nx project** (the entire pre-source repo).
- Its role is **tier-c fast feedback + visualization, sitting _under_ the compile wall (D7)** — not the wall itself.

This empirically **confirms** the standing `H7` / `L2-depcruise` "keep both" decision rather than inheriting it on faith.

### D2 — File naming: kebab-case + role suffix, suffix **everything** (Option B)

**Decision:** kebab-case filenames **everywhere** + a **role suffix on every domain/application file**, including entities. Co-located tests stack: `name.role.test.ts`.

Examples: `catalog-item.entity.ts`, `logger.port.ts`, `neon-catalog.repository.ts`, `publish-lesson.command.ts`, with tests `catalog-item.entity.test.ts`.

**This supersedes PR #25's Option A** (PascalCase/camelCase split + folder-per-entity, no role suffix). **`folder-per-entity` is dropped** — the role suffix carries the role, which removes the bespoke `check-layout.sh` folder rule.

**Rationale (empirical + research):**

- Most idiomatic for a **hexagonal Nx** repo — the canonical 12k★ `domain-driven-hexagon` suffixes everything in kebab.
- **One** `check-file` rule (`KEBAB_CASE`, `ignoreMiddleExtensions: true` — already set in PR #25) covers source **and** stacked tests; verified `catalog-item.entity.test.ts` passes (the flag strips both `.entity` and `.test`).
- Resolves two warnings in the research doc: **Nx generators emit kebab** (Option B = zero fight with the entity generator) and **`apps/` frameworks expect kebab** (one rule works in every layer). PR #25's Pascal/camel rule fights both.
- Sidesteps the **macOS case-insensitive-filesystem collision** (`Brand.entity.ts` vs `brand.entity.ts` clashed twice during the spike) and the **PascalCase-suffix-vs-folder-per-entity collision** (`Brand.entity.ts` demanded a `Brand.entity/` folder).
- **Suffix-everything (vs entities-suffix-free)** chosen for maximum determinism + agent-proofing: every file declares its role, so `check-file` can enforce per-role and agents can't create ambiguous files.
- Makes the legacy Pascal-vs-camel DangerJS naming task **redundant** — drop it.

**Suffix taxonomy (starting set — refine in the AGENTS.md naming section):**

| Layer                    | Suffixes                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`                  | `.entity.ts`, `.value-object.ts`, `.aggregate.ts`, `.event.ts` (domain event), `.specification.ts` (policy/rule), `.port.ts`, `.service.ts` (domain service), `.error.ts` |
| `adapters/`              | `.adapter.ts`, `.repository.ts`, `.mapper.ts`, `.client.ts`                                                                                                               |
| `apps/`                  | `.handler.ts`, `.use-case.ts`, `.command.ts`, `.query.ts`, `.controller.ts`, `.dto.ts`                                                                                    |
| `infra/`                 | `.stack.ts` / `.infra.ts` (Pulumi IaC)                                                                                                                                    |
| tests                    | `*.test.ts` — stacked, e.g. `*.entity.test.ts`                                                                                                                            |
| **unsuffixed (allowed)** | `index.ts` (package/project entry only), `*.config.ts`, `*.d.ts`                                                                                                          |

- Outliers corrected vs the original brief: `*.value.ts` → `*.value-object.ts`; `*.policy.ts` → `*.specification.ts` (or accept as a house term); `*.client.ts` kept (adapter detail).
- **Ban junk-drawer suffixes** `*.manager.ts` / `*.helper.ts` via `check-file/filename-blocklist`; allow a **narrow** `*.util.ts` only for genuinely generic pure functions.

### D3 — Enforce H8–H11; widen H9

**Decision:** enforce H8/H10/H11 as written; **widen H9** from `infra ↛ (apps|libs)` to **`infra ↛ (apps|core|adapters)` source**.

**Rationale:**

- H8/H10/H11 are built, probe-verified, **0 false positives** on the empty repo (spike §4.1).
- H9's `^(apps|libs)/` is **vestigial** — this repo has no `libs/`, so as written H9 only blocks `infra→apps`. Widening it **enforces the repo's own registry `H3`** (_"IaC lives in infra/; imports @pulumi/_; **never domain source**"_) + `H4` (_"references the handler BUILD OUTPUT … never its source"\*).
- This is **not** a contradiction of clean-architecture's "composition root imports inward": in the serverless-Pulumi split the **runtime composition root is `apps/`** (the handler, which _may_ import `@core` per `H2`), while **`infra/` is pure IaC** that wires via build output. Go (`internal/`), Rust (crates), and .NET (Infrastructure references built Core) all treat the deploy layer this way.
- Escape valve: genuinely-shared deploy constants live in a non-domain config, not `core/`.

### D4 — Adopt `eslint-plugin-boundaries` now

**Decision:** adopt `eslint-plugin-boundaries` (v6 `boundaries/dependencies`) immediately, for **sibling-folder internal isolation** _and_ **editor-time layer-direction feedback**.

**Rationale:** it is the **only** tool that does sibling/internal isolation (`core/lessonA` reaching into `core/lessonB` internals — missed by depcruise, Nx, and PR #25). It also emits live in-editor errors for layer-direction imports, which is why it makes D6 unnecessary. (This was chosen over deferring — leocaseiro elected to enforce from commit one.)

### D5 — Add depcruise `no-core-to-pulumi` parity rule

**Decision:** add a `no-core-to-pulumi` rule to `.dependency-cruiser.cjs`.

**Rationale:** the spike found an asymmetry — depcruise has `core→@aws-sdk` (H10) and `apps→@pulumi` (H8) but **no `core→@pulumi`**, which only the ESLint `core/` deny-list caught. Adding it (~4 lines) makes depcruise's external bans symmetric and keeps the belt-and-suspenders parity intact.

### D6 — Do NOT add `import-x/no-restricted-paths`

**Decision:** skip it.

**Rationale:** redundant for layer direction, which is now **triple-covered**: `eslint-plugin-boundaries` (D4, live editor feedback), TS project references (D7, compile wall + editor), and dependency-cruiser (CI). A fourth tool is unjustified churn.

### D7 — Climb enforcement tiers: TS project references as the compile wall

**Decision:** commit to climbing from **tier-c (lint)** toward **tier-a (compile wall)** via **TS project references** (`tsc -b` fails undeclared cross-layer imports — `TS6307`). Already planned as `L2-projref` / `F-4` (`nx sync`, Lane A); this ADR elevates it from "someday" to **the next strictness lever**. Optionally add `package.json` `exports` maps (Go-`internal/` emulation) and a `ts-arch`/ArchUnitTS test (tier-b) later.

**Rationale:** lint alone is bypassable (`// eslint-disable` line 1). A "strict foundation" needs a wall a determined dev/agent must edit a visible manifest to bypass. Stacked, this yields "multiple independent gates, ≥1 of which fails the build." dependency-cruiser, boundaries, and Nx tags remain the fast tier-c feedback **under** the wall.

---

## Resulting enforcement-ownership model (tiered)

| Rule / concern                                  | Tier (a) compile                               | Tier (b) test   | Tier (c) lint — editor                                             | Tier (c) lint — CI                                                  |
| ----------------------------------------------- | ---------------------------------------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Layer direction (`core↛adapters`, …)            | TS project references (D7)                     | _(opt) ts-arch_ | `@nx/enforce-module-boundaries` + `eslint-plugin-boundaries` (D4)  | dependency-cruiser                                                  |
| File-level source bans (H9/H11)                 | TS project references (D7)                     | —               | —                                                                  | **dependency-cruiser**                                              |
| External-package bans (H8/H10, core↛@pulumi D5) | —                                              | —               | ESLint `no-restricted-imports`                                     | **dependency-cruiser**                                              |
| Cycles                                          | —                                              | —               | —                                                                  | **dependency-cruiser** (import-x `no-cycle` unreliable until NH-42) |
| Orphans                                         | —                                              | —               | —                                                                  | **dependency-cruiser**                                              |
| Sibling / internal isolation                    | —                                              | —               | **`eslint-plugin-boundaries`** (D4)                                | dependency-cruiser (path rules)                                     |
| Public entry point                              | TS project references / package `exports` (D7) | —               | `@nx/enforce-module-boundaries` (project)                          | —                                                                   |
| Filename + role suffix (D2)                     | —                                              | —               | `check-file` (`filename-naming-convention` + `filename-blocklist`) | —                                                                   |
| Type naming / default-export / import-order     | —                                              | —               | `@typescript-eslint/naming-convention`, `import-x`                 | —                                                                   |
| **Visualization**                               | —                                              | —               | —                                                                  | **dependency-cruiser** (`--output-type mermaid`) — unique           |
| Commentary only                                 | —                                              | —               | —                                                                  | DangerJS (never a source of truth)                                  |

---

## Consequences

- **PR #25 needs rework before merge.** It implemented Option A; the contract is now Option B. Specifically:
  1. Swap `check-file` glob → `KEBAB_CASE` (keep `ignoreMiddleExtensions: true`); add `filename-blocklist` for `*.manager.ts`/`*.helper.ts`.
  2. **Remove** the `folder-per-entity` rule from `tooling/check-layout.sh` (keep the dir-ban + co-located-test-sibling rules).
  3. **Widen H9** regex → `^(apps|core|adapters)/`; add a clarifying comment that `infra` is IaC (wires via dist/package, never domain source).
  4. **Add** `no-core-to-pulumi` to `.dependency-cruiser.cjs`.
  5. **Add** `eslint-plugin-boundaries` (element-types core/adapters/apps/infra + sibling isolation).
  6. **Do not add** `import-x/no-restricted-paths`.
  7. Drop the planned Pascal-vs-camel DangerJS naming task.
- **Unblocks** the Nx entity generator (was the "one true hard-block" waiting on the suffix decision) and the AGENTS.md naming section.
- **Elevates** `L2-projref` (TS project references) from a deferred nicety to the next strictness lever.
- `@typescript-eslint/naming-convention` (typeLike→PascalCase) is **unaffected** — type _identifiers_ stay PascalCase regardless of kebab _filenames_.

---

## Implementation sequencing (to plan/execute separately — NOT done here)

1. **Rework PR #25** per the 7 points above → green checkpoint.
2. **Wire `eslint-plugin-boundaries`** (D4) with the layer element-types + sibling rules.
3. **Author the AGENTS.md naming section** + the suffix taxonomy; configure the **Nx entity generator** to emit kebab + suffix.
4. **TS project references** (D7 / `L2-projref` / `F-4 nx sync`) as its own lane — the compile wall.
5. _(Optional later)_ `package.json` `exports` maps + a `ts-arch` layer test (tier-b).
6. Each step updates the **decision-registry** statuses + Change log in the same PR (per AGENTS.md governance).

---

## Proposed decision-registry updates (apply with the implementation PRs — shown here for approval)

- **`DEPCR-files`** ⏳→ (on impl) ✅ 🤖 — H8/H10/H11 enforced; **H9 widened** to `infra ↛ apps|core|adapters` source (honors `H3`/`H4`). Add `no-core-to-pulumi` (D5).
- **`L2-tags`** ⏳→ (on impl) ✅ 🤖 — `@nx/enforce-module-boundaries` wired (PR #25). Project-level; depcruise owns file-level (`H7`).
- **`H9`** — amend wording: scope = `apps|core|adapters` (was `apps|libs`).
- **`L2-depcruise` / `H7`** — append the empirical "why both" + the tiered-ownership model from this ADR.
- **`L2-projref`** — elevate priority: chosen as the tier-a compile wall (D7).
- **New `NAME-suffix`** — kebab-case + role suffix on every file (D2/D2b); folder-per-entity dropped; Pascal-vs-camel DangerJS task dropped; junk-drawer suffixes banned.
- **New `STRUCT-sibling`** — `eslint-plugin-boundaries` adopted for sibling/internal isolation (D4).
- **New `STRICT-tiers`** — enforcement-tier ladder adopted; climb lint→compile via TS project references (D7).
- **Change-log entry (2026-06-12):** record ratification of D1–D7 by leocaseiro with the rationale above.

> "Why we run both" (registry one-liner): _We run Nx tags + eslint-plugin-boundaries for fast project/file-level layering with editor feedback, and dependency-cruiser as the file-level CI backstop plus the only architecture visualization — deliberately not redundant, because Nx is blind below the project line and dormant until a folder is a tagged project, while depcruise enforces direction on raw paths from commit one and catches cycles/orphans our ESLint stack can't yet detect under legacy config. TS project references add the compile-time wall above all of them._
