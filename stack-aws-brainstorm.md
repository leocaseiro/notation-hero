# Drum Tutor — AWS Stack Brainstorm (interview-prep track)

> **Status:** living brainstorm · **Last updated:** 2026-06-03
> Companions: [`scope.md`](scope.md) · [`stack-brainstorm.md`](stack-brainstorm.md)
> **Dual goal:** ship the drum app's backend **and** learn the AWS services interviewers ask about. Legacy AWS account (pre-2025-07-15) → **Always-Free** allowances apply.
> **Decided:** ship the backend on **AWS** (Supabase = nice-to-learn later, lower priority). **IaC = Pulumi** (+ Terraform literacy). Client stack unchanged (Vite+React, AlphaTab, PixiJS, Web Audio/MIDI, Capacitor/PWA).

---

## The lens: Sr FE → Staff FE = system design

The career goal sets the optimization target. Staff interviews probe **solution design / system thinking**, not coding. So learn each piece **deep enough to whiteboard and defend the tradeoffs** — this backend is the **system-design portfolio piece** (a real thing built end-to-end you can walk an interviewer through). Background (React/TS expert, strong CI/CD, fluent Docker, ex-LAMP/Postgres/Mongo) means we **skip** the known parts and aim all energy at **backend + messaging + the design narrative**.

---

## Why AWS here (when "ship-cheap" said Supabase)

- **Learning is now a first-class goal** → AWS is what gets asked about; the app is the vehicle.
- **Legacy account** → genuine **Always-Free** (Lambda, DynamoDB, SQS, SNS, Cognito, CloudWatch, X-Ray, CloudFront 1 TB).
- **Not lock-in** → the client sync layer (RxDB/Legend-State) is an abstraction over a replication protocol, so the backend (AWS *or* Supabase) is **swappable**.

---

## How it composes with the client stack

```
  Web / PWA  ──HTTPS──▶ CloudFront ──OAC──▶ S3 (private static bundle)
  Capacitor iOS/Android  (bundles the same build natively)
        │  all clients call the SAME backend:
        ▼
   Cognito (JWT, PKCE) ─verified in-handler─▶ Lambda Function URL ─▶ DynamoDB (per-user sync + history)
                                                    │ Streams / emit
                                                    └─▶ SQS ─▶ consumer λ ─▶ S3 ─▶ Athena (analytics)
                                                                  │ failures ▶ DLQ
   CloudWatch + X-Ray span the backend → SLOs        Sentry (free) = CLIENT-side JS errors
```

**Boundary:** AWS is the **backend** (sync, auth, analytics, backend SRE). **Real-time gameplay** (Web MIDI, Web Audio scoring, AlphaTab, PixiJS) stays **client-side**. Only web delivery uses S3+CloudFront; Capacitor bundles the build natively and hits the same Lambda API.

---

## The three use cases

- **A — Sync:** Lambda + DynamoDB (`USER#<sub>` key, LWW on `updatedAt`, delta pull). One user across their own devices → low conflict → LWW is fine.
- **B — SRE/SLOs** *(richest learning surface):* CloudWatch SLIs (Lambda `Errors`/`Duration` p95/99/`Throttles`, SQS age-of-oldest-message, DynamoDB `ThrottledRequests`) → SLOs (avail 99%, p95 < 300 ms, queue age < 60 s) → **error budget** → **burn-rate alerts** via composite alarms. + X-Ray traces, DLQ.
- **C — Usage analytics:** `action → SQS → consumer λ (batch) → S3 (Parquet, dt-partitioned) → Athena (SQL)`. DynamoDB is wrong here (no aggregation).

---

## Queues & messaging (priority area)

### The hierarchy — the interview gold

| Shape | Service | Behaviour | One-liner |
|---|---|---|---|
| **Queue** | **SQS** | drop → **one** worker consumes → **deleted** | "do this work later" |
| **Pub/Sub** | **SNS** | publish once → **many** subscribers each get a copy (push) | "tell everyone this happened" |
| **Log / Stream** | **Kafka / Kinesis / DynamoDB Streams** | durable ordered log, **many** readers, **replayable**, retained | "a replayable history of events" |
| **Bus / Router** | **EventBridge** | route events by rules/schema to targets | "send the right event to the right place" |

**Killer distinction:** *SQS deletes on consume (no replay); Kafka retains and replays with many independent consumers.* Articulating this = senior signal.

### DynamoDB Streams → Lambda vs SQS

- **Streams → Lambda = Change Data Capture.** The DB *write is the event*; a 24 h ordered log; Lambda auto-fires per change, captures *every* write. It's a **stream/log**, not a queue. Use for **reacting to sync writes** (projections, notify devices).
- **SQS = explicit enqueue** in code; general-purpose; consumed-and-deleted. Use for **non-DB-write events** (analytics) or deferring slow work.
- → In this app they're **complementary**: SQS for analytics ingestion, Streams for sync side-effects.

### Learning SQS **and** SNS, not-complex

The **SNS → SQS fan-out**: one event → SNS topic → (a) SQS analytics queue → consumer → S3, and (b) email/push. One pattern teaches SQS, SNS, fan-out, DLQ, idempotency, visibility timeout. Free: **SQS 1M req/mo · SNS 1M req + 1,000 emails/mo (perpetual)**.

### Kafka — without the AWS bill

- 🚫 **Amazon MSK has no free tier** (~$460–607/mo provisioned; ~$547/mo serverless). **Kinesis** has no free tier either. Don't learn streaming on AWS.
- ✅ **Local Docker** (you know Docker): **Redpanda** (lightest, Kafka-compatible) or **Apache Kafka** via docker-compose. Real API: partitions, consumer groups, offsets, **replay**.
- ✅ Managed taste, free: **Aiven free Kafka** ($0/mo) or **Confluent Cloud free tier**. *(Avoid CloudKarafka — discontinued; Upstash Kafka — sunset.)*
- 🎯 **Decision matrix to rehearse:** SQS (simple decouple) · SNS (fan-out) · Kinesis/Kafka/MSK (throughput, replay, many consumers, event-sourcing) · EventBridge (routing). Picking + justifying = the Staff system-design test.

---

## The offline-first ↔ DynamoDB bridge

**You keep the FE library.** Client uses **RxDB or Legend-State** (does all the hard offline/sync work — saves FE time). You build the **server side**: two small Lambda handlers the lib calls.

| Lib expects | Lambda + DynamoDB |
|---|---|
| `pull(checkpoint)` → docs changed since checkpoint | **query a GSI** on `(USER#sub, updatedAt > checkpoint)` → docs + new checkpoint |
| `push(changeRows)` → conflicts | **conditional writes** (LWW); return server-newer docs |
| deletions | **tombstones** flow through `pull` like any change |

- **GSI (Global Secondary Index)** = an auto-maintained second copy of the table sorted by a *different* key (here `updatedAt`), so "what changed since X?" is fast. (The back-of-book index.)
- **Soft-delete tombstone** = you can't hard-delete (other devices would never learn it's gone); mark `deleted:true`, let peers pull it, then **TTL** auto-purges it (~30 days).
- **Interview story:** *"I implemented RxDB's pull/push replication against DynamoDB — GSI change-feed + conditional-write conflict detection + tombstones."*

---

## Auth plan (Cognito + PKCE)

- **PKCE is correct** for SPA + Capacitor (public clients, no secret): OAuth2 **Authorization Code + PKCE**. Cognito supports it.
- **Federation:** native **Google, Apple, Facebook, Amazon, any OIDC/SAML**. Google = easy; **Apple = native (and required on iOS App Store if any social login)**; **GitHub = not OIDC → needs a bridge (defer past MVP)**.
- **MVP:** Cognito **Hosted UI** (managed login page, runs the PKCE dance) + **Google** + email/password. Add Apple with iOS; GitHub later.
- Covers interview ground: OAuth2, PKCE, OIDC, federation, JWT, Hosted-UI-vs-custom. **Function URL caveat:** only IAM or NONE auth → verify JWT **in-handler** (`aws-jwt-verify`, `AuthType: NONE`).

---

## Observability split

| Layer | Tool | Cost |
|---|---|---|
| **Backend** SRE (Lambda/SQS/Dynamo metrics, SLOs, traces) | **CloudWatch + X-Ray** | Always-Free |
| **Client** JS errors (stack traces, source maps) | **Sentry** (not CloudWatch RUM — not free) | Free |
| **Usage** analytics | your SQS→S3→Athena pipeline | ~$0 |

---

## IaC — Pulumi (decided) + Terraform literacy

- **Pulumi (TypeScript)** = fastest for you, real TS, you'll finish. **Decided.**
- **Terraform** is still more requested in enterprise JDs — but the *concepts* (state, plan/apply, providers, drift, modules) transfer 1:1. → Spend an afternoon on HCL **literacy** so you can speak it; interviews ask concepts, rarely "write HCL live." Match a specific JD if needed.
- CI/CD: GitHub Actions → `pulumi up` (you already know CI/CD — just wire the AWS deploy).

---

## Local dev — real AWS primary, LocalStack optional

**LocalStack** = a fake AWS in Docker (emulates Lambda/DynamoDB/SQS/SNS/S3). Fast loop, $0, offline, safe; great for CI integration tests. Community (free) covers core services; can subtly diverge from real AWS (esp. IAM). → **For learning + interview fluency, use *real* AWS as primary** (see the real console/IAM/CloudWatch); LocalStack only for fast local/CI tests.

---

## What to LEARN vs SKIP

| 🟢 Build it here (hands-on core) | 🟡 Concept only (speak it; maybe a local demo) | ⚪ Skip (have it / wrong fit) |
|---|---|---|
| **Lambda** (Function URLs, cold starts, event-source mappings) | **Kafka** (local Docker) + queue-vs-log model | FE framework + state (expert) |
| **DynamoDB** (single-table, GSI, TTL, Streams) | **Kinesis / MSK / EventBridge** decision matrix | **CI/CD** basics (apply to AWS deploy) |
| **Cognito** (PKCE, OIDC federation, JWT, Hosted UI) | **VPC / NAT / Gateway endpoints** (why serverless skips them) | **Docker** basics (reuse for Kafka/LocalStack) |
| **SQS + SNS** (fan-out, DLQ, idempotency, visibility timeout) | **DocumentDB / Atlas** doc modeling (optional detour) | **Kubernetes** (serverless ≠ K8s → separate project) |
| **S3 + CloudFront** (OAC — the setup you've never done) | **burn-rate / error-budget** theory | **API Gateway** (use Function URL), **EC2** |
| **CloudWatch + X-Ray** (SLI/SLO, alarms, dashboards, traces) | **Sentry** wiring for client errors | **QuickSight** (cost), **XState** (optional*) |
| **Pulumi** (provision all of it as code) | **Terraform** HCL literacy | |
| **The sync `pull`/`push` backend** | | |

\* *XState: skip for plumbing; optionally model the one game-mode lifecycle (idle→count-in→playing→paused→results) as an explicit FSM for the rigor + interview story. K8s: doesn't fit this serverless app — do a separate containerize-the-Express-app project if you want hands-on.*

Everything fits in **this one project** except **Kafka** (local Docker, alongside) and **K8s** (separate).

---

## Corrected free-tier ceilings (legacy account)

| Service | Free allowance | Type |
|---|---|---|
| Lambda (+ Function URL) | 1M req + 400K GB-sec / mo | Always Free |
| DynamoDB (+ Streams) | 25 GB + 25 WCU + 25 RCU (provisioned) | **Always Free** |
| SQS | 1M req / mo | Always Free |
| SNS | 1M req + 1,000 emails / mo | Always Free (perpetual) |
| Cognito | 10,000 MAU (Lite/Essentials) | Always Free *(pre-2024-11-22 pools: 50K)* |
| CloudWatch / X-Ray | 10 alarms, 5 GB logs / ~100K traces | Always Free |
| **CloudFront** | **1 TB egress + 10M req + 2M Functions / mo** | **Always Free, perpetual** |
| **S3** | 5 GB / 20K GET / 2K PUT | **12-month → expired; ~pennies/mo** |
| ACM (TLS, us-east-1 for CF) · Athena | certs free · pay-per-scan | Free / ~$0 |
| **No free tier — avoid for learning** | **MSK** (~$460–607/mo), **Kinesis**, NAT Gateway (~$32/mo), EC2, API Gateway (12-mo), CloudWatch RUM, DocumentDB (~$69/mo) | 💸 |

---

## Refined learning order

1. **Lambda + Function URL** — hello-world over HTTPS; cold starts, logs.
2. **DynamoDB** — single-table; add the `updatedAt` **GSI** + TTL/tombstone.
3. **Cognito** — user pool (Essentials), Hosted UI + Google, **PKCE**; verify JWT in-handler.
4. **Wire sync** — `pull`/`push` endpoints (the RxDB/Legend-State protocol). *(Use case A)*
5. **Pulumi** — port steps 1–4 to IaC; redeploy from code. *(the interview multiplier)*
6. **S3 + CloudFront + OAC** — host the FE; fix Function-URL CORS.
7. **SQS + SNS fan-out + DLQ** — emit on write; drain; idempotency. *(messaging core)*
8. **S3 + Athena** — batch events to partitioned Parquet; SQL. *(Use case C)*
9. **CloudWatch + X-Ray** — 2–3 SLOs, dashboard, alarms, a trace, then **burn-rate**. *(Use case B)*
10. **Kafka (local Docker)** — produce/consume, consumer groups, offsets, replay; feel queue-vs-log. *(interview priority, off-AWS)*
11. **(Optional)** Atlas document modeling · the one XState game-mode FSM.

---

## Interview talking points (earned)

- Static FE on S3 + **CloudFront/OAC**, no EC2; **1 TB egress Always-Free** ≈ $0. Why not serve from S3? (no custom-domain HTTPS, per-request/egress charges.)
- Lambda **not in a VPC** → public services need none; VPC forces a paid NAT for no security gain (no inbound surface). S3/Dynamo from VPC Lambda → free **Gateway endpoint**.
- DynamoDB for history, **S3+Athena for analytics** → key-lookup vs aggregation.
- **SLI for the async pipeline** → SQS age-of-oldest-message + alarm + DLQ; SLO alerting via **burn-rate**.
- Provisioned (free 25/25, throttle-don't-bill) vs on-demand (bills per request).
- **Queue vs log:** SQS (delete-on-consume) vs Kafka (retained, replay, many consumers); when to reach for SNS / EventBridge / Kinesis.
- **Offline sync:** RxDB pull/push over Lambda+DynamoDB; GSI change-feed; conditional-write conflicts; tombstones.
- **Auth:** OAuth2 Authorization Code + **PKCE** for public clients; OIDC federation; Function URLs verify JWT in-handler (IAM/NONE only).
- **IaC:** Pulumi/Terraform — state, plan/apply, drift, modules.
- **Where K8s fits** (and why serverless was the right call here).

---

## Open decisions (most now settled)

1. ✅ Backend = **AWS** (Supabase deferred). 2. ✅ IaC = **Pulumi** (+ Terraform literacy). 3. ⬜ Sync client lib: **RxDB vs Legend-State** (both target AWS via custom replication). 4. ⬜ XState for the game-mode FSM: yes (rigor) or skip (speed). 5. ⬜ First concrete build step.

---

## Sources

[CloudFront 1 TB Always-Free](https://aws.amazon.com/blogs/aws/aws-free-tier-data-transfer-expansion-100-gb-from-regions-and-1-tb-from-amazon-cloudfront-per-month/) · [Cognito feature plans](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html) · [MSK pricing (no free tier)](https://aws.amazon.com/msk/pricing/) · [Kinesis pricing](https://aws.amazon.com/kinesis/data-streams/pricing/) · [SQS](https://aws.amazon.com/sqs/pricing/) / [SNS](https://aws.amazon.com/sns/pricing/) free tiers · [Aiven free Kafka](https://aiven.io/free-kafka) · [SQS/SNS/Kinesis/EventBridge guide](https://betterdev.blog/aws-messaging-services-sqs-sns-kinesis-eventbridge/) · [RxDB replication](https://rxdb.info/replication.html) · [Pulumi](https://www.pulumi.com/docs/) · [Sentry free](https://sentrypricing.com/free-plan) · [Google SRE Workbook — burn-rate](https://sre.google/workbook/alerting-on-slos/)
