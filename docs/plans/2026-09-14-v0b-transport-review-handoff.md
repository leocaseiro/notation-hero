---
artifact_contract: 'ce-handoff/v1'
created_at: '2026-09-14T11:33:22Z'
title: 'v0 Transport plan review — handoff'
summary: 'Six-persona doc review of the v0 Transport plan (Plan B); 23 findings applied and pushed, three AlphaTab spikes banked, four open items ticketed as NH-294..297.'
keywords: ['nh-291', 'v0-transport', 'plan-b', 'ce-doc-review', 'alphatab', 'base-ui', 'handoff']
cwd: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
resume_focus: 'Plan B is reviewed and green. Next: it cannot start until Plan A lands (engine context, /play screen, Playwright lane). Either continue reviewing Plan A/C, or begin Task 1 once Plan A is merged.'
repository: 'leocaseiro/notation-hero'
repo_root_sha: 'acf677074bd5'
branch: 'spike/alphatab-nextjs-poc'
head: '3a06db6e'
worktree_path: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
---

# v0 Transport plan review — handoff

**Session objective.** Run `/compound-engineering:ce-doc-review` over
[`docs/plans/2026-09-13-v0b-transport-plan.md`](2026-09-13-v0b-transport-plan.md) — the v0 transport
plan, one of three (A = engine and first sound, B = this one, C = settings/tracks popovers, not yet
written).

**Outcome.** Round-1 review complete. 23 findings decided and applied, two commits pushed, four open
items ticketed. The plan's claims now match the installed packages.

---

## What landed

Two commits on `spike/alphatab-nextjs-poc`, both pushed:

| Commit     | What                                                |
| ---------- | --------------------------------------------------- |
| `cc8d02dc` | The review itself — +623 −265 on the transport plan |
| `0793db48` | Links the four open items to their tickets          |

Read the review commit's message first: it is the itemised record of all 23 changes and why each was
made. This handoff does not repeat it.

### Tickets filed

| Ticket                                                   | Item                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [NH-294](https://leocaseiro.atlassian.net/browse/NH-294) | Metronome glyph — `avg_pace` is a flagged placeholder; Material Symbols ships no metronome icon          |
| [NH-295](https://leocaseiro.atlassian.net/browse/NH-295) | Whether playback speed survives a reload — `playbackSpeed` is an API property, not a Settings-JSON field |
| [NH-296](https://leocaseiro.atlassian.net/browse/NH-296) | Whether Plan A's `/play` chrome duplicates Task 7's new header                                           |
| [NH-297](https://leocaseiro.atlassian.net/browse/NH-297) | The `alphaTabWebsite` fork's own `score.tempo` defect — **not** a notation-hero change                   |

294–296 are children of NH-291; 297 is standalone (different repo).

---

## The spike findings — the most valuable thing here

Three subagent spikes established facts that cost real effort and are **not** re-derivable by reading
type signatures. They are written into the plan's **Global Constraints** section, which is now the
durable home for them — read that section before touching any AlphaTab wiring.

Four were confirmed by running the real synth headless (a fake `ISynthOutput` in Node pumping
`sampleRequest` → `samplesPlayed` to drive the real clock):

1. **`score.tempo` is the initial tempo only.** A getter over
   `masterBars[0].tempoAutomations[0].value`. Observed: a `90 → 120 → 60` score reported **90
   throughout**. `args.originalTempo` tracks automations at bar _and_ sub-bar granularity.
2. **`playerPositionChanged` replays a hardcoded stub on subscribe.** It has a `fireOnRegister`
   provider and `on()` fires synchronously with `PositionChangedEventArgs(0,0,0,0,false,120,120)` — so
   a naive mount subscription flashes **120 BPM on a 90 BPM score**. Guard on `endTime > 0`.
3. **A seek is followed by a burst of stale position events carrying `isSeek: false`** — the same value
   every legitimate playback tick carries, so the flag alone cannot filter them. Blocking the main
   thread 25 ms produced 8 stale events; 60 ms produced 18. The seek's own echo carries `isSeek: true`
   and _exactly_ the requested time (clamped to `endTime`), and MessagePort delivery is FIFO, so the
   stale burst always precedes it.
4. **`api.updateSettings()` is not needed** after setting `metronomeVolume` / `countInVolume` /
   `isLooping` — alphaTab's own docs show direct assignment. The fork calls it defensively.

**The spike harnesses are machine-local and will vanish.** They live at
`/tmp/claude-501/-Users-leocaseiro-Sites-notation-hero/4602cebe-4ab7-479e-b410-7633ab4ebc0f/scratchpad/`
in one subdirectory per spike. `/tmp` is OS-managed. The _conclusions_ survive in Global
Constraints; the harnesses do not. Rebuild them if you need to re-measure.

### Prior art read during the review

Two of the maintainer's own codebases were surveyed and should be consulted before re-deciding any of
this:

- **`~/Sites/alphaTabWebsite`** (branch `rhythm-game`) — the fork. Uses `score.tempo × playbackSpeed`
  computed at render time; never reads the event's tempo fields; has no tempo-automation handling at
  all. Its compact toolbar shows `120 BPM`, its expanded panel shows `120 BPM (100%)` — a two-tier
  disclosure, not "always show the percentage".
- **`~/Sites/tablatures`** (Svelte, alphaTab 1.8.1) — the A–B loop reference. Stores the loop as **bar
  indices** and derives `playbackRange` ticks via `api.tickCache.masterBars` with repeat expansion
  (`barToExpandedRange`, `barSpanBetweenMs`), which is what makes a loop survive repeat sections and alternate endings. It
  also carries `tests/loop-repeat.spec.ts` (~22 Playwright cases). **Worth borrowing when A–B ships**;
  out of scope for v0, which uses AlphaTab's native bar-range selection.

---

## Decisions and rejected alternatives

Recorded so the next session does not re-litigate them.

| Decision                                                                                                          | Rejected                                                                                                       | Why                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every new control on a **Base UI primitive** (`Slider`, `Progress`, `Toggle`, `NumberField`)                      | Hand-rolled equivalents, which is what the plan originally had for three of them                               | Standing convention: use shadcn/Base UI by default. Each swap also deleted hand-written ARIA, clamping or interaction code                                                                                                       |
| **Two slider wrappers** (`Slider` + `RangeSlider`) with shared classes extracted                                  | One `Slider` taking `value: number[]` (the canonical shadcn shape)                                             | Converging would refactor a shipped component and regenerate its VR baselines. Flip if Plan C's rows need `formatValue`/`unit`/`showReadout` on a _range_ too                                                                    |
| **Sequencing predicate** for the seek guard (latch on target, unlatch on matching `isSeek` echo, 250 ms fallback) | `isSeek`-alone (drops 2928 of 2958 events); the 100 ms wall-clock window the `tablatures` app uses (drops 918) | Measured: 0 wrong positions, 0 live ticks dropped. The 250 ms fallback is **mandatory** — a seek during a count-in emits no event at all (`isPlayingMain` gate) and would latch the UI forever                                   |
| Track **`originalTempo × playbackSpeed`**, not `modifiedTempo`                                                    | `modifiedTempo` directly                                                                                       | Identical in the plain synth path, but `modifiedTempo` is `syncPointTempo × playbackSpeed` and diverges once backing-track sync points exist. Kept in one place so the choice is swappable                                       |
| Vocabulary: a piece of music is a **`score`**, a **`notation`** is the score file                                 | "chart" (previously 36 uses)                                                                                   | "chart" appears nowhere in the data model; `score` matches AlphaTab's own `api.score` / `score.title` and is the user- and log-facing word. The schema's instrument-agnostic unit is `playable` (song · part · lesson · pattern) |
| Percentage rule: show on **hover or focus**, hide on blur, 3 s linger, **never at 100 %**                         | "always show" (the fork's expanded panel); "only while adjusting" (the spec as written)                        | Hover and focus are pure CSS — `:focus-within` gives hide-on-blur free. **This is a Spec Delta**, recorded in Task 5 and in the registry step                                                                                    |
| Retitled to `v0 Transport — Implementation Plan B "Playback Control" (2 of 3)`                                    | Dropping "Plan B" entirely                                                                                     | "Plan B" reads as _fallback plan_ to any reader — but existing references to it must stay findable                                                                                                                               |

**Settled upstream, do not reopen:** the three-plan split · the TDD step shape · VR + axe blocking
merge · the Storybook/Playwright/Base UI/Tailwind stack · tempo lives in the header · A–B loop markers
out of scope for v0.

---

## Current state

- The transport plan is **reviewed, lint-green, committed and pushed**. Nothing is uncommitted.
- **Plan B cannot start.** It depends on Plan A for the engine context, the `/play` screen, the
  `AlphaTabApi` handle and the `web` Playwright lane. Task 1 has no foundation until Plan A merges.
- **Plan A and Plan C are other sessions' work.** Plan A was being edited and reviewed in two parallel
  sessions throughout this review and was treated as a moving target — no findings were raised about it
  and no edits were made to it.

### Two flags deliberately left in the plan

Both are written as explicit conditional fallbacks rather than assumptions, and both need confirming
while building rather than re-reviewing:

1. Whether `NumberField.Input` reports `role="textbox"` or `spinbutton` to Testing Library in
   `@base-ui/react` 1.6.0 — the Task 5 test queries assume `textbox`.
2. Whether the doubled `group-data-[…]` variant composes under Tailwind 4. If not, hoist the
   percentage-visibility gate to a single attribute computed in TypeScript rather than fighting the
   variant syntax.

### Fragile: this worktree is shared

At capture time the repo had **20+ worktrees** and at least two other Claude sessions were active on
this same branch. It bit twice during this session:

- Another session's broad `git add` swept an uncommitted edit of mine into _their_ commit (`4ffe2c7f`).
- Another session's `git push` pushed my commits before I could, so my own push was rejected twice
  (once needing a rebase).

Nothing was lost — the sessions happened to be touching disjoint files — but `git add -A` and
`git push` are effectively shared-state operations here. `HEAD` had already moved from `0793db48` to
`3a06db6e` by the time this handoff was written. **A worktree per plan would remove the whole class of
problem.** Never use bare `git stash` in this repo; the stash stack is shared.

---

## Verification performed

- `prettier`, `markdownlint-cli2`, `cspell` — clean on the plan.
- Full `lefthook` pre-commit on both commits: layout-guard, markdownlint, prettier, sast, secret-scan,
  commitlint — all green.
- Full `lefthook` pre-push: 13 checks including `typecheck` across all five packages, `lint`, `test`,
  `lint-spell`, `check-supply-chain-pins` — all green.
- **No code was written or run.** This was a document review; the plan's tests do not exist yet.

---

## Open items beyond the four tickets

- **Three FYI observations**, deliberately not actioned: the rewritten `Progress.tsx` has no
  `'use client'` while its four siblings do · `TransportToggle` is a screen-specific name for a generic
  icon toggle (adversarial suggested `IconToggle`) · the scrubber announces raw seconds rather than
  `mm:ss`, and every future `Slider` consumer inherits that.
- **No cross-model review ran.** Only the `claude` CLI is installed, which is the same family as the
  host, so there was no verifiably different model to route to. A second opinion on the judgment lenses
  (adversarial, product-lens) has not been obtained.
- **Handoff docs are fragmented three ways** and the maintainer asked only that it be noted here, not
  fixed: `docs/handoffs/` (the dedicated dir, 2 files, unused since 2026-07-07),
  `docs/plans/*-handoff.md` (what the last three handoffs including this one actually use), and
  `docs/wireframe/*-HANDOFF-*.md` (the June series). `docs/handoff.md` and `docs/handoff-prompts.md`
  are both banner-superseded. `AGENTS.md` documents the `docs/specs` and `docs/plans` conventions but
  says nothing about handoffs.

---

## Working preferences learned this session

Not in `AGENTS.md` or `CLAUDE.md`; the maintainer stated them mid-review and they apply going forward.

- **Show, don't tell — BEFORE/AFTER in every question.** When putting a finding, fix or decision to
  them, quote the current text from the real file with its path, then the same region with the change
  applied, both minimal. Where a diff is genuinely impossible (a missing thing, a process question, a
  judgment call), give a concrete worked example instead: specific inputs, what goes wrong, what the fix
  produces. _"I understand far more from examples than from prose, and examples remove ambiguity."_
  They are improving their own tooling for this at `~/Sites/spec-triage-loop` and declined a memory
  write for it.
- **Standing authorization, tests and VR:** where a change is needed to make tests or visual-regression
  baselines pass, apply the best option without confirmation unless genuinely unsure or there are
  competing options.
- **Standing authorization, accessibility:** apply a11y fixes without asking when confident they meet
  WCAG AA or better. Only ask when there are multiple valid approaches.
- **Check the fork first.** Before deciding anything technical, check how `~/Sites/alphaTabWebsite`
  (`rhythm-game`) already does it and align — and if the fork has a bug, they would rather fix it than
  copy it, provided the fix is validated. That is what produced NH-297.
- **Follow AlphaTab's own naming** where it exists: if the library says `score.title`, say "score
  title", not "notation title".

---

## Plausible next steps

1. **Review Plan A or Plan C** with `/compound-engineering:ce-doc-review`. Plan C is not written yet;
   Plan A is under review in other sessions — check with them before starting to avoid a third
   concurrent reviewer on one file.
2. **Round-2 review of this plan.** A second `ce-doc-review` pass would see all 23 decisions in its
   primer, so resolved findings self-suppress and only new issues surface. Diminishing returns are
   likely; the round-1 pass was thorough.
3. **Resolve NH-296 cheaply** once Plan A settles — it is a five-minute read of Plan A's `/play` render
   tree that either confirms Task 7's header is new or turns it from a create into a modify.
4. **Start implementing** — only after Plan A merges. Task 1 (the `Slider` primitive) is the entry
   point, and `superpowers:subagent-driven-development` is the plan's own declared sub-skill.

### Artifacts

- Tempo-pill mockup (live, interactive — hover and tab the pills):
  <https://claude.ai/code/artifact/5f688ca5-a4d7-44e0-ab37-82fdb5c3470b>. The watch on it has ended, so
  this session will not hear about republishes.
