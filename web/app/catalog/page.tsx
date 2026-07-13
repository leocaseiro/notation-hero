import { and, eq, inArray } from 'drizzle-orm';

import { playable } from '../lib/catalog-schema';
import { createDb } from '../lib/db';
import { CatalogDataTable } from './catalog-table';
import type { CatalogItem } from './catalog-table';

export const revalidate = 300;

function toDifficulty(level: number | null): string {
  if (level === null) return 'Ungraded';
  if (level === 0) return 'Debut';
  const n = String(level);
  if (level <= 3) return `Beginner ${n}`;
  if (level <= 6) return `Intermediate ${n}`;
  if (level <= 8) return `Advanced ${n}`;
  return `Expert ${n}`;
}

async function getCatalog(): Promise<CatalogItem[]> {
  const db = createDb();

  const rows = await db
    .select({
      id: playable.id,
      slug: playable.slug,
      title: playable.title,
      kind: playable.kind,
      level: playable.level,
    })
    .from(playable)
    .where(
      and(
        eq(playable.status, 'published'),
        eq(playable.listable, true),
        eq(playable.origin, 'curated'),
        inArray(playable.kind, ['song', 'lesson', 'pattern']),
      ),
    )
    .limit(50);

  return rows.map((row) => {
    if (row.kind !== 'song' && row.kind !== 'lesson' && row.kind !== 'pattern') {
      throw new Error(`catalog read returned an unexpected kind: ${row.kind}`);
    }
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      kind: row.kind,
      difficulty: toDifficulty(row.level),
      level: row.level,
    };
  });
}

export default async function CatalogPage() {
  const items = await getCatalog();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Catalog</h1>
        <p className="text-muted-foreground">
          {items.length} {items.length === 1 ? 'piece' : 'pieces'} available
        </p>
      </div>
      <CatalogDataTable data={items} />
    </main>
  );
}
