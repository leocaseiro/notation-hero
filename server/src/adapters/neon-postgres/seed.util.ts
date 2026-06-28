import { readFileSync } from 'node:fs';
import path from 'node:path';

import postgres from 'postgres';

// Thin, idempotent seed runner: executes the committed seed.sql (every INSERT is ON CONFLICT DO
// NOTHING) over a single TCP connection, inside one transaction. A standalone `tsx` entry point —
// nothing imports it (it has a no-orphans exemption in .dependency-cruiser.cjs). Run from CI via
// the seed-catalog workflow (owner url) or locally against a Neon dev branch.
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — seed with the OWNER url (NEON_MIGRATION_URL).');
  }
  // __dirname (CommonJS — server is `module: nodenext` + CJS output; `import.meta.url` is TS1470).
  // eslint-disable-next-line unicorn/prefer-module -- CJS output: import.meta.url errors under tsc (TS1470)
  const seedPath = path.join(__dirname, 'seed.sql');
  const seedSql = readFileSync(seedPath, 'utf8');
  const sql = postgres(url, { max: 1 });
  try {
    await sql.begin((tx) => tx.unsafe(seedSql));
    console.log('[seed] seed.sql applied (idempotent — re-runs change nothing).');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
