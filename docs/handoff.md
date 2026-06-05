# NotationHero — Handoff / Re-entry Doc

> **Purpose:** single source of truth for state, decisions, and paths so nothing
> is lost across the folder rename, session boundaries, or a fresh Claude session.
> **Last updated:** 2026-06-04

---

## Project identity

- **Name:** NotationHero (brand); repo + dir `notation-hero` (renamed from `drum-tutor-clone`)
- **What:** drum-practice / rhythm-game app, spiritual successor to Roland's
  discontinued DT-1 V-Drums Tutor. Wedge vs Melodics: custom song upload
  (MIDI + Guitar Pro) and Android support.
- **Domain:** being acquired (`notation-hero.*` / `notationhero.*` — TBD)
- **Stage:** pre-code. Repo currently holds docs only (`scope.md`,
  `docs/design-stack.md`, this file).

## How to resume this work later

- **This session ID:** `53466813-7343-411e-8e12-99a3ea7b6d33`
- **Transcript path (stable, survives folder rename):**
  `~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-pensive-boyd-6d17e3/53466813-7343-411e-8e12-99a3ea7b6d33.jsonl`
  - The `.jsonl` is keyed by session UUID and is **not moved or deleted** by
    renaming the folder. New sessions just log under the new path slug.
  - Resume with `claude --resume` (locate by the ID above), or find it via the
    `ce-sessions` skill.

## Key paths (read these on re-entry)

| What | Path |
|---|---|
| Requirements (original scope) | `scope.md` (this repo) |
| **Tech stack design doc (APPROVED)** | `docs/design-stack.md` (this repo) |
| Design doc source-of-truth copy | `~/.gstack/projects/pensive-boyd-6d17e3/leocaseiro-claude-pensive-boyd-6d17e3-design-20260603-163704.md` |
| AWS backend brainstorm (committed on branch `claude/serene-grothendieck-fb5e67`) | `~/Sites/notation-hero/.claude/worktrees/serene-grothendieck-fb5e67/stack-aws-brainstorm.md` |
| Client-stack brainstorm (committed, same branch; has UI design + alternatives-rejected) | `~/Sites/notation-hero/.claude/worktrees/serene-grothendieck-fb5e67/stack-brainstorm.md` |
| Phase-0 working rhythm game (MPL-2.0 fork) | `~/Sites/alphaTabWebsite` (branch `rhythm-game`), live: https://leocaseiro.github.io/alphaTabWebsite/docs/rhythm-game |
| MIDI mapping feature plan | `~/Sites/alphaTabWebsite/MIDI_MAPPING_PLAN_SUMMARY.md` |
| Reference only (GPL-3, do NOT copy code) | `~/Sites/sightread` (sightread.dev) |

## Decisions locked

- **Stack:** TypeScript + React 19 + Vite + Tailwind; `@coderline/alphatab@^1.8.1`
  (MPL-2.0) for parsing + notation + AlphaSynth playback; PixiJS for the
  friendly falling-notes view; Tone.js (drift-corrected from AlphaSynth) for
  metronome; RxDB or Legend-State for offline-first sync.
- **Native:** Capacitor shells (iOS Swift + Android Kotlin MIDI bridges, written
  from scratch). Hit scoring runs native-side; only verdict events cross the JS
  bridge.
- **Cloud (AWS, via Pulumi TS):** Lambda Function URL + DynamoDB (single-table +
  GSI) + Cognito (Hosted UI + PKCE + Google) + SQS/SNS → S3/Athena analytics +
  CloudFront/OAC + CloudWatch/X-Ray + Sentry (client errors).
- **Distribution:** App Store (iPad/iOS) + Play Store (Android) + PWA (Win/Mac).
- **Default branch:** `master` (kept, not renamed to main).

## Decisions PROPOSED (easy-path defaults — confirm/override)

- **Repo visibility:** **Public** + **proprietary `LICENSE`** ("all rights
  reserved" / source-available). Rationale: public = unlimited free GitHub
  Actions; proprietary license keeps all legal rights; the moat is native +
  cloud + App Store, not the web source.
- **Repo layout:** **Monorepo** (`apps/web`, `infra`, later `packages/shared`),
  path-filtered CI.
- **AWS local creds:** **IAM user + access keys** (`aws configure`) to unblock
  `pulumi up` fast; **OIDC** for CI (no secrets in GitHub).
- **Package manager / runtime:** **bun** (already installed 1.3.11).

## Actions-minutes facts (why public was recommended)

- Public repos = **unlimited free** Actions minutes (confirmed: `base-skill`
  has 5,970 runs on `ubuntu-latest`, billed $0, because public).
- Private free tier = **2,000 min/month**. Linux CI ~7 min/run → ~250 runs/mo.
  Playwright/VR runs ~33 min → ~60/mo. **macOS = 10×** → iOS builds on
  GitHub-hosted macOS runners torch the budget (≈13 builds = 2,000 min).
- If private is ever chosen: Linux-only CI + path filters + concurrency +
  caching, and **iOS builds local or self-hosted macOS runner**, never
  GitHub-hosted macOS.

## Folder rename procedure (run OUTSIDE a session in this folder)

Do NOT rename while a Claude session's CWD is inside the folder (breaks the
session + worktree links). Exit this session first, then in a plain terminal:
```bash
cd ~/Sites
mv drum-tutor-clone notation-hero
cd notation-hero
# main + the 2 nested linked worktrees moved together — pass each linked path:
git worktree repair \
  .claude/worktrees/pensive-boyd-6d17e3 \
  .claude/worktrees/serene-grothendieck-fb5e67
git worktree list   # every path should now start with ~/Sites/notation-hero
```
Then start a fresh Claude session from `~/Sites/notation-hero`.
Optional: update `.specstory/.project.json` `project_name` to `notation-hero`.

## AWS toolchain status (2026-06-04)

- `aws` CLI v2 ✅ installed · **creds ❌ none · region ❌ none** (blocker for
  `pulumi up`)
- `pulumi` ✅ installed, logged in as `leocaseiro`
- `node` v24 ✅ · `npm` ✅ · `bun` 1.3.11 ✅

## CI/CD plan (to build, post doc-review)

1. **Scaffold** `apps/web` (Vite + React 19 + TS + Vitest), proprietary LICENSE,
   minimal landing so there's something to deploy.
2. **CI workflow** (`.github/workflows/ci.yml`): install → lint (ESLint) →
   typecheck (tsc) → test (Vitest) → build (Vite). Linux, path-filtered,
   concurrency-cancel, cached.
3. **Infra** (`infra/`, Pulumi TS): S3 (private) + CloudFront + OAC + GitHub
   OIDC provider + deploy role. ACM cert when domain is ready.
4. **Deploy workflow** (`.github/workflows/deploy.yml`): on merge to `master`,
   OIDC-assume role → `aws s3 sync` → CloudFront invalidation.
5. **Create GitHub repo** `notation-hero` (public) + push.
6. **Branch protection** on `master`: require PR + require CI status checks green.
7. **Advanced PR policy** (Danger, VR-required-on-UI, Storybook-required-on-new-
   components, agent-vs-human rules) → designed via `/plan-eng-review` first,
   then implemented. Lift patterns from `~/Sites/alpha-drums` (own repo: has
   Playwright + auto-merge + Dependabot workflows).

## Skill workflow recipe ("best of all")

- **Plan/doc review:** `ce-doc-review` (this doc + design-stack.md), `/plan-eng-review`
  (architecture + the advanced PR policy).
- **Per-PR code review:** `ce-code-review` (deep, tiered) for substantial PRs;
  gstack `/review` (lighter) for trivial ones.
- **Ship mechanics:** gstack `/ship` (test, bump VERSION, CHANGELOG, commit, push,
  PR) or `ce-commit-push-pr`.
- **Deploy:** `/setup-deploy` + `/land-and-deploy`; `/canary` post-deploy.
- **Enforcement:** branch protection makes "CI green + PR" the hard gate; the
  review skills are the (solo) human reviewer.

## Doc evolution & resolved contradictions

Three planning docs were written across two days; **later decisions override
earlier ones**. When `ce-doc-review` flags these as contradictions, here's the
resolution (newest wins) — do not re-litigate:

| Topic | `stack-brainstorm.md` (earliest) | Resolution (current truth) |
|---|---|---|
| Backend | ❌ AWS "for now"; leaning **Supabase** | ✅ **AWS** — overridden by `stack-aws-brainstorm.md` (learning AWS became first-class + legacy pre-2025-07-15 account = Always-Free tiers) |
| CI/CD | "**No CI/CD needed**, build locally" | ✅ **CI/CD is the priority** (this session). Reversed. |
| Web hosting | Cloudflare / Netlify / GH Pages | ✅ **AWS S3 + CloudFront** (this session) |
| Client stack | web + AlphaTab + Vite + React + PixiJS + Capacitor + Web MIDI + local-first + Legend-State/RxDB | ✅ **Unchanged** — all three docs agree |

`stack-brainstorm.md` also holds two things to PRESERVE into `design-stack.md`
post-review:
- The fullest **friendly-notation UI design** (Melodics-style horizontal
  highway, lanes mirror the kit, gem shape encodes articulation, translucent
  hit-window band, tendency meter, combo glow, accessibility = color+shape+text).
  This answers scope.md's "friendly view = TBD".
- A strong **"why not alternatives"** table (MAUI / Unity / Godot / Next.js /
  Flutter-RN rejected, with reasons).

## ce-doc-review runbook (next session)

Goal: harden the plan before building. In a fresh session:
1. Review set (all committed/safe):
   - `docs/design-stack.md` (this branch) — approved tech plan
   - `scope.md` (this branch) — requirements
   - `…/serene-grothendieck-fb5e67/stack-aws-brainstorm.md` — AWS backend rationale
   - (optional) `…/serene-grothendieck-fb5e67/stack-brainstorm.md` — client stack + UI design
2. Run `ce-doc-review`. It will likely flag the 3 contradictions above — that's
   expected; the resolution table is the answer.
3. Feed findings into `design-stack.md`; fold in the friendly-notation UI design.
4. Return to the CI/CD build (scaffold → CI → AWS infra → branch protection).

> ⚠️ For another session to SEE `docs/design-stack.md` + `docs/handoff.md`, either
> run it from THIS worktree, or commit `docs/` first (they're currently
> uncommitted, so a fresh checkout elsewhere won't have them).

## Open items / next actions

1. ⬜ Run `ce-doc-review` on `docs/design-stack.md` (user wants this before build).
2. ⬜ Confirm proposed defaults (public+proprietary / monorepo / IAM keys / bun).
3. ⬜ Configure AWS local creds + region (unblocks Pulumi).
4. ⬜ Scaffold app + CI; create GitHub repo; branch protection.
5. ⬜ `/plan-eng-review` for the advanced PR policy (Danger/VR/Storybook).
6. ⬜ (Later, outside session) rename folder + `git worktree repair`.
