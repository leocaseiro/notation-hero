import { boolean, pgTable, smallint, text } from 'drizzle-orm/pg-core';

export const playable = pgTable('playable', {
  id: text('id').primaryKey(),
  kind: text('kind').$type<'song' | 'part' | 'lesson' | 'pattern'>().notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  listable: boolean('listable').notNull().default(true),
  level: smallint('level'),
  status: text('status').$type<'draft' | 'published' | 'archived'>().notNull().default('draft'),
  origin: text('origin').$type<'curated' | 'user-upload'>().notNull().default('curated'),
});
