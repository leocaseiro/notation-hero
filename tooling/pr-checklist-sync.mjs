// tooling/pr-checklist-sync.mjs — appends MISSING canonical checklist items to a PR body.
// Additive only: never edits/removes existing lines; appended boxes are unticked (the strict
// pr-checklist gate still forces the tick). Spec: docs/specs/2026-06-24-pr-checklist-auto-inject.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalItems, stripNoise, missingItems } from './pr-checklist-lib.mjs';

// Pure over its inputs. Returns the new body + the labels appended (empty ⇒ no change).
export function ensureChecklist(body, canonical) {
  const missing = missingItems(stripNoise(body), canonical);
  if (missing.length === 0) return { body, appended: [] };
  const lines = missing.map((label) => `- [ ] ${label}`);
  const hasHeading = /^##\s+Checklist\s*$/m.test(body);
  const base = body.replace(/\s+$/, '');
  const block = hasHeading
    ? `\n${lines.join('\n')}`
    : `${base ? '\n\n' : ''}## Checklist\n\n${lines.join('\n')}`;
  return { body: `${base}${block}\n`, appended: missing };
}

// CLI: node pr-checklist-sync.mjs <body-file> <out-file>
// Writes the synced body to <out-file>; prints the appended count (0 ⇒ caller skips the edit).
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , bodyFile, outFile] = process.argv;
  if (!bodyFile || !outFile) {
    console.error('usage: pr-checklist-sync.mjs <body-file> <out-file>');
    process.exit(2);
  }
  const { body, appended } = ensureChecklist(readFileSync(bodyFile, 'utf8'), canonicalItems());
  writeFileSync(outFile, body);
  console.log(String(appended.length));
}
