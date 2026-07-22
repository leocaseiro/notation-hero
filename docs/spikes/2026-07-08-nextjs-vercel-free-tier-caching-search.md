# Spike — Next.js on Vercel + AWS: free-tier capacity, caching, catalog search (2026)

- **Date:** 2026-07-08
- **Status:** ✅ Numbers verified (Vercel, Neon, Upstash, AWS 2025 model) 2026-07-08. Cognito exact free-MAU still to confirm.
- **Driver:** leocaseiro (job-hunt pivot: a real Next.js app as a portfolio piece)
- **Question:** In the locked **Option A** shape (Next.js PWA on Vercel + AWS backend), if **v1 is online-first** — catalog fully server-rendered, search server-side → Neon, a cache in front — how much traffic do the free tiers absorb before cost begins, and how far does caching push that ceiling?
- **Feeds:** a forthcoming ADR that will supersede `ARCH-FE-1` (Vite SPA) and the `2026-06-16` no-Next.js ADR.

---

## TL;DR (verdict)

- Free-tier pressure lands on **Vercel + Neon**, **not AWS** — in v1 AWS is only Cognito (auth).
- The catalog is **read-heavy and rarely-changing**, so Next.js caching (`"use cache"` + `cacheTag()` + on-demand `revalidateTag()`) collapses Neon load to ~**one read per content edit**. This is the capacity strategy, not just polish.
- With caching, the binding limit is **Vercel's 100 GB bandwidth ≈ ~100k–300k page views/month** — far beyond a portfolio app. Vercel **hard-stops at caps (no surprise bill)**.
- **Two operational gotchas** (details in §6):
  1. **Vercel Hobby is non-commercial** — ads, affiliate links, a paid app, _even a donations button_ → requires **Pro ($20/mo)**.
  2. **Your new AWS account closes after 6 months** (or when the $100–200 credits run out) **unless you upgrade to the Paid plan**. After upgrading, the always-free services (Cognito/Lambda/DynamoDB/CloudFront) stay **$0 forever within limits**.

---

## Decisions locked this session (2026-07-08)

These feed a forthcoming ADR that will supersede `ARCH-FE-1` (Vite SPA) and the `2026-06-16` no-Next.js ADR.

- **FE shape = Option A:** the real product FE becomes a **Next.js PWA on Vercel** (SSR public catalog + CMS server-actions + serves the offline PWA). Résumé-driven; offline surfaces stay client-from-Dexie.
- **Backend = keep NestJS on Lambda** (exposed via a free **Function URL**); Next.js = FE + thin BFF; typed **oRPC** across the boundary. Both keep Cognito + DynamoDB + S3 + IAM.
- **Caching = `"use cache"` + `cacheTag` + on-demand `revalidateTag`** for the read-heavy catalog (protects Neon, doubles as the cache-control showcase).
- **Search = Postgres FTS** (`tsvector` + GIN) + `pg_trgm` on Neon; no external search service in v1.
- **Native = deferred** Capacitor shell reusing the shared component package (player-first; iOS needs the CoreMIDI bridge).
- **Hosting = Vercel now; optional AWS re-host later.** Ship on Vercel Hobby ($0, best DX). Next.js is host-agnostic, so **if** the app monetizes (Vercel Pro's $20/mo unwanted), re-host on AWS then — candidates **Amplify** (managed) or **EC2 / container** (`next start`); decided at that point. **OpenNext skipped** (outdated/hacky). Optional + deferred.
- **API path = `api.notationhero.com` → CloudFront → Lambda.** Origin Access Control locks the raw Function URL to CloudFront (hidden + not publicly callable); branded URL, always-free CloudFront, and it keeps Vercel compute OUT of the data path (Vercel only renders pages, mostly cached). Web + native both call `api.notationhero.com`; Cognito JWT validated at the Lambda. This resolves the auth-across-clouds topology.
- **Blob store = Cloudflare R2** (10 GB always-free, no egress fees, S3-compatible API) — chosen for $0-forever on the cost priority; adds Cloudflare as a 3rd vendor but each piece stays $0.

**Still open:** v1 offline scope — Dexie in v1, or online-first then add offline (Plane 2) later.

---

## 1. The scenario (what actually runs where)

v1 builds **Plane 1** only (online); **Plane 2** (Dexie offline sync) is a later phase.

| Surface                            | Runs / renders                                      | Offline (v1)? | Hits Neon?                             |
| ---------------------------------- | --------------------------------------------------- | ------------- | -------------------------------------- |
| Public song/catalog pages (SEO)    | Vercel · Next.js SSR/SSG from Neon                  | No            | On cache miss / revalidation only      |
| In-app catalog browse + search     | Vercel · Next.js server render/action → Neon        | No (v1)       | On cache miss only (search: per query) |
| CMS / authoring **+ blob uploads** | Vercel · Next.js **server actions** → Neon + **R2** | No            | On write                               |
| Auth                               | **AWS Cognito**                                     | tokens cached | No                                     |

- **Vercel** = one Next.js deploy: SSR/SSG pages + CMS server-actions + serves the app.
- **AWS** = Cognito only in v1 (Lambda/DynamoDB arrive with Plane 2; CMS blobs use Cloudflare R2, not S3).
- **Neon** = the catalogue Postgres — the one component the cache is designed to protect.

---

## 2. Where the free-tier pressure actually lands

The real ceilings are **Vercel** (bandwidth + active-CPU per uncached render) and **Neon** (compute-hours kept awake by uncached queries). AWS is idle in v1.

| Service               | Free ceiling (2026, verified)                                                                            | Pressured by                                     | v1 risk                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| **Vercel Hobby**      | 100 GB bandwidth · 4 CPU-hrs (Fluid) · 1M invocations · 1M ISR reads / 200k writes · 5k image transforms | page views + each **uncached** SSR/search render | first to bite; **hard-stops at cap, no overage bill** |
| **Neon** (free)       | **100 CU-hours/mo** · 0.5 GB storage · up to 2 CU (~8 GB) · auto-suspends when idle                      | **uncached** queries keeping the DB awake        | removed by caching (§3)                               |
| AWS Cognito           | generous always-free MAU (⏳ exact 2026 figure)                                                          | signups                                          | ~none at portfolio scale                              |
| AWS Lambda / DynamoDB | always-free 1M req / 25 GB                                                                               | unused in v1                                     | none in v1                                            |
| CloudFront            | always-free 1 TB egress                                                                                  | N/A (Vercel serves web)                          | none in v1                                            |

The critical word in the top two rows is **uncached** — which §3 removes. And **Vercel hard-stops at its caps** (Hobby can't buy overage), so there is **no surprise-bill path** — requests just fail at the cap until you upgrade to Pro.

---

## 3. Caching — the Neon-solver **and** the showcase

The catalog is public and changes rarely (writes only when an admin edits). Ideal for aggressive server caching, and a senior-level Next.js cache-control showcase.

### 3.1 Per-app, not per-user — the core mental model

The caches that offload Neon — the **Data Cache** and `"use cache"` results — are **server-side and shared across all users**. One DB read populates the cache; every user is then served from that single copy without touching Neon. Shared is the feature.

Next.js **enforces** this: `cookies()` / `headers()` are **not allowed inside a `"use cache"` scope** (it throws), so per-user data cannot leak into the shared cache.

**Discipline:**

- **Public, same-for-everyone data (the catalog)** → cache hard. Shared is perfect.
- **Per-user data (scores, history, settings)** → not in a shared cache. Fetch dynamically, or key by user id.

The only per-user cache is the **client-side Router Cache** (each browser, for back/forward navigation) — a UX nicety, not a DB-offload mechanism.

### 3.2 The pattern

> Corrected per NH-279: use `'use cache: remote'` (durable, shared across Lambda instances) — bare `'use cache'` is per-instance and lost on cold start.

```ts
// ✅ Public catalog — shared cache, revalidate only when an admin edits
async function getCatalog() {
  'use cache: remote';
  cacheTag('catalog'); // revalidateTag('catalog') on edit
  cacheLife('days'); // long-lived; content rarely changes
  return db.select().from(playables); // Neon hit ~only on revalidation
}

// On an admin CMS write (server action):
async function publishEdit(/* ... */) {
  // ...write to Neon...
  revalidateTag('catalog'); // surgically refresh only what changed
}

// ✅ Per-user — NOT shared-cached; fetched per request
async function getMyScores(userId: string) {
  return db.select().from(scores).where(eq(scores.userId, userId));
}
```

### 3.3 Does aggressive caching cost more on Vercel? No — it saves

- **Cache hit** = served from Vercel's CDN → cheap (bandwidth only, ~0 active CPU).
- **Cache miss** = full SSR + Neon query → the expensive path (active CPU + a Neon wake).

More caching = fewer expensive paths, and it keeps Neon asleep. The only ways caching costs _more_: ultra-short revalidation (constant regeneration — do the opposite), or oversized per-entry payloads. For a rarely-changing catalog the cheapest and best pattern is **long `cacheLife` + on-demand `revalidateTag('catalog')` on edit**.

---

## 4. Catalog search in 2026

For a catalog this size, **Postgres full-text search on Neon** is the right call — zero extra cost, one less service.

- **`tsvector` + a GIN index** for word/prefix search; rank with `ts_rank`.
- **`pg_trgm`** (trigram) for typo-tolerant / fuzzy matching.
- Combine: FTS for relevance, trigram as fuzzy fallback.

**When to reach past Postgres** (not now): a dedicated search service (OpenSearch / Algolia / Typesense) only earns its keep at **tens of thousands of items _and_ heavy query volume**. The current seed is ~19 playables; Postgres FTS is comfortable into the many-thousands.

**Caching search:** popular queries can be cached (`cacheTag('search')` keyed by query), shorter-lived than the catalog; or use **Upstash Redis** (500K commands/mo free) if search ever gets hot. Most searches are cheap indexed lookups regardless.

**Showcase angle:** server-side FTS via a Next.js server action, streamed results, cached hot queries — a clean, real demonstration.

---

## 5. Capacity math (headroom)

Two columns — the difference **is** the value of caching (§3).

| Limit                             | Without caching                                                                                                    | With caching (§3)                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Vercel bandwidth** (100 GB)     | ~100k–300k views/mo (payload ~0.3–1 MB) — same either way                                                          | ~100k–300k views/mo                                                   |
| **Vercel active CPU** (4 CPU-hrs) | ~140k uncached renders/mo (@~100 ms each) → bites near bandwidth                                                   | negligible (cache hits ≈ 0 CPU) → not the constraint                  |
| **Neon** (100 CU-hours)           | steady traffic keeps the DB **awake** → 100 CU-hrs ≈ a few hundred awake-hours → **first cliff at modest traffic** | Neon wakes only on revalidation → **effectively unbounded** for reads |
| **AWS** (always-free)             | untouched in v1                                                                                                    | untouched in v1                                                       |

**Read it this way:** _without_ caching, **Neon's 100 CU-hours is your first ceiling** (a continuously-queried DB can't sleep). _With_ caching, Neon barely wakes and the binding limit becomes **Vercel's 100 GB bandwidth ≈ ~100k page views/month** — far beyond a portfolio/job-hunt app. And because Vercel Hobby hard-stops, hitting it fails requests, it never bills you.

---

## 6. AWS costs — bill of materials, the 3 traps, the account model

### 6.1 Bill of materials (Vercel FE + AWS backend)

| AWS service                              | Needed? | Cost at portfolio scale                       |
| ---------------------------------------- | ------- | --------------------------------------------- |
| Cognito (auth)                           | ✅      | **$0** — always-free MAU                      |
| Lambda (NestJS backend)                  | ✅      | **$0** — always-free 1M req/mo                |
| Lambda **Function URL** (exposes Lambda) | ✅      | **$0** — no charge                            |
| DynamoDB (per-user data)                 | ✅      | **$0** — always-free 25 GB                    |
| S3 (CMS blobs)                           | ❌      | not needed — blobs use **Cloudflare R2** ($0) |
| CloudWatch Logs (Lambda auto-logs)       | auto    | ~$0 with 7-day retention                      |
| API Gateway                              | ❌      | avoided — use Function URL                    |
| NAT Gateway                              | ❌      | avoided — **would be ~$32/mo**                |
| Secrets Manager                          | ❌      | avoided — use SSM Parameter Store (free)      |
| ALB / Route 53                           | ❌      | avoided                                       |

Vercel → AWS needs a scoped **IAM user's keys** as Vercel env vars (setup, not cost).

### 6.2 The three $0 traps (how accidental AWS bills happen)

1. **NAT Gateway (~$32/mo)** — a Lambda needs one only if it is _inside a VPC_ and must reach the internet. **Keep Lambda VPC-less** — Neon, DynamoDB, S3, Cognito are all public HTTPS, so no VPC is needed and NAT Gateway never appears. The #1 surprise bill.
2. **API Gateway** — use a **Lambda Function URL** (free HTTPS endpoint). API Gateway only earns its keep for custom domains / request validation / usage plans / WAF.
3. **Secrets Manager** ($0.40/secret/mo) — use **SSM Parameter Store** standard params (free) for the DB connection string + keys.

### 6.3 The account model + the two non-traffic cliffs

1. **Vercel Hobby is non-commercial (strict).** Verbatim: _"Hobby teams are restricted to non-commercial personal use only."_ Commercial = any deployment for anyone's financial gain — **including ads, affiliate links, payment processing, and even a donations button.** So any monetization (the $2 app, ads, donate) → **Pro (~$20/mo)**. A portfolio app is fine on Hobby until then.
2. **AWS new-account (2025 model) — this matters operationally.** Your new account gets **$100 credits now + up to $100 more from activities ($200 over 6 months)**, _not_ the classic 12-month tier. **⚠️ The free plan ends after 6 months OR when credits run out, and AWS then CLOSES the account** (data kept 90 days) **unless you upgrade to the Paid plan** (warnings at 15/7/2 days). On the Paid plan the **always-free services (Lambda, DynamoDB, Cognito, CloudFront) stay $0 forever within limits** — so steady-state cost is ~$0 at your scale, but **Paid has no free-plan guardrail** → keep the zero-spend budget + billing alarms on. **Action: reminder to upgrade to Paid around month 5.** **Blobs use Cloudflare R2** (10 GB always-free, no egress) — chosen over S3 for $0-forever, so blobs never touch the AWS bill.

---

## 7. Recommendation + flip conditions

- **Verdict:** the shape is **$0 at portfolio scale**, and **caching is the load-bearing move** (it keeps Neon under 100 CU-hours and Vercel active-CPU near zero). Nothing here blocks Option A.
- **Caching:** `"use cache"` + `cacheTag('catalog')` + long `cacheLife` + on-demand `revalidateTag` on CMS writes — capacity strategy _and_ showcase.
- **Search:** Postgres FTS (`tsvector` + GIN) + `pg_trgm` on Neon; no external search service in v1. Add Upstash (500K commands/mo free) only if search gets hot.
- **AWS account:** set a **month-5 reminder to upgrade to the Paid plan**; keep the zero-spend budget + billing alarms (Paid has no built-in cap). Always-free services then hold at $0.
- **Blob store:** S3 (pennies, AWS-native) vs Cloudflare R2 (10 GB always-free, no egress) — open (Leo deciding). Both fine.
- **Upgrade / flip triggers:** monetize in any way (ads/donations/paid) → either accept **Vercel Pro $20/mo** or **re-host on AWS** (Amplify or EC2/container) if the flat fee is unwanted; sustained >~100k views/mo → same; catalog into tens of thousands + heavy search → dedicated search service; Neon >100 CU-hrs despite caching → Neon paid.

---

## Sources

- Vercel — [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) (Hobby: 100 GB transfer · 4 CPU-hrs · 1M invocations · 1M/200k ISR · non-commercial clause) · [Pricing](https://vercel.com/pricing)
- AWS — [Free Tier](https://aws.amazon.com/free/) · [Free Tier update: up to $200 in credits (2025)](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits/) · [What's New: $200 credits + 6-month plan](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/) · [Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/)
- Neon — [Pricing](https://neon.com/pricing) (Free: 0.5 GB · 100 CU-hours/mo · autosuspend)
- Upstash — [Pricing](https://upstash.com/pricing) (Free: 500K commands/mo)
- Next.js — [Caching & `use cache`](https://nextjs.org/docs) (shared Data Cache; `cacheTag` / `revalidateTag`)
