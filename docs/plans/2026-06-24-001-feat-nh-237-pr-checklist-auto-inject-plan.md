# PR Checklist Auto-inject + Resync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-append any missing PR-merge-checklist items to every PR body (on open, and across all open PRs on demand) so no one pastes the checklist by hand, while the existing strict `pr-checklist` gate is left unchanged.

**Architecture:** Extract the gate's parse/match logic into a shared `tooling/pr-checklist-lib.mjs` so the gate and a new additive sync use the _same_ "is this item present?" rule. A new `tooling/pr-checklist-sync.mjs` exposes a pure `ensureChecklist(body, canonical)` that appends only missing items (never edits existing lines, boxes left unticked) plus a thin CLI. A new `.github/workflows/pr-checklist-sync.yml` runs it on `pull_request: opened` (per PR) and fans out across all open PRs on `workflow_dispatch` or a template change pushed to `master`.

**Tech Stack:** Node 24 ESM (`.mjs`, dependency-free), `node:test`, GitHub Actions, `gh` CLI.

## Global Constraints

- **Node 24** from `.nvmrc`; scripts are **dependency-free `.mjs`** run via `actions/setup-node@v6` + `node-version-file: .nvmrc` — the documented dep-free exception (no `pnpm install` in the sync workflow).
- **Do NOT change gate enforcement.** `tooling/pr-checklist.mjs` is refactored only to import shared helpers; the existing `tooling/pr-checklist.test.mjs` (**12 cases**) must stay green.
- **Sync is additive-only:** never edit or remove existing body lines; appended boxes are **unticked**. Idempotent (a compliant PR yields no change).
- Use **`pull_request`**, never `pull_request_target`.
- Conventional Commits; **`NH-237`** in the branch + PR title (in parentheses, e.g. `feat: … (NH-237)` — not a `[NH-237]` prefix). Never `git commit/push --no-verify`.
- kebab-case filenames; new tooling scripts live in `tooling/`.

---

## File Structure

| File                                                | Responsibility                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `tooling/pr-checklist-lib.mjs`                      | **new** — shared: `TASK_RE`, `stripNoise`, `norm`, `canonicalItems`, `parseTasks`, `missingItems`. One source of matching truth. |
| `tooling/pr-checklist-lib.test.mjs`                 | **new** — unit tests for `missingItems` + `canonicalItems`.                                                                      |
| `tooling/pr-checklist.mjs`                          | refactor — import the lib; delete the now-duplicated locals. Behavior identical.                                                 |
| `tooling/pr-checklist-sync.mjs`                     | **new** — `ensureChecklist(body, canonical)` + thin CLI (`<body-file> <out-file>` → prints appended count).                      |
| `tooling/pr-checklist-sync.test.mjs`                | **new** — unit tests for `ensureChecklist`.                                                                                      |
| `.github/workflows/pr-checklist-sync.yml`           | **new** — `opened` + `workflow_dispatch` + template-`push`; `pull-requests: write`; `gh`-driven.                                 |
| `AGENTS.md`                                         | doc note in "PR checklist (CI-gated)".                                                                                           |
| `docs/decisions/decision-registry.md`               | dated change-log entry.                                                                                                          |
| `docs/specs/2026-06-24-pr-checklist-auto-inject.md` | flip status DESIGN → IMPLEMENTED (final step).                                                                                   |

`package.json` needs **no** change — `test:tooling` already globs `tooling/*.test.mjs`.

---

### Task 1: Shared lib + gate refactor (behavior-preserving)

**Files:**

- Create: `tooling/pr-checklist-lib.mjs`
- Create: `tooling/pr-checklist-lib.test.mjs`
- Modify: `tooling/pr-checklist.mjs`
- Test: `tooling/pr-checklist-lib.test.mjs` + existing `tooling/pr-checklist.test.mjs`

**Interfaces:**

- Produces:
  - `TASK_RE: RegExp` (group 1 = check char, group 2 = label)
  - `stripNoise(s: string) => string`
  - `norm(s: string) => string`
  - `canonicalItems(templateUrl?: URL|string) => string[]`
  - `parseTasks(text: string) => {checked: boolean, text: string}[]`
  - `missingItems(body: string, canonical: string[]) => string[]` — canonical labels whose `norm` is not the prefix of any body task's `norm` (same match the gate uses). Caller passes a noise-stripped body.

- [ ] **Step 1: Write the failing lib test**

Create `tooling/pr-checklist-lib.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  missingItems,
  canonicalItems,
  parseTasks,
} from "./pr-checklist-lib.mjs";

test("missingItems returns canonical items not present in the body", () => {
  const canon = ["Alpha claim.", "Beta claim."];
  assert.deepEqual(missingItems("- [x] Alpha claim.", canon), ["Beta claim."]);
});

test("missingItems matches by normalized prefix (trailing detail allowed)", () => {
  const canon = ["Alpha claim."];
  assert.deepEqual(
    missingItems("- [ ] Alpha claim. (see src/foo.ts)", canon),
    [],
  );
});

test("parseTasks reads checked state and label text", () => {
  assert.deepEqual(parseTasks("- [x] done\n- [ ] todo"), [
    { checked: true, text: "done" },
    { checked: false, text: "todo" },
  ]);
});

test("canonicalItems reads every task line from the real PR template", () => {
  const items = canonicalItems();
  assert.ok(items.length >= 10);
  assert.ok(items.every((s) => typeof s === "string" && s.length > 0));
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd <worktree> && node --test tooling/pr-checklist-lib.test.mjs`
Expected: FAIL — `Cannot find module './pr-checklist-lib.mjs'`.

- [ ] **Step 3: Create the lib**

Create `tooling/pr-checklist-lib.mjs`:

````js
// tooling/pr-checklist-lib.mjs — shared parsing/matching for the PR-checklist gate
// (pr-checklist.mjs) and the auto-inject sync (pr-checklist-sync.mjs). One source of
// truth for "what is a task line" and "is a canonical item present", so the gate and the
// sync can never disagree. Spec: docs/specs/2026-06-24-pr-checklist-auto-inject.md (NH-237).
import { readFileSync } from "node:fs";

// A markdown task line: "- [ ] text" / "* [x] text". Group 1 = check char, group 2 = label.
export const TASK_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;

// Strip HTML comments + fenced code blocks so keys/checkboxes hidden in comments or quoted
// samples don't count.
export const stripNoise = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");

// Normalize for matching: collapse whitespace, lowercase.
export const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

// Default template location, relative to this lib file (tooling/ -> ../.github/...).
const DEFAULT_TEMPLATE = new URL(
  "../.github/pull_request_template.md",
  import.meta.url,
);

// Canonical checklist labels, read from the committed PR template (every task line).
export function canonicalItems(templateUrl = DEFAULT_TEMPLATE) {
  const tpl = readFileSync(templateUrl, "utf8");
  const items = [];
  for (const line of tpl.split("\n")) {
    const m = TASK_RE.exec(line);
    if (m) items.push(m[2]);
  }
  return items;
}

// Parse all checkbox task lines from a block of text.
export function parseTasks(text) {
  const tasks = [];
  for (const line of text.split("\n")) {
    const m = TASK_RE.exec(line);
    if (m) tasks.push({ checked: m[1].toLowerCase() === "x", text: m[2] });
  }
  return tasks;
}

// Canonical items NOT present in the body — same match the gate uses (a body task whose
// normalized text starts with the canonical label). `body` should already be noise-stripped.
export function missingItems(body, canonical) {
  const tasks = parseTasks(body);
  return canonical.filter(
    (label) => !tasks.some((t) => norm(t.text).startsWith(norm(label))),
  );
}
````

- [ ] **Step 4: Run the lib test to confirm it passes**

Run: `node --test tooling/pr-checklist-lib.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Refactor `tooling/pr-checklist.mjs` to import the lib**

Apply these exact edits (content-based):

Edit A — replace the fs import with the lib import:

```js
import { readFileSync } from "node:fs";
```

→

```js
import {
  TASK_RE,
  stripNoise,
  norm,
  canonicalItems,
  parseTasks,
} from "./pr-checklist-lib.mjs";
```

Edit B — delete the now-duplicated local `TASK_RE` line (keep `JIRA_RE`):

```js
const JIRA_RE = /\b(?:NH|KAN)-\d+\b/;
const TASK_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;
```

→

```js
const JIRA_RE = /\b(?:NH|KAN)-\d+\b/;
```

Edit C — delete the local `stripNoise` block:

````js
// Strip HTML comments and fenced code blocks so keys/checkboxes hidden in comments or
// quoted samples are ignored — no false-pass on a commented key, no false-fail on a sample.
const stripNoise = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");

const body = stripNoise(rawBody);
````

→

```js
const body = stripNoise(rawBody);
```

Edit D — delete the local `norm` block:

```js
// Normalize for matching: collapse whitespace, lowercase.
const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

// Canonical acknowledgement labels, read from the committed PR template (every task line).
function canonicalItems() {
  const tpl = readFileSync(
    new URL("../.github/pull_request_template.md", import.meta.url),
    "utf8",
  );
  const items = [];
  for (const line of tpl.split("\n")) {
    const m = TASK_RE.exec(line);
    if (m) items.push(m[2]);
  }
  return items;
}
```

→

```js

```

(That entire block is removed — `norm` and `canonicalItems` now come from the lib.)

Edit E — replace the inline body-task loop with `parseTasks`:

```js
// Index the body's checkbox lines (noise already stripped).
const bodyTasks = [];
for (const line of body.split("\n")) {
  const m = TASK_RE.exec(line);
  if (m) bodyTasks.push({ checked: m[1].toLowerCase() === "x", text: m[2] });
}
```

→

```js
// Index the body's checkbox lines (noise already stripped).
const bodyTasks = parseTasks(body);
```

Everything else (the `JIRA_RE` key check, `bodyForKey`, the canonical loop, exit codes) is unchanged. `TASK_RE` and `norm` references now resolve to the imports.

- [ ] **Step 6: Run the full tooling suite — gate behavior preserved**

Run: `pnpm run test:tooling`
Expected: PASS — the existing 12 `pr-checklist` cases **plus** the 4 new lib cases all green.

- [ ] **Step 7: Commit**

```bash
git add tooling/pr-checklist-lib.mjs tooling/pr-checklist-lib.test.mjs tooling/pr-checklist.mjs
git commit -m "refactor(tooling): extract shared pr-checklist lib (NH-237)"
```

---

### Task 2: `ensureChecklist` sync function + CLI

**Files:**

- Create: `tooling/pr-checklist-sync.mjs`
- Test: `tooling/pr-checklist-sync.test.mjs`

**Interfaces:**

- Consumes: `canonicalItems`, `stripNoise`, `missingItems` from `./pr-checklist-lib.mjs`.
- Produces: `ensureChecklist(body: string, canonical: string[]) => { body: string, appended: string[] }` — appends each missing canonical item as a `- [ ] <label>` line under `## Checklist` (created at the end if absent); never edits existing lines; returns the new body + the labels appended (empty ⇒ unchanged input body). CLI: `node pr-checklist-sync.mjs <body-file> <out-file>` writes the synced body to `<out-file>` and prints the appended count to stdout.

- [ ] **Step 1: Write the failing sync test**

Create `tooling/pr-checklist-sync.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureChecklist } from "./pr-checklist-sync.mjs";
import { missingItems, stripNoise } from "./pr-checklist-lib.mjs";

const CANON = ["Item one.", "If this PR changed UI, I did X.", "Item three."];

test("appends all items, unticked, when body has no checklist; prose preserved", () => {
  const { body, appended } = ensureChecklist(
    "## What & why\nDid a thing.",
    CANON,
  );
  assert.equal(appended.length, 3);
  assert.match(body, /## What & why\nDid a thing\./); // prose untouched
  assert.match(body, /- \[ \] Item one\./);
  assert.equal(missingItems(stripNoise(body), CANON).length, 0); // parity with gate
});

test("no change when body already compliant (idempotent)", () => {
  const compliant =
    "## Checklist\n- [x] Item one.\n- [x] If this PR changed UI, I did X.\n- [x] Item three.";
  const { body, appended } = ensureChecklist(compliant, CANON);
  assert.equal(appended.length, 0);
  assert.equal(body, compliant);
});

test("drift: appends only the missing item and preserves existing ticks", () => {
  const partial =
    "## Checklist\n- [x] Item one.\n- [x] If this PR changed UI, I did X.";
  const { body, appended } = ensureChecklist(partial, CANON);
  assert.deepEqual(appended, ["Item three."]);
  assert.match(body, /- \[x\] Item one\./); // existing tick preserved
  assert.match(body, /- \[ \] Item three\./);
});

test("author's own unrelated checkboxes are not mistaken for canonical items", () => {
  const { appended } = ensureChecklist("## Notes\n- [x] my own todo\n", CANON);
  assert.equal(appended.length, 3); // all canonical still appended
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test tooling/pr-checklist-sync.test.mjs`
Expected: FAIL — `Cannot find module './pr-checklist-sync.mjs'`.

- [ ] **Step 3: Implement `tooling/pr-checklist-sync.mjs`**

```js
// tooling/pr-checklist-sync.mjs — appends MISSING canonical checklist items to a PR body.
// Additive only: never edits/removes existing lines; appended boxes are unticked (the strict
// pr-checklist gate still forces the tick). Spec: docs/specs/2026-06-24-pr-checklist-auto-inject.md.
import { readFileSync, writeFileSync } from "node:fs";
import {
  canonicalItems,
  stripNoise,
  missingItems,
} from "./pr-checklist-lib.mjs";

// Pure over its inputs. Returns the new body + the labels appended (empty ⇒ no change).
export function ensureChecklist(body, canonical) {
  const missing = missingItems(stripNoise(body), canonical);
  if (missing.length === 0) return { body, appended: [] };
  const lines = missing.map((label) => `- [ ] ${label}`);
  const hasHeading = /^##\s+Checklist\s*$/m.test(body);
  const base = body.replace(/\s+$/, "");
  const block = hasHeading
    ? `\n${lines.join("\n")}`
    : `${base ? "\n\n" : ""}## Checklist\n\n${lines.join("\n")}`;
  return { body: `${base}${block}\n`, appended: missing };
}

// CLI: node pr-checklist-sync.mjs <body-file> <out-file>
// Writes the synced body to <out-file>; prints the appended count (0 ⇒ caller skips the edit).
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , bodyFile, outFile] = process.argv;
  if (!bodyFile || !outFile) {
    console.error("usage: pr-checklist-sync.mjs <body-file> <out-file>");
    process.exit(2);
  }
  const { body, appended } = ensureChecklist(
    readFileSync(bodyFile, "utf8"),
    canonicalItems(),
  );
  writeFileSync(outFile, body);
  console.log(String(appended.length));
}
```

- [ ] **Step 4: Run the sync test to confirm it passes**

Run: `node --test tooling/pr-checklist-sync.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Smoke-test the CLI against the real template**

```bash
printf '## What & why\nA change.\n' > /tmp/body.md
node tooling/pr-checklist-sync.mjs /tmp/body.md /tmp/newbody.md   # prints e.g. 12
grep -c '^- \[ \]' /tmp/newbody.md                                 # same count
head -1 /tmp/newbody.md                                            # "## What & why" — prose kept
```

Expected: the printed count equals the number of `- [ ]` lines added, and the original prose is the first line.

- [ ] **Step 6: Commit**

```bash
git add tooling/pr-checklist-sync.mjs tooling/pr-checklist-sync.test.mjs
git commit -m "feat(tooling): append-missing PR checklist sync (NH-237)"
```

---

### Task 3: The sync workflow

**Files:**

- Create: `.github/workflows/pr-checklist-sync.yml`

**Interfaces:**

- Consumes: `tooling/pr-checklist-sync.mjs` CLI; `gh` CLI; `GITHUB_TOKEN`.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/pr-checklist-sync.yml`:

```yaml
name: PR checklist sync

# Appends any MISSING canonical checklist items (from .github/pull_request_template.md) to a
# PR body — additive only, never edits/removes existing lines, boxes left unticked. The strict
# `pr-checklist` gate in ci.yml still requires every box ticked. Does NOT trigger on `edited`,
# so its own body edit can't re-trigger it (no loop). Spec:
# docs/specs/2026-06-24-pr-checklist-auto-inject.md (NH-237).
on:
  pull_request:
    types: [opened]
  workflow_dispatch: {}
  push:
    branches: [master]
    paths: [".github/pull_request_template.md"]

# Least privilege: write only PR bodies. ci.yml stays contents: read.
permissions:
  contents: read
  pull-requests: write

concurrency:
  group: pr-checklist-sync-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: false

jobs:
  sync:
    # Skip bot-authored PRs (mirrors the gate's bot exemption); fan-out events always run.
    if: github.event_name != 'pull_request' || github.event.pull_request.user.type != 'Bot'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - name: Append missing checklist items
        env:
          GH_TOKEN: ${{ github.token }}
          EVENT_NAME: ${{ github.event_name }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          set -euo pipefail
          if [ "$EVENT_NAME" = "pull_request" ]; then
            prs="$PR_NUMBER"
          else
            # Fan-out: every open, non-bot PR.
            prs=$(gh pr list --state open --limit 200 \
              --json number,author \
              --jq '.[] | select(.author.is_bot == false) | .number')
          fi
          for pr in $prs; do
            gh pr view "$pr" --json body --jq '.body' > /tmp/body.md
            count=$(node tooling/pr-checklist-sync.mjs /tmp/body.md /tmp/newbody.md)
            if [ "$count" -gt 0 ]; then
              echo "PR #$pr: appended $count missing checklist item(s)."
              gh pr edit "$pr" --body-file /tmp/newbody.md
            else
              echo "PR #$pr: checklist already complete — no change."
            fi
          done
```

- [ ] **Step 2: Validate the YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-checklist-sync.yml')); print('YAML OK')"`
Expected: `YAML OK`.

- [ ] **Step 3: Prove the end-to-end logic on a real open PR body (dry run, no write)**

```bash
gh pr view 57 --json body --jq '.body' > /tmp/pr57.md
node tooling/pr-checklist-sync.mjs /tmp/pr57.md /tmp/pr57.new.md   # prints the count
diff /tmp/pr57.md /tmp/pr57.new.md || true                          # shows the appended checklist
```

Expected: a non-zero count and a diff that **only adds** `- [ ]` lines (nothing removed). This is exactly what the `workflow_dispatch` fan-out will do to #57. (No `gh pr edit` here — read-only proof.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pr-checklist-sync.yml
git commit -m "ci: add pr-checklist auto-inject + resync workflow (NH-237)"
```

---

### Task 4: Docs — AGENTS.md note + decision-registry entry

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/decisions/decision-registry.md`

- [ ] **Step 1: Add the AGENTS.md note**

In `AGENTS.md`, replace:

```md
checklist-label examples don't count. Un-skippable — the one check with real teeth.

Bots (dependabot etc.) are exempt.
```

with:

```md
checklist-label examples don't count. Un-skippable — the one check with real teeth.

**You no longer paste the checklist by hand.** The `pr-checklist-sync` workflow
(`.github/workflows/pr-checklist-sync.yml`) appends any **missing** items to the PR body when a
PR is opened, and resyncs every open PR when you run its `workflow_dispatch` button or when
`.github/pull_request_template.md` changes on `master`. It only **adds** missing items — it
never edits your text or ticks boxes — so you still tick each box yourself before merge. Fork
PRs are the exception (read-only token): add the checklist manually there.

Bots (dependabot etc.) are exempt.
```

- [ ] **Step 2: Add the decision-registry change-log entry**

In `docs/decisions/decision-registry.md`, insert the following **immediately before** the line `### 2026-06-24 — Schema-delta brainstorm: 4 deltas consolidated on the draft (PR #68)`:

```md
### 2026-06-24 — NH-237 PR-checklist auto-inject + resync (extends NH-16, L6)

Closed the "agents paste the checklist by hand" gap. The merge checklist lives in `.github/pull_request_template.md`, but GitHub auto-fills it only in the web "Open a PR" form — PRs opened by agents/CLI via `gh pr create --body` skip it, so the author had to paste all items to pass the `pr-checklist` gate. New `pr-checklist-sync` workflow + `tooling/pr-checklist-sync.mjs` **append only the missing canonical items** to a PR body (additive — never edits existing lines or ticks boxes) on `pull_request: opened`, and **fan out to every open PR** via a `workflow_dispatch` button or a `push` to `master` that changes the template. Shared `tooling/pr-checklist-lib.mjs` gives the sync and the gate one matching function so they can't disagree; `tooling/pr-checklist.mjs` refactored to import it (behavior identical, 12 tests green). **Enforcement unchanged** — boxes arrive unticked; the strict gate still requires every box `[x]`. Rejected: `mheap/require-checklist-action` (re-adds the `~~N/A~~` escape removed in v1.1) and comment-delivery (would force a gate rewrite); DangerJS stays the NH-16 v2 backlog. Uses `pull_request` (not `pull_request_target`) — fork PRs aren't auto-injected (read-only token; acceptable for a solo repo). Spec: `docs/specs/2026-06-24-pr-checklist-auto-inject.md`. `AGENTS.md` "PR checklist (CI-gated)" updated.
```

- [ ] **Step 3: Verify the docs touch nothing executable**

Run: `pnpm run test:tooling`
Expected: PASS (still 12 + 4 + 4 cases; docs changes don't affect tests).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/decisions/decision-registry.md
git commit -m "docs: note PR checklist auto-inject + registry entry (NH-237)"
```

---

## Final verification & handoff

- [ ] **Flip the spec status** in `docs/specs/2026-06-24-pr-checklist-auto-inject.md`: change `> **Status:** 🟡 DESIGN (2026-06-24) — awaiting review` to `> **Status:** 🟢 IMPLEMENTED (2026-06-24, NH-237)`. Commit: `docs(spec): mark NH-237 implemented`.
- [ ] **Full suite green:** `pnpm run test:tooling` passes.
- [ ] **Lint/format clean:** rely on the lefthook pre-commit (format + layout-guard + secret-scan) that runs on each commit; none bypassed with `--no-verify`.
- [ ] **Open the PR** with `NH-237` in the title (parentheses, Conventional Commit), e.g. `feat: auto-inject + resync the PR merge checklist (NH-237)`. Fill the body with the checklist **ticked** (this PR adds testable code + a decision-log entry, so those conditional items are true).
- [ ] **After merge:** run the `PR checklist sync` workflow's `workflow_dispatch` once to backfill open PRs (#57, #34). Confirm each gets the checklist appended and #64 is a no-op.

**Spec coverage check:** §1 goal → Tasks 2+3; §3 model (append-missing, idempotent, unticked) → Task 2; §4 architecture (lib/sync/workflow) → Tasks 1/2/3; §5 triggers + no-loop + no `pull_request_target` → Task 3; §6 resync/backfill → Task 3 + final step; §7 files → all tasks; §8 alternatives → registry entry (Task 4); §9 test plan → Task 1/2 tests + Task 3 dry run; §10 caveats (fork PRs) → AGENTS.md note (Task 4).

## Execution options

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.
