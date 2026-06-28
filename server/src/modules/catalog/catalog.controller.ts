import { neon } from '@neondatabase/serverless';
import { Controller, Get, Header } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { playable } from '../../adapters/neon-postgres/catalog.schema';

export interface CatalogPlayable {
  id: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  /** Difficulty band label (Debut / Beginner 1-3 / Intermediate 4-6 / ...). */
  difficulty: string;
}

export interface CatalogResponse {
  items: CatalogPlayable[];
  count: number;
}

/**
 * N-14 band map (display-only): level 0 = Debut, 1-3 Beginner, 4-6 Intermediate, 7-8 Advanced,
 * 9-10 Expert; null = Ungraded. A lookup over playable.level — no join.
 */
export function toDifficulty(level: number | null): string {
  if (level === null) return 'Ungraded';
  if (level === 0) return 'Debut';
  const n = String(level);
  if (level <= 3) return `Beginner ${n}`;
  if (level <= 6) return `Intermediate ${n}`;
  if (level <= 8) return `Advanced ${n}`;
  return `Expert ${n}`;
}

// Lazily build + memoize the neon-http client (the nh_app url). Lazy so module import never
// connects (keeps unit tests + cold-start import side-effect-free); HTTP is per-query, no pool.
let db: ReturnType<typeof drizzle> | undefined;
function getDb(): ReturnType<typeof drizzle> {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set (the nh_app connection string).');
    db = drizzle(neon(url));
  }
  return db;
}

@Controller('catalog')
export class CatalogController {
  // Validation target (NH-79): a typed Drizzle select against Neon — proves the Lambda -> Neon
  // path. The real read API (oRPC contract, filters, pagination) is NH-123. Cache-Control is
  // forward-compat for the NH-247 edge cache; CORS is deferred to NH-250. A DB failure surfaces as
  // a generic 503 (never a 200) via the global DbExceptionFilter — see entry/db-exception.filter.ts.
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  async list(): Promise<CatalogResponse> {
    const rows = await getDb()
      .select({
        id: playable.id,
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
      .limit(50);

    const items: CatalogPlayable[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      // kind is constrained to song|lesson|pattern by the WHERE allow-list above, so this cast is
      // safe by construction (Drizzle still widens the column type to the full union).
      kind: row.kind as CatalogPlayable['kind'],
      difficulty: toDifficulty(row.level),
    }));
    return { items, count: items.length };
  }
}
