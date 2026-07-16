# Study plan — API contracts, monorepo packaging, DB→TS codegen — 2026-07-16

> **Purpose:** give leocaseiro the material to decide [NH-284](https://leocaseiro.atlassian.net/browse/NH-284)
> (`ARCH-CONTRACT-1`) himself, rather than approving an agent's recommendation. Built for ingestion into
> **Google NotebookLM**.
>
> **Companion:** [`2026-07-16-typed-contract-respike.md`](2026-07-16-typed-contract-respike.md) — the findings.
> **Status:** decisions and implementation are **paused**. This is reading material, not a plan.

## Method — read this before trusting the list

**Every URL below was fetched and confirmed to resolve.** Nothing here is from memory. Where a detail could
not be verified, it says so. Version and download data came from the npm registry and GitHub APIs, not from
blog claims. Sources that are AI-generated filler or vendor marketing are named in the Rejected sections so
they are not re-found.

Two ingestion facts worth knowing first:

- **Next.js docs have a markdown mode.** Append `.md` to any `nextjs.org/docs/...` URL for clean markdown with
  `version:` and `lastUpdated:` front-matter. Index: `https://nextjs.org/docs/llms.txt`. Best path for NotebookLM.
- **`docs.nestjs.com` will probably fail in NotebookLM.** It is a JS-rendered SPA and returns no body text to
  fetchers. Use the raw markdown on GitHub instead (linked below).
- **`npmjs.com` package pages return HTTP 403 to fetchers.** Do not spend source slots on them.

## Suggested NotebookLM split — four notebooks, not one

One notebook blurs four different questions. Split them:

| Notebook                            | Question to ask it                                                                                                                           | Topic |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **A — Why my shared package broke** | _"Should `shared/` export raw TypeScript or a built dist, given consumers are Turbopack, Node type-stripping, esbuild, and possibly Metro?"_ | §2    |
| **B — Inference vs codegen**        | _"Should my API contract derive from my database schema?"_                                                                                   | §3    |
| **C — Defending the architecture**  | _"One web client, a Next.js BFF, a NestJS lambdalith. What's the strongest case against this?"_                                              | §4    |
| **D — The contract landscape**      | _"At one endpoint, is a contract framework justified?"_                                                                                      | §1    |

Notebooks B and C are the valuable ones — their sources **genuinely disagree with each other**, which is what
NotebookLM is good at surfacing.

---

## §1 — The contract landscape (Notebook D)

### Minimum viable path — 36 minutes

| #   | Item                                                                                                 | Type    | Time       | Date                    |
| --- | ---------------------------------------------------------------------------------------------------- | ------- | ---------- | ----------------------- |
| 1   | [Zod — Basic usage](https://zod.dev/basics)                                                          | Doc     | ~8 min     | Zod 4, current          |
| 2   | [Learn tRPC in 5 minutes](https://www.youtube.com/watch?v=S6rcrkbsDI0) — Matt Pocock                 | Video   | **6m 03s** | 2023-03-08 · 158k views |
| 3   | [tRPC vs oRPC: Which is better…](https://blog.logrocket.com/trpc-vs-orpc-type-safe-rpc/) — LogRocket | Article | **22 min** | 2025-12-08              |

**#1** is the foundation — every candidate validates with Zod, and this page covers `z.infer` plus the
"TypeScript types alone do not validate at runtime" point directly. **#2** teaches the inference model in six
minutes; Pocock is deliberate and clear, the best ESL fit in the whole list. _Caveat: 2023/v10 era — the
inference model is unchanged, the API surface is not._ **#3** is the only substantive, current, named-author
tRPC-vs-oRPC comparison that exists.

### Deep path

- [tRPC TypeScript performance — Discussion #2448](https://github.com/trpc/trpc/discussions/2448) · ~10 min skim ·
  opened 2022-08-13, active through Nov 2024. **The highest-value item in this section.** Practitioners at 40+
  endpoints reporting 5–7 second autocomplete and type-instantiation limit errors. The maintainer's own fix is
  to pre-build the API package to `.d.ts` — **which is quietly codegen**. This is what stops "inference is free"
  from sounding true.
- [oRPC — Implement Contract in NestJS](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest) ·
  ~10 min · v1.14.x. **Where the contract-first-only constraint is stated.** Read before committing to anything.
- [End-to-End Type-Safe APIs with NestJS & oRPC](https://www.youtube.com/watch?v=a7V-W0DbIbc) — Michael Guay ·
  **54m 41s** · 2026-03-19 · 3,244 views. The exact stack: NestJS + oRPC + shared Zod + OpenAPI + TanStack Query.
  _Caveats: 55 min is past a comfortable budget — skim and scrub. Low view count; presenter clarity and caption
  quality unverified. Sold as a paid course elsewhere; the YouTube version is free._
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction) + [CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin) ·
  ~15 min. **Note: this path uses `class-validator`, not Zod** — a real fork in the road. The CLI-plugin page is
  the important one: it removes the `@ApiProperty()` drudgery.
- [Hey API — Get Started](https://heyapi.dev/docs/openapi/typescript/get-started) · ~10 min · v0.99.0, 2.7M/wk.
  The closest thing to the Relay workflow: point at a spec, get a typed client. _Caveat: 2.7M/wk but still 0.x
  "initial development" — pin the version._
- [Swagger vs OpenAPI](https://nordicapis.com/whats-the-difference-between-swagger-and-openapi/) — Nordic APIs ·
  ~8 min · 2021-05-20. Wordnik → 2015 Linux Foundation donation → SmartBear keeping the "Swagger" tool name.
  _2021, and that is fine — this is fixed history and cannot go stale._ Backup: [openapis.org FAQ](https://www.openapis.org/faq)
  (current spec 3.1.1, Oct 2024) — reference, not reading.

Optional: [tRPC vs oRPC: Typesafe API battle!](https://www.youtube.com/watch?v=_oHJUxkAM1w) — Jack Herrington ·
**16m 46s** · 2025-08-04 · 29k views. Clear, measured presenter, strong ESL fit; good if watching beats reading.
[How tRPC really works](https://www.youtube.com/watch?v=x4mu-jOiA0Q) — Christopher Ehrlich (tRPC core) ·
**20m 51s** · 2023-01-13 — only if inference still feels like magic.
[oRPC comparison table](https://orpc.dev/docs/comparison) · ~5 min — **vendor self-comparison**; read for the
axes, not the verdict.

### Where material does not exist — and that is the finding

- **oRPC material is scarce.** 5,395 GitHub stars vs tRPC's **40,432** (7.5× gap); 576k/wk vs 3.87M/wk. There are
  **two** watchable videos from credible channels, **one** good article, and the official docs. **When a problem
  hits, it will be source code, not Stack Overflow.** For a project defended in interviews, that cuts both ways.
- **Zod 4 video material does not exist.** Every Zod video checked is stale — Pocock's is 2022 (Zod 3), one is
  2020 (Zod 1/2). Even [Total TypeScript's free Zod tutorial](https://www.totaltypescript.com/tutorials/zod)
  pins `zod: ^3.23.8`. **Skip video for Zod; use the docs.** Specifically stale in Zod 3 material:
  `z.string().email()` is now `z.email()`, and error customization was unified.
- **ts-rest — two minutes if curious.** [ts-rest.com](https://ts-rest.com/). Frozen. But its historical value is
  real: **oRPC's contract-first mode _is_ essentially ts-rest's model**, so understanding ts-rest is
  understanding what would actually get written.

---

## §2 — Why the shared package broke (Notebook A)

### Minimum viable path — ~26 minutes, in this order

1. **[transpilePackages — Next.js official](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages.md)** ·
   ~3 min · `lastUpdated: 2026-06-23`, **`version: 16.2.10`** — the exact Next.js major in use. States the rule
   in one line, and resolves a nuance: **"Turbopack transpiles workspace packages … in your monorepo
   automatically under both routers."** So Turbopack was transpiling `shared/` fine — **the breakage was
   path-alias resolution, not transpilation.** _No caveats; newest and most on-target source here._
2. **[Live types in a TypeScript monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo)** —
   Colin McDonnell (author of Zod) · ~14 min · 2024-05-30. Names the exact failure mode: **"static-runtime
   disagreement"** — TypeScript resolves one thing while the runtime executes another. That is precisely why
   esbuild and Vite papered over the raw-`.ts` `shared/` while Turbopack and Node type-stripping broke it.
   **Caveat — important:** read it as _diagnosis_, not permission. Its recommendation is raw TS source, which
   sounds like "keep doing the thing that broke you." The difference: McDonnell pairs raw source with TS
   `customConditions` + a publish-time `exports` override. The naive version — raw `.ts`, no conditions — is
   what shipped.
3. **[Internal Packages — Turborepo docs](https://turborepo.dev/docs/core-concepts/internal-packages)** · ~9 min ·
   **undated**. Gives the industry vocabulary: **"Just-in-Time Package"** (exports raw `.ts`, consumer compiles)
   vs **"Compiled Package"** (own build, `exports` → `dist/`). **`shared/` is an accidental Just-in-Time
   package.** Lists the exact limitation hit: _"Only applicable when consumers do transpiling"_ and _"cannot use
   TypeScript `compilerOptions.paths`."_ **Caveat:** it is a Turborepo doc but **not** a Turborepo ad — roughly
   75% is general packaging concepts, ~25% is caching. The JIT/Compiled distinction is tool-independent and
   applies unchanged to plain pnpm workspaces. Skip the caching paragraphs. It survives the no-Turborepo rule
   because it is the best writing on this specific distinction found anywhere.

### Deep path

- [Modules: Packages — Node.js official](https://nodejs.org/api/packages.html) · ~40 min as a read, better as a
  **lookup reference** · documents Node v26.5.0. The authority on `exports`, subpath exports, conditional
  exports. One rule needed explicitly: **the `"types"` condition "should always be included first."** Condition
  order is a classic silent breakage. **Caveat:** the **dual package hazard is referenced but not explained
  here** — Node punts to `nodejs/package-examples`. Do not add this expecting that explanation.
- [Project References — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/project-references.html) ·
  ~12 min · **last updated 2026-07-13**, current. The other half: pnpm makes _Node_ resolve the packages;
  project references make _TypeScript_ resolve them. Covers `composite` (which forces `declaration` on) and
  `declarationMap`. AGENTS.md already flags "tsconfig project-reference sync" as a to-be-filled lane — this is
  the primary source. **Caveat: never mentions monorepos.** The extrapolation is yours; that is a gap in the
  official docs, not a reading failure.
- [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) — Sandi Metz · ~6 min ·
  2016-01-20. **The canonical answer to "should this go in `shared/`?"** _"Duplication is far cheaper than the
  wrong abstraction."_ Her remedy — inline a wrong abstraction back into every caller and let the duplication
  show the real seam — is the discipline that stops `shared/` becoming a junk drawer. _Not stale: it is an
  argument, not a tooling guide. Written in Ruby/OO; applied here by analogy — a workspace package is an
  abstraction with a far higher extraction cost than a method._
- [Micro Frontends](https://martinfowler.com/articles/micro-frontends.html) — Cam Jackson · **jump to the
  "Shared component libraries" section (~5 min of ~29)** · 2019-06-19. The sharpest rule found for what belongs
  in a shared package: _"ensure that your shared components contain only UI logic, and no business or domain
  logic."_ Concretely: share a `Button`, do **not** share a `ProductTable`, _"which would contain all sorts of
  assumptions about what exactly a 'product' is."_ A clean test for both `shared/` and `client/`. _The rest of
  the article is about micro frontends, which is not happening here — skip it._
- [Workspace — pnpm](https://pnpm.io/workspaces) · ~18 min · undated, pnpm 11.x. Primary source for the
  `workspace:` protocol. _Dry reference material._
- [Catalogs — pnpm](https://pnpm.io/catalogs) · ~7 min · pnpm 11.x, feature added in v10.12.1. **A genuine find:**
  catalogs define dependency version ranges as reusable constants via the `catalog:` protocol — the pnpm-native
  answer to what **syncpack** currently does here. Same goal, built into the package manager instead of bolted
  on. Worth knowing either way: _"I evaluated catalogs and kept syncpack because X"_ is a strong interview
  answer; not knowing they exist is a weak one. _Caveat: not a decision doc._
- [Monorepos with pnpm — Hotjar](https://dev.to/hotjar/monorepos-with-pnpm-part-1-a-performant-package-manager-5g41) ·
  ~6 min · 2022-12-27. Real numbers, not vendor claims: node\*modules 3.2 GB → 1.3 GB, CI install 4m50s → 1m30s.
  **Caveat — read honestly: Hotjar had 50+ workspaces. This repo has five.** Those wins will not materialise at
  this scale and claiming them in an interview would be a bluff. What **does** transfer at any size: pnpm's
  strict non-hoisted `node_modules` catching phantom dependencies. _Roughly 3.5 years old; it predates catalogs
  and `minimumReleaseAge`._

Optional: [My Quest for the Perfect TS Monorepo](https://thijs-koerselman.medium.com/my-quest-for-the-perfect-ts-monorepo-62653d3047eb) —
Thijs Koerselman · ~21 min · 2023-12-26 · **confirmed not paywalled**. Second voice on JIT vs compiled, and
unusually clear on an ESM/CJS trap relevant to Lambda: _"Your TypeScript Code Might Output CJS"_ despite
`import`/`export` syntax. _Caveat: recommends Turborepo; chunks are Firebase-specific._

### Mobile / React Native sharing

- [Reflecting on Code Sharing Between React and React Native](https://matthewwolfe.github.io/blog/code-sharing-react-and-react-native) —
  Matthew Wolfe · ~6 min · 2023-06-09. Almost exactly the contemplated shape: `packages/shared` +
  `packages/web` (**Next.js**) + `packages/native` (Expo). Verdict from doing it — **shared:** React Query
  hooks, Zod schemas, Zustand state, types, utilities. **Did not share:** UI components. **Caveat: the
  `extraNodeModules` advice is superseded** — Expo SDK 52+ auto-configures Metro.
- [Work with monorepos — Expo official](https://docs.expo.dev/guides/monorepos/) · ~14 min ·
  **modificationDate 2026-06-30**, current. Confirms first-class pnpm workspace support; since SDK 52 no manual
  Metro `watchFolders`/`extraNodeModules`. **De-risks the future mobile app: pnpm workspaces will not block it.**
  **Caveat: it does not discuss sharing packages between Expo and a web app at all.**

**Honest gap:** no current (2025–2026) high-quality experience report exists on Next.js + Expo sharing a
workspace package. Nothing covers the three-way constraint of Metro + Turbopack + Node consuming one `shared/`.

### Where material does not exist

**Monorepo layout guidance (apps/ vs packages/ vs libs/) has no credible tool-neutral source.** The space is
owned by Nx and Turborepo marketing plus AI listicles. `monorepo.tools` is built by Nx. Vercel Academy is a
Turborepo course. **This is the weakest-covered topic here, and it is the ecosystem's fault.** The Metz and
Jackson pieces attack the underlying question (when does an abstraction earn its keep) but neither is about
monorepos. **No conference talk on TS monorepo packaging surfaced** — this knowledge is written, not spoken.

---

## §3 — Should the contract derive from the DB? (Notebook B)

### Minimum viable path — ~35 minutes

1. **[Data on the Outside versus Data on the Inside — digest](https://blog.acolyer.org/2016/09/13/data-on-the-outside-versus-data-on-the-inside/)** —
   Adrian Colyer · ~8–10 min · 2016-09-13 (summarising Helland's 2005 paper). **The best framing of the central
   question.** Data **inside** a service (SQL, mutable, locked, "now") and data **outside** it (immutable,
   versioned, unlocked, "then") are _different kinds of things_. The Drizzle schema is inside data. The API
   contract is outside data. **Deriving one from the other says they are the same thing.** _Caveat: SOA-era
   vocabulary — it says XML where you would say JSON. The reasoning is not stale; the examples are._
2. **[Published Interface](https://martinfowler.com/bliki/PublishedInterface.html)** — Martin Fowler ·
   **~150 words, 1 minute** · 2003-12-26. **The sharpest idea in this entire plan, and it takes a minute.**
   Public vs **published** matters more than public vs private. Non-published: rename and fix all callers in one
   commit. Published: you cannot. **The Drizzle schema is public; the API is published.** Codegen piping one
   into the other silently promotes every column rename into a breaking public change. _No caveats._
3. **[Introducing the new Relay compiler](https://relay.dev/blog/2021/12/08/introducing-the-new-relay-compiler/)** ·
   ~12 min · 2021-12-08. **The anchor, explained.** The only page found where Relay states _why_ it compiles
   rather than infers: precomputed artifacts, data masking, bundle excludes the schema, build-time validation.
   Map each reason onto REST/OpenAPI and see which survive. _Caveat: `/docs/principles-and-architecture/compiler-architecture/`
   and `/docs/guides/compiler/` explain **how**, not **why** — do not ingest those expecting rationale._
4. **[Pact — can-i-deploy](https://docs.pact.io/pact_broker/can_i_deploy)** · ~12–15 min · updated 2022-10-05.
   **This exact bug, named and solved.** The Broker keeps a **matrix** of which consumer versions were verified
   against which provider versions; `can-i-deploy` returns non-zero and blocks the pipeline if the version about
   to ship was never verified against what is already live. **Caveat: Pact assumes separate teams and repos.**
   This is one repo, two pipelines. The matrix idea transfers; the full Broker is heavy for a solo project.

### 🚩 Two corrections that change the decision

**1. drizzle-zod is NOT codegen. It is runtime inference.** It writes no files. `createSelectSchema(table)`
builds a Zod schema at runtime from the table object; TypeScript infers the type. **There is no "single
command," no artifact, no diff to review, and no drift check possible.** Architecturally it is **closer to
gql.tada than to Relay**. If the mental model is "schema to TS in a single command," **drizzle-zod does not do
that.** Kanel does.

**2. The tool that actually does what was asked is the one the registry rejected.** `ARCH-CONTRACT-1` says
_"ditch kanel-zod."_ But **Kanel + kanel-zod is the true Relay model for Postgres** — it reads a live database
and writes committed files. It is **active** (`kanel@4.0.2`, 2026-04-23; repo pushed 2026-07-04). The registry
rejected it for introspecting a live DB. That rejection may still be right — but it should be re-made
knowingly, because it rejects precisely the workflow being asked for.

**3. Drizzle v1 is NOT stable — do not trust the blogs.** Several sources, **including Drizzle's own v1 page
("v1.0 98%")**, read as if v1 shipped. The registry is the authority: `drizzle-orm` `latest` = **0.45.2**
(2026-03-27); `rc` = **1.0.0-rc.4** (2026-06-27). So the new `drizzle-orm/zod` path is real but **not on a
stable release**. On stable you still use `drizzle-zod`, last published **2025-08-06**.

### The generate-from-DB family — verified freshness

| Tool                   | npm latest | Last publish   | Repo pushed      | Verdict                                               |
| ---------------------- | ---------- | -------------- | ---------------- | ----------------------------------------------------- |
| `drizzle-zod`          | 0.8.3      | **2025-08-06** | (in drizzle-orm) | ~11 months quiet; folding into core. **Not codegen.** |
| `kanel`                | 4.0.2      | 2026-04-23     | 2026-07-04       | **Active** — the real Relay model                     |
| `kanel-zod`            | 4.0.0      | 2026-04-01     | (same repo)      | **Active**                                            |
| `zapatos`              | 6.6.1      | 2025-09-19     | 2025-09-19       | ~10 months quiet — effectively dormant                |
| `@pgtyped/cli`         | 2.4.3      | **2025-03-15** | 2026-07-14       | Repo commits, but **no release in 16 months**         |
| `kysely-codegen`       | 0.20.0     | 2026-02-16     | 2026-02-16       | Moderate                                              |
| `prisma-zod-generator` | 2.1.4      | 2026-02-14     | 2026-02-20       | Moderate; **community, not official Prisma**          |
| `sqlc`                 | —          | —              | 2026-07-15       | **Very active**, 18k stars                            |

### The "no" side — do not derive

- [Data on the Outside vs Inside — the original PDF](https://www.cidrdb.org/cidr2005/papers/P12.pdf) — Pat Helland,
  CIDR 2005 · **10 pages, 45–60 min**, dense. Verified: correct paper, public, no login, ingests cleanly. _Read
  the digest first; come here only to cite the primary source._
- [Integration Database](https://martinfowler.com/bliki/IntegrationDatabase.html) — Fowler · **1 min** ·
  2004-05-25 (updated 2015). A shared schema must _"unify what should be separate BoundedContexts"_ and becomes
  _"more general, more complex or both."_ **Generating a public contract from a schema makes the DB an
  integration database by accident.**
- [Bounded Context in APIs](https://nhpatt.com/bounded-context-in-apis/) · ~8–10 min · 2019-01-27. The DDD
  position applied to REST. _Caveat: lower-profile author; aggregates others rather than arguing something new.
  A bridge, not an authority to cite._

### The "yes" side — a real argument, not a strawman

- [PostgREST — philosophy](https://docs.postgrest.org/en/v14/index.html) · ~10–12 min · v14, active. **The
  strongest honest statement of the DRY instinct:** _"a single declarative source of truth: the data itself"_;
  custom API servers _"duplicate, ignore or hobble database structure."_ **If deriving-from-schema is going to
  be rejected, reject this, not a weak version of it.** _Caveat: project's own docs — never states a downside._
- [PostgREST — Hacker News (2019)](https://news.ycombinator.com/item?id=21435195) · 771 points, **237 comments** ·
  2019-11-03. Both sides fighting, with a production war story. Search for **stefanchrobot**: _"in the long run
  it turned out to be painful… your DB schema becomes your API schema and that either means you force one for
  the purposes of the other or you build DB views to fix that."_ **That is the entire trade-off from someone who
  paid for it** — and note "build DB views to fix that" is an anti-corruption layer, just relocated into the
  database. **korijn** asks the question nobody answers: _"How do you version your API with this kind of
  tooling?"_ _Good NotebookLM material precisely because it is a debate._
- [Introducing sqlc](https://conroy.org/introducing-sqlc) — Kyle Conroy · ~12 min · 2019-12-11. **Read for the
  model, not the language.** _"SQL is already a structured, typed language; we should be generating correct,
  type-safe code … from the source of truth: SQL itself."_ The most rigorous statement of the
  generate-from-the-database position, from a tool with 18k stars and commits this week. _Go syntax — take the
  argument, ignore the code._
- [Consumer-Driven Contracts](https://martinfowler.com/articles/consumerDrivenContracts.html) — Ian Robinson ·
  ~20–25 min · 2006-06-12. **The inverse of the instinct:** the contract derives from **consumer expectations**,
  not provider storage. Reading this next to the PostgREST philosophy page is the cleanest way to watch the two
  worldviews collide. _Long, SOA-era. The pattern is the payload._
- [Kanel](https://kristiandupont.github.io/kanel/) · ~10–15 min · v4, active. _"Your schema drives your types,
  not the other way around"_ — a "reverse ORM". `kanel-zod` emits Zod as real committed files. **The
  maximum-automation option — which is exactly why the rest of this section matters before adopting it.**
  _Caveat: needs a live DB at generation time (a CI consideration on Neon). GitHub's release sidebar shows a
  stale v3.5.1/2023 — ignore it; npm and the commit log both say v4 and active._
- [Drizzle Zod docs](https://orm.drizzle.team/docs/zod) · ~8–10 min · official.
  [v0 → v1 changes](https://orm.drizzle.team/docs/v0-v1-changes) · ~10 min — documents `drizzle-zod` →
  `drizzle-orm/zod`.
- [PgTyped](https://pgtyped.dev/) · ~5 min. Types for raw SQL queries, not tables. **Flagged honestly: repo has
  commits (2026-07-14) but no npm release since 2025-03-15.** Active development that never ships is a real risk.

### Inference vs codegen — the honest cost

- **[gql.tada — Essential Workflows](https://gql-tada.0no.co/get-started/workflows)** · **5 min** · active
  (repo pushed 2026-07-15). **The most valuable page in this entire plan, and it is short.** gql.tada is the
  flagship "no codegen, pure inference" tool. At scale it ships `turbo`, which _"scans your codebase … and
  evaluates their TypeScript types ahead of time … writes these types to a type cache"_ — a `.d.ts` you are
  advised to **commit**. Their own docs call it _"essentially a compromise between codegen tools"_ and pure
  inference. **Pure inference, at scale, reinvents codegen: a build step plus a committed artifact.** Told by
  the inference tool itself. _Caveat: the [landing page](https://gql-tada.0no.co/) sells only the upside and
  acknowledges no cost anywhere. Read the workflows page, not the pitch._
- [Introducing Zod 4](https://zod.dev/v4) · ~15–20 min · Zod 4 stable. **Why the Zod 4 detail matters:** Zod 4
  cut tsc **type instantiations by ~100×** — a test file went from >25,000 to ~175; a chained case from 4000ms
  to 400ms; "possibly infinite" errors gone. **The historic "Zod destroys tsc performance" argument was largely
  fixed in the version already in the lockfile.**
- [TypeScript Performance — official wiki](https://github.com/microsoft/TypeScript-wiki/blob/main/Performance.md) ·
  ~25–30 min, skimmable. The authority on what inference costs. Prefer `interface extends` over intersections;
  annotate return types; large unions compare quadratically. The tools that turn opinion into data:
  `--extendedDiagnostics`, `--generateTrace` + `@typescript/analyze-trace`. **Claim perf positions from here.**
- [Nick Lucas — type-checking performance analysis](https://dev.to/nicklucas/typescript-runtime-validators-and-dx-a-type-checking-performance-analysis-of-zodsuperstructyuptypebox-5416) ·
  ~12–15 min · 2023-02-12. Genuine measurement — a real tRPC router, traces, flame graphs; `.extend()` + `.omit()`
  made Zod's router compile ~10× slower. **STALE in a way that matters: it tests Zod 3.20.6, and its conclusion
  ("Zod is a big footgun") is the exact problem Zod 4 fixed.** Take the method, reject the verdict. **Read after
  the Zod 4 notes, never before.**

### Schema-first / contract-first, with critique

- [The False Dichotomy of Design-First and Code-First](https://sookocheff.com/post/api/the-false-dichotomoy-of-design-first-and-code-first-api-development/) —
  Kevin Sookocheff · ~10 min · 2021-06-08. **The best critique of the framing itself.** Replaces the binary with
  a **continuum of four approaches**, recommends the two middle ones, and rejects the pure extremes. For a solo
  TypeScript project the middle is almost certainly the landing spot — this gives the vocabulary to defend it.
- [API Design-First vs Code First](https://apisyouwonthate.com/blog/api-design-first-vs-code-first/) — Phil
  Sturgeon · ~8 min · 2019-10-14. _"Design-First, evolve with code."_ The best line against one-shot codegen:
  _"one of multiple falsehoods here is the idea that there is a design phase, then you stop designing."_
  Generating stubs once and abandoning the spec creates "two sources of lies." _Caveat: Sturgeon was at
  Stoplight and recommends Stoplight Studio._
- [A Technical Journey into API Design-First](https://devblogs.microsoft.com/ise/design-api-first-with-typespec/) —
  Microsoft ISE · ~12–15 min · 2023-05-08. **How an enterprise runs it, including the failure that forced the
  change:** their code-first approach let **Entity Framework's** implementation shape the API contract — _the
  framework drove the design instead of the business need_. **That is this exact risk with Drizzle, in a
  different stack.** _Caveat: Microsoft advocating TypeSpec (a Microsoft project). The lessons-learned section
  is honest; the tool choice is not neutral._

### Codegen operational practice

- [Using sqlc in CI/CD](https://docs.sqlc.dev/en/latest/howto/ci-cd.html) · ~5–7 min · v1.31.1. **The reference
  implementation of the drift check**, as a first-class command rather than a shell trick. `sqlc diff` compares
  expected output against disk and names **both** failure modes: developers who **forget to regenerate**, and
  developers who **hand-edit generated code**. Plus `sqlc vet` and `sqlc verify`. **Steal this three-step
  pipeline shape whatever tool wins.**
- [Handling generated code in Rush](https://7tonshark.com/posts/handling-generated-code-in-rush/) — Elliot Nelson ·
  ~6–7 min · 2023-07-19. The vocabulary that makes this decision sayable: **"generated"** files are transient,
  rebuilt each build; **"codegen"** files are committed. Different rules — codegen files excluded from Prettier,
  PRs blocked on a regeneration mismatch. _Caveat: Rush/Heft-specific commands; the taxonomy transfers._
- [Do people check generated files into Git? — graphql-code-generator #4253](https://github.com/dotansimha/graphql-code-generator/discussions/4253) ·
  ~10 min · 2020-06. Real practitioners, and **no consensus — which is the finding.** The maintainer is against
  ("bloats the repository… merge conflicts"). The counter that applies here: without committed artifacts, two
  developers at the same commit can get different builds. **The decisive variable is whether the schema source
  is reachable and stable at build time** — on Vercel building `web/` against a Neon schema, it may not be.

### Relay's codegen model

Primary source is the 2021 compiler post above. Two verified videos:

- [Building The New Facebook With React and Relay](https://www.youtube.com/watch?v=KT3XKDBZW7M) — Ashley Watkins,
  React Conf 2019 · **16m 43s** · 2019-10-30. **Prefer this one** — same argument, shorter.
- [F8 2019: Building the New Facebook.com](https://www.youtube.com/watch?v=WxPtYJRjLL0) — Meta Developers ·
  **40m 46s** · 2019-05-30. Codegen paying for itself at maximum scale: data-driven code splitting, `@module`,
  persisted queries — **all only possible because a build step knows the queries ahead of time.** The strongest
  available case that codegen buys capabilities inference cannot. _40 min; pre-Relay-Hooks._

### Contract testing / deploy skew

- [ContractTest](https://martinfowler.com/bliki/ContractTest.html) — Fowler · **2 min** · 2011-01-12. The
  definition, plus the detail people miss: run them **periodically, separately from the deployment pipeline**.
- [Pact — Introduction](https://docs.pact.io/) · ~8 min · updated 2022-08-30. Vocabulary. **Caveat: the intro
  page never mentions `can-i-deploy`** — the one feature that solves the skew problem. Do not read this alone
  and conclude Pact does not address it.
- [Schemas are not contracts](https://pactflow.io/blog/schemas-are-not-contracts/) — Matt Fellows · ~6–7 min ·
  updated 2024-02-23. A schema is abstract and syntactic; a contract is concrete and example-driven. A schema
  does not capture HTTP semantics and does not record what consumers actually use — **the argument against a
  generated schema _being_ the contract.** **Caveat: this is vendor marketing** (Pactflow sales funnel ending in
  a product pitch). The technical argument stands alone. **Optional — Helland establishes the same thing better
  and without an agenda.**

### Where material does not exist

1. **Nobody credible has written the modern version of this exact question.** No named-author writing exists on
   "should I derive my API contract from my Drizzle/Prisma schema." What exists splits into **old and excellent**
   at the architecture level (Helland 2005, Fowler 2003/2004, Robinson 2006) and **new and worthless** (SEO posts
   saying generate everything, zero downsides listed). **The translation from the classics has to be done by
   hand — and doing that translation out loud _is_ a strong interview answer.**
2. **Relay never explains why it chose codegen in one authoritative place.** Scattered across a 2021 blog post
   and conference talks. For a framework whose defining trait is codegen, that is a real gap.
3. **No honest, neutral comparison of the generate-from-DB family exists.** Every source is either the tool's own
   docs or AI filler. The freshness table above was built from registry and repo APIs because the article does
   not exist.
4. **Nothing exists on oRPC and contract versioning.**
5. **Pact's material does not address this topology.** Everything assumes separate teams and repos. "One repo,
   two deploy pipelines (Vercel + Lambda)" is common and undocumented.

---

## §4 — Defending the architecture (Notebook C)

### The BFF arc — read in this order; they disagree on purpose

1. [Backends For Frontends](https://samnewman.io/patterns/architectural/bff/) — **Sam Newman** · ~18 min ·
   **2015-11-18**. The person who popularised the term. Read for one sentence aimed straight at this
   architecture: _"For an application which is only providing a web UI, I suspect a BFF will only make sense if
   and when you have a significant amount of aggregation required on the server-side."_ **There is one web
   client.** _Staleness: the definition is canonical and not stale. What is stale — it assumes REST + native
   mobile, predates GraphQL-as-default and RSC, and does **not** cover the token/XSS motivation that is now the
   strongest justification. Pair with #4._
2. [Backends for Frontends pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends) —
   Microsoft Azure · **2,150 words, ~11 min** · `ms.date 2025-03-19`, updated 2026-06-03. **The most
   decision-useful BFF page found**, because it has an explicit **"might not be suitable when"** list — and this
   architecture is on it: _"Only one interface interacts with the backend."_ Also flags the extra-hop latency,
   real here (browser → Vercel → CloudFront → Lambda = two hops before the DB). _Azure-flavoured; read the
   pattern, skim the example._
3. [Do you need a Backend For Frontend?](https://marmelab.com/blog/2025/10/01/do-you-need-a-backend-for-frontend.html) —
   François Zaninotto · ~9 min · **2025-10-01**. **The skeptic's case — read before an interview, not during
   one.** Not justified: _single frontend applications_, simple CRUD, small teams, and _"when the BFF accumulates
   business logic."_ **On this article's criteria the aggregation case here does not hold.** _Caveat: does not
   discuss RSC or route handlers as a BFF — it critiques the general pattern, not this shape._
4. [Things Developers Get Wrong About the BFF Pattern](https://auth0.com/blog/things-developers-get-wrong-about-the-backend-for-frontend-pattern/) —
   Andrea Chiarelli · ~8 min · **2026-04-24**, the most recent BFF source here. **This is the interview
   defense.** It reframes BFF as a **security** boundary, not an aggregation layer: **tokens never leave the
   server**, which no amount of PKCE fixes (PKCE protects the code in transit, not token storage in an
   XSS-exposed browser). Given Cognito + Google federation, _"my Next.js server holds the tokens so the browser
   never does"_ is a strong, current justification — **and it survives the "but you only have one frontend"
   objection, because the security motivation does not depend on client count.** _Caveat: Auth0 sells identity.
   The technical argument stands alone._

**How to hold them together:** Newman defines it (2015) → Azure says when not to (2026) → Marmelab argues you
probably do not need one (2025) → Auth0 gives the reason you actually do (2026). A real, dated argument arc.

### Lambda + NestJS packaging

- [Serverless (FAQ) — NestJS, raw markdown](https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/content/faq/serverless.md) ·
  ~7 min. **Use this URL, not `docs.nestjs.com/faq/serverless`** — the live site serves no body text to
  fetchers. NestJS's own bootstrap numbers:

  | Setup               | Unbundled | Webpack-bundled |
  | ------------------- | --------- | --------------- |
  | Raw Node.js         | 7.1 ms    | 6.6 ms          |
  | Express             | 7.9 ms    | 6.8 ms          |
  | **Nest standalone** | 111.7 ms  | **31.9 ms**     |
  | **Nest + HTTP**     | 197.4 ms  | **81.5 ms**     |

  **Bundling cuts Nest HTTP bootstrap from ~197 ms to ~81 ms.** Also warns that async providers — like a DB
  connection on bootstrap — add their full latency to **every** cold start. **That is live here:** Neon over the
  HTTP driver, with an eager `CATALOG_DB` provider. _Caveat: these are bootstrap times measured by NestJS, not
  end-to-end Lambda cold starts. Undated. Treat as relative._

- [The pros and cons of Lambdalith](https://theburningmonk.com/2025/03/the-pros-and-cons-of-lambdalith/) —
  Yan Cui (AWS Serverless Hero) · ~11 min · **March 2025**. The best-balanced current treatment, from someone
  with nothing to sell. The number to remember: **"every 10 MB in unpacked code size costs 100 ms."** That is
  the argument for bundling NestJS rather than shipping `node_modules`. He names Next.js at 111 MB unpacked as a
  bad Lambda citizen — useful context for why Next.js is on Vercel and only NestJS is in Lambda. _His own
  position leans function-per-endpoint — which is a feature: it is the pushback to rehearse. Date inferred from
  the URL, not stated on the page._
- [Should you use a Lambdalith for your API?](https://rehanvdm.com/blog/should-you-use-a-lambda-monolith-lambdalith-for-the-api) —
  Rehan van der Merwe · ~13 min · 2023-10-04. The counterweight: _"the boundary of the blast radius should be on
  the whole API/service level."_ Cites Chris Munns on cold-start obsession — teams agonise over under 0.25% of
  invocations while ignoring slow DB queries. **Caveat: contains no benchmark data at all, despite the topic —
  it is an argument, not a measurement. Read the Yan Cui piece first.**
- [AWS Lambda Cold Starts: a NestJS Mono-Lambda API](https://dev.to/aws-builders/aws-lambda-cold-starts-the-case-of-a-nestjs-mono-lambda-api-4j42) —
  Marko Djakovic · ~6 min · published 2022-07-08, edited 2025-06-20. **The only source found measuring NestJS
  specifically as a lambdalith.** ~1,000 requests at ~10 req/s: cold start ~1.5 s, warm ~70 ms, and **only 4
  cold starts in ~1,000 requests (0.4%)**. **That 0.4% is the answer to "isn't NestJS too heavy for Lambda?"**
  _Caveats: 2022 runtime numbers; the 2025 edit does not guarantee re-measurement. One load test, not a study.
  10 req/s is gentle — cold-start percentage rises sharply under burst. Cite the shape, not the decimal._

### Where material does not exist

**NestJS-on-Lambda cold starts, measured recently.** The item above is the only NestJS-specific measurement and
its numbers date to 2022. **`docs/superpowers/plans/2026-07-15-nh279-followups.md` F-6 already tracks
benchmarking this** — that follow-up is the fix for this gap.

---

## §5 — `'use cache: remote'` and what it costs

**Why it is here.** `web/app/catalog/page.tsx` uses `'use cache: remote'` — **not** plain `'use cache'`. They are
**three different directives with three separate docs pages** in the bundled Next 16.2.10 docs
(`use-cache.md`, `use-cache-remote.md`, `use-cache-private.md`). Since CloudFront has caching **disabled** on
`/api/*`, this directive is **the only thing between page views and Lambda invocations**.

### The cost answer: on Hobby, a surprise bill is structurally impossible

The bundled docs flag `'use cache: remote'` as one that _"typically incurs platform fees"_, which raised the
question. Verified answer, from [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby) (updated
**2026-06-16**):

> _"As the Hobby plan is a free tier there are no billing cycles. In most cases, if you exceed your usage limits
> on the Hobby plan, you will have to wait until 30 days have passed before you can use the feature again."_

**The failure mode on Hobby is downtime, not a charge.** _(Hobby is restricted to non-commercial personal use — a
portfolio qualifies.)_

**The remote cache IS billed — on paid plans only.** The only page that states it is
[vercel.com/docs/pricing/regional-pricing](https://vercel.com/docs/pricing/regional-pricing) (updated
**2026-02-27**):

| Resource                 | On-demand rate (varies by region)           |
| ------------------------ | ------------------------------------------- |
| Runtime Cache **Writes** | 1,000,000 Write Units for **$4.00 – $6.40** |
| Runtime Cache **Reads**  | 1,000,000 Read Units for **$0.40 – $0.64**  |

[The Runtime Cache doc](https://vercel.com/docs/caching/runtime-cache) (updated **2026-06-29**) confirms:
_"Usage of runtime cache is charged."_ The meter is **reads and writes — not storage, not transfer.** Storage is
unmetered; each project gets a fixed limit with LRU eviction (size unpublished).

**Does `cacheLife('days')` stay inside a free tier? Yes, by a wide margin** — and the reason matters:
`cacheLife('days')` revalidates once a day, so roughly **30 writes/month**, and `getCatalog()` **takes no
arguments and closes over nothing**, so it produces **exactly one cache entry**. No key explosion is possible.
Even at 1,000,000 reads/month the read bill would be **$0.40 – $0.64**.

**A documentation gap, stated plainly: Vercel never publishes a Hobby quota for Runtime Cache.** It appears in
neither the Hobby "Included Usage" table, nor [/docs/limits](https://vercel.com/docs/limits) (updated
2026-07-01), nor the marketing pricing page. **Vercel's own pages contradict each other** — `/docs/limits` lists
ISR Reads/Writes under Pro on-demand resources but omits Runtime Cache; `/docs/pricing/regional-pricing` lists
them. Treat regional-pricing as the authority.

**One number deliberately not asserted:** Vercel defines a Read/Write Unit as **8 KB** for ISR
([ISR pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing), updated 2026-02-23).
Runtime Cache uses identical unit names _and_ identical rates, but its page never states the unit size. **8 KB is
a strong inference, not a documented fact.**

### 🚩 The hazard that actually matters

**Runtime Cache silently refuses items over 2 MB.** _"Item size — 2 MB (items larger won't be cached)."_ If the
catalog JSON ever crosses 2 MB, **caching stops silently and every page view hits the Lambda**. Given this
directive is the only protection, that deserves a guard. The API caps at 50 rows today, so there is headroom — but
nothing enforces the relationship.

**The real cost risk is elsewhere.** `connection()` means every `/catalog` view runs a Vercel function. On Hobby
the meters that can actually pause the site are **Function Invocations (1M/month)**, **Active CPU (4 CPU-hrs)**
and **Fast Data Transfer (100 GB)**. The remote cache is not the risk — it is what protects Lambda and Neon, which
are the things with real bills.

### Two corrections to the repo's own code

- **The comment in `page.tsx` is correct, and understates the problem.** It says plain `'use cache'` "re-hits the
  origin on every cold start". The docs are harsher: _"In serverless environments, memory is not shared between
  instances and is typically destroyed **after serving a request**, leading to frequent cache misses."_ Memory can
  die after **every request**, not just cold starts. The reasoning for choosing `remote` is sound and better
  supported than the comment claims.
- **⚠️ `revalidateTag(tag)` single-argument form is DEPRECATED in 16.2.10** — _"It currently works if TypeScript
  errors are suppressed, but this behavior may be removed in a future version."_ The signature is now
  `revalidateTag(tag, profile)`. **This affects the F-5 follow-up** (the admin publish/refresh button) in
  `docs/superpowers/plans/2026-07-15-nh279-followups.md`, which plans the deprecated form. The docs recommend
  **`updateTag('catalog')`** in a Server Action (read-your-own-writes, so the admin sees the change immediately),
  or `revalidateTag('catalog', 'max')` in a Route Handler.

### Real `cacheLife('days')` values — not the numbers circulating online

| Profile | `stale` (client) | `revalidate` (server) | `expire`   |
| ------- | ---------------- | --------------------- | ---------- |
| `days`  | 5 minutes        | **1 day**             | **1 week** |

So: roughly one origin fetch per day, and **after a week with no traffic the next visitor waits on the Lambda**.

### Minimum viable path — 4 items, in this order

| #   | Source                                                                                                                          | Type / length               | Date · version           |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------ |
| 1   | **Bundled `use-cache-remote.md`** — `web/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-remote.md` | Local markdown, **~15 min** | **Exactly 16.2.10**      |
| 2   | [Runtime Cache (Vercel)](https://vercel.com/docs/caching/runtime-cache)                                                         | Docs, **~12 min**           | **2026-06-29**           |
| 3   | [Regional Pricing (Vercel)](https://vercel.com/docs/pricing/regional-pricing)                                                   | Reference, **~3 min**       | **2026-02-27**           |
| 4   | [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components.md)                            | Docs, **~20 min**           | **2026-06-23 · 16.2.10** |

**#1** carries the three-directive comparison table and a "When to avoid remote caching" section — authoritative
for this exact build. **#2** is the only page saying what `'use cache: remote'` maps to on Vercel, plus the 2 MB
limit. **#3** is the only page with real numbers. **#4** is the best single explanation of the model and covers why
`use cache` is not durable.

### Deep path

- [Getting Started: Caching](https://nextjs.org/docs/app/getting-started/caching.md) · ~18 min · 2026-05-13 ·
  **v16.2.10** — the "How rendering works" section explains the `connection()` + `<Suspense>` pattern in use here.
- [cacheComponents config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents.md) ·
  ~5 min · **v16.2.10** — what the flag turns on. **PPR is now the default; `experimental.ppr` was removed.**
- [cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife.md) · ~18 min · **v16.2.10** — the real
  profile numbers, plus the nested-cache and "dynamic hole" rules.
- [connection()](https://nextjs.org/docs/app/api-reference/functions/connection.md) · ~4 min · **v16.2.10** — short;
  confirms the pattern here is the documented one.
- [Next.js 16 release post](https://nextjs.org/blog/next-16) · ~20 min · **2025-10-21** — why Cache Components
  exists; the `revalidateTag`/`updateTag`/`refresh` changes.
- [Vercel Academy — Cache Components](https://vercel.com/academy/nextjs-foundations/cache-components) · ~15 min ·
  undated — gentlest intro. _Mentions `'use cache: remote'` only in passing; **no cost content**._
- Bundled `use-cache.md` / `use-cache-private.md` · **16.2.10** — cache keys, serialization, the closure rule.
  `private` is marked **experimental**.
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) · [Limits](https://vercel.com/docs/limits) · ~5 min each ·
  2026-06-16 / **2026-07-01** — the "paused, not billed" evidence.

### Independent writing barely exists — and that is the finding

**Almost nobody outside Vercel has written seriously about `'use cache: remote'`.** The entire honest independent
record:

| Source                                                                                                                                                   | Verdict                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Discussion #85882 — "Cache Components force to utilize CPU"](https://github.com/vercel/next.js/discussions/85882) · **~8 min** · 2025-11-07, 12 replies | **The best independent signal.** Real user, reproducible evidence, a Vercel collaborator responds. Ends **partly unresolved**. |
| [Discussion #89375](https://github.com/vercel/next.js/discussions/89375) · ~5 min · 2026-02-02, 2 replies                                                | Real, but **no Vercel team member answered** — community only.                                                                 |
| [tigerabrodi.blog — "use cache: remote"](https://tigerabrodi.blog/next-js-use-cache-remote-a-distributed-cache-in-one-line)                              | Genuine hands-on writing, **~8 min**. ⚠️ **No byline, no date** — freshness unconfirmable.                                     |
| [shubhra.dev — Cache Components migration](https://shubhra.dev/tutorials/nextjs-16-cache-components) · 2026-04-30                                        | Substantive, **~40 min**. ⚠️ Funnels to the author's paid "Cache Pro Kit" — content marketing.                                 |

**This matters: the mechanism protecting the Lambda has essentially no public stress-testing.** No production
post-mortems, no independent benchmarks, no critical cost analysis at scale. **Saying that out loud in an interview
is a strength, not a gap** — it shows the risk was measured rather than assumed.

### Rejected — including one trap worth naming

| Source                                                                                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Vercel Remote Cache is now free" changelog**                                                                                                                          | ⚠️ **A trap.** That is **Turborepo/Nx build-artifact caching** — a completely different product from Runtime Cache. **The names collide.**                                                                                                                                                                                                                                                                             |
| [digitalapplied.com — "Next.js 15 to 16 Migration Playbook"](https://www.digitalapplied.com/blog/next-js-15-to-16-migration-playbook-cache-components-2026) · 2026-05-15 | **Factually wrong.** Claims _"The cache key is derived from the function arguments; closures are invisible to the key"_ and warns of cross-tenant leaks. **The bundled docs say the opposite:** closure variables are _"automatically captured and bound as arguments, making them part of the cache key."_ The real footgun is the reverse — silent capture **multiplies cache entries**, a cost problem, not a leak. |
| Nandann Creative Agency — "Next.js 16: Revolutionary Features"                                                                                                           | Agency SEO filler.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Medium / "Better Dev" (Melvin Prince) — "Next.js 16 Caching: Finally, It Makes Sense"                                                                                    | Content farm.                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Anything about `unstable_cache`, `fetch` + `force-cache`, `export const dynamic`, or `experimental.ppr`**                                                              | That is the **previous** model. `experimental.ppr` was **removed** in 16. **Actively misleading.**                                                                                                                                                                                                                                                                                                                     |

**Related, already tracked:** `docs/spikes/2026-07-08-nextjs-vercel-free-tier-caching-search.md:94-96` still shows
the **stale bare `'use cache'`** pattern with no banner — the wrong variant, for exactly the reason above.

---

## Corrections to carry into an interview

Three claims that sound right and are wrong:

1. **"drizzle-zod gives me schema-to-Zod in one command."** It does not. It is runtime inference with no
   artifact — nothing to diff, review, or drift-check. The Relay model on Postgres is **Kanel + kanel-zod**.
2. **"Drizzle v1 is out, so I'll use `drizzle-orm/zod`."** v1 is at **rc.4**; `latest` is **0.45.2**. Several
   sources, **including Drizzle's own v1 page**, read as if it shipped. The registry is the authority.
3. **"Zod destroys TypeScript performance."** Largely fixed in **Zod 4** (~100× fewer type instantiations). The
   benchmark everyone cites tests **Zod 3.20.6**.

And two about this architecture:

- **The BFF's aggregation case is weak** — one client, CRUD-ish catalog; **Newman himself and the Azure doc both
  say so.** The **security** case is strong: tokens never reach the browser, which holds regardless of client
  count. **Defend the BFF on token custody, not aggregation.**
- **`shared/` is an accidental Just-in-Time package.** esbuild and Vite compile everything they touch, so they
  hid it. **Turbopack transpiles workspace packages automatically — so transpilation was never the failure;
  path-alias resolution was.** Node type-stripping has no bundler to save it, so it failed loudest and most
  honestly.

## Rejected — named so they are not re-found

**Verified rejections** (fetched, problem confirmed):

| Source                                                                                                                        | Why                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Vercel Academy — Understanding Monorepos](https://vercel.com/academy/production-monorepos/understanding-monorepos)           | Lesson 1.1 of a course titled _"Production Monorepos with Turborepo."_ Built on Vercel's starter + Vercel remote caching.                                                                                                    |
| [Robin Wieruch — Monorepos in JS/TS](https://www.robinwieruch.de/javascript-monorepos/)                                       | ~4,500 words, updated 2025-02-03, but entirely **Yarn** + **Turborepo** + Changesets. pnpm gets one passing sentence.                                                                                                        |
| [AWS — BFF Pattern](https://aws.amazon.com/blogs/mobile/backends-for-frontends-pattern/)                                      | Not bad, off-target: it is about BFF + **event-driven architecture** (WebSockets, AppSync, DynamoDB Streams). Real-time push is not the problem here.                                                                        |
| `monorepo.tools`                                                                                                              | Built and maintained by Nx. Presents as neutral comparison; it is not.                                                                                                                                                       |
| [gql.tada landing page](https://gql-tada.0no.co/)                                                                             | Sells only the upside; acknowledges **no** performance cost. Use the workflows page.                                                                                                                                         |
| **qaskills.sh** (Pact guides)                                                                                                 | **AI-generated SEO.** No byline; restates the Pact docs; invents a fake "50-engineer, 20-microservice" war story for credibility. Ranks well on Pact searches.                                                               |
| **talkingschema.ai** (`schema-to-code-prisma-drizzle-typescript`)                                                             | **Founder marketing as neutral advice.** Argues "Design First, Generate Everything," lists **zero** downsides, cites nobody, repeatedly says "Try TalkingSchema." Engineered to look like the answer to this exact question. |
| **microservices.io** anti-corruption-layer page                                                                               | Real author (Chris Richardson), but the page is an **empty stub** — headers, no content.                                                                                                                                     |
| **saschb2b.com** (`typesafe-api-codegen-2026`)                                                                                | Real developer, real configs, **but** asserts "gql.tada slows the language server" with **no data** and sells his own product. Superseded by the gql.tada workflows page (first-party and honest).                           |
| **tech.spiko.io** (`benchmarking-typescript-type-checking`)                                                                   | Titled "benchmarking", contains **no benchmarks**.                                                                                                                                                                           |
| **"tRPC in 100 Seconds"** ([0DyAyLdVW0I](https://www.youtube.com/watch?v=0DyAyLdVW0I))                                        | Real video, **misattributed to Fireship everywhere** including by search engines. The channel is "Marcon".                                                                                                                   |
| **"ORPC Safe and Healthy - Video 2"**                                                                                         | It is **Oak Ridge Presbyterian Church**. The acronym collides.                                                                                                                                                               |
| **swagger.io's own "Difference Between Swagger and OpenAPI"**                                                                 | **Dead** — 301s to `/blog/`. Still ranks #1. This is why the naming question sends people in circles.                                                                                                                        |
| Jan Marshal's _"Create a B2B AI SaaS… oRPC"_ ([Uj9X7Hbw6dk](https://www.youtube.com/watch?v=Uj9X7Hbw6dk))                     | Real, but **709 minutes** (11.8 hours). Disqualified on length.                                                                                                                                                              |
| **PkgPulse "From REST to tRPC"**                                                                                              | Claims tRPC has "~2M weekly downloads"; the real figure is **3.87M**. AI-generated SEO.                                                                                                                                      |
| **pkgpulse.com · starterpick.com · ecosire.com · oneuptime.com · gable.ai · compilenrun.com · jsdev.space · wireframe.today** | SEO content farms dominating "tRPC vs OpenAPI 2026", "Drizzle vs Prisma 2026", "anti-corruption layer". All filler.                                                                                                          |
| Medium: _"The Ultimate Guide to Building a Monorepo in 2026"_, _"10 TypeScript Monorepo Conventions That Age Well"_           | Year-stamped "ultimate guide" and anonymous numbered listicles — the canonical AI-SEO shape. **Flagged on signal; not opened.**                                                                                              |

**No paywalled sources are in this plan.** The one Medium article kept (Koerselman) was checked specifically for
a member-wall and is open. Everything above is free, public, and login-free.
