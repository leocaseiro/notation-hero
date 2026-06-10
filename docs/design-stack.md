# NotationHero — Tech Stack

This file holds the **implementation-only** picks. Strategic positioning, competitive analysis, the "why this product" thesis, and any internal reference materials live in private storage:

- Linear Document (canonical) under the [Notation Hero project](https://linear.app/leocaseiro/project/notation-hero-db465058e201)
- Local agent context: `docs/.private/design-stack-strategic.md` (gitignored; mirrors the Linear doc)

## Stack picks

| Layer | Choice |
|---|---|
| Notation rendering | [AlphaTab](https://www.alphatab.net/) — TypeScript, MusicXML + Guitar Pro support; no MIDI yet (track upstream) |
| Cross-platform shell | [Capacitor](https://capacitorjs.com/) — single JS/TS codebase ships as iOS app, Android app, and web PWA |
| Web target | PWA (browser-installable, offline-capable) |
| App-store distribution | iOS App Store + Google Play via Capacitor builds; PWA on the open web |
| Backend | AWS (Lambda + DynamoDB + Cognito + S3 + CloudFront) — see [`aws-learning-map.md`](./aws-learning-map.md) |
| Monorepo + tooling | pnpm + Nx; full stack in [`docs/decisions/2026-06-09-tooling-stack-daci.md`](./decisions/2026-06-09-tooling-stack-daci.md) |

## Cross-references

- Tooling-stack DACI (pnpm, Nx, ESLint flat, project refs, isolatedDeclarations, Vitest, Stryker, DangerJS, AGENTS.md, Lefthook, observability, etc.): [`docs/decisions/2026-06-09-tooling-stack-daci.md`](./decisions/2026-06-09-tooling-stack-daci.md)
- AWS learning map (service → feature-vehicle mapping): [`aws-learning-map.md`](./aws-learning-map.md)
- CI/CD pipeline plan: [`cicd-pipeline.md`](./cicd-pipeline.md)
- Feature freeze (locked v1 scope): [`feature-freeze.md`](./feature-freeze.md)
- Player-app UI design + key-screen mockups: [`player-app-ui.md`](./player-app-ui.md)
- Song schema (shared contract): [`song-schema.md`](./song-schema.md)
