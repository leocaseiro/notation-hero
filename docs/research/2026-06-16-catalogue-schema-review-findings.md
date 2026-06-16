# Catalogue Schema — Review Findings (pending schema validation)

> **Status:** 🟡 OPEN — schema-dependent findings surfaced by the 2026-06-16 `ce-doc-review` of the Catalogue CRUD plan. The schema spec (`docs/specs/2026-06-10-catalogue-schema.md`) is **NOT yet fully validated** (leocaseiro, 2026-06-16), so these are parked here to resolve when the schema is finalised — deliberately **kept out of the plan** until then.
> **Source review:** `ce-doc-review` of `docs/plans/2026-06-16-001-feat-catalogue-crud-fastify-plan.md`.
> **Owner:** leocaseiro

---

## Context

The plan assumes the schema spec is authoritative. The findings below hinge on schema columns/constraints that aren't locked yet, so applying them to the plan now would bake in unvalidated assumptions. Resolve each against the schema spec, then fold the resolution into the plan.

---

## SCH-1 — `source` provenance: meaning, NOT-NULL default, and write-once enforcement

**What `source` actually is (clarification).** `catalogue_item.source` is the **provenance** flag: `'curated'` (you / the team added it) vs `'user-upload'` (a user uploaded it — M1, deferred). It is **NOT** the notation source — that's `notation_key` (the S3 `.gp`/`.xml` file for songs) or `notation_tex` (inline alphaTex for lesson steps). `source` answers *"who put this in the catalogue,"* not *"where's the music data."*

**Why it exists (schema §5 / §12).** The publish gate `ci_shared_curated CHECK (status<>'published' OR source='curated')` means only curated items can be published to the shared catalogue; user-uploads stay private-per-user. `source` is the flag that enforces "the public catalogue is curated-only," and the schema marks it **write-once** (set at ingest, never editable) so a `user-upload` can't be relabelled `curated` to sneak in.

**Open questions to resolve when validating the schema:**
- `source text NOT NULL` has **no DEFAULT** (§4). Default it to `'curated'` (so the K-3 curated-API path needn't pass it), or keep it explicit?
- Write-once enforcement: **API-contract only** (create sets it, update excludes it) vs a **DB trigger**? §5 says "enforce in the K-1/K-3 API contract, **or** a DB trigger" — pick one.
- The plan's domain entity (`CatalogueItem`, Task R.1) currently omits `source`; whatever you decide, the entity + mapper + create command must carry it, and the insert fails (NOT NULL) until they do.

**Plan impact once resolved:** add `source` to the entity, set it server-side on create, exclude it from update. *(Was finding F6.)*

---

## SCH-2 — keyset pagination index missing from §9

**What.** The plan picks keyset pagination on `(updated_at, id)` ("no deep-OFFSET scan"), but schema §9 defines only the single-column `ci_updated ON catalogue_item (updated_at)` — no composite index. The keyset query (`(updated_at,id) < ($cur_ts,$cur_id)` ORDER BY `updated_at DESC, id DESC`) falls back to a sort.

**Resolution.** Add `CREATE INDEX ci_keyset ON catalogue_item (updated_at DESC, id DESC)` to schema §9 (and thus the generated migration). Correctness is unaffected (the `id` tiebreak handles `updated_at` ties); this is purely the efficiency the keyset design names. Harmless at tiny scale.

**Plan impact once resolved:** the migration hand-edit (Task 0.5 Step 3) picks it up with the other §9 indexes. *(Was finding F8.)*

---

## SCH-3 — `notation_key` required-for-songs not enforced at the API

**What.** §4 has `ci_song_file CHECK (type<>'song' OR notation_key IS NOT NULL)`. The plan's create command (Task CU.2) validates `bpm` for songs (`ci_song_bpm`) but is silent on `notation_key` — so a `POST` of a song with no `notation_key` reaches the DB and returns a raw constraint violation (500) instead of a clean domain `422`.

**Resolution.** Mirror the `bpm` check — in `makeCreateCatalogueItem`, reject a song without `notation_key` with `ItemValidationError` → 422. (Confirm `ci_song_file` stays in the validated schema.)

**Plan impact once resolved:** one validation line in the create command. *(Was finding SG2.)*

---

## SCH-4 — archived-source resolver (§6 D2) deferred with lesson-steps

**What.** §6 requires the K-3 API to verify a song-breakdown slice's source song is `status='published'` before serving it (so an archived / de-licensed song can't keep serving through a lesson back-door). The plan's Phase R read API has no such resolver.

**Resolution (low urgency).** This only applies to song-breakdown **slices**, which need the `exercise` table — **explicitly deferred** in v1 (first migration = `catalogue_item` only). So the resolver correctly belongs to the future lesson-steps phase, NOT Phase R. Action = a one-line note in the plan that §6's resolver ships with lesson-steps, so no one mistakes Phase R's read API for the final word.

**Plan impact once resolved:** a deferral note (the resolver itself is out of v1 scope). *(Was finding F16.)*

---

## Not in this doc

The plan review's **non-schema** findings — admin gate, deploy build/stack/secret, CI dry-run, rate-limit key, module-scope init, OIDC roles, fake-repo test fidelity, warmer/controller scope, file naming — are handled directly against the plan; they don't depend on schema validation.
