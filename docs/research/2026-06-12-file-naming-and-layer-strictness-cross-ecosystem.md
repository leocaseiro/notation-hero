# Cross-ecosystem research: file naming + layer-import strictness

**Date:** 2026-06-12
**Purpose:** Spike-support grounding for the _file-level structure-strictness_ brainstorm.
**Scope guard:** The hexagon layout (`core/ adapters/ apps/ infra/`) is **LOCKED** (FOLD-hex, DACI [2026-06-09-tooling-stack-daci.md](../decisions/2026-06-09-tooling-stack-daci.md), PR #7). This research does **not** reopen it. It only informs two _open_ decisions layered on top:

> 1. **File-role signal** — suffix convention (`.entity.ts` / `.port.ts`) vs folder-only. (Ref F-B.1)
> 2. **Layer-import strictness** — how hard to enforce the one-way dependency rule. (Ref F-C / H9 widen / deferred Lane-D bans)

Sourced from three parallel research passes (TS frameworks; .NET + JVM; Go/Rust + generic). All links inline.

---

## Master comparison table

| Ecosystem                                            | (A) Filename convention                                                             | (B) Entity-vs-util signal                                         | (C) Strictness mechanism                                            | Strength tier           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| **Nx**                                               | No file suffix; role at **library/tag** level; kebab files, Pascal classes          | The **tag** of the lib (`type:util` vs `type:data-access`)        | `@nx/enforce-module-boundaries` tags + `depConstraints`             | **Lint**                |
| **NestJS**                                           | **Suffix PRIMARY**: `.entity/.service/.controller/.dto/.repository.ts`, kebab name  | The **suffix**                                                    | None built-in; teams bolt on dependency-cruiser                     | Lint (add-on)           |
| **Angular ≤v19 (legacy)**                            | Suffix: `.component/.service/.guard.ts`, kebab                                      | The suffix                                                        | None; delegate to Nx tags / eslint-plugin-boundaries                | Lint (add-on)           |
| **Angular v20+ (2025 RFC)**                          | **Suffix DROPPED**; filename = role-named (`*-store.ts`, `*-api.ts`)                | Domain-meaningful name + folder                                   | None                                                                | —                       |
| **TS DDD repos** (white-label, bespoyasov)           | **Folder-based**; camel value-objects, Pascal use-cases, `*Adapter.ts`              | **Folder + base class** (extends `Entity`/`AggregateRoot`)        | **NONE — convention only**                                          | None                    |
| **ASP.NET Core Clean Arch** (Ardalis / Jason Taylor) | Suffix on **type name** (`…Repository/Service/Command`); **entities get NO suffix** | Folder (`Entities/`) + base class (`BaseEntity`) + suffix-absence | `.csproj` `ProjectReference` (**hard**) + NetArchTest (soft)        | **Compile + test**      |
| **Java Spring Boot**                                 | Class-name suffix (`…Repository/Service`); annotation-backed                        | **Annotation** (`@Entity`) + folder                               | Maven/Gradle modules / JPMS (**hard**) + ArchUnit (soft)            | **Compile + test**      |
| **Kotlin**                                           | Multi-decl per file; folder+suffix > filename                                       | Folder + suffix                                                   | Gradle modules (**hard**) + Konsist (soft)                          | **Compile + test**      |
| **Go**                                               | **No suffix**; lowercase package-by-context                                         | **Folder/package only**; ports = `interface`s in inner layer      | `internal/` (**compile hard wall**) + go-arch-lint / depguard (CI)  | **Compile + lint**      |
| **Rust**                                             | **No suffix**; crate + module                                                       | Ports = `trait`s in core crate; entities = structs                | crate-per-layer + `pub(crate)` (**compile hard wall, acyclic DAG**) | **Compile (strongest)** |

---

## Casing axis (filename case specifically)

A sharp split — three camps, and they fall along **language type, not preference**:

| Ecosystem                         | Filename case                                                  | Rule / why                                                                              |
| --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Angular** (all versions)        | **kebab-case**                                                 | Style guide _mandates_ dasherized: `user-profile.component.ts`, `user-profile.ts` (v20) |
| **NestJS**                        | **kebab-case**                                                 | CLI-generated: `create-cat.dto.ts`, `cats.controller.ts`                                |
| **Nx generators**                 | **kebab-case** files (Pascal classes)                          | `@nx/js` / `@nx/node` emit kebab by default                                             |
| **TS DDD — Stemmler/white-label** | **camelCase** value-objects + **PascalCase** operation classes | `userEmail.ts`, `traderId.ts` vs `CreateUserUseCase.ts`, `UserMap.ts`                   |
| **TS clean-arch — bespoyasov**    | **camelCase**                                                  | `order.ts`, `paymentAdapter.ts`                                                         |
| **ASP.NET Core C#**               | **PascalCase** (filename == class name)                        | Language: one public type per file, Pascal types                                        |
| **Java Spring**                   | **PascalCase** (filename == class name)                        | Language: file == public class                                                          |
| **Kotlin**                        | **PascalCase** typical, looser                                 | Multiple decls per file allowed → filename a weaker signal                              |
| **Go**                            | **lowercase / snake_case**                                     | `user_service.go`; package names short lowercase                                        |
| **Rust**                          | **snake_case** (compiler-nudged)                               | `user_service.rs` files/modules; types PascalCase                                       |

**The pattern:**

- **kebab-case** = the JS/TS _framework tooling_ default (Angular, NestJS, Nx generators).
- **PascalCase (= type name)** = compiled OO languages where the language forces file==type (C#, Java).
- **camelCase / Pascal mix** = hand-rolled TS DDD repos (camel for domain primitives, Pascal for "operation" classes).
- **snake_case** = Rust (forced), Go (common).

**What this means for our current `check-file` rule** (allows **Pascal + camel**, bans **kebab + snake**):

- That choice plants us firmly in the **DDD / C# camp** and **explicitly rejects the Nx/Angular/NestJS kebab default**. Defensible — our hexagon is DDD-rooted, not framework-rooted.
- ⚠️ **Coupling with the Nx generator (#8):** Nx generators emit **kebab** by default → their output would _fail our own lint rule_ unless we configure the generator to emit Pascal/camel. Decide casing **before** building #8.
- ⚠️ **Layer-specific casing worth considering:** the data supports splitting by layer — **Pascal/camel in `core/` + `adapters/`** (domain, DDD tradition), but **allow kebab in `apps/`** if we ever put an Angular/Next.js/Nest app there (those ecosystems mandate/expect kebab). A single global rule will fight the framework in `apps/`.

---

## Decision frame 1 — File-role signal (F-B.1)

Two camps:

**Suffix camp** (NestJS, legacy Angular): `catalogue-item.entity.ts`, `catalogue.repository.ts`, `create-item.dto.ts`.

- ✅ Self-describing per file; greps/lints easily; **closes the Pascal-vs-camel gap deterministically** (`*.entity.ts` → must be PascalCase; `*.util.ts` → camelCase).
- ❌ Verbose; the one **Angular is actively retreating from** (v20 dropped it).

**Folder + role-name camp** (DDD repos, modern Angular, React): `core/CatalogueItem.ts`, `adapters/NeonCatalogueAdapter.ts`, ports in `ports.ts`.

- ✅ Cleaner names; role comes from the folder you already have.
- ❌ No enforcement; you must trust the folder; doesn't close the casing gap by itself.

**Lean (not a decision — your call in the spike):** the hexagon **already has the folders**, so folder-based is the lower-friction base. The strongest middle path observed across ecosystems (.NET especially): **folder signals the layer, a light suffix signals the role** — entities stay suffix-free (`CatalogueItem.ts` in `core/`), but role-bearing files carry a suffix (`.port.ts`, `.adapter.ts`, `.repository.ts`, `.dto.ts`). That selective suffix is exactly what lets ESLint `check-file` enforce casing per-role and **makes the KAN-125 DangerJS task redundant**.

---

## Decision frame 2 — Layer-import strictness (F-C / H9 / Lane-D)

**The enforcement-strength ladder** (how hard is it for a determined dev/agent to bypass):

| Tier                           | Mechanism                   | Examples                                                                                                                               | Bypass difficulty                                     |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **(a) Compile-time hard wall** | Violation **won't compile** | Go `internal/`, Rust crates, .NET `.csproj` refs, Java JPMS, **TS project references**, **package.json `exports` maps** (resolve-time) | Must edit a visible, reviewable manifest              |
| **(b) Test-time arch test**    | Red CI build                | ArchUnit, NetArchTest, Konsist, **ts-arch / ArchUnitTS**, go-arch-lint                                                                 | Must delete/disable a test (visible)                  |
| **(c) Lint-time**              | Lint error                  | **Nx tags**, **dependency-cruiser**, eslint-plugin-boundaries / Sheriff                                                                | `// eslint-disable` one line, or don't run the linter |

**Where notation-hero sits today (PR #25):** **tier (c) only** — Nx `enforce-module-boundaries` tags + dependency-cruiser. Both are bypassable with a single `eslint-disable`. This is the **weakest tier.**

**The headline for a "strict foundation" goal:** TypeScript can climb higher than most teams realize. Three available upgrades, stackable:

1. **TS project references** → **compile-time wall** (`tsc --build` fails on undeclared cross-layer imports — `TS6307`). Structurally equivalent to .NET `.csproj` references. Nx can generate/maintain these (`nx sync`). This is the single biggest lever and we are **not** using it yet.
2. **package.json `exports` maps** → emulate **Go's `internal/`**. Publish only each layer's public surface; deep imports throw `ERR_PACKAGE_PATH_NOT_EXPORTED` at resolve/build time. Caveat (Node docs): not _strong_ encapsulation (absolute-path requires bypass), but enforced by the resolver — a notch above lint.
3. **ts-arch / ArchUnitTS test in CI** → climb to tier (b); one test asserting "`core` imports nothing from `adapters|apps|infra`" turns a bypassable lint into a red build.

**Stacked = "three independent gates, two of which fail the build"** — a defensible "strict" without pretending an agent can't `eslint-disable` line 1. The Go-inspired move specifically worth adopting: **`exports`-map-as-`internal/`** — each layer package hides internals by default, exports on purpose.

This directly reframes **H9 / Lane-D**: those are tier-(c) dependency-cruiser rules. The question isn't only "widen H9 to `apps|core|adapters`?" — it's "do we _also_ climb to tier (a)/(b) so the rule can't be `eslint-disable`d away?"

---

## Things worth stealing (concrete)

- **.NET pattern:** suffix the role on the type/file (`…Repository`, `…Command`) but **leave domain entities suffix-free**, using folder (`core/`) + a `BaseEntity`-style marker as the entity signal.
- **Go pattern:** default everything to internal; export deliberately via `exports` maps.
- **Rust/Java/.NET shared pattern:** **layer = compilation unit.** The reason their walls are hard is the layer is a _project/crate/module_, not just a folder. TS project references are the way to make our `core/adapters/apps/infra` folders into real compile boundaries.
- **ArchUnit pattern:** architecture tests can also assert **naming** (`@Repository` classes must end in `Repository`) — a ts-arch test could assert "files in `adapters/` that implement a port end in `Adapter`."
- **Anti-pattern to avoid:** the famous TS DDD reference repos (white-label, bespoyasov) enforce the dependency rule with **nothing** — pure author discipline. Do **not** copy that; it's the exact gap a locked foundation must close.

---

## Sources

**TypeScript / Nx**

- [Nx — Enforce Module Boundaries](https://nx.dev/features/enforce-module-boundaries) · [Project dependency rules](https://nx.dev/concepts/decisions/project-dependency-rules) · [Switch to Workspaces + Project References](https://nx.dev/docs/technologies/typescript/guides/switch-to-workspaces-project-references)
- [TypeScript Handbook — Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) · [3 Ways to Enforce Module Boundaries in Nx (Stefanos Lignos)](https://www.stefanos-lignos.dev/posts/nx-module-boundaries)
- [NestJS modules](https://docs.nestjs.com/modules) · [NestJS naming conventions](https://github.com/stephenhenckaerts/appwise-nestjs-naming-conventions/blob/main/naming-conventions.md)
- [Angular style guide](https://angular.dev/style-guide) · [RFC: Updated style guide 2025 (angular#59522)](https://github.com/angular/angular/discussions/59522)
- [stemmlerjs/white-label](https://github.com/stemmlerjs/white-label) · [bespoyasov/frontend-clean-architecture](https://github.com/bespoyasov/frontend-clean-architecture) · [dependency-cruiser rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) · [arch-unit-ts](https://github.com/arch-unit-ts/arch-unit-ts) · [Node.js packages: exports](https://nodejs.org/api/packages.html)

**.NET / JVM**

- [Ardalis.CleanArchitecture](https://github.com/ardalis/CleanArchitecture) · [Jason Taylor CleanArchitecture](https://github.com/jasontaylordev/CleanArchitecture) · [NetArchTest](https://github.com/BenMorris/NetArchTest)
- [ArchUnit User Guide](https://www.archunit.org/userguide/html/000_Index.html) · [Konsist](https://docs.konsist.lemonappdev.com/) · [Package by Layer vs Feature (Spring Boot)](https://medium.com/@akintopbas96/spring-boot-code-structure-package-by-layer-vs-package-by-feature-5331a0c911fe)

**Go / Rust**

- [golang-standards/project-layout](https://github.com/golang-standards/project-layout) · [evrone/go-clean-template](https://github.com/evrone/go-clean-template) · [fe3dback/go-arch-lint](https://github.com/fe3dback/go-arch-lint) · [depguard](https://pkg.go.dev/github.com/OpenPeeDeeP/depguard)
- [Rust Reference: Visibility & Privacy](https://doc.rust-lang.org/reference/visibility-and-privacy.html) · [howtocodeit: Hexagonal in Rust](https://www.howtocodeit.com/guides/master-hexagonal-architecture-in-rust)
