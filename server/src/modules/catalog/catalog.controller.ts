import { Controller, Get, Header, Inject } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { toDifficulty } from './catalog.util';
// Type-only import: erases at runtime, so the CJS server never require()s the ESM shared package
// (the property that keeps the pure contract free of the ESM/CJS dual-package hazard). NH-279.
import type { CatalogItem, CatalogResponse } from '@notation-hero/shared';
import { CATALOG_DB, type CatalogDb } from '@/adapters/neon-postgres/catalog-db.adapter';
import { playable } from '@/adapters/neon-postgres/catalog.schema';

@Controller('catalog')
export class CatalogController {
  // The nh_app neon-http client, injected as a singleton (NH-79 review F12). neon-http is per-query
  // HTTP (no pool), so one client is reused across warm invocations.
  constructor(@Inject(CATALOG_DB) private readonly db: CatalogDb) {}

  // Validation target (NH-79): a typed Drizzle select against Neon — proves the Lambda -> Neon
  // path. The real read API (oRPC contract, filters, pagination) is NH-123. Cache-Control is
  // forward-compat for the NH-247 edge cache; CORS is deferred to NH-250. A DB failure surfaces as
  // a generic 503 (never a 200) via the global DbExceptionFilter — see entry/db-exception.filter.ts.
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  async list(): Promise<CatalogResponse> {
    const rows = await this.db
      .select({
        id: playable.id,
        slug: playable.slug,
        title: playable.title,
        kind: playable.kind,
        level: playable.level,
      })
      .from(playable)
      // Public read = curated + published + listable, enforced at the DB layer (ARCH-AUTHZ-1) — not
      // by seed convention. `listable` hides internal rows (the masked single-voice leaves);
      // `origin = 'curated'` keeps user-uploads out; the kind allow-list keeps the response union
      // honest, so a 'part' row can never leak as an unknown kind.
      .where(
        and(
          eq(playable.status, 'published'),
          eq(playable.listable, true),
          eq(playable.origin, 'curated'),
          inArray(playable.kind, ['song', 'lesson', 'pattern']),
        ),
      )
      // Deterministic default order so the cached web snapshot is stable (easiest first, then A-Z);
      // interactive re-sorting stays client-side (TanStack). NH-279 F1.
      .orderBy(asc(playable.level), asc(playable.title))
      .limit(50);

    const items: CatalogItem[] = rows.map((row) => {
      // The WHERE kind allow-list keeps 'part' out at the DB layer; this guard makes the invariant
      // explicit at the boundary, so if a future change relaxes the filter an unexpected kind throws
      // (-> a generic 503) instead of leaking as an unknown kind (review F4). It also narrows
      // row.kind to the response union, so the previous `as` cast is no longer needed.
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
    return { items, count: items.length };
  }
}
