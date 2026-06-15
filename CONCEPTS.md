# CONCEPTS — NotationHero domain vocabulary

> The shared, plain-language definition of every domain word. **This file = "what the word means."**
> For the exact data shape (columns, types, constraints) see the authoritative schema:
> `docs/specs/2026-06-10-catalogue-schema.md`.
>
> **Status:** 🌱 scaffold (KAN-164). Items marked **TBD** are filled by the lesson/steps structure spike (**KAN-165**).

---

## The catalogue

**Catalogue** — the "find a piece to play" surface: searchable/browsable list of **Songs** and **Lessons** by type. Score/mastery is a per-row *garnish*, never the spine.

## Playable items

**Song** — a full piece to play along to. Has a level, BPM, instrument(s), best-score. Can be practised in parts ("song-breakdowns", reached *through* the song, not as a separate shelf).

**Lesson** — a structured, multi-step practice unit. Has a **type** and is made of ordered **Steps** (see TBD below).
- **Lesson type** (open vocab): **Beat** · **Rudiment** · **Fill**. (`lesson_type='fill'` was the schema tweak that added Fills.)

**Pattern** — a reusable rhythmic figure (e.g. `8th-note`, `16th-note`, `paradiddle`, `single-stroke`). Today it appears two ways: as a **filter/tag** on items, and as a first-class thing that "gets its own detail + history."
- **TBD (KAN-165):** is a Pattern an independent entity a Lesson *references* (one lesson → many patterns), a tag, or both? Define precisely.

## Lesson internals

**Step** — one rung of a Lesson's practice ladder. A Step has:
- a **notation source** — exactly one of: **alphaTex** (`notation_tex`, CMS/admin-authored) · **upload** (`notation_key`, user file) · **song-slice** (`source_item_id` + bar range — *spike pending, KAN-167*).
- a **Start → Goal BPM** ladder (the practice progression).
- a title and an ordering position.

**TBD (KAN-165) — "what is a Lesson made of?"**
- Is a Lesson = an ordered list of Steps, and does it *also* reference one or more **Patterns**?
- Can a Lesson contain multiple Patterns? How do Patterns and Steps relate?
- There is currently a **song/step form** but **no lesson-authoring form** — the spike produces the low-fi wireframe for it.

## Scoring & progress

**Score** — a 0–100 result for a single play/attempt.

**Best** — the highest Score a user has reached on an item. Shown per row as the **score donut** (ring fills by best-%, exact number centred).
- **Bands** (donut ring colour, Okabe-Ito, colourblind-safe; the *number* always carries the exact value): `1–49` low · `50–69` developing · `70–88` climbing · `89–99` high · `100` mastered.

**Mastery** — a Best of **100**. Rendered as a **gold disc + trophy** (its own reward colour).

**Not attempted** — no Score yet. Grey ring + `–`.

**Level / grade** — an item's difficulty. Numeric, **1–10 for now** (industry 1–8 + Debut is deferred — F-2). Shown as a neutral rounded pill.

## Roles & sourcing

**Admin / CMS** — the catalogue is **admin-curated** (sidesteps copyright). Admins author Lessons/Steps (incl. alphaTex) and edit/delete via the same UI, admin-gated.

**User upload vs. local file** — users may **upload** a file (`notation_key`), or — see the **Local / unauthenticated play** epic (KAN-163) — play a **local file without uploading** at all (copyright-safe; scores kept client-local, sync on auth). *TBD / brainstorm-first.*

---

## See also
- Schema (authoritative data shape): `docs/specs/2026-06-10-catalogue-schema.md`
- Catalogue UI decisions: `docs/design/2026-06-13-catalog-flow-decisions.md`
- Donut score system: `docs/design/2026-06-13-donut-spectrum-handoff.md`
