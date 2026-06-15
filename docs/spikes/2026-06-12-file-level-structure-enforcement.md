# Spike — File-level structure enforcement & does dependency-cruiser earn its place

> **Status:** evidence + recommendation. **Decisions marked `🟦 DECIDE` are leocaseiro's to make — nothing here changes enforcement config until approved.**
> **Date:** 2026-06-12 · **Worktree:** `recursing-moser-f882cf` (off `master` 84097c8) · **System-under-test:** PR #25 `claude/agent-aligned-enforcement` (180f3b4)
> **Trigger:** <https://xebia.com/blog/taking-frontend-architecture-serious-with-dependency-cruiser/>
> **Locked (not reopened):** hexagon layering, pnpm+Nx, test co-location.
>
> **✅ DECISIONS RATIFIED 2026-06-12 → see the [ADR](../decisions/2026-06-12-file-level-structure-enforcement-adr.md).** This spike is the *evidence*; the ADR is the *decision record*. Net outcomes: KEEP depcruise (D1); kebab + role suffix, suffix everything, **folder-per-entity dropped** (D2); enforce H8–H11 and **WIDEN H9** to `apps\|core\|adapters` (D3); adopt `eslint-plugin-boundaries` (D4); add depcruise `no-core-to-pulumi` (D5); **skip** `no-restricted-paths` (D6); climb to TS project references as the compile wall (D7). Where this spike's pre-decision recommendations differ (esp. H9), the ADR is authoritative.

---

## 0. TL;DR — decision-ready

1. **KEEP dependency-cruiser.** It is *not* redundant. Empirically, neither tool is a superset of the other, and depcruise is the only tool that does three things **today**: detect **cycles**, detect **orphans**, and **visualise the graph**. In the repo's current **legacy `.eslintrc.cjs`** setup, the ESLint cycle/orphan rules (`import-x/no-cycle`, `import-x/no-unused-modules`) **did not fire at all** despite a working resolver — they are flat-config-first and unreliable until NH-42. depcruise caught both instantly, zero config fuss.

2. **BUT depcruise's file-level *path/external bans* (H8–H11 + layer direction) ARE fully reproducible in pure ESLint** at equal-or-better precision — proven against identical fixtures. `import-x/no-restricted-paths` + `no-restricted-imports` caught **relative, alias, and workspace-package** forms (depcruise parity), and even caught `core→@pulumi`, which depcruise currently *misses*. So the overlap on bans is real and intentional belt-and-suspenders, not waste.

3. **Suffix convention is genuinely open** and there are **two coherent, conflicting options**. PR #25 already committed *Option A* (PascalCase/camelCase split + folder-per-entity, **no role suffix**). The ecosystem evidence favours *Option B* (**kebab-case-everything + role suffix**, e.g. `catalogue-item.entity.ts`) as the most idiomatic choice for a hexagonal **Nx** repo — and it **collapses the naming lint into one rule** and dodges a real case-insensitive-filesystem trap I hit during testing. **🟦 DECIDE.**

4. **A real collision exists in PR #25 today:** a PascalCase role-suffix file (`Brand.entity.ts`) **fails** the folder-per-entity guard (it demands a folder named `Brand.entity/`). So "keep folder-per-entity" and "adopt PascalCase role suffixes" are mutually exclusive unless `check-layout.sh` is patched.

5. **The H8–H11 deferred bans are built, probe-verified, and 0-false-positive** in PR #25 → recommend **enforce now**, with one fix: **H9's regex `^(apps|libs)/` is vestigial** (no `libs/` in this repo) so H9 currently only blocks `infra→apps`, not `infra→core/adapters`. **🟦 DECIDE the H9 widen.**

**One-paragraph "why we run both" (for the registry / a Staff-FE interview):**
> We run Nx tag boundaries for fast *project-level* layering with editor feedback, and dependency-cruiser as the *file-level* backstop plus the only architecture-visualisation we have. They are deliberately not redundant: Nx's tag rule is blind below the project boundary and dormant until a folder becomes a tagged Nx project, whereas dependency-cruiser enforces import direction on raw file paths from commit one, catches cycles and orphans that our ESLint stack can't yet detect under legacy config, and renders the dependency graph (Mermaid/Dot) that no linter can produce. ESLint gives developers instant red squiggles; dependency-cruiser gives CI a graph-aware safety net and gives the architecture a picture.

---

## 1. What was actually tested

- **Isolated worktree** off `master`, `pnpm install` green, baseline gates green (`depcheck` 0 modules, `check:layout` OK, `nx lint` infra-stub OK).
- **Overlaid PR #25's config** (`.dependency-cruiser.cjs`, `.eslintrc.cjs`, `tooling/check-layout.sh`, `package.json`, lockfile, `pnpm-workspace.yaml`) → installed `eslint-plugin-check-file`, `eslint-plugin-import-x`, `@nx/eslint-plugin`.
- **29 throwaway fixtures**, one per violation class (layer ×4 incl. relative+alias, external bans, H8–H11, circular, orphan, test-only-import, sibling deep-import, bad filenames, role-suffix collision, default export, lowercase type, fully-compliant control).
- **3 tagged Nx fixture projects** (`type:core`/`adapter`/`app`) to exercise `@nx/enforce-module-boundaries` at the project level.
- **Candidate pure-ESLint stack** (`import-x/no-restricted-paths` + `no-restricted-imports` + `import-x/no-cycle` + `import-x/no-unused-modules` + `eslint-plugin-boundaries`) run head-to-head against the same fixtures.
- **Cleanup:** all fixtures + throwaway configs removed; `git status` clean; baseline gates green again. Evidence saved under `/tmp/spike/` during the run.

---

## 2. Inventory — what is wired, `master` vs PR #25

### On `master` (live today)
| # | Mechanism | Owner | Enforces | Registry |
|---|---|---|---|---|
| 1 | Layer direction | depcruise | `core↛adapters`, `core↛apps`, `adapters↛apps` | `L2-depcruise` ✅ |
| 2 | Cycles | depcruise | `no-circular` | `L2-depcruise` ✅ |
| 3 | Orphans | depcruise | `no-orphans=error` (test/spec/stories exempt) | `E-no-orphans-error`/`CONV-5` ✅ |
| 4 | `core/` deny-list | ESLint `no-restricted-imports` | core ↛ react, aws-sdk, `@aws-sdk/*`, `@pulumi/*`, `@adapters/*`, `@apps/*` | belt-&-suspenders |
| 5 | No-escape-hatches | ESLint | `ban-ts-comment`, eslint-comments, unused-disable | `F3-noescape` ✅ |
| 6 | Dir layout | `check-layout.sh` | bans `__tests__/`, `__mocks__/`, `stories/` | `CONV-1` ✅ |
| 7 | Declared deps | pnpm strict | refuses undeclared imports | `L2-pnpm` ✅ |

**Not on master:** Nx `enforce-module-boundaries` (`L2-tags` ⏳ 🟥), file-level bans H8–H11 (⏳ 🟥), any filename/role/casing rule, folder-per-entity, no-default-export, sibling isolation, public-entrypoint.

### PR #25 adds
| # | Mechanism | Owner | Adds | Maps to |
|---|---|---|---|---|
| 8 | File-level bans | depcruise | H8 `apps/*/src↛@pulumi`, H9 `infra↛(apps\|libs)`, H10 `core↛@aws-sdk`, H11 `adapters↛(apps\|infra)` | `DEPCR-files`/H8–H11 |
| 9 | Tag layer rule | `@nx/enforce-module-boundaries` | core→core; adapter→core,adapter; app→core,adapter,app; infra→all | `L2-tags` |
| 10 | Filename casing | `check-file/filename-naming-convention` | bans kebab+snake; allows PascalCase **and** camelCase | naming A |
| 11 | Type identifiers | `@typescript-eslint/naming-convention` | `typeLike → PascalCase` | naming B |
| 12 | No default exports | `import-x/no-default-export` | named exports only | naming B |
| 13 | Import order | `import-x/order` | autofixable | hygiene |
| 14 | Arrow bodies | `arrow-body-style` | autofixable | hygiene |
| 15 | Folder-per-entity | `check-layout.sh` | PascalCase file must live in same-named folder | `CONV-1/2` |
| 16 | Co-located test sibling | `check-layout.sh` | `X.test.ts` requires `X.ts` sibling | `CONV-2` |

**Not in either branch:** role-suffix convention, **sibling-folder internal isolation**, **public-entrypoint/barrel enforcement**, working ESLint cycle/orphan detection.

---

## 3. The capability matrix (empirical)

Legend: ✅ caught · ❌ missed · 🟡 partial/conditional · — n/a. "ESLint (wired)" = PR #25's actual config. "ESLint (achievable)" = candidate stack proven in this spike.

| # | Violation class / capability | depcruise | ESLint (wired in PR #25) | ESLint (achievable) | Nx tags | layout guard |
|---|---|---|---|---|---|---|
| 1 | `core→adapters` **alias** (`@adapters/*`) | ✅ | ✅ `no-restricted-imports` | ✅ `no-restricted-paths` | 🟡 if projects | — |
| 2 | `core→adapters` **relative** (`../../adapters`) | ✅ | ❌ pattern-only | ✅ resolver-backed | 🟡 project-escape | — |
| 3 | `core→apps` | ✅ | ✅ | ✅ | 🟡 if projects | — |
| 4 | `adapters→apps` | ✅ | ❌ core-only override | ✅ | 🟡 if projects | — |
| 5 | **H8** `apps/src→@pulumi` (external) | ✅ | ❌ no apps override | ✅ `no-restricted-imports` | 🟡 `bannedExternalImports` (not set) | — |
| 6 | **H10** `core→@aws-sdk` (external) | ✅ | ✅ | ✅ | 🟡 `bannedExternalImports` (not set) | — |
| 7 | `core→@pulumi` (external) | ❌ **no rule** | ✅ | ✅ | 🟡 (not set) | — |
| 8 | **H9** `infra→app` **source** | ✅ | ❌ | ✅ `no-restricted-paths` | ✅ "imports of apps forbidden" (built-in) | — |
| 9 | `infra→core/adapter` **source** | ❌ H9 regex vestigial | ❌ | ✅ if zone added | ❌ tag-legal + lib | — |
| 10 | **H11** `adapters→infra` **source** | ✅ | ❌ | ✅ | 🟡 tag-illegal if projects | — |
| 11 | **Circular** (`a↔b`) | ✅ instant | ❌ no rule | ❌ **`no-cycle` did NOT fire** (legacy eslintrc) | 🟡 cross-project only | — |
| 12 | **Orphan** (pure) | ✅ | ❌ no rule | ❌ **`no-unused-modules` did NOT fire** | ❌ | — |
| 13 | Orphan via **test-only** import | ❌ test = reachable entry | ❌ | ❌ (the article's "wash") | ❌ | — |
| 14 | **Sibling** internal import | ❌ no rule | ❌ | ✅ `eslint-plugin-boundaries` (v6 `boundaries/dependencies`) | ❌ same project | ❌ |
| 15 | Filename kebab/snake | — | ✅ `check-file` | ✅ | — | — |
| 16 | **Folder-per-entity** | — | ❌ check-file can't | ❌ | — | ✅ **only tool** |
| 17 | Orphan test (no source sibling) | — | ❌ | ❌ | — | ✅ `check-layout` Rule 3 |
| 18 | Default export | — | ✅ `import-x/no-default-export` | ✅ | — | — |
| 19 | Lowercase type name | — | ✅ `naming-convention` | ✅ | — | — |
| 20 | **Graph visualization** | ✅ Mermaid/Dot | ❌ | ❌ **impossible** | 🟡 `nx graph` (project-level) | — |
| 21 | **Editor-realtime feedback** | ❌ CI/CLI only | ✅ | ✅ | ✅ | ❌ CI/hook |

### Key reads of the matrix
- **depcruise-ONLY (today):** rows 11 (cycles), 12 (orphans), 20 (viz). Row 9 is a depcruise *gap*, not a strength.
- **ESLint-ONLY:** rows 7 (`core→@pulumi`), 15, 18, 19, 21 (editor feedback) + folder/test-sibling shape owned by the layout guard (16, 17).
- **Reproducible by ESLint at equal precision** (rows 1–10): every path/external ban. The candidate stack matched depcruise including relative+alias+package resolution.
- **Nx tags** are powerful but **project-level and dormant**: in this repo only `infra` is a project, so the tag rule ignored every `core/adapters/apps` fixture. It also can't see sub-folder/file imports (rows 9, 14).

---

## 4. Evidence appendix (commands + trimmed output)

### 4.1 depcruise (PR #25 bundle) — 20 violations
```
$ pnpm exec depcruise core adapters apps infra --config .dependency-cruiser.cjs
  error no-core-to-adapters: core/spike_layer/coreToAdaptersRel.ts → adapters/store/api.ts      # relative caught
  error no-core-to-adapters: core/spike_layer/coreToAdaptersAlias.ts → adapters/store/api.ts    # alias caught
  error no-core-to-apps: core/spike_layer/coreToApps.ts → apps/player/src/feature.ts
  error no-adapters-to-apps: adapters/spike_layer/adaptersToApps.ts → apps/player/src/feature.ts
  error no-handler-to-pulumi (H8): apps/player/src/handler.ts → @pulumi/aws
  error no-core-to-aws-sdk (H10): core/spike_layer/coreToAwsSdk.ts → @aws-sdk/client-s3
  error no-infra-to-app-or-lib-source (H9): infra/spike_stack/main.ts → apps/player/src/feature.ts
  error no-adapters-to-app-or-infra-source (H11): adapters/spike_layer/usesInfra.ts → infra/spike_stack/main.ts
  error no-circular: core/spike_cycle/a.ts → …
  error no-orphans: core/spike_orphan/lonely.ts (+ unimported naming fixtures)
# NOTE: coreToPulumi.ts is ABSENT — there is no core↛@pulumi depcruise rule.
```

### 4.2 ESLint (PR #25 wired) — 13 problems
```
$ ESLINT_USE_FLAT_CONFIG=false eslint "core/**/*.ts" "adapters/**/*.ts" "apps/**/*.ts" "infra/**/*.ts"
core/spike_layer/coreToAdaptersAlias.ts  no-restricted-imports   # alias caught
core/spike_layer/coreToApps.ts           no-restricted-imports
core/spike_layer/coreToAwsSdk.ts         no-restricted-imports   # H10
core/spike_layer/coreToPulumi.ts         no-restricted-imports   # core→@pulumi (depcruise misses this)
core/spike_naming/defaultExport.ts       import-x/no-default-export
core/spike_naming/publish-gates.ts       check-file/filename-naming-convention   # kebab
core/spike_naming/publish_gates.ts       check-file/filename-naming-convention   # snake
core/spike_typename/Thing/Thing.ts       @typescript-eslint/naming-convention    # lowercase interface
infra/spike_stack/main.ts                @nx/enforce-module-boundaries           # relative project-escape
# MISSED: coreToAdaptersRel.ts (relative), adaptersToApps.ts, handler.ts(H8), usesInfra.ts(H11) — no-restricted-imports is core-only + pattern-only
```

### 4.3 check-layout.sh (PR #25) — the role-suffix collision
```
$ bash tooling/check-layout.sh
::error:: Folder-per-entity: 'core/spike_naming/BadEntity.ts' must live in 'BadEntity/'
::error:: Orphan test: 'core/spike_orphantest/ghost.test.ts' has no source sibling
::error:: Folder-per-entity: 'core/spike_suffix_pascal/Brand.entity.ts' must live in 'Brand.entity/'   # ← COLLISION
# camelCase 'brand.entity.ts' passed; PascalCase 'Brand.entity.ts' is treated as basename "Brand.entity"
```

### 4.4 Nx tag rule — project-level proof
```
$ eslint core/spike_nxcore/index.ts        # type:core importing type:adapter (package name)
  error  A project tagged with "type:core" can only depend on libs tagged with "type:core"  @nx/enforce-module-boundaries
$ eslint infra/spike_stack/viaPackage.ts   # type:infra importing an app (package name)
  error  Imports of apps are forbidden  @nx/enforce-module-boundaries     # built-in, tag-independent
$ nx show projects                          # only 4 projects exist; core/adapters/apps fixtures are invisible to Nx
["@notation-hero/spike-nxadapter","@notation-hero/spike-nxcore","@notation-hero/spike-nxapp","@notation-hero/infra"]
```

### 4.5 Candidate pure-ESLint stack — reproduces H8–H11 + layer (11 problems)
```
$ eslint (candidate: import-x/no-restricted-paths + no-restricted-imports) "core|adapters|apps|infra/**/*.ts"
adapters/spike_layer/adaptersToApps.ts   import-x/no-restricted-paths   # adapters→apps
adapters/spike_layer/usesInfra.ts        import-x/no-restricted-paths   # H11 adapters→infra (relative)
core/spike_layer/coreToAdaptersAlias.ts  import-x/no-restricted-paths   # alias (resolver)
core/spike_layer/coreToAdaptersRel.ts    import-x/no-restricted-paths   # relative
core/spike_layer/coreToApps.ts           import-x/no-restricted-paths
core/spike_nxcore/index.ts               import-x/no-restricted-paths   # workspace-package import resolved
infra/spike_stack/main.ts                import-x/no-restricted-paths   # H9 infra→apps (relative)
infra/spike_stack/viaPackage.ts          import-x/no-restricted-paths   # H9 infra→apps (package)
apps/player/src/handler.ts               no-restricted-imports          # H8 apps→@pulumi
core/spike_layer/coreToAwsSdk.ts         no-restricted-imports          # H10
core/spike_layer/coreToPulumi.ts         no-restricted-imports          # core→@pulumi
# → equal-or-better precision vs depcruise on every path/external ban.
```

### 4.6 ESLint cycle/orphan — did NOT fire (the depcruise-justifying result)
```
$ eslint (import-x/no-cycle, maxDepth:10 AND Infinity)  "core/spike_cycle/**/*.ts"   → 0 problems
$ eslint (import-x/no-unused-modules unusedExports:true) <all fixtures>               → 0 problems
# Resolver IS working — proof:
$ eslint (import-x/no-unresolved) on an import of "./DOES_NOT_EXIST.ts"
  error  Unable to resolve path to module './DOES_NOT_EXIST.ts'  import-x/no-unresolved
# Conclusion: import-x 4 graph-traversal rules are flat-config-first; unreliable under legacy .eslintrc.cjs.
# depcruise no-circular + no-orphans caught the same fixtures with zero fuss.
```

### 4.7 Visualization — depcruise-only artifact
```
$ pnpm exec depcruise core adapters apps infra --config .dependency-cruiser.cjs --output-type mermaid
flowchart LR
  subgraph 0["adapters"] … end
  subgraph 3["apps"] … end
  subgraph 8["infra"] … end
  …  # 117 lines; renders natively in GitHub/Markdown. (graphviz `dot` not installed → no SVG, Mermaid is better here anyway.)
# No ESLint plugin can emit a graph. `nx graph` shows the PROJECT graph only, not file-level imports.
```

---

## 5. The article's claims — verdict

The Xebia article only benchmarked **bare `no-restricted-imports` + `eslint-plugin-import`**. Re-tested against the full modern toolbox:

| Article claim ("depcruise-only") | Verdict | Evidence |
|---|---|---|
| Detect **orphans incl. test-only-imported** | **Wash** | depcruise `orphan` = no-incoming-AND-no-outgoing, so a test-imported module isn't an orphan either; both tools need a non-default trick. depcruise still wins on *pure* orphans today (ESLint rule didn't fire). |
| **Isolate sibling folders** | **Closed by ESLint** | `eslint-plugin-boundaries` (v6 `boundaries/dependencies`) does element/sibling isolation — a capability **no tool in either branch currently uses**. |
| Show **usage frequency** | **Real depcruise-only** | reporting feature, not a lint pass/fail. |
| **Visualize the graph** | **Real depcruise-only** | Mermaid/Dot output; ESLint cannot. Confirmed (§4.7). |

So the article's blanket "ESLint can't" is mostly an artifact of testing the two weakest rules. The durable depcruise-only wins are **visualization** + **usage-frequency**, plus the **operational** reality that its cycle/orphan checks work under our legacy config while ESLint's don't.

---

## 6. Proposed file-level structure contract

### 6.1 Suffix convention — 🟦 DECIDE (the headline open decision)

| | **Option A — status quo (PR #25)** | **Option B — kebab + role suffix (ecosystem-recommended)** |
|---|---|---|
| Filenames | PascalCase entity *or* camelCase utility; **no role suffix** | **kebab-case everything** + role suffix: `catalogue-item.entity.ts`, `logger.port.ts` |
| Folder-per-entity | required (`Brand/Brand.ts`) | dropped (role suffix carries the role) |
| Lint rules | `check-file` (Pascal/camel) + `naming-convention` + bespoke `check-layout.sh` | **one** `check-file` rule → `KEBAB_CASE` |
| Idiomatic for hexagonal+Nx | mixed (Stemmler/Nx-ADR camp) | **dominant** (Angular dropped suffixes but kept kebab; NestJS + canonical 12k★ `domain-driven-hexagon` use kebab+suffix) |
| Case-insensitive-FS safety | **fails** — `brand.entity.ts`/`Brand.entity.ts` collide on APFS (hit during this spike) | safe |
| PascalCase + suffix collision with folder-per-entity | **yes, broken today** (`Brand.entity.ts` → demands `Brand.entity/`) | n/a |
| Cost to adopt | already built | rework `check-file` rule + drop folder-per-entity; regenerate the Nx entity generator template |

**Recommendation:** **Option B (kebab + role suffix).** It is the most idiomatic for this exact stack, collapses three naming mechanisms into one lint rule, removes the bespoke `check-layout.sh` folder-per-entity guard, and avoids the case-insensitive-FS trap. PR #25 is a **draft** and the suffix decision was explicitly deferred to this spike — so now is the cheapest moment to switch. If you specifically want PascalCase filenames to *signal* "this is a class," stay on Option A and accept the bespoke guard + the "no PascalCase role suffixes" constraint.

**Suffix vocabulary (if Option B), grounded in `domain-driven-hexagon`:**
- **Adopt (widely attested):** `*.entity.ts`, `*.service.ts`, `*.port.ts`, `*.adapter.ts`, `*.mapper.ts`, `*.repository.ts`, `*.controller.ts`, `*.command.ts`, `*.query.ts`, `*.handler.ts`, `*.event.ts`
- **Reconsider (outliers):** `*.value.ts` → attested form is `*.value-object.ts`; `*.policy.ts` → weak, DDD term is `*.specification.ts` (or keep `.policy` as a deliberate house term); `*.client.ts` → fine but it's an adapter detail, not a DDD building block.
- **Ban junk-drawer:** `*.manager.ts`, `*.helper.ts` via `check-file/filename-blocklist`; allow a **narrow** `*.util.ts` only for genuinely generic pure functions.

> Either option makes a **separate "PascalCase-vs-camelCase DangerJS naming task" redundant** — Option B because everything is kebab (one rule), Option A because `check-file` + `naming-convention` already encode it. Drop that task either way.

**Co-located tests stack as `name.role.test.ts`** (e.g. `catalogue-item.entity.test.ts`) — empirically verified clean:

| Filename | `check-file` KEBAB + `ignoreMiddleExtensions:true` | flag `false` | Option A glob (bans kebab) |
|---|---|---|---|
| `catalogue-item.entity.ts` | ✅ pass | ❌ fail | ❌ fail |
| `catalogue-item.entity.test.ts` | ✅ pass | ❌ fail | ❌ fail |
| `catalogueItem.entity.ts` (camel) | ❌ fail | ❌ fail | ✅ pass |
| `CatalogueItem.entity.ts` (Pascal) | ❌ fail | ❌ fail | ✅ pass |

- `ignoreMiddleExtensions:true` (**already set in PR #25**) strips **all** middle extensions (`.entity` *and* `.test`) → checks only `catalogue-item`. So one `KEBAB_CASE` rule covers source **and** stacked tests. The flag is load-bearing — `false` fails even `catalogue-item.entity.ts`.
- Every `.test.ts`-anchored glob already handles the stack (matches the trailing `.test.ts`): Nx `production` exclusion `*.{test,spec,stories,fake}.{ts,tsx}`, depcruise `no-orphans` `\.(test|spec)\.(ts|tsx)$`, Vitest `**/*.test.{ts,tsx}`, `build:dts` `*.test.*`, and `check-layout.sh` Rule 3 (strips `.test` → finds `catalogue-item.entity.ts` sibling).
- This is a **point for Option B**: stacked role+test suffixes are clean with zero new tooling. Under Option A you'd use camelCase tests, and PascalCase+suffix collides with folder-per-entity.

### 6.2 Allowed unsuffixed files
`index.ts` (package/Nx-project entry only — see §6.4), `*.config.ts`, `*.test.ts`/`*.spec.ts` (test marker is the suffix), `*.d.ts`, and top-level tooling. Everything that is a domain/application concept gets a role suffix (Option B) or obeys the Pascal/camel rule (Option A).

### 6.3 File-level import strictness
- **Cross-folder imports:** prefer the **Nx project package entry** as the public API. **Do NOT mandate per-entity `index.ts` barrels** — barrels defeat tree-shaking, are circular-dep magnets, and blow up the module graph (cited: marvinh.dev part 7, "stop using barrel files"). Public API = the lib's package entry, which `@nx/enforce-module-boundaries` already protects.
- **Sibling-folder isolation:** currently enforced by **nobody**. **🟦 DECIDE:** enforce via `eslint-plugin-boundaries` now, or defer to a first-use trigger when real intra-layer structure appears. Recommendation: **defer** — it adds config surface and there is no intra-layer structure yet; revisit when `core/` holds multiple entities.
- **Test-only imports & orphans:** keep tests as depcruise entry points (current config) — a module used only by its test reads as reachable, which matches both tools' default and avoids false orphans.

### 6.4 Deferred bans (H8–H11) — 🟦 DECIDE enforce-now + H9 widen
- **Enforce now:** H8/H10/H11 are built, probe-verified, 0 false positives. Recommendation: **flip to enforced** with PR #25.
- **H9 fix required:** the regex `to: ^(apps|libs)/` is vestigial DACI text — this repo has no `libs/`, so H9 only blocks `infra→apps`. **✅ RATIFIED 2026-06-12: WIDEN** to `^(apps|core|adapters)/` — this enforces the repo's own `H3` ("infra is IaC; imports @pulumi; **never domain source**") + `H4` (references build output, not source). The clean-arch "composition root imports core" norm applies to `apps/` (the runtime root, which may import `@core` per `H2`), **not** `infra/`. Escape valve: shared deploy constants live in non-domain config, not `core/`. See the [ADR](../decisions/2026-06-12-file-level-structure-enforcement-adr.md).
- **Coverage note:** `core→@pulumi` is caught by ESLint but **not** depcruise — add a depcruise `no-core-to-pulumi` rule for parity, or accept ESLint as its sole owner.

### 6.5 Enforcement ownership (per rule)
| Rule | Primary owner (editor-realtime) | Backstop (CI) | Notes |
|---|---|---|---|
| Project-level layer direction | `@nx/enforce-module-boundaries` | depcruise | depcruise also covers files not yet in a project |
| External bans (core↛aws/pulumi, apps↛pulumi) | ESLint `no-restricted-imports` | depcruise H8/H10 | depcruise lacks `core↛@pulumi` |
| File-level source bans (H9/H11) | *(optional)* `import-x/no-restricted-paths` | **depcruise** | depcruise authoritative; relative-robust |
| Cycles | — | **depcruise** | `import-x/no-cycle` doesn't fire under legacy eslintrc |
| Orphans | — | **depcruise** | `import-x/no-unused-modules` doesn't fire under legacy eslintrc |
| Sibling isolation | `eslint-plugin-boundaries` *(if adopted)* | — | currently a gap |
| Public entrypoint | `@nx/enforce-module-boundaries` (project) | depcruise | no per-entity barrels |
| Filename casing/suffix | `check-file` | `check-layout.sh` | one rule under Option B |
| Folder-per-entity | `check-layout.sh` | — | only tool that can; **drop under Option B** |
| Type naming / default-export / import-order | ESLint (`naming-convention`, `import-x`) | — | autofixable where possible |
| Visualization | **depcruise** (`--output-type mermaid`) | — | unique |
| DangerJS | — | PR commentary only | not a source of truth |

---

## 7. KEEP / DROP recommendation

**KEEP dependency-cruiser.** Validated unique value: (1) **cycle** detection that works today (ESLint's doesn't, under legacy config), (2) **orphan** detection that works today, (3) **graph visualization** that ESLint structurally cannot do. Its file-level path/external bans overlap with what ESLint *could* do — but that overlap is cheap, intentional belt-and-suspenders, and depcruise additionally guards files that aren't yet in an Nx project (the entire pre-source repo right now). The standing registry decision `H7`/`L2-depcruise` ("keep BOTH") is **empirically confirmed**, not just inherited.

**Do NOT drop it** even after NH-42 (flat config) unless you re-test and confirm `import-x/no-cycle` + `import-x/no-unused-modules` fire reliably — and even then you'd lose visualization.

**Optional enhancement (not required):** add `import-x/no-restricted-paths` for editor-realtime layer feedback (it reproduced H8–H11 at equal precision and *does* work under legacy config). This is additive; it doesn't replace depcruise.

---

## 8. Proposed decision-registry updates (await 🟦 approval — no config changes yet)

- **`DEPCR-files`** ⏳→✅ (on PR #25 merge): H8/H10/H11 enforced via depcruise; H9 = `infra↛apps` (apps-only, intentional). Add change-log entry.
- **`L2-tags`** ⏳→✅: `@nx/enforce-module-boundaries` wired (PR #25). Note: project-level only; depcruise owns file-level (`H7`).
- **`L2-depcruise` / `H7`**: append the empirical "why both" justification from §0.
- **New row `NAME-suffix`**: the chosen suffix convention (Option A or B) + the dropped DangerJS Pascal-vs-camel task + the junk-drawer ban.
- **New row `STRUCT-sibling`**: sibling-isolation decision (enforce via boundaries vs defer).
- **AGENTS.md** "naming" section + Nx entity generator template unblock once `NAME-suffix` lands — they were the "one true hard-block."

---

## 9. Open decisions for leocaseiro (🟦)
1. **KEEP vs DROP depcruise** — recommendation: KEEP (§7).
2. **Suffix convention** — Option A (status quo) vs Option B (kebab + role suffix, recommended) (§6.1).
3. **H8–H11 enforce-now** + **H9 widen** (apps-only vs apps|core|adapters) (§6.4).
4. **Sibling isolation** — adopt `eslint-plugin-boundaries` now vs defer (§6.3).
5. **`core→@pulumi`** — add depcruise rule for parity vs leave to ESLint (§6.4).
6. **Optional:** add `import-x/no-restricted-paths` for editor-realtime layer feedback (§7).
