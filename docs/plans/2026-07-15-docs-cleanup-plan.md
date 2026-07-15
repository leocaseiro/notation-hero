---
title: Docs cleanup plan — reduce agent confusion by shrinking the doc graveyard
date: 2026-07-15
jira: none (meta-cleanup)
status: in-progress
supersedes: n/a
delete_after: this PR merges (self-retiring plan)
---

# Docs cleanup plan — 2026-07-15

## Why this PR exists

Leo raised: "agents are lost, and I am lost." A diagnostic pass surfaced two root
causes:

1. **Doc graveyard.** 30+ files matched `grep -l SUPERSEDED docs/`. Triage revealed
   the reality is more nuanced: ~8 files need archiving (shipped-ticket plans),
   ~8 need banner strengthening, ~10 already respect the "strike, don't delete"
   convention and are fine, ~3 were false positives (grep hit on "supersedes"
   pointing backward — the doc IS the current spec), ~2 are held by open branch
   work.
2. **Instruction-file bloat.** `AGENTS.md` is 549 lines / ~5,400 words;
   `docs/decisions/decision-registry.md` is 990 lines. Both loaded on every
   session start. Agents skim mechanics before hitting governance rules.

The deeper issue is that this project optimizes for **audit trail over
actionability**. Every pivot leaves 3–4 artifacts (old ADR + new ADR + registry
entry + downstream doc edits) and almost nothing gets deleted. Six weeks of
active learning produced a lot of history alongside current truth.

## What this PR does

Nine atomic commits, non-squash merge (each is independently revertable):

1. **This plan doc** — captures the triage classification and the workflow-of-record for future cleanups.
2. **Archive 8 shipped-ticket plans** → `docs/archive/2026-07/` via `git mv`.
3. **Strengthen 8 banners** with explicit "sections still current" lists at the top.
4. **New runbook** `docs/runbooks/before-pr.md` — the 15-step workflow Leo codified 2026-07-15 (brainstorm → doc-review → plan → doc-review → execute → code-review → audit → merge) + 4 supplemental rules + escape hatches for trivial changes.
5. **AGENTS.md pointer + ship-mode freeze** — 5-line pointer to the new runbook at the top of "Current direction"; HARD ship-mode freeze section (no new spec/plan/ADR until Leo explicitly ends the freeze in a registry entry).
6. **Cherry-pick from PR #140 (on hold)** — the `pnpm dev` tmux docs section (AGENTS.md) + the 2026-07-14 catalog-read service-boundary registry entry, both self-contained and additive.
7. **AGENTS.md trim** — move VR-docker mechanics, lint setup, worktree setup, and PR-checklist internals into `docs/runbooks/*.md`; AGENTS.md primary drops to ~200 lines.
8. **Registry split** — `docs/decisions/decision-registry.md` becomes the ~100-line "current state per topic" file; the 26-date change log moves to `docs/decisions/decision-changelog.md`.
9. **Delete this plan doc** — it did its job; the archive move + runbook + registry entries are the permanent record.

## Not in this PR

- Worktree pruning is separate and already done (Round B/C of the same session): 62 → 48 via Tier 1 + Tier 2. Local operation, no PR needed.
- Preservation of 5 dirty worktrees is separate and already done: 5 WIP branches pushed to origin; index at [issue #142](https://github.com/leocaseiro/notation-hero/issues/142).
- Deeper Tier 3 worktree cleanup (46 remaining worktrees with novel commits or dirty files) is deferred — needs per-worktree investigation, out of scope.

## Triage table (31 files classified)

Grouped by action.

### 🗄️ ARCHIVE — 8 files (shipped-ticket plans and superseded predecessors)

| File                                                                | Reason                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/plans/2026-06-21-001-feat-real-source-data-grounding-plan.md` | NH-194 shipped (PR #52)                                          |
| `docs/plans/2026-07-05-nh-254-catalog-filter-components-plan.md`    | NH-254 shipped (PR #99)                                          |
| `docs/plans/2026-07-05-nh-254-catalog-filters-handoff.md`           | NH-254 shipped (PR #99)                                          |
| `docs/plans/2026-07-05-storybook-pr-preview-plan.md`                | NH-266 shipped (PR #113)                                         |
| `docs/plans/2026-07-05-nh-262-ui-primitives-port.md`                | NH-262 shipped (PR #101/#109/#112)                               |
| `docs/plans/2026-07-08-pr99-merge-vr-realign-handoff.md`            | Merge complete (PR #132)                                         |
| `docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql`             | Superseded by 2026-06-21 SQL (profile keys moved playable→track) |
| `docs/wireframe/2026-06-18-HANDOFF-tonal-schema-open-question.md`   | Handoff consumed by 2026-06-19 spec                              |

### 🏷️ STRENGTHEN BANNER — 8 files (add "sections still current" list at top)

| File                                                             | What stays current                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `docs/feature-freeze.md`                                         | Feature-area tables A/B/C/D/E/F/G/I/J/K minus K-2/H-9 auth rows       |
| `docs/cms-approach.md`                                           | React-Admin choice, AWS-coverage matrix, license analysis, cost table |
| `docs/specs/2026-06-15-cms-admin.md`                             | §1–3, §5 (only §4 auth is stale)                                      |
| `docs/specs/2026-07-09-nextjs-web-client-design.md`              | Phase 1 shipped; §4–5 redirect to 2026-07-12 ADR                      |
| `docs/specs/2026-07-05-storybook-pr-preview-design.md`           | Post-implementation reference doc                                     |
| `docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md` | SD-27 update note; runnable DDL is 06-21 SQL                          |
| `docs/wireframe/2026-06-16-schema-deltas.md`                     | SD ledger stays current; round-history is archival                    |
| `docs/wireframe/2026-06-25-voicing-by-track-bar-spec.md`         | Status → "decided (SD-15 / NH-213 merged PR #76)"                     |

### ✋ HELD — 2 files (leave alone until branches merge/abandon)

| File                                                                  | Held by                                                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `docs/plans/2026-06-18-001-feat-foundation-phase0-nx-to-pnpm-plan.md` | `worktree-nh-195-arch-guard-1` — fence DID land under NH-199, but the worktree has 30 novel commits worth per-branch review |
| `docs/plans/2026-07-11-nh-275-nextjs-web-client-phase1-plan.md`       | `origin/nextjs-web-setup` — Phase 2 groundwork, 1 commit ahead of master                                                    |

### ✅ ALREADY FINE — 10 files (D history-only, no action)

`song-schema.md` · `aws-learning-map.md` · `design-stack.md` · `handoff.md` ·
`handoff-prompts.md` · `cicd-pipeline.md` · `docs/design/2026-06-13-catalog-handoff.md` ·
`docs/ideation/2026-06-09-agent-native-tooling-ci-ideation.md` ·
`docs/plans/2026-06-07-001-feat-cms-k-build-plan.md` · `docs/runbooks/linear-mcp.md`

### 🎯 FALSE POSITIVE — 3 files (grep hit on backward-pointing "supersedes")

- `docs/specs/2026-06-10-catalog-schema.md` — supersedes older `song-schema.md` drafts; IS the current spec.
- `docs/decisions/2026-07-12-design-system-distribution-adr.md` — ratified ADR; supersedes NH-275 Phase 1 `@source` choices.
- `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` — current DDL that AGENTS.md points to.

## Retirement

This plan doc gets `git rm`'d in Commit 9 of this PR. Its job is done once the archive moves, the runbook, and the freeze section are on master. The registry entry for the PR captures the permanent record.
