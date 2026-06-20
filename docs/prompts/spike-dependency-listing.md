# Prompt: evaluate file-level structure strictness and whether dependency-cruiser earns its place

## TL;DR of what I want

We already locked the hexagonal monorepo shape (`core/ adapters/ apps/ infra/`). Do **not** reopen that. What is still open is the **file-level structure contract** on top of it: suffix conventions, sibling-folder import strictness, public/internal boundaries, and deferred file-level bans.

I want **evidence** — not a vibe — on two connected questions:

1. What file-level strictness should we adopt for Notation Hero?
2. If we adopt that strictness, does **dependency-cruiser earn its place** alongside ESLint/Nx/layout guards, or is it redundant?

I'm OK keeping 2 tools (belt + suspenders); prove it's worth it. Decide with a matrix + recommendation. Do **not** change enforcement config without my explicit OK — I make the final call.

## Repo & current state

- Repo root: `/Users/leocaseiro/Sites/notation-hero` (default branch `master`). Hexagonal Layout 4 monorepo (`core/ adapters/ apps/ infra/`), **pnpm + Nx**, **legacy `.eslintrc.cjs`** (flat-config migration is the deferred `L3-eslint` lane / KAN-158 — **do NOT migrate flat config as part of this work**).
- Boundary mechanisms that may be live (enumerate the real ones first — they may differ between `master` and the latest enforcement PR, e.g. PR #25):
  - **dependency-cruiser** path-based rules (H8–H11) → `pnpm depcheck`
  - ESLint **`no-restricted-imports`** deny-list inside `core/`
  - Nx **`@nx/enforce-module-boundaries`** (tag-based: `type:core/adapter/app/infra`)
  - Layout guard (`tooling/check-layout.sh`) for forbidden layouts like `__tests__/`, `__mocks__/`, and `stories/`

## Why I'm asking (the trigger)

Article: <https://xebia.com/blog/taking-frontend-architecture-serious-with-dependency-cruiser/>

What the article ACTUALLY says (don't misread it): it advocates using **both** tools. It says ESLint **can** detect circular deps, restrict imports, separate test/prod, and give real-time editor feedback; and that ESLint **cannot** (dependency-cruiser-only): detect **orphans** (incl. test-only-imported), **isolate sibling folders**, show **usage frequency**, or **visualize** the graph. CAVEAT: the article only benchmarks bare `no-restricted-imports` + "eslint-plugin-import" — it never tests `import/no-restricted-paths`, `eslint-plugin-boundaries`, or `@nx/enforce-module-boundaries`. **That gap is the heart of this evidence pass.**

## Read FIRST (sources of truth — don't re-derive, don't re-litigate)

- `/Users/leocaseiro/Sites/notation-hero/AGENTS.md` (agent contract: test layout, naming, run commands)
- `/Users/leocaseiro/Sites/notation-hero/docs/decisions/decision-registry.md` (rows: `L2-tags`, `DEPCR-files`, `H8`–`H11`, `FOLD-hex`, `L3-eslint`)
- `/Users/leocaseiro/Sites/notation-hero/docs/decisions/2026-06-09-tooling-stack-daci.md`
- Live configs: `.dependency-cruiser.cjs`, `.eslintrc.cjs`, `nx.json` + project tags
- Prior session that built + probe-verified the enforcement bundle: `/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/8f12561d-cc7c-4a44-b930-ce44c9e9228d.jsonl`

## LOCKED — do not re-open (per the DACI)

Hexagon layering, **pnpm + Nx**, folder-per-entity + test co-location. Scope is **ONLY** the file-level structure contract and which existing/proposed tools should enforce it. Don't redesign the architecture.

## OPEN — decide/recommend here

The earlier sessions found that suffix conventions were **never discussed**. Treat them as genuinely open.

### 1. Suffix convention

I am keen to keep a strict naming structure unless there is a very solid reason not to.

Evaluate a convention like:

- Core domain: `*.entity.ts`, `*.value.ts`, `*.policy.ts`, `*.service.ts`, `*.port.ts`, `*.event.ts`
- Adapters: `*.adapter.ts`, `*.mapper.ts`, `*.client.ts`, `*.repository.ts`
- Apps: `*.handler.ts`, `*.command.ts`, `*.query.ts`, `*.controller.ts`
- Tests: `*.test.ts`, co-located only

Questions to answer:

- Should we require `PascalCase.<role>.ts` for domain/application concepts?
- Should any files remain unsuffixed? If yes, which ones and why?
- Should we ban broad junk-drawer suffixes like `*.util.ts`, or allow them only under narrow conditions?
- Can this convention make the old Pascal-vs-camel / DangerJS naming task redundant?

Use external grounding: Nx, Angular, NestJS, DDD/clean architecture, and mature TypeScript monorepos. Do not invent conventions if a proven local or ecosystem pattern fits.

### 2. File-level import strictness

Decide/recommend how strict imports should be below the package/layer level:

- Can one entity folder import another entity folder's internals?
- Should cross-folder imports go through a public entrypoint (`index.ts` or package-level API)?
- Should sibling-folder isolation be enforced, warned, or ignored?
- Should test-only imports count when evaluating orphans and public/internal boundaries?

### 3. Deferred file-level bans

AGENTS.md documents intended bans that may not be wired yet. Verify the real state and recommend whether these should become enforced now or stay deferred:

- `core ↛ @aws-sdk/*`
- `core ↛ @pulumi/*`
- `adapters ↛ infra source`
- `apps ↛ infra source`
- `handler ↛ @pulumi/*` if applicable in the live tree

### 4. Enforcement ownership

For each proposed rule, identify the best owner:

- Nx tags: project/layer boundaries
- ESLint: fast editor feedback and simple import restrictions
- dependency-cruiser: graph-wide/file-level path rules, cycles, orphans, sibling isolation, visualization
- layout guard: filename/path shape and forbidden directories
- DangerJS: PR commentary only, not a source of truth unless there is a clear reason

## Method (empirical, isolated, throwaway)

0. **Orient.** Read the sources above; enumerate EVERY boundary mechanism actually wired today + on which branch; run the existing gates green once (`pnpm lint`, `pnpm depcheck`, `nx lint`/`nx affected`) to baseline.
1. **Isolated worktree** off latest `origin/master` (or the enforcement PR branch if the bundle lives there) — never touch the main checkout; `pnpm install`.
2. **Ecosystem grounding.** Briefly compare how Nx, Angular, NestJS, and DDD/clean-architecture TypeScript projects handle suffixes and file-level boundaries. Keep this practical: what should Notation Hero copy, adapt, or reject?
3. **Fixtures** — one tiny file per violation class, deliberately illegal:
   - `core → adapters` import (layer)
   - `core → apps` import (layer)
   - `adapters → apps` import (layer)
   - circular dep (a→b→a)
   - **orphan** module + a module imported **only by a test**
   - **sibling-folder** deep import (`core/lessonA` reaching into `core/lessonB` internals)
   - **alias-based** violation (`@adapters/*` imported from `core/` via tsconfig paths) — tests alias-awareness
   - **bad suffix** examples (`foo.ts`, `Thing.util.ts`, `thing.entity.ts`, etc.) once you define the candidate convention
   - deferred-ban examples (`core → @aws-sdk/*`, `core → @pulumi/*`, `adapters → infra`, etc.) if the packages/config make them testable
4. For EACH fixture, run BOTH paths; record **caught / missed / partial** + exact command + trimmed output:
   - ESLint path: `@nx/enforce-module-boundaries` + `no-restricted-imports`; AND to test the article's blind spot, wire candidate ESLint-only replacements `import/no-restricted-paths` and/or `eslint-plugin-boundaries`, plus `import-x/no-cycle` and `import-x/no-unused-modules`.
   - dependency-cruiser path: `pnpm depcheck`.
   - layout/script path: determine whether filename/suffix rules belong in `tooling/check-layout.sh` or another lightweight script.
5. **Test the article's "dependency-cruiser-only" claims head-on:**
   - **orphan** (incl. test-only-imported): can ANY ESLint rule catch it (`import-x/no-unused-modules`, `check-layout.sh`)?
   - **visualization**: produce a real artifact — `depcruise core adapters apps infra --output-type mermaid` (and dot→svg). ESLint has no equivalent — judge its Staff-FE portfolio/interview value.
   - **cycles**: does `import-x/no-cycle` match dependency-cruiser's `no-circular` in precision + speed?
6. **The decisive test:** can a pure-ESLint config (`import/no-restricted-paths` or `eslint-plugin-boundaries`) reproduce dependency-cruiser's H8–H11 and the proposed file-level strictness at EQUAL precision against the same fixtures? If yes on boundaries — what (if anything) is still dependency-cruiser-only?
7. **Clean up** ALL fixtures; restore the worktree spotless (`git status` clean). Baby-commit only the report + any proposed config, behind my approval.

## Deliverable

- A proposed **file-level structure contract**:
  - suffix convention
  - allowed exceptions
  - sibling/public-entrypoint rules
  - deferred-ban recommendation
  - enforcement owner per rule
- A comparison **MATRIX** (capability rows × {ESLint-tools, dependency-cruiser, Nx, layout guard} cols) with caught/missed/partial + evidence per cell.
- A clear **recommendation**: KEEP dependency-cruiser (name the unique capabilities that justify it — likely orphan-via-tests + visualization) OR DROP it (give the exact validated ESLint-only config that replaces H8–H11 at equal precision).
- A 2–3 sentence **"why we run both"** justification fit for the decision-registry AND as a Staff-FE interview answer.
- Write the report to `/Users/leocaseiro/Sites/notation-hero/docs/spikes/2026-06-12-file-level-structure-enforcement.md` (adjust date).
- **Propose** the decision-registry update (`DEPCR-files` / `L2-tags` plus a new suffix/file-strictness decision row if needed) but DON'T change enforcement config without my explicit OK.

## Working style

- Baby commits at each green step; never `--no-verify`; respect lefthook + the AGENTS.md run commands.
- Section-by-section findings; let me drive the final keep/drop decision.
- This is evidence + recommendation over production code. Do not implement enforcement unless I explicitly approve the recommended contract.
