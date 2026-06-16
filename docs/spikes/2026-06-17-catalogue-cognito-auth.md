# Spike — Catalogue admin/user auth via AWS Cognito

> **Status:** 🔬 SPIKE — open design questions, not yet decided. Surfaced by the 2026-06-16 `ce-doc-review` of the Catalogue CRUD plan; the plan records the *decision* (auth = Cognito) and defers the *design* here.
> **Decision being designed:** writes (`POST/PUT/DELETE`) + admin-read on the catalogue API are gated by **AWS Cognito** (user pool, admin group) — the real auth from day one, **no interim admin shortcut**. The same pool enables end-user auth later.
> **Owner:** leocaseiro · **Date:** 2026-06-17 · **Tickets:** NH-177 (K-3 API) / NH-122 (K-2 CMS)

---

## Why Cognito (decision context)

- **Real auth, not a hack.** Cognito is the auth from the start — standard token auth, **no interim admin shortcut** — and the *same* user pool gives end-user accounts later ("user auth soon").
- **$0, perpetual.** Cognito user pools are free for the first **50,000 MAUs** — perpetual, not a 6-month promo. **No "free-tier bomb," no Amplify, no migration step** (this supersedes the earlier "Amplify for 6 months then migrate to Cognito" idea).
- **Pulumi-native.** A Cognito user pool is a first-class resource (`aws.cognito.UserPool`), so it lands in `infra/` alongside the Lambda — keeping **Pulumi the single IaC**. This resolves the NH-185 "no Amplify, Pulumi single IaC" decision cleanly: we are NOT using Amplify (hosting or IaC), only Cognito-the-service via Pulumi.

## Open design questions

1. **Where is the JWT verified?** The catalogue API is a Fastify Lambdalith behind an open Function URL (`AuthType: NONE`).
   - **(a) In-Lambda JWT verify [leading].** A Fastify `preHandler` verifies the `Authorization: Bearer` token against the pool's **cached JWKS** and checks the `cognito:groups` claim for `admin`. $0, no API Gateway, fits the open-URL design. Library: `aws-jwt-verify` (AWS-maintained).
   - **(b) API Gateway + Cognito authorizer.** Moves auth to the edge but adds API Gateway in front of the Function URL — extra infra + cost, and contradicts the plan's "Function URL, no API Gateway" decision. Rejected unless (a) proves insufficient.
2. **Admin vs end-user shape.** v1 only needs the **admin** group (gates writes + admin-read). End-user accounts come later but should share the pool. Decide the group/claim shape now so it doesn't churn: e.g. one pool, an `admin` group, regular users ungrouped.
3. **FE token flow.** FE is Next.js (NH-185). How does the admin obtain a token — Cognito Hosted UI, the Amplify *Auth SDK client* (fine to use the client SDK even though we don't use Amplify hosting/IaC), or a direct `InitiateAuth`? This is an FE-session decision; the API only verifies the resulting JWT.
4. **Public reads stay anonymous.** Only writes + admin-read need a token; `GET /catalogue` (published) stays open. Confirm the `preHandler` is scoped to the write/admin routes only.
5. **Local dev / tests.** `app.inject()` tests can't mint real Cognito tokens. Plan: a `verifyToken` seam (port) so tests inject a fake admin/non-admin verifier; the real impl uses `aws-jwt-verify`.
6. **Provisioning.** User pool + app client + `admin` group in `infra/` (Pulumi); outputs (pool id, client id) flow to the Lambda env as **non-secret** config. JWT *verification* needs no secret (public-key/JWKS).

## Proposed spike scope (validate before Phase C+U)

- Provision a Cognito user pool + `admin` group + app client in `infra/` (Pulumi), `dev` stack.
- Prototype `cognito-auth.service.ts` (`preHandler`) with `aws-jwt-verify` + the `verifyToken` seam.
- Prove an `inject()` test: no token → 401, non-admin → 403, admin → 200.
- Confirm $0 on the free tier + that it composes with the open Function URL (no API Gateway).

## Impact on the plan (once resolved)

- **Phase R unaffected** (public reads stay open).
- **Phase C+U Task CU.4 Step 0** (`cognito-auth.service.ts` preHandler) implements the chosen verify path.
- **`infra/index.ts`** gains the Cognito resources; the catalogue Lambda env gains `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` (non-secret).

## Out of scope

- End-user features (saved progress, social login) — same pool, later.
- The FE token-acquisition UI — FE session.
