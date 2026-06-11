# NotationHero — AWS Learning Map (service → feature vehicle)

> [!WARNING]
> ⛔ **SUPERSEDED / PARTIALLY STALE.** This doc predates the **2026-06-09 decision cliff**
> (pnpm + Nx replaced Bun; the song/lesson catalogue moved to **Neon Postgres + JSONB**,
> DynamoDB is per-user data only) and/or the 2026-06-10 schema lock. **Do not build from the
> struck lines below.**
>
> **Authoritative now →** `docs/decisions/decision-registry.md` (every decision + status),
> `docs/decisions/2026-06-09-tooling-stack-daci.md`, `docs/decisions/2026-06-09-catalogue-store-postgres-neon.md`,
> `docs/specs/2026-06-10-catalogue-schema.md`, `AGENTS.md`.
>
> _Kept for history (per "strike, don't delete"). Stale lines are ~~struck~~ with a reason._

> **Status:** living reference · **Created:** 2026-06-05 · **Owner:** leocaseiro
> **Companions:** [`docs/feature-freeze.md`](feature-freeze.md) (feature → AWS) · `stack-aws-brainstorm.md` (rationale, free-tier ceilings, learning order — in worktree `serene-grothendieck-fb5e67`)
> **Goal:** get AWS skills interview-ready *fast*. The freeze table answers "what AWS does this feature need?"; this doc inverts it — **"which feature is the best vehicle to learn each service?"** so you can pick build targets that maximize learning.

> The whole app **can ship as a pure PWA with zero AWS.** AWS is opt-in per feature, chosen for portfolio value — not because the rhythm game needs it. Legacy (pre-2025-07-15) account → **Always-Free** tiers make this ~$0.

---

## Freeze alignment (2026-06-05)

Updated to match the locked [feature-freeze.md](feature-freeze.md):
- **Sync = M1.** No per-device sync — user data is localStorage in Alpha/Beta; DynamoDB *cross-device* sync arrives at **M1** with Cognito User Pools. The `pull`/`push` engine (RxDB/Legend-State) is therefore an **M1** piece.
~~- **DynamoDB's Alpha vehicle = the Admin CMS (`K`) + analytics** (shared/global data, no identity) — build DynamoDB skills there first, not on per-user sync.~~ <!-- SUPERSEDED: the Admin CMS IS the song/lesson catalogue, now locked to Neon Postgres + JSONB (catalogue-store-postgres-neon DACI 2026-06-09); DynamoDB is a per-user-data vehicle ONLY (sync, H-3) -->
- **Kafka (`H-12`)** = the local **replay** exercise (rebuild the `H-6` ingestion; consumer groups + offsets + replay vs SQS delete-on-consume).

## Punchline

- **One feature teaches almost all the messaging services: the usage-analytics pipeline (`H-6`).**
- The unlock is tiny: **client event-emit (`J-8`)** — once any in-app action emits an event ("song completed", "score saved", "mapping changed", "practice ended"), you have endless cheap material to practice SQS / SNS / fan-out / DLQ / Athena.
- So the trick: **almost any feature becomes AWS-messaging practice the moment you attach an event to it.**

---

## Messaging services (your focus: SQS, SNS, …) → vehicle

| Service | What it teaches (interview) | Best feature vehicle | Effort | Free tier |
|---|---|---|---|---|
| **SQS** (Simple Queue Service) | decouple, consume-and-delete, visibility timeout, **DLQ**, idempotency | `J-8` → `H-6` analytics ingestion queue | in `H-6` (L) | 1M req/mo |
| **SNS** (Simple Notification Service) | pub/sub **fan-out** (one event → many subscribers) | `H-6` fan-out: "song-completed" → analytics SQS **+** email/push | in `H-6` | 1M req + 1k emails/mo |
| **DynamoDB Streams** | change-data-capture; **the queue-vs-log distinction** (interview gold) | `H-3` sync write → Stream → Lambda side-effect (roll up `C-6` daily streak; notify devices) | +S on `H-3` | included w/ DynamoDB |
| **Kafka** (local Docker, off-AWS) | partitions, consumer groups, offsets, **replay** | `H-12` replay the same analytics events locally | M | $0 |
| **EventBridge** (router) | route events by rule/schema | *concept-only* (could route achievement events later) | — | — |
| **Kinesis / MSK** | streaming throughput, replay | *speak the decision matrix — don't build (no free tier)* | — | 💸 avoid |

**Killer distinction to rehearse:** *SQS deletes on consume (no replay); Kafka/Streams retain and replay with many independent consumers.* DynamoDB Streams → Lambda is change-data-capture (the write **is** the event); SQS is an explicit enqueue. In this app they're complementary — **SQS for analytics ingestion, Streams for sync side-effects.**

---

## The fan-out feature (interview gold)

Build **practice-session-complete → SNS topic → (a) SQS → analytics Lambda → S3/Athena, (b) email/push "practice summary."**

One feature demonstrates **SQS + SNS + fan-out + DLQ + idempotency + visibility timeout** in a single breath — the canonical Staff-FE messaging story. Free: SNS 1M req + 1,000 emails/mo (perpetual).

---

## Rest of the AWS surface → vehicle

| Service | Teaches | Best vehicle | Effort | Milestone |
|---|---|---|---|---|
| **Lambda** (Function URL, cold starts, event-source mappings) | serverless compute (everywhere) | `H-2` sync API + every consumer above | M | Alpha |
| **DynamoDB** (single-table, GSI, TTL) | NoSQL modeling + change-feed | `H-3`; bolt-ons `C-5`/`F-3`/`D-2`/`F-1` | L | Alpha |
| **S3 + CloudFront + OAC** | static host, CDN, origin access control | `H-4` PWA host · `H-10` uploads · `H-11` library | M | Alpha |
| **Athena** | SQL over S3 Parquet (analytics) | `H-6` query usage data | in `H-6` | Beta |
| **CloudWatch + X-Ray** | SLI/SLO, **burn-rate alarms**, distributed tracing (SRE) | `H-7` watch sync API + SQS age-of-oldest-message | L | Beta |
| **Cognito** (PKCE / OIDC / JWT / Hosted UI) | OAuth2 auth (strong interview topic) | `H-9` accounts | L | M1 |
| **Pulumi** (IaC in TypeScript) | infrastructure-as-code | `H-1` provisions all of the above | M | Alpha |

---

## Suggested AWS build order (mirrors `stack-aws-brainstorm.md` learning order)

Almost all of it lives in **Alpha + Beta** — AWS skills come fast, not behind the Swift/native work:

1. `H-2` **Lambda** Function URL — hello-world over HTTPS; cold starts, logs
2. `H-3` **DynamoDB** — single-table + GSI + TTL
3. `H-1` **Pulumi** — port steps 1–2 to IaC, redeploy from code *(the interview multiplier)*
4. `H-4` **S3 + CloudFront + OAC** — host the PWA, fix Function-URL CORS
5. `H-5` **Wire sync** — `pull`/`push` (RxDB/Legend-State protocol)
6. **`J-8` event-emit + `H-6` SQS + SNS fan-out + DLQ** ← the messaging core
7. `H-6` **S3 + Athena** — batch events to partitioned Parquet; SQL
8. `H-7` **CloudWatch + X-Ray** — 2–3 SLOs, dashboard, alarms, a trace, then burn-rate
9. `H-12` **Kafka** (local Docker) — produce/consume, consumer groups, offsets, replay
10. *(later)* `H-9` **Cognito** — Hosted UI + Google + PKCE; verify JWT in-handler

**ASAP suggestion:** pull a **thin `J-8`** (emit just 2–3 event types) into **Alpha**, ahead of the full `H-6` pipeline, so you're hands-on with SQS/SNS the moment the backend exists.

---

## Free-tier ceilings (legacy account → Always-Free)

| Service | Allowance | Type |
|---|---|---|
| Lambda (+ Function URL) | 1M req + 400K GB-sec/mo | Always Free |
| DynamoDB (+ Streams) | 25 GB + 25 WCU + 25 RCU | Always Free |
| SQS | 1M req/mo | Always Free |
| SNS | 1M req + 1,000 emails/mo | Always Free (perpetual) |
| Cognito | 10,000 MAU | Always Free |
| CloudWatch / X-Ray | 10 alarms · 5 GB logs · ~100K traces | Always Free |
| CloudFront | 1 TB egress + 10M req/mo | Always Free (perpetual) |
| S3 | 5 GB (12-mo expired → ~pennies/mo) | low |
| Athena | pay-per-scan (~$0 at this volume) | ~free |

**No free tier — speak it, don't build:** MSK (~$460–607/mo), Kinesis, NAT Gateway (~$32/mo), API Gateway (12-mo only), CloudWatch RUM, DocumentDB, EC2.

---

## Interview talking points (earned by building the above)

Full list in `stack-aws-brainstorm.md`; the headline ones this app lets you defend:

- Static FE on **S3 + CloudFront/OAC**, no EC2; 1 TB egress Always-Free ≈ $0. Why not serve from S3 directly? (no custom-domain HTTPS, per-request/egress charges.)
- **Lambda not in a VPC** → public services need none; VPC forces a paid NAT for no security gain. S3/Dynamo from a VPC Lambda → free Gateway endpoint.
- **DynamoDB for history vs S3+Athena for analytics** → key-lookup vs aggregation.
- **Queue vs log:** SQS (delete-on-consume) vs Kafka/Streams (retained, replayable, many consumers); when to reach for SNS / EventBridge / Kinesis.
- **Offline sync:** RxDB `pull`/`push` over Lambda+DynamoDB; GSI change-feed; conditional-write conflicts; soft-delete tombstones + TTL.
- **Auth:** OAuth2 Authorization Code + PKCE for public clients; Function URLs verify JWT in-handler (`aws-jwt-verify`, `AuthType: NONE`).
- **SLOs:** SQS age-of-oldest-message SLI + DLQ + burn-rate alerting; X-Ray traces.
- **IaC:** Pulumi/Terraform — state, plan/apply, drift, modules.
