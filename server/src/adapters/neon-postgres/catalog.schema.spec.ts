import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { playable } from './catalog.schema';

// The migration — NOT this Drizzle file — is the DDL source of truth (ARCH-ORM-1). Read the
// committed CREATE TABLE so the cross-check below binds the hand-written subset to it (NH-79 F8).
// vitest compiles to ESM (no __dirname); the server package is the vitest root, so resolve from cwd.
function playableDdl(): string {
  const sqlPath = path.join(
    process.cwd(),
    'src/adapters/neon-postgres/migrations/0000_playable_init.sql',
  );
  const sql = readFileSync(sqlPath, 'utf8');
  const match = /CREATE TABLE playable \(([\s\S]*?)\n\);/.exec(sql);
  if (!match?.[1]) throw new Error('playable CREATE TABLE not found in 0000_playable_init.sql');
  return match[1];
}

describe('catalog.schema — playable (typed query surface for the thin read)', () => {
  it('exposes the columns the thin read selects and filters on', () => {
    const cols = getTableColumns(playable);
    for (const name of ['id', 'kind', 'title', 'slug', 'listable', 'level', 'status', 'origin']) {
      expect(cols, `missing column: ${name}`).toHaveProperty(name);
    }
  });

  it('maps to the real Postgres table name', () => {
    expect(getTableName(playable)).toBe('playable');
  });

  // F8: catches Drizzle<->SQL drift (a dropped NOT NULL, a renamed column) at test time instead of
  // at a live query failure. Asserts every Drizzle column exists in the DDL with a matching NOT NULL
  // stance — id is NOT NULL via PRIMARY KEY, the rest carry an explicit NOT NULL or are nullable.
  it('matches the migration DDL on column presence + NOT NULL', () => {
    const ddl = playableDdl();
    const ddlLine = (column: string): string => {
      const match = new RegExp(String.raw`^\s*${column}\s+[^\n]*`, 'm').exec(ddl);
      expect(match, `column ${column} absent from the migration DDL`).not.toBeNull();
      return match ? match[0] : '';
    };
    for (const [key, col] of Object.entries(getTableColumns(playable))) {
      const line = ddlLine(col.name);
      const ddlNotNull = /NOT NULL/.test(line) || /PRIMARY KEY/.test(line);
      expect(
        col.notNull,
        `${key}: Drizzle notNull=${String(col.notNull)} disagrees with DDL "${line.trim()}"`,
      ).toBe(ddlNotNull);
    }
  });
});
