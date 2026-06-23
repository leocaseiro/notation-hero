# Spike — SPA token storage (in-memory) + silent renew + CSP

> **Status:** forward-reference for the M1 auth plan. v1 uses the same pattern for the single admin gate.
> **Source:** NH-194 expert review (findings SEC-1, SEC-2). Supports ARCH-SEC-1, ARCH-SEC-2, ARCH-AUTH-1.
> **Companion:** `docs/spikes/2026-06-17-cognito-google-federation.md`

## Question

ARCH-SEC-1 requires the access and ID tokens to live in memory only (a module-scoped
variable), never in `localStorage` or `sessionStorage`, because any same-origin script
can read both of those during an XSS attack. How do we implement that with
`oidc-client-ts`, and how does it interact with token renewal and the
Content-Security-Policy?

## Findings

1. **The `oidc-client-ts` default is `sessionStorage`.** Its `UserManager` keeps the
   user object (which contains the tokens) in a `WebStorageStateStore` backed by
   `window.sessionStorage` by default. To satisfy ARCH-SEC-1 we must pass an in-memory
   store explicitly:
   - `userStore`: a `WebStorageStateStore` backed by a plain in-memory object, not `window.sessionStorage`.
   - `stateStore`: the same, for the temporary login/redirect state.
   A small object that implements the `Storage` interface (`getItem` / `setItem` /
   `removeItem` over a JS `Map` or object) is sufficient.

2. **A page refresh clears the in-memory tokens.** This is expected. Recovery does not
   read stored tokens; it uses one of:
   - **Silent renew** — a hidden iframe navigates to the Cognito `/authorize` endpoint;
     if the Cognito session cookie is still valid, it returns a fresh token without a
     visible login. `oidc-client-ts` supports this via `automaticSilentRenew` plus a
     silent-redirect route.
   - **The Cognito refresh token** — held by the Cognito managed-login session, with
     rotation enabled (ARCH-AUTH-1).

3. **CSP interaction (this is finding SEC-2).** The silent-renew iframe navigates to
   Cognito, so the CSP must allow the Cognito Hosted-UI domain in `frame-src` (already
   listed in ARCH-SEC-2). Logout must also reach the Cognito `/logout` endpoint
   (`form-action`). Test the full login → silent-renew → logout cycle under
   `Content-Security-Policy-Report-Only` before enforcing.

4. **Capacitor native build.** The WebView loads from `capacitor://localhost`, so the
   CloudFront response header does not apply; the mirrored `<meta>` CSP must allow the
   same Cognito `frame-src`. In-memory storage behaves the same inside the WebView.

## Recommendation (for the M1 auth plan)

- Configure `oidc-client-ts` with an in-memory `userStore` and `stateStore`.
- Enable `automaticSilentRenew`; provide a silent-redirect route.
- Keep the access-token lifetime short (60 minutes) with refresh-token rotation on.
- **CI guard (finding SEC-1):** a build check that fails if `localStorage` or
  `sessionStorage` appears in any OIDC/auth configuration file, so the default is never
  reintroduced.
- Roll the CSP out as Report-Only first; confirm silent-renew and logout work; then enforce.

## Open

- Confirm the exact in-memory `WebStorageStateStore` recipe against the installed
  `oidc-client-ts` version at implementation time (the API is stable, but verify).
- Decide whether the Capacitor build also needs a native secure-storage path for the
  refresh token — deferred with the rest of the offline/native work to M1.
