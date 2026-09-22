-- Phase-2 grants (NH-79). Run as the Neon OWNER (NEON_MIGRATION_URL) AFTER the 8 tables exist
-- (i.e. after the first `db:migrate`), so the least-privilege nh_app role can read/write them. The
-- Lambda's public read returns 403 until this runs. Scriptable — operator OR agent can apply it
-- non-interactively:
--
--   psql "$NEON_MIGRATION_URL" -f server/src/adapters/neon-postgres/phase2-grants.sql
--
-- NEVER widen to GRANT ... ON ALL TABLES / ALTER DEFAULT PRIVILEGES — that would expose
-- __drizzle_migrations to nh_app.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  playable, notation, step, playable_link, track, media, tonal_profile, drum_profile
  TO nh_app;
