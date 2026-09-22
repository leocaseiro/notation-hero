import { boolean, pgTable, smallint, text } from 'drizzle-orm/pg-core';

// Hand-written Drizzle definition of the SUBSET of `playable` columns the NH-79 thin read needs
// (a typed query surface). The full 8-table typed schema + drizzle-zod derivation is NH-123. The
// migration (migrations/0000_playable_init.sql) — NOT this file — is the DDL source of truth.
export const playable = pgTable('playable', {
  id: text('id').primaryKey(),
  // CHECK-enforced in the DDL; typed here so the thin read maps cleanly to the response union.
  kind: text('kind').$type<'song' | 'part' | 'lesson' | 'pattern'>().notNull(),
  title: text('title').notNull(),
  // Friendly URL token, separate from the opaque id (NH-221); UNIQUE + NOT NULL in the DDL.
  slug: text('slug').notNull(),
  listable: boolean('listable').notNull().default(true),
  // Nullable 0–10 grade (N-14 bands); null = ungraded.
  level: smallint('level'),
  status: text('status').$type<'draft' | 'published' | 'archived'>().notNull().default('draft'),
  // Provenance gate for the public read (ARCH-AUTHZ-1): only 'curated' rows are publicly served;
  // user-uploads stay out of the anonymous catalog even when published+listable.
  origin: text('origin').$type<'curated' | 'user-upload'>().notNull().default('curated'),
});
