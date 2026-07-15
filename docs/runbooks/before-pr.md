# Before you open a PR — canonical workflow (95% of the time)

**Status:** ✅ decided (leocaseiro 2026-07-15) — the standing workflow of record
**Audience:** every agent and every session working on `notation-hero`
**Applies to:** 95% of PRs. See the escape hatches at the end for the other 5%.

---

## Read this first

Before you touch anything, read the source of truth:

1. [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md) — current state per topic.
2. [`AGENTS.md`](../../AGENTS.md) — current direction + hexagon layout + operational rules.

If your session's assumed direction conflicts with either, **the registry wins**. Do not proceed with a superseded direction; ratify a new decision first.

---

## The 15-step workflow

Ordered. Each `→ ce-doc-review` or `→ ce-code-review` step may need multiple iterations before its triage lands cleanly.

1. **`superpowers:brainstorming`** — explore the problem shape before you build. Not the implementation — the requirements + trade-offs.
2. **`ce-doc-review`** — surface findings against the brainstorm output.
3. **Triage step 2's findings + apply changes.** Every triage follows the review pattern from `~/.claude/adhd-collaboration-rules.md` §4 (chunked findings + section-by-section walk).
4. **(iterate)** — depending on step 3, run another `ce-doc-review` and iterate through steps 2-3 as many times as needed.
5. **`superpowers:writing-plans`** — turn the brainstorm into a concrete plan (task list, verification criteria, atomic commit sequence).
6. **`ce-doc-review`** — review the plan.
7. **Triage step 6's findings + apply changes.**
8. **(iterate)** — as many `ce-doc-review` turns as the plan needs.
9. **`superpowers:executing-plans`** or **`superpowers:subagent-driven-development`** — implement the plan. Commit atomically at each green step.
10. **`ce-code-review`** — review the implementation.
11. **Triage step 10's findings + apply changes.**
12. **(iterate)** — as many `ce-code-review` turns as the code needs.
13. **`/pr-checklist-audit`** — verify every ticked box against the actual diff (the NH-16 v2 verification layer).
14. **Human review + manual test.** Leo reviews on GitHub; agent runs the app to verify golden path + edge cases where UI is involved.
15. **Merge.** Non-squash unless the PR was designed as a single-commit fix.

---

## Four supplemental rules

These apply throughout the 15 steps. **Every step, every session.**

### Rule 1 — Every triage follows the ADHD collaboration rules

Every `triage step` in the workflow (steps 3, 7, 11) walks section-by-section per `~/.claude/adhd-collaboration-rules.md`:

- Findings established in prose chunks (📖 F-N with **What's wrong / Proposed fix / Why it works**) BEFORE the picker.
- The decision is an `AskUserQuestion` picker in the SAME turn — never a numbered prose "answer 1-4" list.
- No ghost references (a `(see 📖 F-X above)` picker MUST have the chunk in the same message or the immediately-preceding assistant message).

### Rule 2 — Verify against the latest documentation

Agent recommendations — for code, brainstorms, plans, or anything — MUST be **spiked and/or verified against the latest resources** (framework docs, package changelogs, official specs). Not from training-knowledge memory.

- If a spike is warranted, run one (dispatch a subagent that reads bundled docs, `WebFetch`es the current version, or actually runs the code).
- If a spike is not warranted (the change is trivial), the exemption goes under the escape hatches below, not here.

### Rule 3 — Always confirm approach via the decision registry

Every session starts by loading [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md) and checking whether the current topic has an existing decision. If yes:

- **Follow it.** Don't re-litigate.
- If your evidence contradicts it, surface the contradiction and propose ratifying a new decision (with a change-log entry).

If the topic is new to the registry, your PR SHOULD land a new registry entry alongside the code.

### Rule 4 — No training-only recommendations for non-trivial work

Agents SHOULD NOT recommend strategies or approaches sourced only from training knowledge — **unless the change is minor or very clear** (see escape hatches). For anything else:

- Say what you don't know.
- Ask, or spike, or read the code — but don't guess.

### Bonus — Portfolio-scale mindset

This is a personal project AND a portfolio. Strategies decided here are meant to apply at **Enterprise scale**. When choosing between "shortcut for this one project" and "the way this would be done at scale," default to the latter unless a clear reason argues otherwise. See the "well-architected-even-at-tiny-scale" position in [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md).

---

## Escape hatches — when the 15 steps are overkill (~5% of PRs)

Skip the full workflow when the change is one of these. **If you hesitate on whether the exemption applies, it doesn't — run the workflow.**

| Hatch                              | Description                                                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Typo / prose edit**          | Fix a typo or minor prose in an existing doc. No logic change.                                                                                                                                                                                                        |
| **(b) Mechanical rename / move**   | File rename or directory move with zero logic change. Refactor tool output counts.                                                                                                                                                                                    |
| **(c) Dependency bump**            | Dependabot-shape version bump with no config change. If the bump requires code adjustments, run the workflow.                                                                                                                                                         |
| **(d) Explicit leocaseiro waiver** | leocaseiro says "do that without my approval, come on" or equivalent. Waiver is per-change, not standing.                                                                                                                                                             |
| **(e) Revert of a merged commit**  | Reverting a bad merge has its own review shape — go directly to the revert.                                                                                                                                                                                           |
| **(f) Remove ambiguity / clarify** | Improve confusing wording so meaning is unambiguous. No logic change, just clearer text.                                                                                                                                                                              |
| **(g) Extra test coverage**        | Add new tests. No production-code changes.                                                                                                                                                                                                                            |
| **(h) Clear wins**                 | Obvious code-quality improvements with no logic change. Examples: replace `any` with a concrete type, fix an identifier typo, remove unreachable/dead code, rename a variable for clarity, extract a magic number to a named constant, correct an obvious off-by-one. |

**Self-limit for hatch (h):** clear wins mean the fix is so obviously right that any senior would ship it without a review meeting. If you hesitate, it's not a clear win.

**Trivial changes still get reviewed by CI.** The escape hatch skips the 15-step workflow, not the pr-checklist gate + CI lint/test/typecheck. Bots don't get to disable your safety net.

---

## Ship-mode freeze

An orthogonal rule that runs alongside this workflow. See [`AGENTS.md` § Ship-mode freeze](../../AGENTS.md#ship-mode-freeze) for the current freeze state.

**In short:** when the freeze is ACTIVE, no new spec/plan/ADR of any kind until leocaseiro explicitly ends the freeze in a `docs/decisions/decision-registry.md` change-log entry. The freeze is a forcing function against the start-many-finish-few pattern; the workflow above is how you actually finish.

---

## Related docs

- [`~/.claude/adhd-collaboration-rules.md`](file:///Users/leocaseiro/.claude/adhd-collaboration-rules.md) — the collaboration rules every triage follows.
- [`AGENTS.md`](../../AGENTS.md) — current-direction snapshot + hexagon layout + operational rules.
- [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md) — source of truth for current state per topic.
