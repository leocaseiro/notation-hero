// tooling/pr-checklist-lib.mjs — shared parsing/matching for the PR-checklist gate
// (pr-checklist.mjs) and the auto-inject sync (pr-checklist-sync.mjs). One source of
// truth for "what is a task line" and "is a canonical item present", so the gate and the
// sync can never disagree. Spec: docs/specs/2026-06-24-pr-checklist-auto-inject.md (NH-237).
import { readFileSync } from 'node:fs';

// A markdown task line: "- [ ] text" / "* [x] text". Group 1 = check char, group 2 = label.
export const TASK_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;

// Strip HTML comments + fenced code blocks so keys/checkboxes hidden in comments or quoted
// samples don't count.
export const stripNoise = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');

// Normalize for matching: collapse whitespace, lowercase.
export const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// Default template location, relative to this lib file (tooling/ -> ../.github/...).
const DEFAULT_TEMPLATE = new URL('../.github/pull_request_template.md', import.meta.url);

// Canonical checklist labels, read from the committed PR template (every task line).
export function canonicalItems(templateUrl = DEFAULT_TEMPLATE) {
  const tpl = readFileSync(templateUrl, 'utf8');
  const items = [];
  for (const line of tpl.split('\n')) {
    const m = TASK_RE.exec(line);
    if (m) items.push(m[2]);
  }
  return items;
}

// Parse all checkbox task lines from a block of text.
export function parseTasks(text) {
  const tasks = [];
  for (const line of text.split('\n')) {
    const m = TASK_RE.exec(line);
    if (m) tasks.push({ checked: m[1].toLowerCase() === 'x', text: m[2] });
  }
  return tasks;
}

// Canonical items NOT present in the body — same match the gate uses (a body task whose
// normalized text starts with the canonical label). `body` should already be noise-stripped.
export function missingItems(body, canonical) {
  const tasks = parseTasks(body);
  return canonical.filter((label) => !tasks.some((t) => norm(t.text).startsWith(norm(label))));
}
