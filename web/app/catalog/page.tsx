import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { fetchCatalog } from '../lib/catalog';
import { CatalogDataTable } from './catalog-table';
import type { CatalogItem } from '@notation-hero/shared';

async function getCatalog(): Promise<CatalogItem[]> {
  // Durable cache in the platform runtime cache (Vercel), shared across all server instances —
  // unlike plain 'use cache', which is in-memory per instance and re-hits the origin on every cold
  // start. Busted on demand with revalidateTag('catalog') (the admin publish/refresh button ships
  // with the CMS work — spec §6); otherwise self-heals within the 'days' window. The Neon read now
  // lives behind the server API (GET /api/catalog); web is a pure cached consumer (NH-279).
  'use cache: remote';
  cacheTag('catalog');
  cacheLife('days');

  return fetchCatalog();
}

async function CatalogList() {
  // Defer to request time: the build prerenders the static shell (below) without needing the API,
  // and the cached read runs at request time (hitting the Lambda only on a cache miss).
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
