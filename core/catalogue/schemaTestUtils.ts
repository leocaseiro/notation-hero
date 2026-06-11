import assert from 'node:assert/strict';
import type { z } from 'zod';

/**
 * Shared boundary-parse assertions for the catalogue entity tests. Extracted at
 * U2.4 (Rule-of-Three: CatalogueItem + Exercise + Pattern all need them). The
 * per-entity `valid*` builders stay LOCAL to each test file — only these two
 * schema-generic helpers are shared.
 *
 * Both take the schema explicitly (rather than closing over one) so a single
 * copy serves every entity.
 */

/**
 * Assert `input` FAILS to parse and return the issue messages. Our refinements
 * set `message = <CHECK name>`, so callers assert e.g. `.includes('pat_level')`.
 */
export const failureCodes = <T>(schema: z.ZodType<T>, input: unknown): string[] => {
  const r = schema.safeParse(input);
  assert.equal(r.success, false, 'expected parse to fail');
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

/** Assert `input` parses OK and return the parsed (branded/transformed) value. */
export const parsed = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const r = schema.safeParse(input);
  assert.equal(r.success, true, r.success ? '' : JSON.stringify(r.error.issues));
  if (!r.success) throw new Error('unreachable');
  return r.data;
};
