# Spike — Google sign-in → Cognito Hosted UI → Pulumi — 2026-06-17

> **Feeds:** `ARCH-AUTH-1` (Cognito + Google federation v1). Cognito User Pool (Essentials, managed-login) + PKCE App Client + Hosted-UI domain + Google IdP, all in Pulumi; verify with `aws-jwt-verify`. No Amplify. **Google-only sign-in for v1.**

## Load-bearing answers
- **Personal-Gmail admin & consent screen:** `openid email profile` are **non-sensitive** → **no Google verification ever**; keep the app in **Testing** with yourself as a test user.
- **Managed login vs classic Hosted UI [2025 change]:** "managed login" (Nov 2024) is the new branding; classic = "first-generation". Both broker Google. Set `managedLoginVersion` 1 (classic) or 2 (managed) on the domain. **Recommend 2 + Essentials.**
- **`tokenUse` for authz:** **`access`** (carries `cognito:groups` + scopes); id token only for profile display.
- **Group claim for federated users:** NOT automatic — `AdminAddUserToGroup` once; then `cognito:groups` appears in both tokens. No Pre-Token-Generation Lambda needed.
- **Duplicate-user pitfall:** real — a Google user + native user with the same email = two `sub`s unless linked. **v1-safe: go Google-only** (don't enable native sign-up) → pitfall cannot occur.
- **Cost:** **$0** — social Google counts in the **10k-MAU** Essentials/Lite free tier (NOT the 50-MAU SAML/OIDC bucket). Google OAuth is free.

## Build order
1. **Google Cloud (Google Auth Platform):** External audience, Testing, add yourself as test user; scopes `openid email profile`; create **Web application** OAuth client; **authorized redirect URI = `https://<domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`** (Cognito's endpoint, not the SPA's). Copy client id + secret.
2. **Pulumi:** `aws.cognito.UserPool` (Essentials), `IdentityProvider` (providerType `Google`, `authorize_scopes='openid email profile'`, attribute map email/username→sub), `UserPoolClient` (`generateSecret:false`, `allowedOauthFlows:['code']` PKCE, `supportedIdentityProviders:['Google','COGNITO']` — or `['Google']` for v1, callback/logout URLs), `UserPoolDomain` (`managedLoginVersion:2`), `UserGroup` `admin`. Google secret read from **SSM SecureString** via `aws.ssm.getParameter({withDecryption:true})` + `pulumi.secret(...)`. `dependsOn:[google]` on the client.
3. **SPA:** `oidc-client-ts` / `react-oidc-context` → Cognito issuer; code+PKCE; `/oauth2/token` (no secret); `Authorization: Bearer <access>`.
4. **Nest guard:** `CognitoJwtVerifier.create({userPoolId, tokenUse:'access', clientId})` at module scope; check `cognito:groups` includes `admin`.
5. **Admin group:** `aws cognito-idp admin-add-user-to-group` once (federated username is `Google_<sub>`).

## Gotchas
- **G1 linking:** Google-only avoids it; when native/2nd IdP arrives, add a Pre-SignUp `AdminLinkProviderForUser` (social → `ProviderAttributeName:'Cognito_Subject'`), only on **verified** email (account-takeover risk otherwise).
- **G3 username** is `Google_<sub>`, not the email — filter by email when scripting.
- **G4 managed-login** v2 = branding editor (Essentials+); switching versions invalidates sessions (~4 min propagate).
- **G5 logout** must go through the `/logout` endpoint (the 1-hour managed-login session cookie isn't cleared by dropping local tokens).
- **G6 refresh-token rotation** ON (best practice for SPAs) → old `REFRESH_TOKEN_AUTH` flow unavailable; refresh via `/oauth2/token grant_type=refresh_token`. Google's 7-day test-user limit doesn't bite (you hold *Cognito* refresh tokens, 30 days).
- **G7** social federation requires a **domain** (managed-login service); can't sign in federated users via `InitiateAuth`.

## Sources
[Cognito managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html) · [social IdP](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html) · [linking](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html) · [refresh tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html) · [groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html) · [aws-jwt-verify](https://github.com/awslabs/aws-jwt-verify) · [pricing](https://aws.amazon.com/cognito/pricing/) · [Pulumi IdentityProvider](https://www.pulumi.com/registry/packages/aws/api-docs/cognito/identityprovider/) · queried 2026-06-17.
