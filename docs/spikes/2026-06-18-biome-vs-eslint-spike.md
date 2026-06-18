# Spike: Biome vs ESLint for `server/` (NestJS) and `client/` (TanStack)

- **Date:** 2026-06-18
- **Ticket:** decision input for [NH-42](https://leocaseiro.atlassian.net/browse/NH-42) (Migrate ESLint to flat config — `L3-eslint`)
- **Status:** Spike complete · tool choice **deferred to NH-42** (Leo, 2026-06-18)
- **Method:** current-doc research (verified against biomejs.dev / typescript-eslint.io / tanstack.com / npm / GitHub, **no training assumptions**) + an **empirical Biome run on the real scaffolds** + **adversarial fact-check** of the load-bearing claims.
- **Supersedes nothing yet:** the registry rows `L3-eslint` / `L3-prettier` stay 🔒 locked-active until NH-42 picks a tool and revises them.

---

## TL;DR — the recommended shape

It is **not "Biome *or* ESLint"** — the question splits into two independent axes (formatter vs linter) that resolve differently:

- **Formatter → Biome, everywhere** (`server/` + `client/` + `shared/`). Replaces Prettier; lets us drop the `eslint-plugin-prettier` anti-pattern.
- **`client/` (TanStack) → ESLint.** The TanStack plugins + React Compiler rules have **no Biome equivalent**.
- **`server/` (NestJS) → hybrid.** Biome *formats*; a thin ESLint lane does the type-aware async rules. **Do not run Biome's linter on decorated files** — it provably breaks dependency injection (DI).
- **dependency-cruiser** keeps the hexagon-fence / graph lane regardless (Biome cannot and should not do graph rules). `eslint-plugin-boundaries` becomes redundant → drop it.

> **Net end-state:** Biome format everywhere + dependency-cruiser graph everywhere + a thin, lint-only ESLint flat-config lane per package where its rules earn their keep.

---

## Background — why this is being reconsidered now

The 2026-06-09 tooling-stack DACI locked **"ESLint flat config + Prettier"** and **rejected "Biome-as-primary"** (`L3-eslint` / `L3-prettier`, `DACI:126`). The stated blocker was **Nx**: boundary enforcement was delivered *through* an ESLint plugin (`@nx/enforce-module-boundaries`), making ESLint "architecturally load-bearing." Leo's own registry note read: *"We should use Biome, unless there are issues with Nx or something."*

**That blocker is gone.** Nx was dropped on 2026-06-18 (`ARCH-MONO-1`), and boundary/graph rules moved to **dependency-cruiser** (`ARCH-GUARD-1`, shipped in PR #51), which stays regardless of the lint tool. Linting is also not running yet — per-package `lint` scripts are `echo` placeholders and the real flat-config lane is the deferred NH-42 work — so this is a **clean, pre-lane decision point** with no large ESLint config to migrate away from.

---

## Findings by axis

### `server/` (NestJS) — the DI hazard is real and was proven on our scaffold

- Biome's `useImportType` rule is **on by default** with a **safe** auto-fix. A plain `biome check --write` (no `--unsafe`) on the real `server/src` rewrote `app.controller.ts` to `import type { AppService }`.
- Under our `server/tsconfig.json` (`emitDecoratorMetadata: true`, `experimentalDecorators: true`, `verbatimModuleSyntax` unset), a type-only import is **erased at emit** → `reflect-metadata` loses the constructor-parameter type → **DI fails at runtime**.
- Biome's own docs say *"disable this rule for NestJS/Angular."* The per-decorator opt-in is an **open, unmerged** PR (biomejs/biome#10496, issue #10495).
- typescript-eslint's equivalent `consistent-type-imports` **self-disables in any file containing a decorator** when both decorator flags are on — and it isn't even in Nest's default config. The inverse, safe posture.
- **Why hybrid:** Biome's *formatter* is decorator-safe (proven: preserved `@Controller`/`@Get`/`@Module`/`@Injectable`, changed only quotes + indentation). So Biome formats fine; a thin typescript-eslint `recommendedTypeChecked` lane covers the GA async-correctness rules (`noFloatingPromises` etc.) that Biome only has in **nursery**.

### `client/` (TanStack) — irreplaceable rule coverage = ESLint

- Biome ships **zero** TanStack rules (verified against its domain list + a tarball grep). ESLint gives first-party, version-matched `@tanstack/eslint-plugin-query` (8 rules incl. `exhaustive-deps` for query keys), `@tanstack/eslint-plugin-router` (2 rules), and `eslint-plugin-react-hooks` v7 (React Compiler diagnostics).
- Biome **structurally cannot** replicate the TanStack `query/exhaustive-deps` rule: its custom-hooks option maps a closure arg to a React dep-array arg **by index**, but the TanStack rule checks the `queryFn` closure against the `queryKey` **data-cache array** — a different semantic with nowhere for Biome's index model to point.
- **Honest correction (caught by the adversarial verifier):** Biome **does** ship the *basic* React hook rules on by default — `useHookAtTopLevel` (= rules-of-hooks) and `useExhaustiveDependencies` (= exhaustive-deps). So Biome **works for exhaustive-deps** — that is *not* the gap.
- **React Compiler ≠ a linter (clarifying the gap):** the React Compiler is a *build-time* optimizer (auto-memoization). It runs with **any** linter, so "Biome + React Compiler" is a valid combo and the compiler still optimizes your components. What only ESLint provides is the React Compiler **diagnostics** — the `eslint-plugin-react-hooks` v7 rules that *warn* you when a component breaks the compiler's assumptions (so the compiler silently skips it). So the real ESLint-only advantage on the client is **React Compiler diagnostics (~14 rules) + the TanStack query/router plugins** — **not** exhaustive-deps or rules-of-hooks (Biome covers both).

### Formatter — Biome wins cleanly, on both packages

- ~35× faster than Prettier (Biome's official benchmark figure), single Rust binary, one config, decorator-safe, great agent-readability.
- Caveats are minor on a fresh scaffold: 97% Prettier-compatible (not 100%); Biome defaults to double-quotes/tabs, so set single-quote to match the scaffold's intent; set `javascript.parser.unsafeParameterDecoratorsEnabled: true` so Biome can parse Nest's `@Body`/`@Query`/`@Inject` parameter decorators even as formatter-only.

---

## At-a-glance comparison

| Dimension | Biome | ESLint | Edge |
|---|---|---|---|
| Type-aware async rules (`noFloatingPromises`…) | nursery/experimental (severity "information", may change) | GA in `recommendedTypeChecked` | **ESLint** |
| Framework rules (TanStack Query/Router, React Compiler) | none | first-party plugins | **ESLint** |
| NestJS decorator / DI safety | breaks DI by default (`useImportType`) | safe (self-disables on decorators) | **ESLint** |
| Formatter | decorator-safe, ~35×, 1 config | n/a (uses Prettier) | **Biome** |
| Speed (local + CI gates) | Rust, ~ms | Node, slower (type-check first) | **Biome** |
| Single-config / agent-readability | one `biome.json` | flat config + plugins + parser | **Biome** |
| Basic React hook rules (rules-of-hooks, exhaustive-deps) | ✅ on by default | ✅ | Tie |
| Maintenance | active (~weekly); no type-aware GA date on 2026 roadmap | mature, first-party framework support | Tie |
| Migration cost (greenfield NH-42 lane) | near-zero | near-zero | Tie |
| Boundary/graph rules | can't (fine — depcruise owns it) | redundant twin of depcruise | Tie |

**Decisive trade-off:** *coverage-correctness vs single-tool speed/simplicity.* ESLint is the only tool that delivers the framework-specific + GA type-aware rules that catch real runtime bugs here (DI safety, backend async-correctness, TanStack stale-query traps). Biome wins decisively on formatter speed + simplicity. Because the two axes are independent, the answer is a **split, not a single winner**.

---

## Verified load-bearing facts (primary sources, 2026-06-18)

1. **NestJS DI hazard — CONFIRMED (empirical).** `biome check --write` on the real scaffold rewrote the injected import to `import type`; `useImportType` is recommended + safe-fix; opt-in fix unshipped (open PR #10496 / issue #10495); Biome docs say to disable for NestJS. Sources: `biomejs.dev/linter/rules/use-import-type/`, GitHub `biomejs/biome#10495`, `#10496`.
2. **typescript-eslint is DI-safe — CONFIRMED.** `consistent-type-imports` self-disables on decorated files when `experimentalDecorators` + `emitDecoratorMetadata` are on (per the 2024-03-25 typescript-eslint blog) and is absent from Nest's default config (and from `recommendedTypeChecked`). Sources: `typescript-eslint.io/blog/changes-to-consistent-type-imports-with-decorators/`, `nestjs/typescript-starter` eslint config.
3. **Biome type-aware rules are nursery — CONFIRMED.** `noFloatingPromises` / `noMisusedPromises` / `useAwaitThenable` are nursery in 2.5.0; the typescript-eslint equivalents are GA in `recommendedTypeChecked`. No GA date on Biome's 2026 roadmap. Sources: the respective `biomejs.dev/linter/rules/*` pages, `typescript-eslint.io` config docs.
4. **Biome has zero TanStack rules — CONFIRMED.** No TanStack domain; cannot replicate `query/exhaustive-deps` via custom-hooks config. (Note: this claim's dedicated adversarial pass was thin — it is nonetheless well-grounded in the research agent's domain-list + tarball check.)
5. **React hooks — PARTIAL/CORRECTED.** `eslint-plugin-react-hooks` v7 surfaces React Compiler diagnostics by default; Biome has no React Compiler integration **but does** ship `useHookAtTopLevel` + `useExhaustiveDependencies`. The client ESLint advantage is React Compiler + TanStack, not basic hook rules. Sources: `biomejs.dev/linter/rules/use-hook-at-top-level/`, `use-exhaustive-dependencies/`; npm `eslint-plugin-react-hooks@7.1.1`.
6. **Biome formatter is decorator-safe — CONFIRMED.** Formatting preserved decorator placement; the DI-breaking rewrite is the *linter* (`useImportType`), not the formatter.
7. **dependency-cruiser owns boundaries regardless — CONFIRMED.** Biome cannot do graph rules; `.dependency-cruiser.cjs` carries the hexagon fence either way; this neutralizes the original Nx-via-ESLint blocker.

---

## Flip conditions (when to revisit toward Biome-only)

- **`server/` → Biome-only** if Biome ships a per-decorator `useImportType` opt-in (PR #10496) **and** promotes its type-aware rules to GA. (Or: enabling `verbatimModuleSyntax` in tsconfig neutralizes the import-type rewrite at the compiler level.)
- **`client/` → Biome-only** if Biome ships a TanStack domain **and** React Compiler parity.
- Neither has a committed date → **plan the hybrid as durable, not a bridge**.

## Risks / operational notes

- Don't let Biome and ESLint fight: run ESLint **lint-only** (no formatting rules, drop `eslint-plugin-prettier`), let Biome own formatting, and never run Biome's linter on decorated server files.
- Two-tool maintenance surface for a solo dev — acceptable because the ESLint lane is deliberately thin (framework + type-aware rules only) and NH-42 is greenfield.
- Configure Biome to single-quote before the first run, or the initial reformat will be a large noisy diff vs the scaffold's `.prettierrc`.
- Set `unsafeParameterDecoratorsEnabled: true` even for formatter-only on `server/`, or Biome reports Nest controllers as invalid syntax.
- Add the generated `client/src/routeTree.gen.ts` to the ignore list of whichever tool runs (it trips `noExplicitAny`).
- ⚠️ **NH-42's own scope is now partly stale** (written 2026-06-12, pre-Nx-drop): it still references `@nx/eslint-plugin`, `ESLINT_USE_FLAT_CONFIG=false`, and `nx.json` — all dead. Boundaries now live in dependency-cruiser. Rewrite those parts when NH-42 is picked up.

---

## References

- Prior decision: decision-registry `L3-eslint` / `L3-prettier` (`DACI:126`); 2026-06-09 tooling-stack DACI.
- Nx removal: `ARCH-MONO-1` (NH-195, PR #50 / #51).
- NH-42 carries the same recommendation as a comment (2026-06-18).
- Spike session: worktree `nh-foundation-phase0`, 2026-06-18.
