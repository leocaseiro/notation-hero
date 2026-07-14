import { and, asc, eq, inArray } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { playable } from '../lib/catalog-schema';
import { createDb } from '../lib/db';
import { CatalogDataTable } from './catalog-table';
import type { CatalogItem } from './catalog-table';

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
  // Durable cache stored in the platform runtime cache (Vercel), shared across all server
  // instances — unlike plain `'use cache'`, which is in-memory per instance and re-hits Neon on
  // every cold start. Busted on demand with `revalidateTag('catalog')`; otherwise self-heals
  // within the `'days'` window.
  'use cache: remote';
  cacheTag('catalog');
  cacheLife('days');

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
    // Deterministic order so the cached snapshot is stable (easiest first, then A–Z).
    .orderBy(asc(playable.level), asc(playable.title))
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

async function CatalogList() {
  // Defer to request time: the build prerenders the static shell (below) without needing
  // DATABASE_URL, and the cached read runs at request time (hitting Neon only on a cache miss).
  await connection();
  const items = await getCatalog();

  return (
    <>
      <p className="text-muted-foreground">
        {items.length} {items.length === 1 ? 'piece' : 'pieces'} available
      </p>
      <CatalogDataTable data={items} />
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="h-64 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogList />
      </Suspense>
    </main>
  );
}
