import { defineConfig } from 'drizzle-kit';

// DDL-first (ARCH-ORM-1): the raw 8-table SQL under migrations/ is the migration source of truth,
// so we use `drizzle-kit generate --custom` (empty migrations we paste DDL into) — drizzle-kit does
// NOT diff catalog.schema.ts here. `migrate` applies pending SQL over TCP, tracked in
// __drizzle_migrations. DATABASE_URL is ALWAYS the OWNER url (NEON_MIGRATION_URL) in CI — never the
// nh_app url, which has no DDL rights.
//
// ⚠️ NEVER run a plain `drizzle-kit generate` — the meta snapshot is intentionally empty (custom
// migration), so a non-custom generate would diff catalog.schema.ts against nothing and emit a
// bogus "create the tables again" migration. The `db:generate` script hard-codes `--custom`; keep it.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/adapters/neon-postgres/catalog.schema.ts',
  out: './src/adapters/neon-postgres/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
