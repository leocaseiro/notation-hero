// Pure FE<->BE response contract for the catalog read (NH-279). Types only — no runtime, no
// drizzle. This is what lets both the ESM web bundler and the CJS NestJS server consume one
// contract without the ESM/CJS dual-package hazard that a shared drizzle table trips (see the
// 2026-07-14 catalog-read service-boundary ADR).
export interface CatalogItem {
  id: string;
  /** Friendly URL token (NH-221), distinct from the opaque id. */
  slug: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  /** Difficulty band label: Debut / Beginner 1-3 / Intermediate 4-6 / Advanced 7-8 / Expert 9-10 / Ungraded. */
  difficulty: string;
  /** Nullable 0-10 grade (N-14 bands); null = ungraded. */
  level: number | null;
}

export interface CatalogResponse {
  items: CatalogItem[];
  count: number;
}
