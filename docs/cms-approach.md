# NotationHero — Admin / CMS Approach (area K) — Decision

> ⛔ **SUPERSEDED — admin-auth + CMS-UI direction (2026-06-17).** Two things below are outdated: (1) the admin gate is **NOT** CloudFront-Function Basic-Auth / "No Cognito" — it is **Cognito + Google federation + RBAC (Cognito groups) + `can()` policy** in **v1**, Pulumi-provisioned; (2) there is **no separate React-Admin SPA** — the admin is the **same catalog UI with admin-gated actions** (the same-UI reuse was locked in [`specs/2026-06-15-cms-admin.md`](specs/2026-06-15-cms-admin.md), itself now auth-superseded). Source of truth: [`decisions/2026-06-17-architecture-decisions.md`](decisions/2026-06-17-architecture-decisions.md) — ARCH-AUTH-1 / ARCH-ROLE-1 / ARCH-AUTHZ-1 / ARCH-OWN-1. The AWS-coverage / S3+Lambda+CloudFront / license analysis still stands.

> ✅ **Sections still current** (2026-07-15 triage): the "Options considered" comparison + rejection reasoning, the React-Admin vs Refine/Retool table, the "Exactly what AWS this exercises" matrix, the $0/mo cost table, the license/App-Store analysis, and the "Content authoring (build-time lean)" section. Read everything **except** the admin-auth wiring (per the 2026-06-17 banner above) and the DynamoDB-as-catalog references (per the 2026-06-09 banner below) as current.

> [!IMPORTANT]
> 🗄️ **Datastore update (2026-06-09):** this record predates the catalog-store decision. The song/lesson **catalog moved DynamoDB → Neon Postgres + JSONB** (DynamoDB is now per-user data only; Mongo/DocumentDB dropped). Read every "DynamoDB as the catalog store" reference below as **superseded** — see `docs/decisions/2026-06-09-catalog-store-postgres-neon.md` + `docs/decisions/decision-registry.md`. Everything else (React-Admin choice, "why not a headless CMS", S3/Lambda/CloudFront/edge-auth architecture, AWS-coverage matrix, license analysis) still stands.

> **Status:** ✅ **DECIDED 2026-06-05** — Track 4 (CMS tooling). Approach locked; implementation can proceed in parallel with Track 3 (schema finalize).
> **Created:** 2026-06-05 · **Owner:** leocaseiro
> **Companions:** `docs/feature-freeze.md` (area `K`, `H-11`, sync model) · `docs/song-schema.md` (the Lesson contract this manages) · `docs/aws-learning-map.md` (service → vehicle) · `docs/design-stack.md` (AWS stack, free-tier, license gate)
>
> ✅ Companion docs are now on master under `docs/` (some carry SUPERSEDED banners from the 2026-06-09 decision cliff — see `docs/decisions/decision-registry.md`).

---

## Decision (TL;DR)

**Build area `K` as a custom serverless AWS backend, and mount [React-Admin](https://marmelab.com/react-admin/) (MIT) as the admin front-end over that backend's own catalog API.**

- **Backend (unchanged from the freeze):** S3 (lesson files) + DynamoDB (single-table metadata) + Lambda Function URL (CRUD + public read) + CloudFront + OAC, with a **CloudFront Function (Basic-Auth)** gate on the admin distribution. No Cognito.
- **Front-end:** React-Admin renders the admin CRUD UI (lists, filters, forms, file-upload) via a thin `dataProvider` adapter (~150 LOC) pointed at the Lambda Function URL. It is **not** a CMS — it owns no data; DynamoDB stays the system of record.
- **Net effect:** keeps the full AWS-portfolio surface (area `K` is the **#3-ranked** interview piece) **and** deletes the only real downside of custom-built — hand-rolling the admin tables/forms.

**Why not a headless CMS:** every headless CMS (Strapi, Directus, Payload, Sanity, Contentful) ships its **own** storage (SQL or its own cloud); **none** support DynamoDB as a backing store, and self-hosting one requires an always-on container (no perpetual AWS free tier) that _bypasses_ the DynamoDB + Lambda + edge-auth learning that is the entire point of placing `K` in Alpha.

---

## Context & the core tension

Area `K` (Admin/CMS) was placed in **Alpha specifically as an AWS-portfolio piece**, not because the rhythm game needs it. It is **ranked #3** of all interview candidates in `feature-freeze.md` — _because_ you build S3 + DynamoDB + Lambda + CloudFront + an edge Basic-Auth gate yourself.

The project's stated priority is unambiguous (`design-stack.md`): **"AWS depth = primary near-term goal; rhythm-game feature completeness = secondary… favor _rich enough to whiteboard and defend_ over _minimum required to ship_."** This is a full-time, job-hunt-driven AWS portfolio.

The tension: a headless/SaaS CMS is faster to a working admin, but it brings its own DB/backend and **largely bypasses the AWS learning** `K` exists to deliver — and may add recurring cost, a vendor, or a non-OSS license.

**Resolution:** the priority order decides it. The admin UI is a tiny, single-user, internal surface; the AWS backend is the goal. So we keep the custom AWS backend and only borrow a front-end _framework_ (not a CMS) to skip the boilerplate.

---

## Options considered

Scored on the five required criteria. **AWS-learning is weighted highest** per the stated priority.

| #        | Approach                                                       | AWS-learning **(PRIMARY)**                                                               | Cost (Always-Free fit)                              | Build effort                                           | Schema fit                                                       | License / App-Store                                                    |
| -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **1 ✅** | **Custom backend + React-Admin front-end**                     | ★★★★★ **max** — the #3 piece, fully intact                                               | **$0** — fits free tier                             | **M** — backend + ~150-LOC adapter (no hand-rolled UI) | **Perfect** — schema _is_ a DynamoDB item + S3 + catalog API     | React-Admin **MIT**; internal tool, never in the app binary → gate N/A |
| 1a       | Custom backend + **hand-rolled** admin UI                      | ★★★★★ max                                                                                | $0                                                  | M–L (build all CRUD UI)                                | Perfect                                                          | N/A — all your code                                                    |
| 2        | Self-hosted headless (Strapi / Directus / Payload)             | ★★ low — own DB/backend; skips DynamoDB + Lambda + edge-auth                             | ❌ **breaks free tier** — container ~$15–50/mo + DB | low UI, **+container/DB ops**                          | needs sync → DynamoDB                                            | Strapi/Payload MIT ✅ · **Directus BSL** ⚠ not OSS                     |
| 3        | SaaS headless (Sanity / Contentful / Strapi Cloud)             | ★ **near-zero** — data off-AWS; learn the vendor                                         | free tier exists, but $ at scale + **off-AWS**      | lowest                                                 | vendor in read-path or sync needed                               | vendor ToS, not OSS; data residency off-AWS                            |
| 4        | Git / flat-file (repo files + thin editor, e.g. Decap/Sveltia) | ★ low — only static S3 host (= `H-4`, already covered)                                   | $0                                                  | low–M                                                  | **partial** — no dynamic catalog API (`K-3`); rebuild-to-publish | N/A — your files                                                       |
| 5        | Hybrid (headless admin + S3 files + sync → DynamoDB)           | ★★★ medium — S3 + DynamoDB + sync Lambda, but admin/auth from the tool (skips edge-auth) | mixed — headless half still costs                   | **M–H** — operate the tool _and_ build sync            | DynamoDB canonical ✅                                            | inherits the tool's license caveats                                    |

### Why each alternative loses (against _these_ priorities)

- **Opt 2 (self-host headless):** the killer is **cost + bypass**. Strapi/Directus/Payload need an always-on container (Fargate/EC2/App Runner have **no perpetual free tier**) plus a SQL DB — breaking the Always-Free constraint — and the DB/admin/auth all come from the tool, so you skip exactly the DynamoDB single-table modeling, Lambda CRUD, and edge-auth gate that make `K` a portfolio piece. The "less code" win buys the wrong thing.
- **Opt 3 (SaaS headless):** **self-defeating for an AWS portfolio** — lesson data lives in the vendor's cloud, not AWS. Fastest to build, lowest AWS value, plus vendor lock + off-AWS data residency.
- **Opt 4 (git/flat-file):** genuinely simple and $0, but collapses `K` into "static files on S3+CloudFront" — which `H-4` already teaches. No DynamoDB, no Lambda CRUD, no live catalog API, no edge-auth → it **deletes the #3 piece.** (Still useful for _authoring content_ — see [Content authoring](#content-authoring-build-time-lean).)
- **Opt 5 (hybrid):** more moving parts than custom (run the headless tool **and** write a CMS→DynamoDB sync layer), still skips edge-auth, and the headless half still costs. Medium AWS value at higher operational cost.
- **Opt 1a (hand-rolled UI):** identical AWS value to the chosen option, but you rebuild lists/forms/file-upload that React-Admin gives for free. Kept as the zero-dependency fallback if React-Admin's `dataProvider` ever fights the API.

### The category the headless search was missing

A _headless CMS_ owns the data. The thing that fits DynamoDB is its mirror image — an **admin-UI framework / "bring-your-own-backend"** that renders CRUD over **your** API:

| Tool                                   | What it is                                                             | License                                                             | Why (not) chosen                                                       |
| -------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **React-Admin**                        | React admin-UI framework over any backend via a `dataProvider`         | **MIT**                                                             | ✅ **chosen** — static SPA on your S3+CloudFront, $0, mature           |
| Refine                                 | Modern, truly headless admin/CRUD framework (shadcn/MUI)               | MIT                                                                 | strong runner-up; pick if you later want shadcn styling                |
| Retool / Appsmith / ToolJet / Budibase | Low-code internal-tool builders (Retool connects to DynamoDB directly) | Retool SaaS · Appsmith Apache-2.0 · ToolJet/Budibase **AGPL/GPL** ⚠ | SaaS = vendor/off-AWS; self-host = container $$; copyleft flags        |
| Amplify Studio                         | AWS content UI over DynamoDB (via AppSync)                             | —                                                                   | drags in **Amplify/AppSync**, explicitly rejected in `design-stack.md` |

---

## Chosen approach — detail

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN PLANE  (internal, single user = you)                  │
│                                                              │
│  React-Admin SPA ──(static)──▶ S3 (private) ◀─OAC─ CloudFront │
│        │                                          │ viewer-   │
│        │ dataProvider (REST, ~150 LOC)            │ request   │
│        │                                   CloudFront Function│
│        ▼                                   = Basic-Auth gate  │
│  Lambda Function URL  (admin CRUD + presigned PUT)            │
│        │            POST/PUT/DELETE /lessons                  │
│        │            POST /lessons/{id}/file → presigned S3 PUT│
│        ▼                                                      │
│  DynamoDB (single-table)      S3 (lessons/<id>/source.<ext>)  │
│   PK=LESSON#<id> SK=METADATA   + cover.<ext>                  │
│   GSI (category, order)        ▲ magic-byte validate (Lambda) │
└───────────────────────────────┼──────────────────────────────┘
                                 │ same table + bucket
┌────────────────────────────────┼─────────────────────────────┐
│  READ PLANE  (public, player app = K-3 → feeds H-11)         │
│  Lambda Function URL ──▶ CloudFront                           │
│   GET /lessons?category=&difficulty=&tag=  (list projection)  │
│   GET /lessons/{id}  → full Lesson + short-lived signed URL   │
└──────────────────────────────────────────────────────────────┘
```

**React-Admin ↔ catalog API mapping** — `song-schema.md` already specifies the exact REST shape a `dataProvider` needs:

| React-Admin call      | Catalog API route (`song-schema.md`)                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `getList(lessons)`    | `GET /lessons?category=&difficulty=&tag=` (list projection)                              |
| `getOne(lessons, id)` | `GET /lessons/{id}`                                                                      |
| `create(lessons)`     | `POST /lessons` (`status:"draft"`)                                                       |
| `update(lessons, id)` | `PUT /lessons/{id}`                                                                      |
| `delete(lessons, id)` | `DELETE /lessons/{id}` (soft-delete / tombstone)                                         |
| `<FileInput>` upload  | `POST /lessons/{id}/file` → presigned S3 PUT (magic-byte validated, per `H-10` pipeline) |

Auth is handled **at the edge** by the CloudFront-Function Basic-Auth gate _before_ the SPA loads, so React-Admin needs **no `authProvider`** — the browser's Basic-Auth challenge fronts the whole admin distribution (HTTPS-only; rotate the baked credential by redeploying the function).

---

## Exactly what AWS this exercises (and what it does not)

> Identical for the chosen option and the hand-rolled fallback — React-Admin is a pure front-end swap and **changes nothing** about the AWS surface.

| ✅ **DOES exercise** (the portfolio value)                                                                                                      | ❌ **Does NOT** (covered elsewhere / by design)                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S3** — `lessons/<id>/source.<ext>` + `cover.<ext>`; key layout, lifecycle                                                                     | ~~**Cognito** — _by design_; edge Basic-Auth instead (Cognito = `H-9` @ M1)~~ — **superseded: admin gate = Cognito v1** (see top banner)                |
| **DynamoDB** — single-table Lesson items; GSI `(category, order)` list, `(updatedAt)` future change-feed; single-table modeling                 | **SQS / SNS / Athena / Kafka** — the `H-6` analytics pipeline (#1), not the CMS                                                                         |
| **Lambda Function URL** — admin CRUD + presigned PUT + public read (`K-3`); `AuthType:NONE`, logic in handler                                   | **CloudWatch / X-Ray SLOs + burn-rate** — that's `H-7` (#2); K Lambdas emit basic logs only                                                             |
| **CloudFront + OAC** — fronts admin SPA (private S3) _and_ catalog/file delivery; caching, custom domain, HTTPS                                 | **DynamoDB Streams** — not needed here; Streams learning = `H-3` sync side-effects @ M1                                                                 |
| **CloudFront Functions** — viewer-request **Basic-Auth** gate; baked credential, sub-ms at edge _(the specifically-called-out edge-auth piece)_ | **RDS / Fargate / EC2 / containers** — **never touched** (stays serverless) — a self-hosted headless CMS would have _forced_ these and broken free tier |
| **Pulumi** (TypeScript IaC) — provisions all of `K` (`H-1` multiplier)                                                                          | **AppSync / Amplify** — rejected; React-Admin hits the raw Lambda FURL, not AppSync                                                                     |
| **IAM** least-privilege — Lambda role scoped to the table ARN + S3 prefix; OAC bucket policy                                                    | **Offline-sync engine** (`H-5` RxDB/Legend-State) — player-app / M1 concern                                                                             |
| **Lambda file validation** — magic-byte check on upload (`K-1`); the same pattern `H-10` reuses for user uploads @ M1                           |                                                                                                                                                         |

**Optional future bolt-on (interview connective tissue, not required):** have the CRUD Lambda emit a `lesson.published` event → SNS → the `H-6` pipeline, so the CMS becomes a _producer_ in the analytics story. Free, and it stitches `K` to the #1 piece — but it is **not** part of the `K` build.

---

## Cost — $0/mo on a legacy Always-Free account

| Service              | `K` usage                           | Always-Free ceiling     | Verdict |
| -------------------- | ----------------------------------- | ----------------------- | ------- |
| S3                   | a few MB (lesson files + covers)    | 5 GB                    | ~$0     |
| DynamoDB             | dozens–hundreds of items            | 25 GB · 25 WCU · 25 RCU | ~$0     |
| Lambda (FURL)        | admin (you) + a few friends reading | 1M req + 400K GB-s      | ~$0     |
| CloudFront           | tiny egress                         | 1 TB egress + 10M req   | ~$0     |
| CloudFront Functions | edge auth per admin request         | 2M invocations/mo       | ~$0     |

**Only real spend:** the domain (already needed for the app). The admin can be a subdomain (`admin.notation-hero.com`) or a path on the same distribution. Apple ($99/yr) / Play ($25 once) are app-distribution costs, unrelated to `K`.

**Contrast:** a self-hosted headless CMS would add **~$15–50/mo** (always-on container + DB) with no free tier — the single biggest reason it loses.

---

## License / App-Store

- **React-Admin** core (`ra-core`, `react-admin`) is **MIT** — App-Store-clean. (Refine, the runner-up, is also MIT.)
- The admin is an **internal web tool** hosted on S3+CloudFront; it **does not ship inside the iOS/Android App-Store binary**, so the proprietary-app license gate (`design-stack.md`: MIT/Apache/BSD/MPL-2.0 OK; GPL-3/AGPL-3 not) **does not even apply** to it. MIT makes it doubly safe.
- This is why the copyleft flags on ToolJet/Budibase (AGPL/GPL) and the BSL on Directus were noted but are non-fatal for an _internal_ tool — yet we avoid them anyway because they also fail on cost (self-hosted container) or AWS-learning.

---

## Resolved: "does `/design-shotgun` cover the CMS UI?"

**No — the CMS admin UI is explicitly OUT of the `/design-shotgun` whole-app pass.**

- The admin is a **single-user internal tool**; React-Admin's default Material-UI theme is good enough out of the box (user confirmed: _"happy with a simple UI design"_).
- Design budget belongs on the **player-facing** surfaces real users see — notation feedback colors, a11y palette, dark mode, score display, the friendly view — not the lesson-authoring back-office.
- This is the clean resolution of the deferred question: a headless CMS would have _mooted_ it by bringing its own UI; the custom build _answers_ it by scoping the UI as internal/utilitarian and out of scope for consumer design.

---

## Content authoring (build-time lean)

Leaning **git-flavored authoring**, decided alongside Track 3 (not locked here): hand-author exercises as `alphatex` (`format:"alphatex"`, per `song-schema.md` Open-Q #4 / `J-3`) or `.gp`/`.mid` files, uploaded through the admin's file route to S3; the custom DynamoDB + Lambda stack owns the **metadata + catalog + gate**. This keeps authoring simple **without** sacrificing the AWS backend — i.e., it is _Option 1 with externally-authored content files_, not Option 4.

---

## What this refines upstream (fold in at next touch)

- **`feature-freeze.md` `K-2`** ("Hosted admin SPA + CRUD"): the "SPA" is now specified as **React-Admin over the own catalog API**. AWS row (`S3 · CloudFront · CloudFront Function (Basic Auth) · Lambda FURL`) is **unchanged**. (Freeze is locked + on the parallel worktree — add a one-line pointer when it's next edited.)
- **`song-schema.md`**: no change required — the existing REST routes already _are_ the `dataProvider` contract.

---

## Build sketch (light — a dedicated `/ce-plan` can sequence implementation)

1. **`K-1` store** — Pulumi: DynamoDB single-table + GSIs, S3 bucket (+ OAC), Lambda magic-byte validator.
2. **`K-3` read API** — Lambda Function URL (`GET /lessons` list projection, `GET /lessons/{id}` + short-lived signed URL) behind CloudFront. _Player app + `H-11` consume this._
3. **`K-2` admin** — Lambda CRUD (`POST/PUT/DELETE` + presigned PUT) → React-Admin SPA (write the `dataProvider` adapter + field config) on S3+CloudFront, gated by the CloudFront-Function Basic-Auth.

> Per the project rule (_every UX/perf-impacting feature gets its own spec_), `K-2` may take a **light** `docs/specs/cms-admin.md` before its code lands — but it is internal/utilitarian, so far lighter than the player-facing specs. This decision doc satisfies the _approach_ gate.

---

## Open items (non-blocking)

- **Refine vs React-Admin** — React-Admin chosen; revisit only if you later want shadcn-native styling (Refine) for the admin.
- **Authoring flavor** — git-flavored lean above; finalize with Track 3 schema lock.
- **`lesson.published` → `H-6`** bolt-on — optional, deferred; a nice talking point that makes `K` a producer in the analytics pipeline.

## Sources

- `docs/feature-freeze.md` — area `K` (K-1/K-2/K-3), AWS portfolio ranking (K = #3), sync model, `H-11`.
- `docs/song-schema.md` — Lesson record (DynamoDB item), S3 layout, catalog API (the `dataProvider` contract).
- `docs/aws-learning-map.md` — service → vehicle; DynamoDB's Alpha vehicle = the CMS + analytics.
- `docs/design-stack.md` — raw-services-via-Pulumi stack, Always-Free posture, Amplify rejection, App-Store license gate.
