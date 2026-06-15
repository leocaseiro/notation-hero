# CONCEPTS — NotationHero domain vocabulary

> The shared, plain-language definition of every domain word. **This file = "what the word means."**
> For the exact data shape (columns, types, constraints) see the authoritative schema:
> [`docs/specs/2026-06-10-catalogue-schema.md`](docs/specs/2026-06-10-catalogue-schema.md).
>
> **Status:** 📝 draft (KAN-164). Grounded in the v1 catalogue schema. A few items are flagged
> **⚠ to reconcile** or **TBD** — those are settled by the lesson/steps spike (**KAN-165**), not here.

---

## The catalogue

**Catalogue** — the "find a piece to play" surface: a searchable, browsable library of **Songs** and **Lessons**. It's discovery, not a progress dashboard; score/mastery is a per-row *garnish*.

**Catalogue item** — one entry in the catalogue. Every item is either a **Song** or a **Lesson** (`catalogue_item.type`). Shared facets (title, level, BPM, time signature, genre, instruments, tags…) are common columns so songs and lessons search in one query.

**Curated vs. user-upload** — an item's `source` is either **curated** (admin-authored, the only kind published to the shared catalogue in v1) or **user-upload** (private, per-user; M1). `source` is write-once. Curated curation sidesteps copyright; see also the **Local / unauthenticated play** epic (KAN-163) for playing a local file without uploading at all.

---

## Playable items

### Song
A full piece to play along to. File-backed: the notation is a Guitar Pro / MusicXML file in S3 (`notation_key`), served via a short-lived signed URL. Has a `bpm` (required), optional level, time signature, genre, key, instruments, audio/video links. A song can be practised in parts via a **song-breakdown lesson** (reached *through* the song — "Practice in parts").

### Lesson
A structured, multi-step practice unit. Not file-backed itself — its notation lives on its **Steps**. A lesson has a **lesson type** and an ordered list of Steps, and may link to **Patterns**.
- **Lesson type** (`lesson_type`, open vocab): **song-breakdown** · **beat** · **rudiment**.
  - **song-breakdown** — steps are *slices of a source song* (bar ranges); display labels come from the song's sections ("Chorus 1").
  - **beat** — steps are authored grooves (alphaTex), often layered (hi-hat → +kick → +snare → full).
  - **rudiment** — steps are authored rudiment variations (e.g. single paradiddle at increasing BPM).
- A lesson must have **≥1 Step** before it can be published.

### Step (DB: `exercise`)
One rung of a Lesson's practice ladder. What the UI calls a **Step** is the `exercise` table in the schema. Each Step has:
- a **title** ("Hi-hat only", "+ Kick") and an **order** (`step_no`);
- a **Start → Goal BPM ladder** (the practice progression);
- **exactly one notation source**: **alphaTex** (`notation_tex`, authored inline — the common case) · **upload** (`notation_key`, a standalone file) · **song-slice** (`source_item_id` + `start_bar`/`end_bar` — a slice of a song; *spike pending → KAN-167*).

### Pattern
A **named, reusable groove vocabulary** — a beat, fill, or rudiment that can be referenced by many items. This is the answer to "what is a pattern": it's a first-class entity (the `pattern` table), not just a tag.
- **Kind** (`pattern.kind`, open vocab): **beat** · **fill** · **rudiment** (later: ostinato · scale · chord). The UI shows "Beats / Rudiments / Fills" as filtered views of this one table.
- **Family ≠ genre.** `family` is a *kind-relative* grouping (beat→Rock/Funk/Shuffle; rudiment→Roll/Diddle/Flam/Drag), distinct from a song's musical `genre`.
- Has a canonical `notation_tex`, `subdivision` (8th/16th/triplet), `level`, `aliases`.
- **A Song or Lesson can link 0, 1, or many Patterns** (`item_pattern`, many-to-many, optional) — so yes, a lesson can reference multiple patterns.

---

## How they relate
```
catalogue_item (Song | Lesson)
   ├── type = 'song' | 'lesson'
   ├──< Step (exercise)            ← lessons only: ordered steps, each with a BPM ladder + one notation source
   └──< item_pattern >── Pattern   ← optional m:n: an item links 0..n patterns (beats/fills/rudiments)
```
- A **Lesson** = a catalogue_item (`type='lesson'`) + a `lesson_type` + ordered **Steps** + optional linked **Patterns**.
- A **Song** = a catalogue_item (`type='song'`) + a notation file + optional linked **Patterns** (the beat(s) it uses).
- **Pattern pairing** ("fills that go well with beats" / suggest-a-fill) is *designed but deferred* (v1.5).

---

## Scoring & progress
- **Score** — a 0–100 result for a single play/attempt. *(Per-user data; lives in DynamoDB, not the catalogue.)*
- **Best** — the highest Score a user has reached on an item. Shown per row as the **score donut** (ring fills by best-%, exact number centred — the number always carries the value).
- **Donut bands** (ring colour, Okabe-Ito, colourblind-safe): `1–49` low (purple) · `50–69` developing (orange) · `70–88` climbing (blue) · `89–99` high (green) · `100` mastered (gold).
- **Mastery** — a Best of **100**. Rendered as a **gold disc + trophy** (its own reward colour).
- **Not attempted** — no Score yet. Grey ring + `–`.

## Level / grade
An item's difficulty — numeric **1–10** (`level`; NULL = ungraded, shown as `—`). Not parsed from files; a curator judgment. The catalogue UI shows it as a **neutral rounded pill** (numeric).

---

## Roles & sourcing
- **Admin / CMS** — the catalogue is **admin-curated**. Admins author Lessons/Steps (incl. alphaTex), set licenses, and edit/delete via the same UI, admin-gated.
- **User upload** — users may upload their own file (M1, private per-user; never auto-published to the shared catalogue).
- **Local / unauthenticated play** — play a local file **without uploading** at all (copyright-safe; scores kept client-local, sync on auth). *Brainstorm-first → epic KAN-163.*

---

## ⚠ To reconcile (flagged for review / KAN-165 — not decided here)
1. **Is a *Fill* a lesson type or a pattern kind?** The **schema (v1, authoritative)** says `fill` is a **pattern kind**, and there is **no `fill` lesson_type** — a fill rides inside a beat lesson's step content or links via `item_pattern`. But the **catalogue mockups + earlier handoff** show "Lessons → Beats · Rudiments · **Fills**" (a Fill lesson badge) and noted "Fills = `lesson_type='fill'`". These conflict — pick one.
2. **Stars dropped.** The schema (§5) maps `level` 1–10 → a 5★ library display; the **catalogue UI deliberately dropped stars** (gestalt risk) for a numeric **neutral level pill** + the score donut. The numeric pill is the live decision; the schema's star mapping is superseded for display.
3. **`exercise` vs `step` naming** — the DB table is `exercise`; the UI/users say **Step**. Schema open-question #1 (keep `exercise` or rename `step`).

## TBD (filled by the lesson/steps spike — KAN-165)
- The **lesson-authoring form** (UI) doesn't exist yet — only a song/step form in `catalog-flow.html`. The spike produces its low-fi wireframe.
- Confirm the day-to-day authoring flow: how a curator builds a Lesson from Steps + links Patterns.

---

## See also
- Schema (authoritative data shape): [`docs/specs/2026-06-10-catalogue-schema.md`](docs/specs/2026-06-10-catalogue-schema.md)
- Catalogue UI flow decisions: [`docs/design/2026-06-13-catalog-flow-decisions.md`](docs/design/2026-06-13-catalog-flow-decisions.md)
- Donut score system: [`docs/design/2026-06-13-donut-spectrum-handoff.md`](docs/design/2026-06-13-donut-spectrum-handoff.md)
