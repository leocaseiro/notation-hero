// tooling/check-error-codes.test.mjs — node --test suite for the error-code drift gate (NH-331).
// Each case seeds one fault the gate exists to catch. A gate nobody has watched fail is a gate
// nobody knows works, and this one guards a rule with no other enforcement: a number handed out
// twice makes every old bug report quoting it ambiguous.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  REFERENCE_PAGE,
  REGISTRY_FILE,
  codesInReferencePage,
  codesInSource,
  duplicates,
  missingFrom,
} from './check-error-codes.mjs';

const PAGE = `# Error codes

## 1xx — opening a file

| Code | Meaning |
| ---- | ------- |
| E101 | Over the size limit. |
| E102 | Unreadable. |

## 9xx — an unexpected crash

| Code | Meaning |
| ---- | ------- |
| E901 | A crash. |

## Retired

| Code | Was |
| ---- | --- |
| E110 | Something that no longer exists. |
`;

test('the reference page splits active rows from retired ones', () => {
  const { active, retired } = codesInReferencePage(PAGE);
  assert.deepEqual(active, ['E101', 'E102', 'E901']);
  assert.deepEqual(retired, ['E110']);
});

test('prose mentioning a code is not mistaken for a table row', () => {
  const withProse = PAGE.replace(
    '## Retired',
    'Every message ends with its number, like E999, in prose.\n\n## Retired',
  );
  assert.equal(codesInReferencePage(withProse).active.includes('E999'), false);
});

test('codesInSource finds every code literal in registry text', () => {
  const source = `export const ERROR = {
    /** doc */
    a: 'E101',
    b: 'E302',
  } as const;`;
  assert.deepEqual(codesInSource(source), ['E101', 'E302']);
});

test('a number used twice is reported', () => {
  assert.deepEqual(duplicates(['E101', 'E302', 'E101']), ['E101']);
  assert.deepEqual(duplicates(['E101', 'E302']), []);
});

test('a code in the registry but missing from the page is reported', () => {
  const { active } = codesInReferencePage(PAGE);
  assert.deepEqual(missingFrom(['E101', 'E303'], active), ['E303']);
});

test('a code active on the page but absent from the registry is reported', () => {
  const { active } = codesInReferencePage(PAGE);
  assert.deepEqual(missingFrom(active, ['E101', 'E102']), ['E901']);
});

test('a retired number with no row under Retired is reported', () => {
  const { retired } = codesInReferencePage(PAGE);
  assert.deepEqual(missingFrom(['E110', 'E120'], retired), ['E120']);
});

// The hole this closes: removing a code from the registry AND the reference page in one commit
// leaves the two agreeing, so every current-state check passes while the number quietly becomes
// available for a second meaning. Only a comparison against history catches it.
test('a number allocated at the base and now in neither list is reported', () => {
  const base = ['E101', 'E102', 'E302', 'E901'];
  assert.deepEqual(missingFrom(base, ['E101', 'E102', 'E901']), ['E302']);
});

test('retiring a number instead of deleting it satisfies the never-reuse rule', () => {
  const base = ['E101', 'E102', 'E302', 'E901'];
  const live = ['E101', 'E102', 'E901'];
  const retired = ['E302'];
  assert.deepEqual(missingFrom(base, [...live, ...retired]), []);
});

test('the paths the gate reads are exported as single constants', () => {
  // Feasibility review: archiving or moving either file should be a one-line repoint here, not a
  // hunt through the script — and AGENTS.md points a future maintainer at these names.
  assert.equal(REFERENCE_PAGE, 'docs/reference/error-codes.md');
  assert.equal(REGISTRY_FILE, 'shared/src/error-codes.ts');
});
