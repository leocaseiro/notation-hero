---
title: Markdownlint errors far from your edit mean consistent-style re-anchoring
date: 2026-07-02
category: developer-experience
module: docs
problem_type: developer_experience
component: tooling
severity: low
applies_when:
  - 'markdownlint or prettier reports errors on lines you did not touch'
  - 'Editing a heavily-formatted Markdown file with tables and mixed emphasis'
  - 'Adding emphasis or a table row to docs/decisions/decision-registry.md or a similar long doc'
tags: [markdownlint, md049, emphasis-style, prettier, docs, debugging]
---

# Markdownlint errors far from your edit mean consistent-style re-anchoring

## Context

Adding a small change-log entry to `docs/decisions/decision-registry.md` produced **132 markdownlint MD049 errors** — none on the inserted lines, all on pre-existing content far below. The file was clean before the edit. Two distinct edits cause this "errors everywhere except where I edited" symptom: an emphasis-style mismatch, and a malformed table row.

## Guidance

When markdownlint or prettier flags lines you did not touch, suspect a **document-wide re-anchoring**, not a local typo.

- **MD049 / MD050 `consistent` style.** With `default: true` and no explicit `style`, the first emphasis marker in the file sets the expected style for the whole document. This registry uses underscore italics (`_x_`). Inserting asterisk italics (`*x*`) near the top re-anchored the expected style to asterisk, flagging every pre-existing underscore italic below. **Fix:** match the file's existing emphasis convention.
- **Malformed table row.** A row with the wrong number of cells breaks table parsing, so markdownlint re-reads the rest of the doc as prose and flags underscores in downstream cells as emphasis. **Fix:** match the table's column count exactly.
- **Diagnose by bisecting your own edits.** Apply each edit in isolation (`git checkout` the file between tries) and re-run the linter to see which single edit produces the cascade. The error count jumps on the culprit.

## Why This Matters

The reported line numbers point at innocent, pre-existing content, so the natural instinct — "the repo was already broken" or "it's a CI-versus-local version gap" — is wrong and wastes time. The real cause is your edit changing a document-global parse or style anchor. Recognizing the pattern turns a confusing 100-plus-error dump into a one-line fix.

## When to Apply

- Any large, heavily-formatted Markdown file (decision registries, big tables, generated docs).
- When the fix hook (`markdownlint-cli2 --fix` with `stage_fixed: true`) wants to rewrite dozens of unrelated lines — that is the same re-anchoring, auto-fixing.

## Examples

- **Symptom:** 132 MD049 errors across lines 90-678 after a 16-line insertion at line 15; the inserted lines themselves are clean.
- **Root cause:** the change-log used asterisk italics; the file's convention is underscore italics.
- **Fix:** switch the new content to underscore italics to match.
- **Prevention:** pin the style explicitly in `.markdownlint.yaml` (`MD049: {style: underscore}`, `MD050: {style: asterisk}`) so a wrong-style emphasis fails at its own line with a clear message instead of cascading.

## Related

- `.markdownlint.yaml` (rules) and `.markdownlint-cli2.yaml` (discovery and ignores).
- Follow-up task: pin the MD049 / MD050 emphasis styles.
