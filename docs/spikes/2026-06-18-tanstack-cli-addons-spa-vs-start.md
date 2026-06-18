# Spike: TanStack CLI add-ons — stay SPA vs adopt TanStack Start (SSR)?

- **Date:** 2026-06-18
- **Verdict:** **STAY on the Vite SPA**; adopt the wanted tools via each tool's **own init** (not the TanStack bundled generator).
- **Method:** read `@tanstack/cli` 0.69.3 source + official docs + AWS/Sentry docs + adversarial verification. No training assumptions.
- **Decision owner:** Leo — confirmed "Stay SPA, own inits" (2026-06-18).

---

## The finding that reframes it

The "let the generator pre-wire everything" benefit **does not exist on a router-only SPA**. In `@tanstack/cli` 0.69.3, `--router-only` **drops all `--add-ons` by design** (source: `command-line.ts` — *"Ignoring --add-ons in router-only compatibility mode"*; matches our Phase 0 observation). The bundled generator pipeline only comes with **TanStack Start (SSR)**.

But **all ten tools have plain-Vite-SPA paths**, and three have their *own* one-command CLIs (Storybook, Shadcn, Sentry) — so "pipeline pre-wired" still holds, sourced per-tool.

## SPA vs Start

| | Stay SPA (own inits) | Adopt TanStack Start (SSR) |
|---|---|---|
| Locked no-SSR/$0 decision | ✅ intact | ❌ reversed (SSR) or ⚠️ kept only in buggy SPA-mode |
| The 10 tools | ✅ all available | ✅ all available |
| AWS cost | $0 static (S3+CloudFront) | per-request Lambda + API GW (free tier expires 12mo) + cold starts |
| Migration | none | TanStack Router→Start rewrite + prerender bug ([router#4798](https://github.com/TanStack/router/issues/4798)) |

**Decisive trade-off:** the value is "one generator wires everything" — but that pipeline isn't available on the SPA at all; it only comes with Start, which costs either the $0 lock or a migration+bug. Per-tool inits deliver the same wired outcome on the SPA at low effort. → **Stay SPA.** Flip only if you later want SSR for *other* reasons (SEO), a separate decision.

## Per-tool adoption plan (all on the SPA, verified 2026-06-18)

| Tool | Effort | SPA path |
|---|---|---|
| Query | done | already wired |
| Storybook | low | `npm create storybook@latest` → `@storybook/react-vite` |
| Shadcn | low | `pnpm dlx shadcn@latest init -t vite` → theme with teal tokens (**adopted as base layer** per Leo) |
| Sentry | med | `@sentry/react` (errors+tracing+replay) + `@sentry/vite-plugin` sourcemaps. **Not** `@sentry/tanstackstart-react` |
| React Compiler | med | vite.config: `babel({ presets: [reactCompilerPreset()] })` via `@rolldown/plugin-babel` (Vite 8 / plugin-react v6 — **not** the legacy one-liner) |
| T3Env | low | `@t3-oss/env-core` `createEnv()` with `clientPrefix:'VITE_'` (pin — pre-1.0) |
| Table | low | `@tanstack/react-table` headless hook |
| Form | low | `@tanstack/react-form` |
| Store | low | `@tanstack/react-store` (pin — pre-1.0) |
| oRPC (client) | med | `@orpc/client` + `@orpc/tanstack-query` only; needs a shared **contract type** from the NestJS server |

## Why Sentry says "requires Start"

The TanStack **Sentry add-on** wires *server-side* instrumentation (`instrument.server.mjs`, `@sentry/tanstackstart-react`) — only meaningful with a server (Start). On a pure SPA there's no server, so it's Start-gated. **Sentry-the-product** works on the SPA via `@sentry/react` (browser SDK) — errors + performance tracing + session replay, all client-side. Verified CONFIRMED (sentry.io SPA/Vite guide).

## Notes

- `tanstack add <addon>` (add-to-existing) needs a `.cta.json` (we removed ours) — unreliable; use each tool's own init.
- Add-on modes: Sentry/oRPC/Storybook are file-router-only ("requires Start"); the rest work in both modes.
- This is a large client-only change → its own work item; `client/` exists only on PR #50 today (precondition).
