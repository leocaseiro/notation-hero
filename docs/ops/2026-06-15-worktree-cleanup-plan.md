# Worktree Cleanup Plan — 2026-06-15

> **Point-in-time maintenance record.** Review on this PR; once approved, the agent executes
> the removals / Jira syncs per your ticks. **Nothing has been removed or changed yet.**
> This doc can stay as an audit trail or be deleted after cleanup — your call.

## ✅ Execution log — 2026-06-15 (done this session, with approval)

**Verified live against freshly-fetched `origin/master` (`c77fa1d`) — not PR/ticket labels.**

- **Bucket A — 6/6 worktrees removed:** `competent-poitras`, `clever-mccarthy`, `determined-torvalds`,
  `musing-banach`, `mystifying-zhukovsky`, `silly-chaplygin`. All `unlanded=0`; 5 were dirty *only* from a
  regenerable `vectors/` index → `--force`. **Branches + commits + sessions all preserved.**
- **`__BKP` — 14/14 deleted (~62 MB freed):** each verified to hold **no unique non-junk files** vs its
  live worktree before deletion.
- **Jira (G-4):** **NH-150** + **NH-125** → **Done**, each with a tracking comment linking the merged PRs + this audit.

### 🔁 Reclassification — `origin/master` advanced since the plan was written
Moved `3e66b8d → c77fa1d`: **PR #30** (skill-routing runbook) + **PR #32** (disable nx analytics) merged. So:
- `beautiful-villani-f9f02c` (#30) — was Bucket C (keep) → **now merged** (eligible for cleanup).
- `relaxed-haibt-51598a` (#32) — was Bucket C (keep) → **now merged** (eligible for cleanup).
- Open PRs now: **#28, #26, #24, #8** (+ this audit #34).

### ⚠️ Side-finding — `vectors/` is not gitignored
`vectors/` (memstack skill-index: `skills.lance` + `tfidf_index.pkl`, ~1 MB) regenerates in **every worktree
and the master root**, and is **not** in `.gitignore` → accidental-commit risk. Recommend adding it to
`.gitignore` (fits the in-flight PR #24).

## Context

- **43 removable worktrees** under `.claude/worktrees/` (+ the `master` root + this active cleanup session).
- Jira migrated **KAN → NH** (TMP→CMP). Every ticket reference below uses the **NH** key.
- **Goals:** G-1 cleanup worktrees · G-2 track all work · G-3 find stale · G-4 Jira current ·
  G-5 never lose a Claude session · G-6 suggest archivable sessions.

## Safety model — why this is low-risk

1. **`git worktree remove` only ever risks *uncommitted* (dirty) changes.** Every *commit* survives
   as a branch ref — pushed or not, merged or not. Removing a worktree does **not** delete the branch.
2. **Claude sessions live in `~/.claude/projects/…`, separate from the worktree dir** — removal never
   touches session history. *Proof:* 3 already-removed worktrees (`condescending-elion`,
   `ecstatic-sinoussi`, `modest-golick`) still have full session history. → **G-5 holds by construction.**

→ Only two real risk axes: **dirty trees** (peek before discard) and **unpushed local commits**
(track in NH/GitHub first so they don't go invisible).

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Remove now — zero risk (merged + clean, or pushed + clean) |
| 🟡 | Remove after a one-command safety-stash (merged, but dirty working tree = stale junk) |
| 🛑 | Keep — active work / open PR |
| ⚠️ | Decide first — unpushed local commits or no tracking ticket/PR |

- **Session** = Claude Desktop session name (its opening prompt). Worktree id in `()`.
- "Dirty" counts come from `git status --porcelain` per worktree.

---

## Bucket A — Merged + clean → ✅ remove now (6)

Branch fully in `master`; working tree clean. Commits + sessions preserved.

| ✓ | Worktree | NH ticket | Landed via | Session (Desktop name) |
|---|---|---|---|---|
| ☐ | `clever-mccarthy-5e478f` | NH-125 | PR #27 | "ce-code-review: file-structure ADR" |
| ☐ | `competent-poitras-8b8d05` | — | PR #4 | "ce-work: tooling DACI Step 0 (Linear MCP)" |
| ☐ | `determined-torvalds-2ba2fc` | NH-153 | PR #16 | "Guide me through KAN-118 steps" |
| ☐ | `musing-banach-e79536` | — | PR #7 | "ce-sessions: which session decided first work" |
| ☐ | `mystifying-zhukovsky-095616` | NH-79 | PR #7 | "Provision Neon Postgres + validate schema" |
| ☐ | `silly-chaplygin-bad55c` | NH-125 | PR #22/#25 | "ce-code-review PR #25 (structure)" |

---

## Bucket B — Merged + dirty → 🟡 remove after safety-stash (15)

All merged into `master`. Dirty files are **stale junk**: `.specstory/*` tooling files, untracked
`vectors/` · `docs/` · `STRATEGY.md`, and **pre-IP-scrub doc edits** (`M scope.md`,
`M docs/handoff.md`, `M docs/mockups/*.html`) superseded when history was rewritten.

**Proposed safety net:** `git stash push -u` each into a named stash (or tag `wt-bkp/<name>`) before
`git worktree remove --force`. One command, fully recoverable.

| ✓ | Worktree | Dirty | Session (Desktop name) |
|---|---|---|---|
| ☐ | `admiring-ramanujan-c06910` | 13 | "Enable remote control by default" |
| ☐ | `affectionate-dewdney-42c19c` | 4 | "Decide Admin/CMS approach (Track 4)" |
| ☐ | `awesome-taussig-22c80b` | 2 | "Design-consult follow-up (catalog)" |
| ☐ | `charming-curran-f72274` | 9 | "ce-plan: CMS approach" |
| ☐ | `distracted-payne-ffafa7` | 3 | "v1 Feature Freeze go/no-go" (2 sessions) |
| ☐ | `friendly-murdock-956092` | 3 | "ce-doc-review: harden tech plan" |
| ☐ | `gracious-darwin-12d19e` | 1 | "ce-strategy" |
| ☐ | `intelligent-mccarthy-b943a4` | 1 | "ce-code-review PR #25" |
| ☐ | `naughty-black-5686a7` | 1 | "CMS idea → decided against" |
| ☐ | `nostalgic-elbakyan-6fdd4b` | 13 | "ce-doc-review: DACI decisions doc" |
| ☐ | `pensive-boyd-6d17e3` | 7 | "Track 4 CMS handoff prompt" |
| ☐ | `serene-grothendieck-fb5e67` | 4 | "AWS stack brainstorm + interview prep" |
| ☐ | `silly-jepsen-bb5f28` | 8 | "Define Player-app UI (Track 1)" |
| ☐ | `trusting-heisenberg-5dcf98` | 2 | "Catalog design handoff follow-up" |
| ☐ | `youthful-blackburn-2a40d6` | 15 | "DynamoDB vs MongoDB decision" |

---

## Bucket C — Open PR → 🛑 keep (6)

Active / in-review work. Don't touch the worktree.

| Worktree | PR | NH ticket | What |
|---|---|---|---|
| `epic-easley-b661e6` | [#28](https://github.com/leocaseiro/notation-hero/pull/28) | NH-134 | Catalogue UI design |
| `condescending-mendeleev-132bba` | [#8](https://github.com/leocaseiro/notation-hero/pull/8) | ⚠️ **none** | core/catalogue domain (U2) |
| `gallant-bardeen-fb685c` | [#26](https://github.com/leocaseiro/notation-hero/pull/26) | — | kanel DB-row layer plan |
| `gitignore-cleanup` | [#24](https://github.com/leocaseiro/notation-hero/pull/24) | — | untrack `.specstory` (no session) |
| `relaxed-haibt-51598a` | [#32](https://github.com/leocaseiro/notation-hero/pull/32) | NH-150 | disable nx analytics |
| `beautiful-villani-f9f02c` | [#30](https://github.com/leocaseiro/notation-hero/pull/30) | — | skill-routing runbook |

> ⚠️ **G-2 flag:** PR #8 (core/catalogue domain) has **no NH ticket**. Recommend creating one under
> the catalogue/K epic before merge.

---

## Bucket D — Pushed, unmerged follow-ups → ⚠️ worktree removable; decide on follow-up (10)

Branch is **on origin** (commits safe). Core work already merged via the listed PR; these worktrees
carry *extra* commits on top. "Unlanded" = real new content vs `master` (3-dot diff).

| ✓ | Worktree / branch | Merged PR | Unlanded | Session | Recommend |
|---|---|---|---|---|---|
| ☐ | `blissful-khorana` / chore/nx-init | #7 | 10f / +4451 | "DACI Sequencing Step 1" | **Review** — large; PR if real |
| ☐ | `trusting-lewin-1433b9` | #6 | 10f / +1707 | "Revise Area-K CMS plan (Postgres)" | **Review** — K-plan revision |
| ☐ | `hungry-chatterjee-a46716` | #23 | 6f / +573 | "Design-system consultation" | PR design follow-ups? |
| ☐ | `crazy-knuth` / theme-2-ci-release | #22 | 9f / +284 | "Sprint-1 tooling (theme-2 CI)" | NH-172 branch-ruleset — PR? |
| ☐ | `agent-aligned-enforcement` | #25 | 8f / +1828 | *(no session — CLI/agent)* | Likely squash dupes — verify |
| ☐ | `recursing-moser-f882cf` | #27 | 2f / +468 | "Evaluate structure strictness + depcruise" | spike-evidence docs — PR? |
| ☐ | `angry-hellman` / land-unmerged-notes | #11 | 4f / +441 | "Lost: what decided vs pending" | WIP drafts — land or drop |
| ☐ | `frosty-meninsky-0e540e` | *none* | 2f / +187 | "memstack mentor: KAN-119 walkthrough" | hexagonal diagrams — PR? |
| ☐ | `competent-wilbur` / KAN-133 | #19 | 7f / +452 | "Pipeline setup (dep hygiene)" | trivial doc follow-up — drop |
| ☐ | `youthful-ramanujan` / KAN-116 | #10 | 2f / +64 | "Migrate Linear → Jira" | trivial follow-up — drop |

---

## Bucket E — Local-only, unpushed → ⚠️ track BEFORE cleanup (5)

Commits exist **only on this laptop** (survive removal as branch refs, but are invisible on
GitHub/Jira). Per your rule — confirm + create tickets/PRs first.

| ✓ | Worktree / branch | Commits | Delta | What it is | Session | Recommend |
|---|---|---|---|---|---|---|
| ☐ | `agent-ad4bfc9c` / **colocate-pr8** | 9 | 33f / +2546 | **Core catalogue domain** + co-located tests (superset of PR #8) | *(no session — agent)* | **Push → fold into PR #8 / new PR + NH ticket** |
| ☐ | `optimistic-lalande-2ad538` | 7 | 50f / +5384 | **v1 catalogue schema spec** (Track 3) | "Finalize song/lesson schema (Track 3)" | **Verify vs #6; ticket+PR if unlanded** |
| ☐ | `determined-perlman-6c6a14` | 8 | 2f / +557 | tooling DACI ideation (post-#5) | "ce-ideate: AWS learning project" | Likely landed — verify → discard |
| ☐ | `intelligent-goldstine-9eeb15` | 2 | 3f / +19 | AWS/DNS doc corrections | "AWS root vs IAM user guidance" | Tiny — cherry-pick or discard |
| ☐ | `vigorous-goldwasser-73ccca` | 1 | 1f / +82 | tooling-stack ranking doc | "Why depcruise over eslint" | Likely landed via #7 — verify → discard |

---

## Bucket F — Active (1)

| Worktree | Branch | Note |
|---|---|---|
| `condescending-pare-e80224` | `docs/worktree-cleanup-2026-06-15` | **This cleanup session — keep** |

---

## Orphans (bonus cleanup)

### `__BKP` backup dirs — ~62 MB → delete (14)
Plain backup copies, **not** git worktrees:
`admiring-ramanujan__BKP` · `affectionate-dewdney__BKP` · `charming-curran__BKP` ·
`determined-perlman__BKP` · `distracted-payne__BKP` · `friendly-murdock__BKP` ·
`intelligent-goldstine__BKP` · `nostalgic-elbakyan__BKP` · `optimistic-lalande__BKP` ·
`pensive-boyd__BKP` · `serene-grothendieck__BKP` · `silly-jepsen__BKP` ·
`vigorous-goldwasser__BKP` · `youthful-blackburn__BKP`

### Orphan branches (no worktree) — separate from worktree cleanup (8)
`claude/condescending-elion-8ac357` · `claude/ecstatic-sinoussi-2a1e12` · `claude/modest-golick-98271b` ·
`claude/recursing-feistel-29cb4e` · `claude/strange-nightingale-c76e29` · `claude/xenodochial-pike-b582d8` ·
`worktree-agent-ad4bfc9c2af44b421` · `archive/main-root-pre-cleanup-2026-06-12`
→ flag if you also want branch pruning; out of scope for worktree cleanup by default.

### Worktrees with no Claude session (created via CLI/headless agent) — 3
`agent-ad4bfc9c2af44b421` (colocate-pr8) · `agent-aligned-enforcement` · `gitignore-cleanup`

---

## Jira syncs (G-4) — 2 stale statuses

| ✓ | NH ticket | Current | → Proposed | Why |
|---|---|---|---|---|
| ☐ | **NH-150** — first pulumi-up Lambda | Code Review | **Done** | PR [#29](https://github.com/leocaseiro/notation-hero/pull/29) merged 2026-06-13 |
| ☐ | **NH-125** — file-structure enforcement | Code Review | **Done** | PRs [#25](https://github.com/leocaseiro/notation-hero/pull/25)+[#27](https://github.com/leocaseiro/notation-hero/pull/27) merged; follow-ups NH-40/NH-42 are separate tickets |

Everything else referenced (NH-80/83/89/91/93/147/148/149/152/153/154/155/156/167/170/171/172)
is already **Done** and correctly synced. NH-134 (catalogue UI) correctly sits at Code Review (PR #28 open).

> A tracking comment will be added to each NH ticket when its status flips, per your "update Jira/GH
> with comments to track later" instruction.

---

## Proposed execution order (after your approval on this PR)

1. **Bucket A** (6) → `git worktree remove` (clean, zero risk).
2. **`__BKP` dirs** (14) → delete (~62 MB).
3. **Bucket B** (15) → `git stash -u` safety net → `git worktree remove --force`.
4. **Bucket D** (10) → for the ⚠️ "review"/"PR?" rows, open follow-up PRs you approve; then remove worktrees.
5. **Bucket E** (5) → push + open PRs / create NH tickets for `colocate-pr8` + `optimistic-lalande`;
   verify-then-discard the 3 doc-only ones; then remove worktrees.
6. **Jira** → flip NH-150 + NH-125 to Done with tracking comments.
7. **Keep** Bucket C (6) + Bucket F (1) untouched.

**Net result:** 43 worktrees → ~7 kept (6 open-PR + active). Every commit preserved on its branch;
every session preserved in `~/.claude/projects/`.

---

## Appendix 1 — KAN → NH map (full, all resolved)

Your Phase-2 map (31) + the 6 stragglers I resolved against the live NH board:

| KAN | NH | Ticket | KAN | NH | Ticket |
|---|---|---|---|---|---|
| KAN-48 | NH-119 | CI/CD pipeline + AWS creds | KAN-133 | NH-89 | Dependency hygiene (L9) |
| KAN-99 | **NH-34** | L10b Linear GitHub App | KAN-134 | NH-142 | Knip dead-code |
| KAN-115 | NH-146 | GitHub OIDC in deploy.yml | KAN-135 | NH-143 | Syncpack |
| KAN-116 | NH-147 | Repo-meta layer | KAN-136 | NH-144 | depcruise no-orphans → ERROR |
| KAN-117 | **NH-148** | Branch protection on master | KAN-137 | NH-83 | CI architecture (L7) |
| KAN-118 | NH-149 | AWS creds bootstrap | KAN-138 | NH-170 | nx-set-shas |
| KAN-119 | NH-150 | First pulumi up — Lambda | KAN-139 | NH-171 | Reusable workflow |
| KAN-120 | NH-151 | Pulumi OIDC + deploy role | KAN-140 | NH-172 | merge-queue |
| KAN-121 | NH-19 | CodeQL scanning | KAN-143 | NH-167 | .nvmrc + packageManager pin |
| KAN-123 | NH-17 | Per-app CI build matrix | KAN-146 | NH-96 | AGENTS.md from config (L8) |
| KAN-124 | NH-18 | CI-driven pulumi up | KAN-147 | NH-91 | no-escape-hatches ESLint (L4) |
| KAN-125 | NH-16 | Advanced PR policy | KAN-148 | NH-93 | commitlint (L6) |
| KAN-126 | NH-79 | adapters/postgres Neon | KAN-149 | NH-98 | nx release |
| KAN-127 | **NH-80** | Security & secrets scanning | KAN-153 | NH-40 | BATS tests for tooling/*.sh |
| KAN-128 | NH-152 | gitleaks | KAN-158 | NH-42 | ESLint flat config (L3) |
| KAN-129 | NH-153 | Semgrep SAST | KAN-141 | **NH-104** | Cross-cutting hardening (L12) |
| KAN-130 | NH-154 | osv-scanner CVE gate | KAN-160 | **NH-125** | File-structure enforcement |
| KAN-131 | NH-155 | Dependabot alerts | KAN-161 | **NH-134** | Catalogue UI design |
| KAN-132 | NH-156 | GitHub secret scanning |  |  |  |

**Bold** = resolved here (not in your original 31-row map).

---

## Appendix 2 — Phase 2: archivable Claude sessions (G-6) — DO NOT ACT YET

Candidates to **archive (never delete)** once cleanup lands — merged/superseded work or one-off lookups.
Full G-6 pass comes after cleanup; this is a preview.

- **Merged & shipped** (work is in `master`): sessions behind Buckets A + B + the merged-PR rows of D.
- **One-off lookups / superseded**: "ce-sessions: which session decided first work", "Why depcruise over
  eslint", "AWS root vs IAM user guidance", "CMS idea → decided against".
- **Keep active** (open PRs / in-flight): Bucket C sessions + anything you're still iterating on.

> Archiving is reversible and never touches transcripts. Confirm the list before any archive action.
