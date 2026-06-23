# ADR — Front-end framework: Next.js (one source → SSR web + static Capacitor)

- **Status:** ✅ Accepted (ratified by leocaseiro, 2026-06-16). Implementation tracked in **NH-185**; not yet executed.
- **Date:** 2026-06-16
- **Driver / Approver:** leocaseiro
- **Ticket:** [NH-185](https://leocaseiro.atlassian.net/browse/NH-185) (Story under Epic [NH-177](https://leocaseiro.atlassian.net/browse/NH-177) "Catalog/CMS & Infra")
- **Evidence:**
  - Spike — [docs/spikes/2026-06-16-fe-framework-nextjs.md](../spikes/2026-06-16-fe-framework-nextjs.md) (options, 2026 free-tier figures, hexagon fit, router)
  - `/ce-sessions` synthesis 2026-06-16 — prior 2026-06-02 decision + the "I am happy with that" acceptance
- **Scope:** the **FE framework** and its build/deploy targets. Does **not** reopen the hexagon, pnpm+Nx, Capacitor, Pulumi, or S3+CloudFront — all kept.
- **Supersedes:** the FE-framework clause of the 2026-06-02 stack-pick ("Vite + React; Next.js rejected"). Capacitor / PWA / AWS / Pulumi unchanged.

---

## Context

On 2026-06-02 the stack-pick chose **Capacitor + Vite + React 19** and **rejected Next.js** for conflicting with Capacitor (leocaseiro: _"I am happy with that. No discussions on Next.js with Capacitor."_). The job-hunt driver later made a **Next.js** credential — and specifically a **SSR + React-hydration** showcase — worth revisiting.

`/ce-sessions` confirmed the prior rejection was of **SSR Next.js**. **Static-export Next.js + a one-source/two-targets build was never evaluated.** That gap is what this ADR closes: it satisfies the driver without breaking the Capacitor / offline / S3+CloudFront / Pulumi stack.

---

## Decision

Adopt **Next.js (App Router)** as a **single front-end source** (`apps/notation-hero`) built to **two targets**:

1. **Web → SSR** via **OpenNext → Lambda + CloudFront**, provisioned in **Pulumi**, on AWS free-tier. Server-render + hydration → SEO + the portfolio showcase.
2. **iOS / Android → static-export** (`output:'export'`) → **Capacitor** native shell. No server; offline-capable.

Build the **catalog routes first** (SSR is most valuable there). Player routes migrate into the same app from the fork over time. **No Amplify.** **Not a micro-frontend; not two apps.**

---

## Rationale

- **Capacitor ⇒ static build** (no server runtime in a WebView). SSR is therefore a **web-only** enhancement; the native build is static-export. (`F-1`)
- **`output` is a build-time switch**, not a runtime toggle. One source, two `next build` modes via `BUILD_TARGET`. (`F-2`)
- **OpenNext keeps Pulumi + AWS depth**; **Amplify** has a free SSR tier but provisions its own infra (outside Pulumi) and hides the IAM/CloudFront/Lambda wiring that is the job-hunt goal → **rejected**. (`F-3`)
- **Free-tier holds** — always-free Lambda (1M req) + CloudFront (1 TB) cover both targets at ~$0. (`F-4`)
- **Hexagon-safe** — FE is one `app`; `core`/`adapters` untouched (machine-enforced; `FOLD-hex` locked). (`F-5`)

---

## Consequences

**Positive:** Next.js + App Router + a genuine SSR/hydration portfolio piece; ~$0; keeps Pulumi (single IaC), Capacitor, PWA, S3+CloudFront, and the hexagon.

**Negative / costs:**
- Pages shipping in the **static (iOS) build must render client-side**; `isCapacitor()` selects the data path, SSR is the web bonus. No server-actions in shared pages.
- Capacitor routing config (`basePath`/`trailingSlash`) for the `capacitor://localhost` scheme.
- **Next.js ↔ OpenNext** version pinning required (Next 16 in 2026 — verify adapter support before wiring).

---

## Alternatives considered

- **Vite + React + HashRouter** — cleanest Capacitor fit, but no "Next.js" keyword → rejected (driver).
- **Amplify SSR hosting** — free-tier but sidelines Pulumi + hides AWS depth → rejected.
- **Two separate apps** (player static + catalog SSR) — deferred; additive later if SEO page-load needs a game-bundle-free site (route-splitting likely makes it unnecessary).
- **Keep the 2026-06-02 rejection** — superseded: it never evaluated static-export + one-source.

---

## Enforcement / follow-up

- **No machine enforcement** (framework choice is prose-grade). Hexagon boundaries already guard `core`/`adapters` from the FE.
- Implementation tracked in **NH-185** (scaffold `apps/notation-hero`, conditional `output`, first catalog route, OpenNext+Pulumi deploy).
- `decision-registry.md` change-log row added 2026-06-16.
