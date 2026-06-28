import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { playable } from './catalog.schema';

describe('catalog.schema — playable (typed query surface for the thin read)', () => {
  it('exposes the columns the thin read selects and filters on', () => {
    const cols = getTableColumns(playable);
    for (const name of ['id', 'kind', 'title', 'listable', 'level', 'status']) {
      expect(cols, `missing column: ${name}`).toHaveProperty(name);
    }
  });

  it('maps to the real Postgres table name', () => {
    expect(getTableName(playable)).toBe('playable');
  });
});
