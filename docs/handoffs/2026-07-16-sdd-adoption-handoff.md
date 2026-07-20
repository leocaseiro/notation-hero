# Handoff — SDD framework adoption (post PR #143)

> **Date:** 2026-07-16 · **Origin session:** "docs confusion review" (worktree `clever-mendel-8e382c`, branch `claude/docs-confusion-review-ee6c2f`)
> **Reason for handoff:** parent session context grew too large; SDD deep-dive resumes in a fresh session while PR #143 ships.

## What shipped in PR #143

The parent session opened as a diagnostic ("agents are lost, and I am lost") and produced 11 atomic commits, non-squash merge intended:

1. `dcdbc02` — docs-cleanup triage + 9-commit plan
2. `b8f8ed2` — archive 8 shipped-ticket plans + predecessors to `docs/archive/2026-07/`
3. `1890c8f` — fold remaining archive refs
4. `897c13c` — strengthen 8 partial-supersession banners with "sections still current" lists
5. `e7779ba` — new `docs/runbooks/before-pr.md` (15-step workflow + 4 rules + escape hatches a–h)
6. `a843d98` — AGENTS.md pointer to before-pr + HARD ship-mode freeze section
7. `b370485` — cherry-pick from PR #140: pnpm-dev tmux docs + 2 registry entries
8. `4f51731` — AGENTS.md trim (588 → 465 lines) — extract 4 sections to `docs/runbooks/`
9. `3fc7f16` — registry split: state (`decision-registry.md`) + history (`decision-changelog.md`)
10. `d05d9ed` — delete self-retiring cleanup plan
11. `4f3fe62` — cspell ignore for new files

**Merge shape:** rebase-and-merge or merge-commit (non-squash), so per-commit revert stays possible.

## Open question for the next session — SDD framework adoption

Mid-review of PR #143, leocaseiro flagged that many files STILL contain "SUPERSEDED" markers even after the cleanup. Then read Wasowski's ["SDD — Designing a Spec That Survives Code Generation"](https://medium.com/@wasowski.jarek/sdd-designing-a-spec-that-survives-code-generation-spec-first-spec-driven-development-b61fdc234493) and asked for a proper single SDD framework instead of the current stitched mix.

## What's decided (confidence: high)

- **Adopt `tlc-spec-driven`** (already installed at `~/.claude/skills/tlc-spec-driven/`, v2.0.0, community CC-BY-4.0) as the primary SDD backbone. Leo explicit: _"I like tlc execution a bit better than superpowers anyway, they seem to have better guard rails."_
- **Wrap, don't fork.** Use tlc's own extension pattern (§ Skill Integrations) — superpowers:brainstorming precedes Specify; ce-doc-review and ce-code-review act as gates. Zero fork maintenance.
- **PR #143 stays as-is.** Runbook + freeze + archives are foundational and don't conflict with tlc adoption.

## What's decided (confidence: medium — Leo agreed but discussion continued)

- **Mixed folder strategy.** Each tool owns its default path:

| Path                      | Owner             | Convention                                              |
| ------------------------- | ----------------- | ------------------------------------------------------- |
| `.specs/project/`         | tlc               | Flat — PROJECT.md · ROADMAP.md · STATE.md               |
| `.specs/codebase/`        | tlc               | Flat — 7 brownfield docs                                |
| `.specs/features/<name>/` | tlc               | Subfolder per feature — spec.md · design.md · tasks.md  |
| `.specs/quick/NNN-slug/`  | tlc               | Subfolder per task — TASK.md · SUMMARY.md               |
| `docs/plans/`             | ce-brainstorm     | Flat, date-prefixed — ce writes here (hardcoded)        |
| `docs/decisions/`         | you               | Flat, date-prefixed — ADRs (unchanged)                  |
| `docs/runbooks/`          | you               | Flat — operational how-tos (unchanged)                  |
| `docs/archive/`           | you               | Year-month subfolder — retired specs/plans              |
| `docs/specs/`             | retires over time | — no new files land; existing 12 stay banner-superseded |

- **Feature name convention:** kebab-case, semantic (`catalog`, `nh-275-web-client`, `nh-279-service-boundary`) — no date prefix on `.specs/features/`.
- **Path reconciliation:** the earlier consolidation (PR #91 moved `.specs/` → `docs/specs/`) reverses under tlc adoption — `.specs/` becomes load-bearing again. This is a direction change, not a mistake, and matches Leo's "change my mind + archive" pattern.

## What's OPEN (Leo dismissed the picker; needs the new session)

1. **What happens to `superpowers:writing-plans` and `superpowers:executing-plans` / `subagent-driven-development`?** They overlap with tlc Specify/Design/Tasks and tlc Execute (which has its own sub-agent delegation). Three options presented, none picked:
   - **A. Retire for tlc-managed features, keep for one-off small tasks** (recommended in parent session)
   - **B. Fully retire** (everything through tlc, including via Quick mode)
   - **C. Keep superpowers primary, tlc as opt-in**
2. **Update `docs/runbooks/before-pr.md` steps 5 and 9** — switch from superpowers to tlc. Everything else in the runbook stays.
3. **First pilot feature** under the new workflow (question was skipped): meta-cleanup Jira ticket for PR #143 vs. next real NH-### backlog item vs. bootstrap `.specs/codebase/` brownfield docs.
4. **Ship-mode freeze compatibility.** The HARD freeze in AGENTS.md says "no new spec/plan/ADR until leocaseiro explicitly ends via changelog entry." Adopting tlc means writing a `.specs/project/PROJECT.md` + `.specs/project/ROADMAP.md` + brownfield docs — that IS new spec work. Decide: end the freeze first (registry entry), OR scope this as "framework refactor of existing intent" (not a new decision), OR both.

## Handoff research — what was investigated (do NOT re-run)

Four subagents completed their research; findings saved in memory:

- **[GitHub Spec Kit](https://github.com/github/spec-kit)** — Python CLI + slash commands, 7-phase workflow (Constitution → Specify → Clarify → Plan → Analyze → Tasks → Implement), v0.12.16 July 2026, missing Wasowski's Change Spec. Solo-friendly but Böckeler flags brownfield friction.
- **[Amazon Kiro](https://kiro.dev/)** — VS Code fork, AWS-native, Q Developer successor. 3-doc workflow (requirements.md EARS + design.md + tasks.md) + `.kiro/steering/*.md` constitution + `.kiro/hooks/*.json`. Free tier 50 credits/mo. re:Invent 2025 talks DVT209/212/320 + DEV314.
- **[Anthropic](https://code.claude.com/docs/en/best-practices.md)** — no first-party SDD framework by that name. Closest: Plan mode + [Ultraplan (April 2026)](https://code.claude.com/docs/en/ultraplan.md) + "interview me → SPEC.md" pattern in best-practices doc.
- **[Thoughtworks / Böckeler (Oct 15, 2025)](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)** — canonical 3-mode taxonomy: **spec-first** (Kiro) / **spec-anchored** (Spec Kit, tlc) / **spec-as-source** (Tessl). [TW Radar Vol 34 (April 2026)](https://www.thoughtworks.com/en-us/radar/techniques/spec-driven-development) rates SDD as **Assess** with warning: _"handcrafting detailed rules for AI ultimately doesn't scale."_ Also surfaced: **[Tessl Framework](https://tessl.io/)**, **[OpenSpec](https://www.thoughtworks.com/en-us/radar/tools/openspec)**, **[BMAD-METHOD](https://github.com/bmadcode/BMAD-METHOD)**.
- **`tlc-spec-driven` on disk** — `~/.claude/skills/tlc-spec-driven/SKILL.md` (217 lines) + `references/` (16 sub-guides). Author Felipe Rodrigues (Tech Lead's Club), v2.0.0, CC-BY-4.0. Has explicit § Skill Integrations extension pattern (already delegates to mermaid-studio + codenavi when installed).

## Memory files written by the parent session

- `notation_hero_pr_143_docs_cleanup.md` — PR #143 status + full commit list + follow-ups blocked by freeze
- `notation_hero_sdd_research_in_progress.md` — SDD adoption is IN FLIGHT; constraints; what's decided vs open
- `notation_hero_strike_dont_delete_reason.md` — why Leo keeps archives (ADHD memory anchor when changing mind); any SDD adoption MUST preserve archive-for-later-review

MEMORY.md index also updated + compacted (20.7KB → ~12KB) with these 3 new entries.

## Suggested opening prompt for the new session

> _"Resume SDD adoption for notation-hero. Read [docs/handoffs/2026-07-16-sdd-adoption-handoff.md](docs/handoffs/2026-07-16-sdd-adoption-handoff.md). PR #143 has merged (or is about to). Start by picking the roles question (superpowers:writing-plans / executing-plans overlap with tlc). Then draft `docs/runbooks/spec-driven-workflow.md` codifying the mixed folder strategy + tlc + superpowers + ce chain. Then decide whether to end the ship-mode freeze via a `decision-changelog.md` entry before writing `.specs/project/PROJECT.md`."_

## Do NOT re-do in the new session

- The 30-file doc triage (all classified; 8 archived, 8 banner-strengthened, 10 already-fine D, 3 false-positives, 2 held)
- The 4-agent SDD landscape research (all 4 completed; findings in this handoff)
- The T2/T3 branch uniqueness check (both branches have zero unique content; no rescue PRs needed)
- The worktree tiering (Tier 1 = 5 prune-safe, Tier 2 = 9 squash-merged, Tier 3 = 46 unmerged, Tier 4 = 2 special)
- The Wasowski article summary + 3 diagrams Leo shared (5-doc types + 7 information layers + 3 lifecycles + decision tree with solo/brownfield/hobby row = "minimal constitution + rewrite more than maintain, skip formal task list")

Everything above is captured in the memory files and this handoff.
