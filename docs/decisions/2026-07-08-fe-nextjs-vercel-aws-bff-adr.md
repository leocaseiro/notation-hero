# ADR — FE + hosting: Next.js PWA on Vercel + NestJS-on-Lambda (hybrid BFF)

- **Status:** ✅ Accepted 2026-07-08.
- **Date:** 2026-07-08
- **Driver / Approver:** leocaseiro
- **Ticket:** FE-framework lineage [NH-185](https://leocaseiro.atlassian.net/browse/NH-185) (supersedes its Vite-SPA outcome). New ticket TBD.
- **Evidence:** Spike — [docs/spikes/2026-07-08-nextjs-vercel-free-tier-caching-search.md](../spikes/2026-07-08-nextjs-vercel-free-tier-caching-search.md) (verified 2026 free-tier numbers, caching, search, AWS bill-of-materials + traps, hosting comparison).
- **Scope:** FE framework + hosting + the client↔backend topology + caching / search / blob choices. Does **not** reopen the hexagon, the NestJS backend, oRPC, Drizzle, the Neon/DynamoDB data split, or Cognito auth — all kept.
- **Supersedes:** the FE-framework clause of [`2026-06-17-architecture-decisions.md`](2026-06-17-architecture-decisions.md) (`ARCH-FE-1`: Vite + TanStack SPA), and closes the [`2026-06-16`](2026-06-16-fe-framework-nextjs-adr.md) no-Next.js chain.

---

## Context

The job-hunt pivot toward **FE-heavy full-stack (Next.js) roles** makes a real, deployed Next.js app a portfolio priority. Next.js was opened and closed three times (2026-06-02, -16, -17) — each time on AWS-hosting cost/complexity ("SSR fights the $0 free tier"). The **new variable** that resolves the loop: host Next.js on **Vercel** (purpose-built, free for non-commercial), keeping AWS for the backend. The design-system investment (110 components, Storybook, tokens) is framework-agnostic React and carries over untouched; only 3 stub routes exist, so the switch cost is near its lifetime minimum.

---

## Decision

Adopt **Next.js (App Router) PWA on Vercel** as the product FE, with a **hybrid BFF topology** over the existing **NestJS-on-Lambda** backend.

1. **Hosting = Vercel now → OpenNext-on-AWS later.** Ship on Vercel Hobby ($0, best DX) for speed. Migrate to self-hosted **OpenNext + Pulumi** (CloudFront / Lambda / S3, $0 even when commercial) if/when the app monetizes or to earn the AWS-hosting credential. Next.js is portable; the migration is itself a portfolio artifact.
2. **Topology = hybrid BFF.**
   - **Vercel as BFF** for render-time / SEO data and server-action mutations — the Next.js server reads Neon (cached) or calls Lambda server-side. Cached, so low compute.
   - **`api.notationhero.com` → CloudFront → Lambda** for high-frequency client-side calls (per-user data, sync). **Origin Access Control** locks the raw Function URL to CloudFront (hidden, not publicly callable); the browser never sees the AWS URL and these calls bypass Vercel compute.
   - **Rule:** server-side / SEO / mutation → Vercel; high-frequency client / per-user → CloudFront-direct. Same NestJS Lambda backend both ways.
3. **Backend = keep NestJS on Lambda** (Function URL, OAC-locked behind CloudFront); typed **oRPC** contract.
4. **Data:** **Neon** (catalog, read-heavy, cached) + **DynamoDB** (per-user) + **Cognito** (auth; JWT validated at the Lambda).
5. **Caching = `"use cache"` + `cacheTag` + on-demand `revalidateTag`** for the read-heavy catalog — keeps Neon under its 100 CU-hours (an uncached, steadily-queried DB can't sleep), and doubles as a cache-control showcase. Public data only in the shared cache; per-user data fetched dynamically.
6. **Search = Postgres full-text search** (`tsvector` + GIN, `pg_trgm` fuzzy) on Neon; no external search service in v1.
7. **Blobs = Cloudflare R2** ($0-forever: 10 GB always-free, no egress, S3-compatible).
8. **Native = deferred** Capacitor shell reusing the shared component package (player-first; iOS needs a CoreMIDI bridge — Web MIDI is absent on all iOS WebKit).

---

## Rationale

- **Both résumé stories:** a real deployed Next.js SSR app **and** a self-hosted AWS backend (with a documented Vercel→OpenNext migration path) — FE credential + AWS depth.
- **$0 at portfolio scale:** Vercel Hobby (non-commercial) + always-free AWS (Cognito/Lambda/DynamoDB/CloudFront) + Neon/R2 free tiers. Caching keeps Neon asleep; CloudFront keeps the client API off Vercel's compute budget; Vercel hard-stops at its caps (no surprise bill).
- **Clean + safe topology:** branded `notationhero.com` / `api.notationhero.com` everywhere the user looks; the raw Lambda URL is hidden and OAC-locked; same-origin render path (no CORS); WAF/rate-limit attachable.
- **Portability:** the Next.js→OpenNext migration is a $0-commercial escape from Vercel Pro and a demonstrable cloud-migration skill.

---

## Consequences

**Positive:** Next.js App Router + PWA + a genuine SSR/caching showcase; a real NestJS-on-Lambda backend behind a branded, hidden API; ~$0; keeps the hexagon, oRPC, Neon/DynamoDB, and Cognito.

**Negative / watch-outs:**

- **Vercel Hobby is non-commercial** — ads, affiliate links, a paid app, even a donations button → Pro ($20/mo). Mitigation: migrate to OpenNext-on-AWS ($0 even commercial).
- **New AWS account closes at 6 months** (2025 model: $100–200 credits + 6-month plan) unless upgraded to the **Paid plan** — after which always-free services stay $0. Action: month-5 reminder + keep the zero-spend budget + billing alarms (Paid has no built-in cap).
- **Three vendors** (Vercel + AWS + Cloudflare) — more surface, but each stays $0.
- **Cognito login** briefly shows an AWS URL until branded with a free custom auth domain (`auth.notationhero.com`).

---

## Open question

- **v1 offline scope** — whether the Dexie/offline layer (Plane 2: outbox + sync + blob queue) lands in v1 or a later milestone. **Deferred to v1 planning.** The two-plane design (Plane 1 online now, Plane 2 offline later) is unchanged either way; only the sequencing is open.

---

## Alternatives considered

- **Vite + TanStack SPA (`ARCH-FE-1`)** — no Next.js credential; superseded by the résumé driver + the Vercel-hosting option that removes the old $0 objection.
- **Next.js on AWS via OpenNext _now_** — max AWS-learning + $0-commercial, but the OpenNext↔Next version-pinning + infra complexity; adopted as the _later_ migration, not v1.
- **AWS Amplify Hosting** — managed + cheap, but abstracts the AWS wiring (rejected, consistent with the Cognito-over-Amplify decision) and can lag Next.js versions.
- **All-Vercel BFF** (every call through Vercel) — spends Vercel compute for no SEO benefit on client calls; rejected in favour of the CloudFront-direct client path.
- **Raw Lambda Function URL to the browser** — exposes the AWS URL + needs CORS; rejected for the CloudFront/OAC path.
- **S3 for blobs** — pennies, AWS-native; the new-account model + the cost priority favoured R2 ($0-forever).

---

## Enforcement / follow-up

- Add a `decision-registry.md` change-log row.
- Update the `notation_hero_no_nextjs` project memory — it currently records Next.js as rejected (now reversed).
- No machine enforcement (framework choice is prose-grade); the hexagon boundaries already guard `core` / `adapters` from the FE.
- Month-5 AWS "flip to Paid" reminder; keep the zero-spend budget + billing alarms.
- v1 scope/plan (incl. the offline decision) tracked separately.
