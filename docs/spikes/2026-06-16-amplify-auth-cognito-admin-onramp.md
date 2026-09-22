# Spike — Amplify Auth vs raw Cognito-in-Pulumi for the admin gate

> ⛔ **Partially stale (FE/BE asides).** The Cognito / admin-gate analysis stands, but the asides are outdated: **FE = Vite SPA** (Next.js dropped) and **BE = NestJS** (locked). See `../decisions/2026-06-17-architecture-decisions.md`.

> **Status:** evidence + recommendation. **Decisions marked `🟦 DECIDE` are leocaseiro's to make — nothing here changes infra or tickets until approved.**
> **Date:** 2026-06-16 · **Worktree:** `nh-193-admin-auth-spike` (off `master` 90f9ea1) · **Jira:** [NH-193](https://leocaseiro.atlassian.net/browse/NH-193)
> **Trigger:** 2026-06-16 conversation — a `ce-sessions` recall of _why we picked Cognito over Amplify_ → _"could I use AWS Amplify Auth temporarily for the admin only, since it's easy to set up?"_
> **Locked (not reopened):** Cognito **is** the auth service ([NH-45](https://leocaseiro.atlassian.net/browse/NH-45) / NH-185); **no Amplify Hosting** (NH-185); the AWS-learning + Pulumi-ownership goals ([[notation-hero-job-hunt-context]]).
> **Companions:** [fe-framework-nextjs spike](./2026-06-16-fe-framework-nextjs.md) · the auth decision lives in `notation_hero_auth_cognito_not_amplify` (memory).

---

## 0. TL;DR — decision-ready

1. **"AWS Amplify Auth" is not a separate service — it _is_ Amazon Cognito.** Amplify Auth = (a) a one-command way to _provision_ a Cognito User Pool (`defineAuth`, CloudFormation under the hood) + (b) the `aws-amplify` client library that wraps the Cognito API. The tokens are ordinary Cognito JWTs. So the real question is **not "Amplify vs Cognito"** — it's **"how do I provision and talk to the Cognito pool?"**

2. **Cost is a non-issue.** Cognito's free tier is **10,000 monthly-active-users, always-free** (does _not_ expire after 12 months). The admin tool has ~1–5 users → **$0/month, forever**, and it sits _outside_ the account's $200-credit / 12-month window. Amplify adds **no** separate auth bill (only Amplify _Hosting_ bills separately — already rejected).

3. **Day 1 you already get the full flow.** Cognito **Hosted UI** ships sign-up, sign-in, sign-out, password reset/recovery, email/phone verification and MFA as AWS-hosted pages — **zero front-end auth code** — whether the pool is made by Amplify or Pulumi. _(Social/third-party sign-in is supported too, but each provider is a ~15–30 min per-provider setup — not free day-1; see §2.)_

4. **Effort for the admin gate ≈ ½–1 day** end-to-end, dominated by front-end callback wiring + the Lambda token check — **not** the ~1-week M1 _user_ auth scope ([NH-45](https://leocaseiro.atlassian.net/browse/NH-45)). See §7.

5. **🟦 DECIDE — provisioning path.** Recommendation: **B — Cognito in Pulumi + Hosted UI** (stays in IaC, _is_ the learning, no migration debt). **A — Amplify `defineAuth`** is a legit _momentum shortcut_ but adds a parallel CloudFormation stack + a later `pulumi import`. **C — console click-ops** = worst fit. See §6.

6. **🟦 DECIDE — now vs defer.** (The Lambda guard uses `aws-jwt-verify` on whichever back-end framework lands — leo is handling the Fastify-vs-NestJS call separately; not a blocker tracked here. §9.)

---

## 1. The reframe — "Amplify Auth" is just Cognito

`amplify add auth` (Gen 1) / `defineAuth` (Gen 2) **provisions an Amazon Cognito User Pool**. The `aws-amplify` npm package is a friendly wrapper over the same Cognito API you could hit with `amazon-cognito-identity-js`, the AWS SDK, or a plain OIDC client. There is **no "Amplify Auth" backend** distinct from Cognito, and **no separate Amplify auth charge** — you are billed Cognito pricing either way.

Consequence: every option below yields **the same Cognito pool issuing the same JWTs**. The only thing that changes is the _tooling_ used to create it and talk to it.

## 2. What you get on day 1 (Cognito Hosted UI)

Cognito's **Hosted UI** is an AWS-hosted set of pages at `https://<domain>.auth.<region>.amazoncognito.com/` that provides, with **zero UI code**:

- Sign-up (with email/phone verification)
- Sign-in / sign-out
- Forgot-password → reset-password recovery
- Email / phone verification
- MFA challenge prompts (if MFA enabled)
- Social-IdP buttons (only if you configure them — not needed for admin)

You redirect to it and handle the OAuth callback. This is a **Cognito** feature, not an Amplify one — so "use the built-in flow temporarily" works on any provisioning path. (The `aws-amplify` client lib will _handle the callback + token refresh for you_; without it you write ~an hour of OAuth-callback handling, or drop in a small OIDC client.)

### Social / third-party sign-in — supported, not zero-config

Hosted UI **can** show "Sign in with …" buttons, but each provider is a **one-time setup**, not a day-1 freebie:

- **Built-in social IdPs:** Google, Facebook, Login with Amazon, Sign in with Apple (+ legacy Twitter/X). Microsoft/Entra and most others via generic **OIDC** or **SAML 2.0**.
- **GitHub is the notable gap** — _not_ built-in, and GitHub isn't OIDC-compliant, so it needs a custom OIDC shim/proxy (real work). Budget for it separately if "Login with GitHub" matters.
- **Per-provider effort:** register an OAuth app on the provider side + add the IdP to the pool + map attributes (~15–30 min each). Once configured, **Hosted UI renders the buttons automatically** — still no UI code.

**For the admin gate you almost certainly don't want social at all** — email/password (or a single "Sign in with Google" restricted to your address) is plenty for ~2 internal users. **Social login is really an M1 _end-user_ concern** ([NH-45](https://leocaseiro.atlassian.net/browse/NH-45)) — wiring Google + PKCE + the Capacitor redirect is part of _why_ M1 is ~a week, not ~a day (§7).

## 3. How it wires into the stack

```
Browser SPA (S3 + CloudFront)
  └─1. login ─────────────▶ Cognito User Pool (Hosted UI)
  ◀─2. JWT (id/access/refresh)─┘
  └─3. API call + Authorization: Bearer <JWT> ─▶ Lambda (Fastify / NestJS)
                                                   └─ verifies JWT via Cognito JWKS (aws-jwt-verify)
                                                   └─4. query keyed by `sub` ─▶ Neon Postgres
```

- **Front-end (S3 + CloudFront):** unchanged hosting. Configure the Cognito pool IDs; redirect to Hosted UI; store the returned JWT. **No Amplify Hosting involved.**
- **Back-end (Lambda):** stateless verification of the JWT against Cognito's JWKS endpoint (`.../.well-known/jwks.json`) using [`aws-jwt-verify`](https://github.com/awslabs/aws-jwt-verify) (~15 lines). Identical in Fastify or NestJS.
- **Neon Postgres:** auth never touches it. Lambda extracts the verified `sub` (user id) and keys data on it. Cognito owns identity; Neon stores app data. No passwords/sessions in Postgres.

## 4. Cost — free-tier evaluation

- **Cognito free tier = 10,000 MAU/month, _always-free_** — explicitly does **not** expire after the 12-month term (new pools on the **Essentials** tier, then `$0.015`/MAU; the old 50,000-MAU tier applies only to pools active before 2024-11-22). Admin (~1–5 users) → **$0/month, forever**.
- **No separate Amplify bill.** Amplify Auth = Cognito pricing. (Amplify _Hosting_ is the thing that bills separately — not in use.)
- **Account context:** this account is on the **new (2025) AWS free-tier model** — **Paid plan**, **$200 credits valid ~12 months** (to ~2027-06), deliberately avoiding the Free plan's 6-month self-destruct. Cognito's always-free tier is **outside** that credit/clock entirely. See [[notation-hero-aws-account-setup]].

## 5. Effort — ~½–1 day (admin gate)

| Phase               | What                                                        | Effort     |
| ------------------- | ----------------------------------------------------------- | ---------- |
| 0 · Prereq          | finish `aws configure sso` (the paused CLI step)            | ~15 min    |
| 1 · Provision pool  | Pulumi resource **or** `defineAuth` + deploy (see §6)       | ~30–45 min |
| 2 · Admin users     | create 1–2 admins (console / `adminCreateUser`)             | ~5 min     |
| 3 · Front-end login | configure pool + redirect to Hosted UI (zero UI), store JWT | ~1–2 h     |
| 4 · Lambda guard    | `aws-jwt-verify` middleware; reject bad/expired             | ~1–2 h     |
| 5 · Test e2e        | login → token → 200; tampered token → 401                   | ~30–60 min |

The auth _definition_ is the genuinely-easy ~30 min; the real time is front-end callback wiring + the Lambda check + testing — a cost you pay on **any** auth solution.

## 6. The real choice — provisioning options 🟦 DECIDE

| Option                                                 | Setup speed         | Stays in Pulumi?                 | Counts as learning?  | Migration debt later     |
| ------------------------------------------------------ | ------------------- | -------------------------------- | -------------------- | ------------------------ |
| **A · Amplify tooling** (`defineAuth` + `aws-amplify`) | ⚡ fastest scaffold | ❌ parallel CloudFormation stack | ❌ abstracts Cognito | ⚠️ `pulumi import` later |
| **B · Cognito in Pulumi + Hosted UI** _(recommended)_  | 🟡 ~½ day           | ✅ yes                           | ✅ yes               | ✅ none                  |
| **C · Console click-ops + Hosted UI**                  | ⚡ fastest clicks   | ❌ drift                         | 🟡 partial           | ⚠️ `pulumi import` later |

- **A — Amplify** wins on raw scaffold speed and a batteries-included client (token refresh/storage, easy social later) — but deploys a **CloudFormation stack parallel to Pulumi**, hides the Cognito internals (skips the learning), and creates a `pulumi import` you'll do later anyway.
- **B — Cognito in Pulumi** is ~30–40 lines in the existing `infra/` (user pool + app client + hosted-UI domain). Stays 100% in IaC, **is** the hands-on Cognito+Pulumi rep, same `$0`, same Hosted UI. Costs ~30 min more thought + ~1 h wiring the OAuth callback yourself — both one-time, both the point.
- **C — console** is fastest to click but isn't IaC → drift + a later import, _without_ Amplify's client-lib upside. Worst fit for the stated goals.

**Decisive trade-off:** _"working tonight with least thinking" (A)_ vs _"stays in IaC and is the learning, ~½ day either way" (B)_. Because the admin gate is tiny, Amplify's conveniences barely pay off, while its costs land squarely on the AWS-learning + Pulumi-ownership goals.

**Recommendation:** **B**. Flip to **A** only for pure momentum this week (accept the import debt); **C** basically never.

## 7. Scope boundary — this ≠ M1 user auth (NH-45)

The ~½-day number is for the **admin gate only**. It must **not** be quoted as the M1 estimate. The ~1-week [NH-45](https://leocaseiro.atlassian.net/browse/NH-45) figure is a _different scope_, and Amplify-vs-Cognito doesn't change it:

|               | 🔑 Admin gate (this spike) | 🌍 Full M1 user auth (NH-45)                                                      |
| ------------- | -------------------------- | --------------------------------------------------------------------------------- |
| Users         | ~2 admins                  | all end-users, multi-user                                                         |
| UI            | Hosted UI, zero code       | custom account screens ([NH-138](https://leocaseiro.atlassian.net/browse/NH-138)) |
| Login methods | email + password           | + Google social (PKCE OAuth)                                                      |
| Platform      | web only                   | + Capacitor native iPad → redirect spike (F-15)                                   |
| Data          | nothing synced             | cross-device sync + anon→account merge                                            |
| Hardening     | minimal (internal)         | WAF, threat detection, JWT in Keychain                                            |
| **Estimate**  | **~½–1 day**               | **~a week**                                                                       |

The week is **native + social + sync + UI scope**, not a "Cognito tax." Amplify might trim a few hours off it but cannot delete the Capacitor-redirect spike or the sync work.

## 8. Migration / reversibility

Because every path lands on Cognito, "migrating off Amplify later" is really **moving pool ownership into Pulumi**:

- **Best — `pulumi import`** the existing pool + client → same IDs, users, tokens; front-end + Lambda code unchanged; zero downtime.
- **Or recreate** a fresh Pulumi pool + move users (CSV import / migration-trigger Lambda). Admin-only = a handful of users = recreate in ~5 min.
- ⚠️ **Landmine:** never `amplify delete` the auth resource to "switch over" — it **destroys the pool + all users**. Import or export first.

## 9. Open decisions 🟦 DECIDE

1. **Provisioning path** — **A** (Amplify shortcut) / **B** (Cognito-in-Pulumi, _recommended_) / **C** (console). §6.
2. **Now vs defer** — stand the admin gate up this week, or leave it for when the admin CMS ([NH-122](https://leocaseiro.atlassian.net/browse/NH-122)) is built. Today the K-2 admin gate is specced as **CloudFront Basic Auth**; this spike is the case for upgrading it to a Cognito Hosted-UI gate at ~the same effort.
3. **Back-end framework** — the Lambda guard (Phase 4) uses `aws-jwt-verify` regardless of Fastify vs NestJS (identical difficulty). **leo is handling the BE-framework decision separately** ([fe-framework-nextjs spike](./2026-06-16-fe-framework-nextjs.md) settled FE = Next.js) — not a blocker tracked here; the guard slots into whichever lands.

## Sources

- [Amazon Cognito pricing](https://aws.amazon.com/cognito/pricing/) (10k MAU always-free)
- [Use existing Cognito resources — Amplify Gen 2](https://docs.amplify.aws/react/build-a-backend/auth/use-existing-cognito-resources/)
- [aws-jwt-verify](https://github.com/awslabs/aws-jwt-verify)
- [Cognito social identity providers (Google/Facebook/Amazon/Apple + OIDC/SAML)](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html)
- [AWS Free Tier: $200 credits + 6-month plan (Jul 2025)](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/)

> **No ADR yet** — this is evidence + a recommendation. Promote to a `docs/decisions/` ADR (+ decision-registry row) **if/when** leo locks the admin-gate provisioning path.
