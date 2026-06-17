# Spike — React SPA stack (Vite + TanStack + Capacitor) — 2026-06-17

> **Feeds:** `ARCH-FE-1`, `ARCH-MOBILE-1`.
> ⚠️ **Two parts of this early research were SUPERSEDED by dedicated spikes:** the **typed contract** (this said ts-rest → now **oRPC**, see `2026-06-17-typed-contract-orpc.md`) and the **offline store** (this said RxDB → now **plain Dexie**, see `2026-06-17-offline-first-sync.md` + `../decisions/2026-06-17-offline-first-reviewed.md`).

## Recommended stack (versions verified 2026-06-17)
| Layer | Pick | Version |
|---|---|---|
| Build | **Vite** | 8.0.16 |
| Router | **TanStack Router** (SPA, client-only) | 1.170.16 |
| Server state | **TanStack Query** | 5.101.0 |
| Offline store | ~~RxDB~~ → **plain Dexie** *(superseded; see offline spike)* | dexie 4.4.4 |
| Typed API | ~~ts-rest~~ → **oRPC** *(superseded; see contract spike)* | @orpc/* 1.14.x |
| Tests | **Vitest** + **Playwright** | 4.1.9 / 1.61.0 |
| Lint | **ESLint flat** + **typescript-eslint** strict-type-checked | 10.5.0 / 8.61.1 |
| Hooks | **lefthook** | 2.1.9 |
| Mobile | **Capacitor** (plain, no Ionic) | 8.4.0 |

Scaffold: `npx @tanstack/cli create --router-only` (the old `create-tsrouter-app` is deprecated).

## Decisions
- **TanStack Router over React Router v7** — typed routes + typed search params (good for `/play?songId=&difficulty=&speed=`), same ecosystem as Query/oRPC. *Closest call of the session;* RR v7 (data mode) is the legitimate "use-what-I-know, focus-on-AWS" alternative.
- **Capacitor plain, NOT Ionic** — Ionic's value is its mobile UI kit; a rhythm game is a custom canvas/low-latency-audio surface, so Ionic's components are dead weight and its page lifecycle can fight the game loop. Capacitor still gives all native device APIs via plugins.
- **Offline (superseded):** original lean RxDB-over-Legend-State (Legend-State sync still `@beta` after ~2 yrs); later revised to **plain Dexie** under the insert-only design — see the offline-first spike.
- **Quality gates:** TS `strict` + `noUncheckedIndexedAccess`; ESLint flat `strictTypeChecked` + `projectService`; Vitest + coverage threshold; Playwright e2e; lefthook pre-commit (`--max-warnings=0`) + CI as the un-skippable wall.

## 2025–2026 flags
`create-tsrouter-app` deprecated → `@tanstack/cli`; React Router v7 three-mode model (declarative/data/framework); ESLint 10 = flat-config only; Vitest 4 / Playwright 1.61 / Vite 8 / Capacitor 8 current.

## Sources
[TanStack Router](https://tanstack.com/router/v1/docs/framework/react/quick-start) · [vs React Router (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/tanstack-router-vs-react-router/) · [React Router modes](https://reactrouter.com/start/modes) · [Ionic+Vite+Capacitor](https://ionic.io/blog/the-magic-of-vite-and-native-in-2024-a-brief-overview) · npm registry (versions) queried 2026-06-17.
