# Spike: Admin/user auth — AWS Amplify vs Pulumi-managed Cognito

> **Status:** ✅ Resolved · **Date:** 2026-06-16 · **Owner:** leocaseiro
> **Context:** catalogue-CRUD plan ([docs/plans/2026-06-16-001-feat-catalogue-crud-nestjs-plan.md](../plans/2026-06-16-001-feat-catalogue-crud-nestjs-plan.md)), review finding **F14** · PR #47
> **Method:** `ce-web-researcher` agent, current (2025–2026) primary sources, cited below.

## Question

For a $0-sensitive solo builder: what's the lowest-complexity way to add **real** admin auth (and later user auth) to a NestJS Lambda API (behind a Lambda Function URL) whose infra is otherwise **Pulumi** — given the plan originally used a shared-password header and deferred Cognito to "milestone M3"? Options weighed: shared-password header, opaque cookie, signed JWT-in-cookie, **AWS Amplify**, **PKCE + Cognito**.

## Decision

**Provision Amazon Cognito directly in Pulumi** — User Pool + App Client (PKCE) + Hosted UI domain — verify access tokens in the Nest guard with **`aws-jwt-verify`**; FE uses **Authorization Code + PKCE** against the Hosted UI. **No Amplify toolchain.** This replaces the shared-password gate (plan decision D7) and pulls auth into the catalogue plan (Tasks 2.0/2.1, `infra/cognito.stack.ts`).

## Why (key findings)

1. **Amplify Auth *is* Cognito.** Amplify Gen 2 `defineAuth` provisions a Cognito User Pool (+ Identity Pool). *"Use Amplify now, migrate to Cognito later"* is a category error — you are on Cognito from day one. The only thing that could "migrate" is the **provisioning layer** (Amplify CDK/CloudFormation → Pulumi) — i.e. work you'd do now and then undo. The User Pool, users, tokens, and JWKS endpoint persist; there is no data migration.
2. **Cognito is $0 forever at this scale.** The **10,000 MAU** free allowance (Lite / Essentials tiers) is **always-free, not time-limited** ("does not automatically expire… available indefinitely"). One admin ⇒ $0, no cliff. The **"6-month free-tier bomb"** applies to **Amplify *Hosting*** + the July-2025 $200/6-month credit plan for new accounts — **not** to Cognito auth.
3. **Pulumi manages Cognito first-class** — `aws.cognito.UserPool` / `UserPoolClient` (PKCE: `allowedOauthFlows: ['code']`, `allowedOauthFlowsUserPoolClient: true`) / `UserPoolDomain` / `ResourceServer` (~80 lines TS). Strictly cleaner than Amplify for a Pulumi shop: single stack, no parallel CloudFormation, no Amplify service-role sprawl, no drift between Amplify-console edits and code.
4. **JWT verification** uses **`aws-jwt-verify`** (AWS Labs, 0 runtime deps): construct `CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId })` at **module scope** so the JWKS cache survives warm Lambda invocations; `await verifier.verify(token)` in the Nest guard's `canActivate` (throws → 401). Auto-handles JWKS fetch + key rotation. Optional higher-level wrapper: `@nestjs-cognito/auth`.
5. **SPA flow** = Authorization Code + **PKCE** against the Cognito Hosted UI → exchange the code at `/oauth2/token` → send `access_token` as a `Bearer` header to the Lambda API. Works with any SPA framework; **no `@aws-amplify/auth` dependency required** (plain Hosted UI redirect + `amazon-cognito-identity-js` or raw `fetch`).

## Alternatives rejected

- **Amplify-managed Cognito** — adds a **second IaC** (Amplify CDK/CFN) alongside the *locked* Pulumi IaC (drift risk + the provisioning you'd later undo); Amplify Hosting's free tier is time-limited/credit-bound.
- **Interim JWT-cookie / opaque cookie** — throwaway work; replaced by Cognito anyway.
- **Shared-password header** (original plan) — XSS-readable credential; rejected by owner as too weak for alpha.

## Unverified / to confirm

- **Amplify Hosting free-tier permanence** (always-free vs 12-month vs credit-bound) — could not be resolved from a single current primary AWS source; treat as time-limited. *(Does not affect the Cognito decision — Cognito MAUs are billed separately and always-free.)*
- **`@nestjs-cognito/auth`** last-publish / NestJS 11 compatibility — not checked (the lower-level `aws-jwt-verify` path is the recommendation regardless).
- **`nodejs24.x` runtime availability in `ap-southeast-2`** — verify at implementation (catalogue plan F4b).

## Sources

- [AWS Amplify Auth Concepts](https://docs.amplify.aws/react/build-a-backend/auth/concepts/) · [Use existing Cognito resources](https://docs.amplify.aws/react/build-a-backend/auth/use-existing-cognito-resources/)
- [Amazon Cognito Pricing](https://aws.amazon.com/cognito/pricing/)
- [AWS Free Tier — July 2025 $200/6-month plan announcement](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/) · [Billing docs — pre-July-2025 accounts](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-free-tier.html) · [Amplify Pricing](https://aws.amazon.com/amplify/pricing/)
- Pulumi: [aws.cognito.UserPool](https://www.pulumi.com/registry/packages/aws/api-docs/cognito/userpool/) · [UserPoolClient](https://www.pulumi.com/registry/packages/aws/api-docs/cognito/userpoolclient/) · [UserPoolDomain](https://www.pulumi.com/registry/packages/aws/api-docs/cognito/userpooldomain/)
- [`aws-jwt-verify` (AWS Labs)](https://github.com/awslabs/aws-jwt-verify) · [NestJS + Cognito guard (Bright Inventions)](https://brightinventions.pl/blog/using-cognito-with-nest-js/) · [`@nestjs-cognito/auth`](https://www.npmjs.com/package/@nestjs-cognito/auth)
