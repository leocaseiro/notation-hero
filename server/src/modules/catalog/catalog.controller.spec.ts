import { Test } from '@nestjs/testing';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CATALOG_DB, createCatalogDb } from '../../adapters/neon-postgres/catalog-db.adapter';
import { CatalogController } from './catalog.controller';

// With the db injected via CATALOG_DB (NH-79 review F12), the test overrides the provider with a fake
// query chain — no driver-module mock, no module-registry reset. The spies record the .where()
// predicate + the .limit() bound so a regression that drops the access filter or the cap is caught;
// the fake chain itself ignores the arguments. The CONTENT of the predicate is asserted by the
// skipped Neon integration block at the bottom (review F2).
function makeDb(rows: unknown[]): {
  db: unknown;
  spies: { where: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> };
} {
  const spies = { where: vi.fn(), limit: vi.fn() };
  const limited = {
    limit: (n: number) => {
      spies.limit(n);
      return Promise.resolve(rows);
    },
  };
  const filtered = {
    where: (condition: unknown) => {
      spies.where(condition);
      return limited;
    },
  };
  const selected = { from: () => filtered };
  const db = { select: () => selected };
  return { db, spies };
}

async function makeController(
  rows: unknown[],
): Promise<{ controller: CatalogController; spies: ReturnType<typeof makeDb>['spies'] }> {
  const { db, spies } = makeDb(rows);
  const moduleRef = await Test.createTestingModule({
    controllers: [CatalogController],
    providers: [{ provide: CATALOG_DB, useValue: db }],
  }).compile();
  return { controller: moduleRef.get(CatalogController), spies };
}

const fakeRows = [
  {
    id: 'pat_ssr_debut',
    slug: 'single-stroke-roll-debut',
    title: 'Single Stroke Roll (Debut)',
    kind: 'pattern',
    level: 0,
  },
  { id: 'song_demo', slug: 'demo-song', title: 'Demo Song', kind: 'song', level: 4 },
  {
    id: 'lesson_x',
    slug: 'ungraded-lesson',
    title: 'Ungraded Lesson',
    kind: 'lesson',
    level: null,
  },
];

describe('CatalogController (DB-backed thin read)', () => {
  it('maps rows to the catalog envelope, deriving difficulty from level', async () => {
    const { controller } = await makeController(fakeRows);
    const res = await controller.list();
    expect(res.count).toBe(3);
    expect(res.items[0]).toEqual({
      id: 'pat_ssr_debut',
      slug: 'single-stroke-roll-debut',
      title: 'Single Stroke Roll (Debut)',
      kind: 'pattern',
      difficulty: 'Debut',
    });
    expect(res.items[1]?.difficulty).toBe('Intermediate 4');
    expect(res.items[2]?.difficulty).toBe('Ungraded');
  });

  it('applies a WHERE access filter and caps the result at 50', async () => {
    const { controller, spies } = await makeController(fakeRows);
    await controller.list();
    // A predicate is passed to .where() (the curated + published + listable access boundary) and the
    // result set is capped. Full predicate-content assertion is the Neon integration block below.
    expect(spies.where).toHaveBeenCalledTimes(1);
    expect(spies.where.mock.calls[0]?.[0]).toBeDefined();
    expect(spies.limit).toHaveBeenCalledWith(50);
  });

  it('throws if the query ever returns a kind outside the response union (F4 guard)', async () => {
    const { controller } = await makeController([
      { id: 'part_x', slug: 'a-part', title: 'A Part', kind: 'part', level: 2 },
    ]);
    await expect(controller.list()).rejects.toThrow(/unexpected kind/);
  });
});

// F2: the WHERE clause is the public-read security boundary, but the unit tests above mock the db, so
// a dropped predicate would still pass them. This DB-backed test proves the EXCLUSION against a real
// Neon branch — skipped unless DATABASE_URL is set (the same gate the F-3 validation used; never run
// against prod). It seeds one row that MUST appear plus three that MUST NOT (draft, non-listable,
// user-upload — all kind=pattern so they need no FK parents/notation), runs the real query, cleans up.
const integrationUrl = process.env.DATABASE_URL;
describe.skipIf(!integrationUrl)('CatalogController (integration — real Neon)', () => {
  const included = { id: 'test_incl_ok', slug: 'test-incl-ok' };
  const excluded = [
    {
      id: 'test_excl_draft',
      slug: 'test-excl-draft',
      status: 'draft',
      listable: true,
      origin: 'curated',
    },
    {
      id: 'test_excl_hidden',
      slug: 'test-excl-hidden',
      status: 'published',
      listable: false,
      origin: 'curated',
    },
    {
      id: 'test_excl_upload',
      slug: 'test-excl-upload',
      status: 'published',
      listable: true,
      origin: 'user-upload',
    },
  ];
  let sql: ReturnType<typeof postgres> | undefined;

  beforeAll(async () => {
    if (!integrationUrl) return;
    sql = postgres(integrationUrl, { max: 1, connect_timeout: 30 });
    await sql`INSERT INTO playable (id, kind, title, slug, status, listable, origin)
      VALUES (${included.id}, 'pattern', 'TEST included', ${included.slug}, 'published', true, 'curated')
      ON CONFLICT (id) DO NOTHING`;
    for (const row of excluded) {
      await sql`INSERT INTO playable (id, kind, title, slug, status, listable, origin)
        VALUES (${row.id}, 'pattern', ${`TEST ${row.id}`}, ${row.slug}, ${row.status}, ${row.listable}, ${row.origin})
        ON CONFLICT (id) DO NOTHING`;
    }
  });

  afterAll(async () => {
    if (!sql) return;
    await sql`DELETE FROM playable WHERE id IN ${sql([included.id, ...excluded.map((r) => r.id)])}`;
    await sql.end();
  });

  it('returns the curated+published+listable row and excludes draft/non-listable/user-upload', async () => {
    const controller = new CatalogController(createCatalogDb());
    const res = await controller.list();
    const ids = new Set(res.items.map((item) => item.id));
    expect(ids.has(included.id), 'a curated+published+listable row must appear').toBe(true);
    for (const row of excluded) {
      expect(ids.has(row.id), `${row.id} must be excluded by the WHERE`).toBe(false);
    }
  });
});
