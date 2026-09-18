---
artifact_contract: 'ce-handoff/v1'
created_at: '2026-09-15T12:22:17Z'
title: 'v0 Plan A review, lap 2 — triage handoff'
summary: 'Seven-persona doc review of Plan A (engine and first sound). 15 findings triaged and applied, plus 12 mechanical fixes, across 9 commits; 6 findings still to triage, then a lap-3 re-review.'
keywords: ['nh-291', 'v0a', 'plan-a', 'ce-doc-review', 'triage', 'alphatab', 'handoff']
cwd: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
resume_focus: 'Triage the 6 open findings in "Still open" with the spec-triage-loop triage skill, then run a lap-3 re-review of the plan.'
repository: 'leocaseiro/notation-hero'
repo_root_sha: '2a593aa2d597'
branch: 'spike/alphatab-nextjs-poc'
head: '9c75c616'
worktree_path: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
---

# v0 Plan A review, lap 2 — triage handoff

**Session objective.** Review
[`docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md`](2026-09-13-v0a-engine-and-first-sound-plan.md)
— Plan A, "engine and first sound" — with `/compound-engineering:ce-doc-review`, then triage the
findings with the `spec-triage-loop` `triage` skill.

**Outcome.** The review (seven personas) applied 7 mechanical fixes and raised 18 findings needing a
decision. Verifying them during triage surfaced 5 more. **15 are decided and applied, 6 are still
open.** Every commit is pushed. The plan's frontmatter records `lap: 2`, `last_applied: P0`. The
approvals are recorded in the decision registry's 2026-09-15 entry.

---

## What landed

Ten commits on `spike/alphatab-nextjs-poc`, all pushed. Each commit message itemises its changes and
the reason for each; this handoff does not repeat them.

| Commit     | What                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| `74035dad` | 7 mechanical fixes from the review's automatic pass                                           |
| `500f2748` | F-1 replace flow (confirm → parse → swap) · F-2 drop handler · F-3 sample directory rename    |
| `27eed536` | F-6 vitest in `web/` · F-10 Drill 2 scope · fixture-generator import                          |
| `1a471a6e` | Real MusicXML and alphaTex fixtures (MuseScore and Tabtify exports)                           |
| `5a886194` | V-3 accept every valid extension · F-4 Q6 closed on the real exports                          |
| `44d32d8b` | F-5 Task 9 becomes the pure selector · F-9 deploy re-check right after vendoring              |
| `149ea24b` | F-16 Turbopack-first D5 wording · F-7 a file opened before the engine loads is kept           |
| `7cd93700` | F-8 engine-import failure replaces the empty state (chosen from a mockup)                     |
| `9c75c616` | F-15 music-font failure detection · V-5 Skeleton comment · F-12 replacement toast · lap state |
| next       | The decision-registry entry, the F-8 mockup, and this handoff                                 |

### Decided and applied (15)

| ID   | Severity     | Decision                                                                                                                                                                  | Alternative rejected                   |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-1  | P0           | Task 11's replace flow follows spec §4: confirm, then parse, then swap. Playback restarts on both cancel and parse failure.                                               | Parse first, then confirm              |
| F-2  | P0           | `acceptDropped` is written like the picker's `accept` helper — the 25 MB check in `readNotation`, then one failure toast — and `PlayerShell.tsx` shows its imports.       | —                                      |
| F-3  | P1           | `git mv web/public/charts web/public/notation` runs in Task 6 Step 1, not Task 2: the spike pages load `/charts/` until Task 3 deletes them.                              | Rename in Task 2                       |
| F-4  | P1           | Real exports are the MusicXML and alphaTex fixtures, and the drum-track test runs on `Punk.gp`, `Punk.mxl` and `Punk.alphatex`.                                           | A hand-written `drums.musicxml`        |
| F-5  | P1           | Task 9 is the pure selector, its unit test and the fixture generator. The `NotationSurface` wiring moves to Task 10 Step 5, typed `notation: OpenNotation \| null`.       | An optional prop; a placeholder `null` |
| F-6  | P1           | `web/` gets vitest `^4.1.9` and `"test": "vitest run"`. Task 9 removes AGENTS.md's "web/ omits test" note.                                                                | Remove the unit test                   |
| F-7  | P1           | A file opened before the engine loads is kept: a `pending` flag, then `await loadAlphaTabEngine()` on the event path (not an effect). The Skeleton shows at once.         | Disable the open controls until ready  |
| F-8  | P1           | An engine-import failure replaces the empty state; the Play button stays where it is, disabled — in v0a and in the later player bar. The spec's failure table is updated. | Replace the Play button                |
| F-9  | P1           | New Task 2 Step 11 re-checks the six generated assets on a Vercel preview, with separate diagnoses for a pnpm-symlink failure and a `buildCommand` that did not run.      | —                                      |
| F-10 | P2, narrowed | Drill 2 stays. One paragraph states that a second bundled copy nothing drives is caught only by the Task 3 lint fence.                                                    | Rewrite the drill                      |
| F-12 | P2           | The replacement toast is shown and resolved inside `requestNotation`, shares one id, and waits one painted frame before the synchronous parse.                            | Resolve it from the render effect      |
| F-15 | P2           | A `loadingerror` listener on `document.fonts`, filtered to the `alphaTab` family, plus a 60 s first-render backstop. A new end-to-end case aborts the font request.       | Timeout only; event only               |
| F-16 | P2           | Task 1 opens with "D5 stands: we stay on Turbopack". The webpack recipe is named only inside the stop condition; the Deferred list drops the closed item (14 → 13).       | Mention no fallback at all             |
| V-3  | new          | The accept list is `.gp .gp3 .gp4 .gp5 .gpx .musicxml .mxl .xml .capx .atex .alphatex`: `.mxml` removed, `.mid` excluded. Spec §4 and Q6 are updated.                     | MusicXML-only fix; keep `.mxml`        |
| V-5  | new          | The `NotationSurface` Skeleton comment no longer claims a font wait that Task 5 removed.                                                                                  | —                                      |

The 12 mechanical fixes: the `useAlphaTabEngine` import; the `Card`/`CardContent` barrel export and
`'use client'`; `data-position` restored in Task 10; Task 6's Interfaces line, Files block and commit;
Task 9's Files block (twice); the PR checklist's step number; Task 2's duplicate "Step 8"; the
generator's `writeFile` import; the File Structure `Card.tsx` row; the drop overlay's alphaTex hint.

---

## Still open — triage these next (6)

Each one is verified. Present each with a Before → After. Items with competing solutions need the full
comparison format.

### F-11 · P1 · The notation surface has no accessible name — needs a role, not just `aria-label`

- **What:** Task 6 Step 4's host `<div ref={hostRef} data-testid="notation-surface">` is the page's main
  content and has no accessible name.
- **Verified trap:** the reviewer suggested `aria-label` on that `div`. In **axe-core 4.12.1**,
  `aria-prohibited-attr` (serious, tag `wcag2a`, which is in the plan's `TAGS`) treats `aria-label` as
  prohibited on a `div` with no role. With no text inside — as before the first render — it is a
  **violation**, so it would break Task 13's axe gate.
- **Decision needed — a role:** `role="img"` hides AlphaTab's SVG text from assistive technology and
  reads the notation as one image. `role="region"` is a named landmark and keeps the SVG content
  exposed. `role="figure"` names the area without being a landmark. Accessibility fixes normally need
  no approval, but this one has competing solutions, so ask.

### F-13 · P2 · One bad file produces three different messages

- **What:** the size check throws "is too large to open", but `OpenFileControl`'s catch replaces it with
  "`<name>` could not be opened." The parse failure says "could not be opened — it is not a score
  format the player reads." The drop handler (F-2) uses "could not be opened." The Global Constraint
  says a rejected file "raises the same unsupported-file toast a parse failure raises."
- **Decision needed:** one message for every path, or one per reason (too large versus not a score).
- **Note:** F-12 already gives the parse-failure toast `id: 'notation-load'`.

### F-14 · P2 · The `@coderline/alphatab` import fence covers `web/` but not `client/`

- **What:** Task 3 adds the `no-restricted-imports` group (with `allowTypeImports`) only to
  `web/eslint.config.mjs`. But `web/next.config.ts` has `transpilePackages: ['@notation-hero/client']`,
  so `client/src` is compiled into `web/`'s bundle, and `client/eslint.config.js` has no such rule.
  Plans B and C put settings and tracks components in `client/`.
- **Proposed:** move the group into `eslint.config.base.mjs`, and prove it fires in `client/` with a
  probe. A related observation suggested a committed canary, like `tooling/check-core-purity-canary.sh`,
  instead of Task 3's throwaway probe.

### F-17 · P2 · Three corrections verified in the plan never reached the spec

The spec is the declared authority and still says:

1. §4 Skeleton: wait on `document.fonts.load('1em Bravura')`. Task 5 measured that it matches zero
   faces, because the face registers as `alphaTab`; the Skeleton lifts on `renderFinished`.
2. §4 data flow and success criterion 9: "AlphaTab's default track". It renders `score.tracks[0]`, the
   first track.
3. §5: Sonner's `openArgs` holds the toast open. Sonner's a11y suite uses the local `ToastOnMount`
   wrapper with `duration: Infinity`.

**Proposed:** edit the spec now, as this lap already did for §4's accept list and failure table, or add
a Task 14 step.

### F-18 · P2 · No loading feedback while a large file parses on the first open

- **What:** the first open parses synchronously before `setNotation`. F-7's `pending` covers only the
  engine wait, and F-12's toast only replacements. A 7-8 MB Guitar Pro file can freeze the page with
  no indicator.
- **Decision needed:** extend F-12's toast and one-frame wait to first opens, or keep `pending` true
  through the parse so the Skeleton shows.

### V-1 · new · Task 11's `eslint-disable-next-line no-alert` does not cover `window.confirm`

- **What:** the directive is followed by 7 more `//` comment lines before
  `const confirmed = window.confirm(`. `eslint-disable-next-line` applies only to the next line, which
  is a comment, so `no-alert` still fires.
- **Proposed:** put a short directive on the line directly above `window.confirm(`, and keep the long
  explanation above it as a plain comment. The plan's own note already says to check this rule.

---

## Observations — no decision needed (7)

- Task 1's MIME check reads a Vercel Deployment Protection 401/403 as a D5 failure; add a branch for it.
- The File Structure table omits the spec and decision-registry edits two tasks make.
- Task 5 says the engine context has five consumers; two components actually consume it.
- Task 3 proves the lint fence with a throwaway probe, not a committed canary (see F-14).
- The `.sf3` CDN-compression half of Q2 is never scheduled; Task 2 Step 11's loop now requests the file.
- `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL` could be pinned in `web/vercel.json`'s `buildCommand`.
- The "nothing leaves this device" copy ships with no test; a same-origin request assertion in Task 13
  would gate it.

## Questions to carry forward

- Pull the deferred bundle-count CI gate into v0? It is the only check that catches a second bundled
  AlphaTab copy that nothing drives (see the Drill 2 paragraph).
- Are Vercel preview URLs public? Task 2 Step 11 and Task 14 request them without authentication, and
  criterion 4 is accepted on one.
- When CSP for `web/` is re-scoped to Vercel, is `connect-src 'self'` the control behind "nothing leaves
  this device"?
- Where does the `.gpx` decompressed-size bound live, given v0 inflates on the main thread inside
  `loadScoreFromBytes`?

---

## Verified facts — do not re-derive

- **AlphaTab 1.8.4 importers**, in order: Guitar Pro 3-5, Guitar Pro 6, Guitar Pro 7-8, MusicXML
  (plain and compressed `.mxl`, verified), Capella, AlphaTex. **No MIDI importer**: `Punk.mid` throws
  "No compatible importer found for file".
- **`web/e2e/fixtures/1-beat.xml` is Guitar Pro 5, not MusicXML.** It starts with
  `FICHIER GUITAR PRO v5.10` and is byte-identical to `resources/charts/1-beat.xml`.
- **`.atex` and `.alphatex` are the same alphaTex text.** AlphaTab's docs recommend `.atex`; Tabtify
  exports `.alphatex`.
- **The fork's accept list** (`~/Sites/alphaTabWebsite`, branch `rhythm-game`, `src/utils.ts` lines 18
  and 40) is `.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.mxml,.xml,.capx` — where the spec's `.mxml` came from.
- **Lint in `web/`** (`eslint --print-config`): `react-hooks/set-state-in-effect` and
  `sonarjs/no-nested-conditional` are **errors**; `@typescript-eslint/no-floating-promises` and
  `no-misused-promises` are **not configured**. Lint runs with `--max-warnings 0`.
- **Music-font failure:** AlphaTab's font checker gets one family (`alphaTab`, no fallback), so a failed
  download is final. In Chromium, `document.fonts.load()` rejects with `NetworkError` and `loadingerror`
  fires within about 5 ms.
- **Corrupt bytes throw:** `not a score`, empty files, random binary and plain prose all throw from
  `loadScoreFromBytes`, so Task 11's corrupt-replacement test is sound.
- **Prettier:** check files from inside the repo, or with `--stdin-filepath`. Checking a copy outside
  the repo skips the repo's config and reports hundreds of false differences.

## How to resume

1. Work in the worktree above, on `spike/alphatab-nextjs-poc`. The tree is clean and pushed.
2. Triage the six open items with the `spec-triage-loop` `triage` skill: a chunk per finding with a
   Before → After, then one picker in the same turn, up to 3 findings plus the catcher. Verify each
   finding against the plan, the spec and the installed packages before presenting it — this lap
   narrowed F-10, moved F-3 to a better task, and caught two suggested fixes that would fail `web/`'s
   lint. For UI placement choices, show a mockup; see F-8's in
   [`docs/mockups/player-engine-error-placement.html`](../mockups/player-engine-error-placement.html).
3. Commit each green batch before presenting the next, and push.
4. After the six, bump the frontmatter's `last_applied` if needed, then run lap 3: re-review the plan
   with `/compound-engineering:ce-doc-review`, giving the decisions table above as the prior-decision
   primer so rejected alternatives are not raised again. The review loop halts at lap 5.
5. Record the remaining approvals in `docs/decisions/decision-registry.md`, next to the 2026-09-15 entry.

Raw lap-2 reviewer output (JSON, outside the repo), if a finding's full evidence is needed:

```text
/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-notation-hero/ce-doc-review-v0a/findings/
```
