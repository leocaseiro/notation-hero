| Field               | Value                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| **Date documented** | 2026-06-18                                                                                           |
| **Origin**          | drum-tutor-clone (early exploration phase; project later renamed Notation Hero)                      |
| **Status**          | prior-art — research only, never built; feature was DEFERRED/nice-to-have in that era                |
| **Source sessions** | `~/.claude/projects/*drum-tutor-clone*/**/*.jsonl` (office-hours / scope.md / lean-plan brainstorms) |

---

## TL;DR

In the drum-tutor-clone phase, Leo proposed a **"song search by reference"** feature: instead of hosting song files, a catalog entry would store a **`{source + id}`** pair (e.g. `source = "songsterr"`, `id = 12345`) that **points at an external tab source** (Songsterr, Ultimate Guitar, …). His words: _"we could use the same approach from tablatures which searchs songs via songsterr api, ultimate guitar and so on, and perhaps save an id for each song."_

The plan-side reasoning landed on four durable points:

1. **Reference, don't host.** Store a tiny `source + id` per song. This **dovetails with sync-by-reference** — a few bytes sync cheaply across devices, while real file blobs are deferred to Storage later.
2. **First feature that needs a server.** External sources can't be called from the browser (**CORS + unofficial/scraped APIs**), so this is the **first feature that genuinely justifies a tiny serverless proxy** (framed then as Cloud Function / Cloudflare Worker; today → Lambda).
3. **Two banked caveats:** **ToS/legal gray area** (esp. Ultimate Guitar, which guards its tabs) and **scraper fragility** (unofficial endpoints break when sites change).
4. **Reference project exists.** The open-source **`tablatures` / `tablatures-api`** repos already implement per-source adapters (Songsterr, Ultimate Guitar). Cloned locally; to be studied **for approach only**, license checked before reusing any code.

It was explicitly **deferred** (nice-to-have / later), **not MVP**. This is **distinct from the current Notation Hero catalog** (first-party content search) — it's about _importing/referencing third-party external sources_.

---

## Findings / spec (as captured then) — labeled prior art

### 1. The data model: `source + id` (catalog-by-reference)

The proposal was to **not host the song file** at all in the common case, but to store a reference:

> _"store a **`source + id`** per song (dovetails with sync-by-reference)."_ — scope.md §7

> _"Your '**save a `source + id` per song**' idea is exactly right and dovetails with sync-by-reference."_ — assistant reply

Shape (reconstructed from the discussion — never formalized in code):

```
song_reference = {
  source: "songsterr" | "ultimate_guitar" | ...,   // which external catalog
  id:     "<external song id>"                       // that catalog's own id
}
```

A catalog entry therefore had **two possible backings**, discussed as a spectrum:

| Backing                         | What's stored                  | Cost / sync                   | Notes                                                              |
| ------------------------------- | ------------------------------ | ----------------------------- | ------------------------------------------------------------------ |
| **By reference** (this feature) | `{source, id}` only            | tiny — syncs cheaply per-user | needs the server proxy to resolve at play time; ToS/fragility risk |
| **Hosted file** (uploads)       | actual GP/MIDI blob in Storage | heavy — deferred to Storage   | "File upload" was a _separate_ deferred nice-to-have               |

The reference model was repeatedly tied to the **sync-by-reference** idea: per-user synced data was meant to stay **small** — _"scores, streaks, settings, and song references (a `source + id` per song)"_ — with _"big file blobs deferred until uploads matter."_

### 2. Why it needs a server-side proxy (the architectural trigger)

> _"Song search … is the **first feature that genuinely needs a tiny server-side proxy** — those sources can't be called from the browser (**CORS + unofficial/scraped APIs**), so you'd add a small serverless function (Cloud Function / Cloudflare Worker)."_

So in the drum-tutor-clone architecture, this feature was the **first thing that broke the "static SPA, no backend" simplicity** and justified standing up a serverless function. (Carry-forward note: today the backend is NestJS-on-Lambda, so the "first server" framing is moot — but the _reason_ a browser can't hit Songsterr/UG directly still holds: CORS + unofficial endpoints.)

### 3. The reference project: `tablatures` + `tablatures-api`

Leo pointed at an existing open-source project that already does exactly this:

> _"the same approach from tablatures which searchs songs via songsterr api, ultimate guitar and so on …"_

Repos (cloned locally at the time):

- **Frontend:** `github.com/tablatures/tablatures` → local clone `~/Sites/tablatures` (referenced for _"how the FE uses"_ the API)
- **API / sources:** `github.com/tablatures/tablatures-api` → local clone `~/Sites/tablatures-api`
- **Per-source adapters** (Python) called out specifically:
  - `api/services/sources/songsterr_source.py`
  - `api/services/sources/ultimate_guitar_source.py`

The plan was to **study them only when search is actually built** — not before — and to treat them as **approach prior art, not code to copy**:

> _"I'll study them when we build search — no need yet, and I'll **check their license before reusing anything (likely copyleft)**. Same respect as your own code: read for approach, copy nothing without your OK."_

(Note: this documenter did **not** open those repos — read-only task. The license is still unverified; see Re-verify.)

### 4. The two caveats (banked for build time)

> _"Two caveats to bank now: **ToS/legal gray area** (Ultimate Guitar in particular guards its tabs) and **fragility** (scrapers break when sites change)."_

- **Legal / ToS:** Songsterr was framed as the more **API-like / friendlier** source; **Ultimate Guitar** as the one that **guards its tabs** → the riskier one to scrape. The whole feature was flagged **⚠️ ToS/legal gray area** in scope.md.
- **Scraper fragility:** the endpoints are **unofficial / scraped**, so they **break when the source sites change** — an ongoing maintenance liability, not a one-time build.

### 5. Status: deferred, not MVP

In the drum-tutor-clone scope.md, this lived under **§7 Nice-to-haves / later**, grouped with:

> _"File upload · Song search (Songsterr/UG) · Native low-latency Windows audio · Android native wrapper"_ — all **💤 Deferred (nice-to-have/later)**.

And in the open-decisions framing it was never on the MVP critical path — the MVP was the AlphaTab core + scoring loop on a single Guitar Pro file.

---

## Decisions reached then (prior art — may be superseded)

1. **Adopt the `source + id` reference model** for catalog entries — _"exactly right"_ — instead of hosting files for the search case. ✅ (conceptually endorsed)
2. **Reference syncs; blobs don't (yet).** Keep synced per-user data small (`source + id` refs); defer file-blob sync/upload to Storage. ✅
3. **A server proxy is required** for this feature; it was the designated _first_ serverless function in that era. ✅ (architecturally; host choice now changed)
4. **Use `tablatures` / `tablatures-api` as approach reference only**; check license before reusing code; build the integration _only when search is actually scheduled_. ✅ (deferred study)
5. **Defer the whole feature** out of MVP. ✅
6. **Bank the ToS + fragility risks** explicitly so they aren't a surprise at build time. ✅

> Important: the _backend spine_ context around these sessions (Firebase vs Supabase, Legend-State vs RxDB, Cloudflare Worker) is from the old exploration and is **superseded** by the current Notation Hero stack (DynamoDB + Neon Postgres, Dexie offline, NestJS-on-Lambda, oRPC/Drizzle). The **`source + id` reference idea and the ToS/proxy/fragility findings survive**; the infra wrapping does not.

---

## Distinction from the current Notation Hero catalog

This prior art is **NOT** the catalog work happening now. They are two different things:

|                     | This prior art (catalog-by-reference)                         | Current Notation Hero catalog                              |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| **What it indexes** | third-party external sources (Songsterr/UG) by `{source, id}` | first-party / owned content (the Playable model)           |
| **Storage**         | a reference; resolve via proxy at play time                   | Neon Postgres (catalog) + DynamoDB (per-user)              |
| **Search purpose**  | _import_ a song from an external tab site                     | _find a piece to play_ within owned catalog (find-a-piece) |
| **Legal posture**   | ToS / scraping gray area                                      | first-party, no third-party ToS exposure                   |
| **Status**          | deferred nice-to-have, never built                            | active, first real feature                                 |

If external-source import is ever revived, it should be modeled as an **import/reference layer that feeds INTO** the current catalog (an external `{source,id}` becomes one possible backing of a Playable), not as a replacement for it.

---

## Re-verify before building (2026 — time-sensitive)

- [ ] **Ultimate Guitar / Songsterr ToS + anti-scraping posture** — the "legal gray area" call was era-based. Re-read current Terms; confirm whether scraping/referencing is permitted, and whether _referencing an id_ (vs _serving the tab_) materially lowers exposure.
- [ ] **Does Songsterr have an official/public API now?** The tablatures-api adapters used unofficial/scraped endpoints. Check for an official API before relying on scraping.
- [ ] **License of `tablatures` + `tablatures-api`** — never verified (assumed possibly copyleft). Confirm before reusing _any_ code; read-for-approach only otherwise.
- [ ] **Do the source adapters still work?** `songsterr_source.py` / `ultimate_guitar_source.py` rely on fragile endpoints that may have changed since clone. Re-test or expect to rewrite.
- [ ] **Serverless host = AWS Lambda now**, not Cloud Function / Cloudflare Worker. Re-map the proxy onto the current NestJS-on-Lambda backend (one entry point among many).
- [ ] **Backend spine** in source sessions (Firebase/Supabase, Legend-State/RxDB) is superseded — do not carry forward; current stack is DynamoDB + Neon + Dexie + oRPC/Drizzle.
- [ ] **Hosting-vs-referencing liability if distributed as a paid app** — referencing third-party copyrighted tabs vs hosting them carries different exposure; re-confirm before shipping import in any distributed build.

---

## Sources / quotes

All from `~/.claude/projects/*drum-tutor-clone*/**/*.jsonl` (file `c9615811-444a-427a-8e80-a814484b621d.jsonl` and the `serene-grothendieck` / `pensive-boyd` worktrees).

**Leo's original request (user message):**

> _"Same for searching songs, we could use the same approach from tablatures which searchs songs via songsterr api, ultimate guitar and so on, and perhaps save an id for each song._
> `https://github.com/tablatures/tablatures-api/blob/main/api/services/sources/songsterr_source.py`
> `https://github.com/tablatures/tablatures-api/blob/main/api/services/sources/ultimate_guitar_source.py`
> _Just in case you need to figure out how the FE uses, I have just cloned them here: /Users/leocaseiro/Sites/tablatures and /Users/leocaseiro/Sites/tablatures-api"_

**scope.md §7 (Nice-to-haves / later):**

> _"**Song search** (Songsterr / Ultimate Guitar — the `tablatures` project approach): store a **`source + id`** per song (dovetails with sync-by-reference). **Needs a small server-side proxy** (CORS + unofficial/scraped APIs) — the first feature justifying a tiny serverless function (Cloud Function / Cloudflare Worker). ⚠️ **ToS/legal gray area** (esp. Ultimate Guitar) and **scraper fragility**. Reference repos cloned at `~/Sites/tablatures` + `~/Sites/tablatures-api` (check their license before reusing code)."_

**Assistant plan reply (caveats + approach):**

> _"**Song search (Songsterr / Ultimate Guitar, the `tablatures` approach):** this is the first feature that genuinely needs a **tiny server-side proxy** — those sources can't be called from the browser (CORS + unofficial/scraped APIs) … Your 'save a `source + id` per song' idea is exactly right and dovetails with sync-by-reference. Two caveats to bank now: **ToS/legal gray area** (Ultimate Guitar in particular guards its tabs) and **fragility** (scrapers break when sites change). … The `tablatures` repos you cloned: I'll study them when we build search … check their license before reusing anything (likely copyleft)."_

**Sync-by-reference tie-in:**

> _"Sync small data first — scores, streaks, settings, and song references (a `source + id` per song). Defer syncing big file blobs until uploads matter."_

> _"MVP sync = small data (scores, settings, song `source+id` references). Defer big file blobs (uploads) to Storage later."_

**Related local fork list (context — Leo's own repo inventory):** the `tablatures` repo appears as `2025-09-04 tablatures PUBLIC fork` in his cloned-repos listing.
