# Instrument identity + family + role from source formats (spike)

- **Date:** 2026-06-24
- **Status:** Research only — no schema or app changes. Feeds **SD-26** (instrument family) and **SD-28** (role), and surfaces candidate new schema deltas.
- **De-risks:** Notation Hero currently derives `track.instrument`, `track.role`, and `playable.family` partly from **free-text UGC track names** ("Guitarra Solo", "Gtr 2", "Overdrive", "String Ensemble 1"). Names are unreliable (foreign-language, player-named, abbreviated, blank). This spike asks: _what STRUCTURED, controlled instrument metadata does each source format carry that we can use as the PRIMARY signal instead?_
- **Sources (high-signal, local):** AlphaTab fork `~/Sites/alphaTabWebsite/node_modules/@coderline/alphatab/dist/alphaTab.d.ts` + `alphaTab.core.mjs` (the importer that ships in our pipeline); the 5 real GuitarPro extractions in `docs/wireframe/data/gp-extract-*.json`; the extractor `docs/wireframe/tools/gp-extract.mjs`; the hand-authored wireframe seed `docs/wireframe/index.html`; the per-track schema `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`.
- **Sources (web):** MusicXML 4.0 Standard Sounds (`sounds.xml`), General MIDI Level 1, MuseScore `instruments.xml` (`main` branch).

---

## TL;DR

1. **Every format carries a structured, controlled instrument id beyond the free-text name.** They differ in granularity but they all cross-walk through **General MIDI program number (0–127)** as the common hub.
   - **GuitarPro** → AlphaTab maps GP's `InstrumentSet.Type` into **`track.playbackInfo.program`** (GM 0–127) + percussion = MIDI **channel 9** (zero-based; GM channel 10). The raw GP `Type` string ("steelGuitar", "electricBass") is **not surfaced by AlphaTab** — we get the GM program it resolves to.
   - **MIDI** → the **GM program number** in the Program Change event + **channel 10 = percussion** (the format's native identity; there is no name at all unless an optional track-name meta event is present).
   - **MusicXML** → `<instrument-sound>` holds a **standardized dotted sound id** (`pluck.guitar.electric`, `keyboard.piano.grand`, `wind.reed.clarinet`) — a controlled, hierarchical vocab — plus `<midi-program>` as a fallback.
   - **MuseScore** → `instruments.xml` template gives every instrument a controlled `id`, a `<family>` (fine-grained, e.g. `guitars` / `bass-guitars`), an `<InstrumentGroup>` (coarse, e.g. `plucked-strings`), a `<musicXMLid>` (the MusicXML sound id), and GM `<program>` channels.

2. **Instrument FAMILY is directly derivable from the structured id in every format** — most cleanly from the GM program (16 fixed families of 8) and from the MusicXML/MuseScore hierarchies, which are strictly richer than GM. **Family does NOT need a stored column** (SD-26 → derive at ingest from a code mapping). See [SD-26](#sd-26-instrument-family).

3. **ROLE (lead/rhythm/solo) is NOT a structured field in ANY of these formats.** It is purely UGC — encoded only in the free-text track name. The strong prior is **confirmed**. Keep `track.role` open-`text`, derived, with a small closed-vocab + `Other` bucket governance. See [SD-28](#sd-28-role).

4. **New schema delta surfaced:** store the structured source id as provenance on `track` (proposed `track.source_instrument_id` + `track.source_instrument_kind`), so the derived `instrument`/`family` is reproducible and auditable instead of a lossy one-way guess. See [New schema deltas](#new-schema-deltas-surfaced).

> **Critical gotcha (low-confidence trap):** the in-repo extractor `gp-extract.mjs` does **NOT** currently read `playbackInfo.program` / `primaryChannel` — it only emits `name`, `isPercussion`, `tuning`, `stringCount`. So today's pipeline is _forced_ onto the name as the only instrument signal. The fix is a one-field extractor change (read `t.playbackInfo.program`), not a schema change. This is the single highest-leverage finding.

---

## Per-format table

| Format                        | Structured instrument id (beyond name)                                                                                                                                                                                             | Family derivable?                                                                                                                                                                                                                 | Tuning / strings                                                                                                                                                                                                                                | Role field?                                                                                                                                    | Reliability of the structured id                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GuitarPro** (.gp/.gpx/.gp5) | **GM program 0–127** via `track.playbackInfo.program` (GP `InstrumentSet.Type` is collapsed into this by AlphaTab); percussion = `primaryChannel === 9`. Raw `InstrumentSet.Name`/`.Type` not exposed by AlphaTab.                 | **Yes** — GM program → 16 GM families; `GeneralMidi.isGuitar/isBass/isPiano(program)` helpers ship in AlphaTab.                                                                                                                   | **Yes, reliable.** `staff.tuning` = MIDI note numbers per string; `staff.tuningName` / `Tuning.findTuning()` names standard tunings; `stringCount = tuning.length`. Pitched-but-tuningless (piano/voice) get a _synthetic_ tuning — see caveat. | **No.** Role lives only in the free-text track name.                                                                                           | **High** for program when the author set the instrument (GP authoring forces a sound choice). **Medium** when authors leave defaults. Percussion flag is **very high** (channel 9 is unambiguous). |
| **MIDI** (.mid)               | **GM program 0–127** (Program Change) + **channel 10 = percussion** (GM drum map). `instrument.family` / `.number` / `.name` in higher-level parsers are just GM-program lookups.                                                  | **Yes** — same GM 16-family mapping; channel 10 ⇒ drums regardless of program.                                                                                                                                                    | **Partial.** No notion of "strings" or fretboard tuning in raw MIDI — pitch range only. Cannot distinguish guitar vs bass vs piano by tuning; must use program.                                                                                 | **No.** Optional track-name meta event (FF 03) is free text only.                                                                              | **High** where Program Change is present (most GM files). **Channel 10** percussion is rock-solid. Name often absent entirely.                                                                     |
| **MusicXML** (.musicxml/.xml) | **`<instrument-sound>` dotted id** (controlled, hierarchical: `pluck.guitar.electric`, `keyboard.piano.grand`, `wind.reed.clarinet`, `drum.group.set`) + `<midi-program>` (GM) + `<virtual-instrument>` (library/patch, free-ish). | **Yes, best of all** — the sound id _is_ a family path (`pluck.*`, `keyboard.*`, `strings.*`, `wind.*`, `brass.*`, `drum.*`/`metal.*`/`pitched-percussion.*`).                                                                    | **Partial/indirect.** `<staff-details><staff-tuning>` exists for tab parts only; otherwise no tuning. String count not guaranteed.                                                                                                              | **No.** `<part-name>` / `<instrument-name>` are free text. `<solo>`/`<ensemble>` exist but mean "1 player vs section", **not** lead-vs-rhythm. | **High** when `<instrument-sound>` is present (modern exporters emit it). Falls back to `<midi-program>` (High) then `<part-name>` (Low).                                                          |
| **MuseScore** (.mscz)         | **Controlled `<Instrument id>`** + `<family>` (fine) + `<InstrumentGroup id>` (coarse) + `<musicXMLid>` (= MusicXML sound id) + GM `<program>` channels. The richest controlled model.                                             | **Yes** — two built-in levels: coarse `InstrumentGroup` (`plucked-strings`, `keyboards`, `strings`, `brass`, `woodwinds`, `vocals`, percussion buckets) and fine `<family>` (`guitars`, `bass-guitars`, `drums`, `clarinets`, …). | **Yes for stringed** — `<StringData><string>` per open string (MIDI numbers). Drumset flagged by `<drumset>1` + `<clef>PERC`, not channel-10.                                                                                                   | **No.** Role not modeled; only `trackName`/`longName` free text + part naming.                                                                 | **Very high** — id/family/group/musicXMLid are all from a curated template; no guessing. (.mscz is a zipped container; needs unzip → parse `*.mscx` XML — not via AlphaTab today.)                 |

---

## What AlphaTab's `Track` model actually exposes (our extractor)

This is the ground truth for _what our pipeline can realistically pull from a `.gp`_, since AlphaTab is the importer. Verified against `alphaTab.d.ts` (the fork ships the full 552 KB type defs) and the real `gp-extract-*.json`.

`Track` (`alphaTab.d.ts:15977`):

| Field                     | Type                       | Use for instrument identity                                                                                                                                                                                                                  |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| `name`                    | `string`                   | Free-text long name. **UGC — the unreliable signal we're replacing.** ("Kiko", "Bateria", "Overdrive                                                                                                                                         | Tube Screamer | Jonny Buckland".) |
| `shortName`               | `string`                   | Abbreviation, also free text.                                                                                                                                                                                                                |
| `playbackInfo`            | `PlaybackInformation`      | **The structured signal.** Holds `program`, `primaryChannel`, `bank` (see below).                                                                                                                                                            |
| `get isPercussion()`      | `boolean`                  | True iff any staff is percussion. **Reliable drum detector.** Already emitted by `gp-extract.mjs`.                                                                                                                                           |
| `staves`                  | `Staff[]`                  | Per-staff tuning + percussion + chords.                                                                                                                                                                                                      |
| `percussionArticulations` | `InstrumentArticulation[]` | Per-kit-piece note-head mapping with `outputMidiNumber` (the GM drum-map note, e.g. 36 kick / 38 snare / 42 hi-hat). Lets us enumerate _which kit pieces_ a drum track uses — feeds `drum_profile.kit_pieces` precisely instead of guessing. |
| `color`                   | `Color`                    | Display only; no identity value.                                                                                                                                                                                                             |

`PlaybackInformation` (`alphaTab.d.ts:13458`):

| Field                                               | Type     | Meaning                                                                                                                                                                          |
| --------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `program`                                           | `number` | **GM program 0–127.** The canonical structured instrument id we get from GP.                                                                                                     |
| `primaryChannel` / `secondaryChannel`               | `number` | MIDI channel. **`=== 9`** (zero-based) ⇒ percussion (`SynthConstants.PercussionChannel = 9`, confirmed in `alphaTab.core.mjs:3837`). NB this is GM "channel 10" in 1-based talk. |
| `bank`                                              | `number` | MIDI bank select (for non-GM sound sets; usually 0).                                                                                                                             |
| `volume` / `balance` / `port` / `isMute` / `isSolo` | —        | Mixing, not identity.                                                                                                                                                            |

`Staff` (`alphaTab.d.ts:15524`):

| Field                                                     | Type                    | Meaning                                                                                                                                             |
| --------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get tuning(): number[]`                                  | MIDI numbers per string | **String tuning.** `[64,59,55,50,45,40]` = E4 B3 G3 D3 A2 E2 = standard 6-string guitar EADGBE. Bass `[43,38,33,28]` = G2 D2 A1 E1 = 4-string EADG. |
| `get tuningName(): string`                                | `string`                | Human tuning name (AlphaTab matches against known tunings via `Tuning.findTuning`).                                                                 |
| `get isStringed(): boolean`                               | `boolean`               | Whether this staff has a fretboard/tuning.                                                                                                          |
| `stringTuning`                                            | `Tuning`                | Full tuning object (`name`, `isStandard`, `tunings[]`).                                                                                             |
| `isPercussion`                                            | `boolean`               | Percussion staff flag.                                                                                                                              |
| `capo`, `transpositionPitch`, `displayTranspositionPitch` | `number`                | Fretboard adjustments.                                                                                                                              |

**`GeneralMidi`** is a real class inside AlphaTab (`alphaTab.core.mjs:12012`). It carries:

- The full **name↔program map** for all 128 GM Level-1 instruments (this map _is_ the GM spec — see [Appendix A](#appendix-a--general-midi-program--family-map)).
- Ready-made family predicates we can reuse directly: `isPiano(program)` (`<=7 || 16–23`), `isGuitar(program)` (`24–39 || 105 || 43`), `isBass(program)` (`32–39`). (Note AlphaTab's `isGuitar` deliberately includes the bass range and banjo/contrabass; for our taxonomy we want the tighter GM-family split in Appendix A, not these loose predicates.)

### Cross-check against the real extractions

From `gp-extract-*.json` (objective fields only — the extractor explicitly avoids inventing subjective data):

| Song                   | Title/Artist in file?            | Tuning signal                                                                                                 | Key signal                                                          | Notes                                                                                                                                                                               |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| I'm Yours              | ✅ "I'm Yours" / "Jason Mraz"    | guitar `[64,59,55,50,45,40]`, bass `[43,38,33,28]`, **drums `tuning:null`**                                   | `B major` (real)                                                    | Clean. Names "Classical Guitar"/"Electric Guitar"/"Bass"/"Drums" map well.                                                                                                          |
| Yellow                 | ✅ "Yellow" / "Coldplay"         | guitars 6-str, bass 4-str, drums null                                                                         | `C major` ⚠️ **default** (real key is B major; chords prove it)     | Names are gear-laden: "Rhythm Guitar                                                                                                                                                | Takamine EN15 | Chris Martin". Name parse is brittle; **program would be clean.** |
| Bohemian Rhapsody      | ✅ "Bohemian Rhapsody" / "Queen" | **Pianos get FAKE 6-string tunings** (`Piano (RH)` → `[65,60,53,48,41,36]`); Voice/Choir get fake tunings too | `Bb major` (plausible)                                              | Shows tuning **cannot** distinguish piano/voice/guitar — they all report a 6-string tuning. **Program is required** to separate keys/vocals from guitar.                            |
| Zoio de Lula           | ❌ **blank title & artist**      | guitars 6-str, bass 4-str (`[42,37,32,27]` = down ½ step), drums null                                         | `C major` ⚠️ **default** (file is markerless; key honestly unknown) | Portuguese names ("Guitarra Solo", "Baixo", "Bateria"). **English name-parse fails**; program/percussion-flag don't.                                                                |
| Angra – Nothing To Say | ❌ **blank title & artist**      | guitars 6-str, bass 4-str, drums null                                                                         | `C major` ⚠️ **default** (real key Em→G per section labels)         | **Player-named tracks** ("Kiko", "Ricardo", "Luis", track 8 blank). Name parse is _useless_ here — there is no instrument word at all. **This is the case that proves the thesis.** |

**Conclusions from the real data:**

- **Names fail in 3 of 5 real files** (foreign language, player names, blanks, gear strings). The structured `program` + `isPercussion` would succeed in all 5.
- **Tuning is a good _disambiguator within plucked_ but a poor _primary_:** it cleanly separates 6-string (guitar, count 6) from 4-string (bass, count 4), but pianos/voices are handed synthetic 6-string tunings, so tuning alone would mislabel them "guitar". Program disambiguates those.
- **GP `key` is unreliable** (3 of 5 are the `C major` default) — already handled correctly in the seed (left blank when in doubt). Out of scope for instrument identity but worth flagging for `tonal_profile`.

---

## Unified Notation Hero instrument vocab + family taxonomy

The existing schema already uses a **flat open `track.instrument`** (`drums, guitar, bass, keys, vocals, …`). Keep that as the user-facing facet. Add a **derived `family`** layer. Both come from one canonical mapping keyed on the structured source id (GM program is the hub; the others fold into it).

### Proposed `instrument` vocab (flat, user-facing — matches current seed)

`drums · guitar · bass · keys · vocals · strings · woodwind · brass · synth · percussion-pitched · other`

(Today's seed only exercises `drums/guitar/bass/keys/vocals`. The rest are the natural GM-family buckets, added only when a real piece needs them — per _no-invented-features_.)

### Proposed `family` taxonomy (derived, coarse — for browse facets)

`keyboard · plucked · bowed-strings · woodwind · brass · voice · percussion · pitched-percussion · synth · other`

This is the **coarse** layer (mirrors MuseScore `InstrumentGroup` + the MusicXML top-level sound categories). It is what a "browse by family" filter needs. (A finer family like MuseScore's `guitars` vs `bass-guitars` is available if ever wanted, but coarse is enough for v1 and zero extra cost since both derive from the same id.)

### Master mapping table (source id → NH `instrument` + `family`)

GM program ranges are the spine; GP/MIDI resolve to GM directly; MusicXML sound-id prefixes and MuseScore groups fold in.

| GM program range                                                                                                  | GM family (spec)                            | MusicXML sound prefix                         | MuseScore group / family                      | NH `instrument`                                      | NH `family`                  |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| 0–7                                                                                                               | Piano                                       | `keyboard.piano.*`                            | `keyboards` / `keyboards`                     | `keys`                                               | `keyboard`                   |
| 8–15                                                                                                              | Chromatic Percussion                        | `pitched-percussion.*`                        | `pitched-percussion` / `keyboard-percussion`  | `percussion-pitched`                                 | `pitched-percussion`         |
| 16–23                                                                                                             | Organ                                       | `keyboard.organ.*`                            | `keyboards`                                   | `keys`                                               | `keyboard`                   |
| 24–31                                                                                                             | Guitar                                      | `pluck.guitar.*`                              | `plucked-strings` / `guitars`                 | `guitar`                                             | `plucked`                    |
| 32–39                                                                                                             | Bass                                        | `pluck.bass.*`                                | `plucked-strings` / `bass-guitars`            | `bass`                                               | `plucked`                    |
| 40–47                                                                                                             | Strings (solo/orch)                         | `strings.*`                                   | `strings` / `orchestral-strings`              | `strings`                                            | `bowed-strings`              |
| 48–55                                                                                                             | Ensemble (string ens, choir)                | `strings.group.*` / `voice.*`                 | `strings` / `vocals`                          | `strings` (or `vocals` for choir 52–54)              | `bowed-strings` (or `voice`) |
| 56–63                                                                                                             | Brass                                       | `brass.*`                                     | `brass`                                       | `brass`                                              | `brass`                      |
| 64–71                                                                                                             | Reed                                        | `wind.reed.*`                                 | `woodwinds` / (saxophones, clarinets, oboes…) | `woodwind`                                           | `woodwind`                   |
| 72–79                                                                                                             | Pipe                                        | `wind.flutes.*`                               | `woodwinds` / (flutes, recorders…)            | `woodwind`                                           | `woodwind`                   |
| 80–95                                                                                                             | Synth Lead / Pad                            | `synth.*`                                     | `electronic-instruments` / `synths`           | `synth`                                              | `synth`                      |
| 96–103                                                                                                            | Synth Effects                               | `synth.effects.*`                             | `electronic-instruments`                      | `synth`                                              | `synth`                      |
| 104–111                                                                                                           | Ethnic (sitar, banjo, koto…)                | `pluck.*` / `wind.*`                          | `plucked-strings` / `winds`                   | `guitar` if plucked-fretted (banjo 105) else `other` | `plucked` / `other`          |
| 112–119                                                                                                           | Percussive (steel drums, woodblock, taiko…) | `pitched-percussion.*` / `wood.*` / `metal.*` | percussion buckets                            | `percussion-pitched`                                 | `pitched-percussion`         |
| 120–127                                                                                                           | Sound effects                               | `effect.*` / `sound-effects.*`                | n/a                                           | `other`                                              | `other`                      |
| **Channel 10 (MIDI) / `primaryChannel===9` (AlphaTab) / `<drumset>` (MuseScore) / `drum.*`+`metal.*` (MusicXML)** | **Percussion kit** (program ignored)        | `drum.*` / `metal.*`                          | `drums` (drumset)                             | `drums`                                              | `percussion`                 |

> **Percussion rule wins over program.** In MIDI/GP a drum track may report program 0; the **channel** (10 / zero-based 9) is the authority. MusicXML uses `<instrument-sound>drum.*` + `<midi-unpitched>`; MuseScore uses `<drumset>1` + `<clef>PERC`. Always check the percussion flag _first_, then fall to program-range mapping.

> **The 48–55 ensemble band is the one genuinely ambiguous bucket** (string ensemble vs choir vs synth strings). GM puts choir (52–54) and string ensembles (48–51) in the same family. Disambiguate choir→`vocals` by program 52–54; otherwise →`strings`. This is exactly the "String Ensemble 1" (GM 48) case that today's name-parse mislabels.

---

## Recommended extraction strategy

A single precedence ladder per track. Stop at the first signal that resolves; record which rung fired as confidence + provenance.

### Precedence / confidence order

1. **Percussion gate (highest, ~1.0).** If `track.isPercussion` (GP/AlphaTab) **or** channel 10 (MIDI) **or** `<drumset>`/`drum.*` (MuseScore/MusicXML) → `instrument = drums`, `family = percussion`. Done. _(Never overridden by program.)_
2. **Controlled structured id (high, ~0.9).** The format's native controlled id:
   - GP/MIDI → **GM `program`** → master table.
   - MusicXML → **`<instrument-sound>`** dotted id → prefix → master table (richer than GM; prefer it when present, else `<midi-program>`).
   - MuseScore → **`<Instrument id>` / `<family>` / `<musicXMLid>`** → master table (most direct).
3. **Tuning + string-count disambiguator (medium, ~0.7, plucked only).** _Only to split within the plucked family or to sanity-check step 2:_
   - count 4 + tuning ≈ EADG (`[43,38,33,28]` ±) → `bass`.
   - count 6 + tuning ≈ EADGBE → `guitar`.
   - count 7/8 → extended-range guitar; count 4 + GCEA → ukulele (rare; would arrive as guitar-family from program 24–25 and be refined here).
   - **Caveat:** ignore tuning for non-stringed programs — pianos/voices report synthetic 6-string tunings (proven in Bohemian Rhapsody). Tuning only _refines_ a step-2 plucked result; it never _creates_ an instrument on its own.
4. **Name parse (lowest, ~0.4, FALLBACK).** Only when steps 1–3 yield nothing (blank/unknown program, no sound id, no tuning). Tokenize the free-text name against a multilingual keyword map (`guitarra/gtr/guit→guitar`, `bajo/baixo/bass→bass`, `bateria/drums/perc→drums`, `voz/voice/vocal→vocals`, `piano/keys/teclado→keys`). **This is what the seed does today and what fails on Angra/Zoio.** Keep it strictly as last resort.

### Role derivation (separate, name-only)

Role has no structured source. Derive it from the same name token scan **after** instrument is known: `lead/solo/lia/solo→lead|solo`, `rhythm/base/rítmica→rhythm`, `pad/strings→pad`. Default `NULL`. (See [SD-28](#sd-28-role).)

---

## Explicit recommendations

### SD-26 — instrument family

**Recommendation: DERIVE `family` at ingest from the controlled instrument vocab via a code mapping — do NOT add a stored `family` column for _instrument_ family.**

Rationale:

- Family is a **pure function** of the structured instrument id (GM program / sound-id / MuseScore group) — see the master table. A stored column would just be a denormalized copy that can drift from `track.instrument`.
- The current schema already treats `playable.instruments[]` as a **derived facet** (`DISTINCT track.instrument`). Instrument-family is the same shape one level up: `playable` browse-by-family = `DISTINCT family(track.instrument)`. Compute it the same way (app-layer, at write time into the existing derived facets, or at query time).
- It costs **zero new columns** and keeps a single source of truth (`track.instrument` + the provenance id from the new delta below).

Reliability per format (confidence the derived family is correct):

| Format                   | Family-derivation reliability                                                    | Why                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| MuseScore                | **Very high**                                                                    | `<family>` + `<InstrumentGroup>` are literally in the file; `musicXMLid` cross-checks.  |
| MusicXML                 | **High**                                                                         | `<instrument-sound>` prefix is a family path; `<midi-program>` backstops.               |
| GuitarPro (via AlphaTab) | **High** when author set the sound (program present); percussion always certain. | GM program → family is deterministic; only the "author left defaults" case degrades it. |
| MIDI                     | **High** where Program Change present; channel-10 percussion certain.            | Same GM mapping; raw MIDI just has fewer non-program hints.                             |

> **Naming caution (separate from SD-26):** the schema's existing `playable.family text[]` is a **MUSICAL** family (`{Rock}`, `{major}`, `{neoclassical}`) — _not_ instrument family. **Do not overload it.** If an instrument-family facet is ever materialized for indexing, give it a distinct name (e.g. `instrument_families[]`) to avoid colliding with the musical-family column. The cleanest path is to not store it at all and derive on read.

### SD-28 — role

**Recommendation: role stays `track.role text` (open, derived). Govern it as a CLOSED starter vocab with an `Other`/free-text escape hatch — not fully open, not hard-enumerated.**

Findings that drive this:

- **No source format models lead/rhythm/solo.** Verified across GP (AlphaTab exposes only `name`), MIDI (name meta only), MusicXML (`<solo>`/`<ensemble>` mean player-count, not role), MuseScore (no role concept). The strong prior is **confirmed** — role is 100% name-derived UGC.
- Because the signal is a free-text name, the value set is open-ended in practice ("solo", "lead", "base", "rítmica", "pad", "harmony", "counter-melody"). A hard `CHECK` enum would reject real data; fully open invites synonym sprawl (`lead` vs `Lead` vs `lia`).

Governance (closed-with-Other):

- **Canonical starter vocab (normalize to these):** `lead · rhythm · solo · pad · harmony`. (These are exactly the values the current seed/wireframe already use: Bohemian/Yellow/Angra use `lead`+`rhythm`; Zoio uses `solo`; the schema comment lists `solo|rhythm|lead|pad|harmony`.)
- **Escape hatch:** anything unmatched → store the lowercased raw token as-is (open `text`), surfaced in an admin "unmapped roles" report for periodic promotion into the canonical set. No `CHECK` constraint (keep it `text`), but an **app-layer normalizer** maps known synonyms (`base/rítmica→rhythm`, `solo→solo`, `lia/lead→lead`) before write.
- Keep `role` **nullable** — most tracks (bass, drums, keys, vocals) have no role and should stay `NULL`, as the seed already does.

This matches the existing column (`role text` with no `CHECK`) — so SD-28 is "confirm + add a normalizer + a starter vocab", **no schema change**.

### New schema deltas surfaced

**Proposed delta (recommended): add structured-source provenance to `track`.**

```sql
ALTER TABLE track
  ADD COLUMN source_instrument_id   text,   -- the raw controlled id from the file
  ADD COLUMN source_instrument_kind text;   -- which scheme it came from
-- source_instrument_kind ∈ ('gm-program','musicxml-sound','musescore-id','name-parse')
-- source_instrument_id examples:
--   gm-program      → '27'                 (GM program number as text)
--   musicxml-sound  → 'pluck.guitar.electric'
--   musescore-id    → 'electric-guitar'
--   name-parse      → '' (no structured id; instrument came from the name)
```

Why this is worth a column (vs deriving everything on the fly):

- **Reproducibility/audit.** `track.instrument`/`family` become _derivations of a recorded fact_ instead of an opaque one-way guess. If we improve the mapping later, we can re-derive every track from stored provenance without re-parsing blobs.
- **Confidence + debugging.** Lets the catalog show/why a track was labeled (program 27 → guitar) and lets an admin find "all tracks labeled by name-parse only" (the low-confidence set that most needs human review — i.e. the Angra/Zoio cases).
- **Cheap.** Two nullable `text` columns, no constraints, populated at ingest. Mirrors the spirit of `notation.checksum`/`bytes` provenance already in the schema.

**Optional, smaller alternative** (if a column is unwanted): stash the same two values inside the existing `track.data jsonb` (`{"sourceInstrument":{"kind":"gm-program","id":"27"}}`). Zero DDL; loses the easy `WHERE source_instrument_kind='name-parse'` index/filter. Recommend the real columns — provenance you want to _query_ (find low-confidence rows) deserves to be a column, not buried in JSON.

**Extractor delta (not schema — but the true blocker):** update `docs/wireframe/tools/gp-extract.mjs` to emit `program: t.playbackInfo.program`, `primaryChannel: t.playbackInfo.primaryChannel`, `bank: t.playbackInfo.bank`, and (for drums) the `percussionArticulations[].outputMidiNumber` kit-piece set. Without this the structured signal never reaches the seed and the pipeline is stuck on names. **One-line-per-field change; highest leverage in this whole spike.**

---

## Appendix A — General MIDI program → family map

The 128 GM Level-1 instruments in 16 families of 8 (verified verbatim from AlphaTab's `GeneralMidi._values` map, `alphaTab.core.mjs:12013`). This map is the cross-walk hub for GP and MIDI, and the MusicXML/MuseScore ids fold onto it.

| Programs | GM family            | NH `instrument` / `family`                   | Notable members (program)                                                                                                                                                                   |
| -------- | -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–7      | Piano                | `keys` / `keyboard`                          | acousticgrandpiano(0), electricpiano1(4), harpsichord(6), clavinet(7)                                                                                                                       |
| 8–15     | Chromatic Percussion | `percussion-pitched` / `pitched-percussion`  | celesta(8), glockenspiel(9), vibraphone(11), marimba(12), xylophone(13), tubularbells(14)                                                                                                   |
| 16–23    | Organ                | `keys` / `keyboard`                          | drawbarorgan(16), rockorgan(18), churchorgan(19), accordion(21), harmonica(22)                                                                                                              |
| 24–31    | Guitar               | `guitar` / `plucked`                         | acousticguitarnylon(24), acousticguitarsteel(25), electricguitarjazz(26), electricguitarclean(27), electricguitarmuted(28), overdrivenguitar(29), distortionguitar(30), guitarharmonics(31) |
| 32–39    | Bass                 | `bass` / `plucked`                           | acousticbass(32), electricbassfinger(33), electricbasspick(34), fretlessbass(35), slapbass1/2(36/37), synthbass1/2(38/39)                                                                   |
| 40–47    | Strings              | `strings` / `bowed-strings`                  | violin(40), viola(41), cello(42), contrabass(43), pizzicatostrings(45), orchestralharp(46), timpani(47)                                                                                     |
| 48–55    | Ensemble             | `strings`/`vocals` / `bowed-strings`/`voice` | stringensemble1(48), stringensemble2(49), synthstrings1/2(50/51), **choiraahs(52), voiceoohs(53), synthvoice(54)**, orchestrahit(55)                                                        |
| 56–63    | Brass                | `brass` / `brass`                            | trumpet(56), trombone(57), tuba(58), frenchhorn(60), brasssection(61), synthbrass1/2(62/63)                                                                                                 |
| 64–71    | Reed                 | `woodwind` / `woodwind`                      | sopranosax(64)…baritonesax(67), oboe(68), englishhorn(69), bassoon(70), clarinet(71)                                                                                                        |
| 72–79    | Pipe                 | `woodwind` / `woodwind`                      | piccolo(72), flute(73), recorder(74), panflute(75), whistle(78), ocarina(79)                                                                                                                |
| 80–87    | Synth Lead           | `synth` / `synth`                            | lead1square(80)…lead8bassandlead(87)                                                                                                                                                        |
| 88–95    | Synth Pad            | `synth` / `synth`                            | pad1newage(88)…pad8sweep(95)                                                                                                                                                                |
| 96–103   | Synth Effects        | `synth` / `synth`                            | fx1rain(96)…fx8scifi(103)                                                                                                                                                                   |
| 104–111  | Ethnic               | mixed                                        | sitar(104), **banjo(105)**, shamisen(106), koto(107), kalimba(108), bagpipe(109), fiddle(110), shanai(111)                                                                                  |
| 112–119  | Percussive           | `percussion-pitched` / `pitched-percussion`  | tinklebell(112), agogo(113), steeldrums(114), woodblock(115), taikodrum(116), melodictom(117), synthdrum(118), reversecymbal(119)                                                           |
| 120–127  | Sound Effects        | `other` / `other`                            | guitarfretnoise(120), breathnoise(121), seashore(122), birdtweet(123), telephonering(124), helicopter(125), applause(126), gunshot(127)                                                     |

**Channel 10 (1-based) / channel 9 (0-based)** = the GM **Percussion** key map (kick 36, snare 38, closed hi-hat 42, ride 51, crash 49, toms 41–48…). Program is ignored on this channel; the note number is the kit piece.

---

## Sources

- **AlphaTab (the importer in our pipeline):** `~/Sites/alphaTabWebsite/node_modules/@coderline/alphatab/dist/alphaTab.d.ts` — `Track` (15977), `PlaybackInformation` (13458), `Staff` (15524), `Tuning` (16227), `InstrumentArticulation` (9761); `alphaTab.core.mjs` — `GeneralMidi._values` (12013), `isPiano/isGuitar/isBass` (12158–12166), `SynthConstants.PercussionChannel = 9` (3837).
- **Real extractions:** `docs/wireframe/data/gp-extract-{imyours,yellow,bohemian,zoio,angra}.json`; extractor `docs/wireframe/tools/gp-extract.mjs`.
- **Current schema + hand-seed:** `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`; `docs/wireframe/index.html` (track instrument/role hand-assignment, lines ~353–357).
- **General MIDI Level 1** instrument families (0–127, 16×8) and channel-10 percussion — GM spec, mirrored exactly by AlphaTab's `GeneralMidi` map.
- **MusicXML 4.0 Standard Sounds:** `https://www.w3.org/2021/06/musicxml40/listings/sounds.xml` and `https://www.musicxml.com/for-developers/standard-sounds/`; `<score-instrument>` / `<instrument-sound>` / `<virtual-instrument>` reference `https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/score-instrument/`.
- **MuseScore `instruments.xml`** (`main` branch): `https://raw.githubusercontent.com/musescore/MuseScore/main/share/instruments/instruments.xml` — verified `<Instrument id="electric-guitar">` → `<family>guitars</family>`, `<musicXMLid>pluck.guitar.electric</musicXMLid>`, `<InstrumentGroup id="plucked-strings">`, `<program value="27">`; `bass-guitar`/`electric-bass` → `pluck.bass.electric`; `drumset` → `<family>drums</family>` + `drum.group.set` + `<drumset>1`. Coarse groups: woodwinds, free-reed, brass, pitched/unpitched/marching/body-percussion, vocals, keyboards, electronic-instruments, plucked-strings, strings.

### Low-confidence / to-verify flags

- **GP `InstrumentSet.Type` raw string** (`steelGuitar`, `electricBass`): the prompt cites confirmed values from a real file, but **AlphaTab does not surface `InstrumentSet` on its `Track` model** — it resolves it into `playbackInfo.program` at import. So we get the GM program, not the type string. If we ever need the literal `Type` enum we'd have to parse the GP7 `score.gpif` XML ourselves (bypassing AlphaTab). Treat the GM program as the GP signal. _(Confidence: high that AlphaTab gives program not Type; medium on the full enumeration of GP `Type` values, which I could not exhaustively enumerate from local sources.)_
- **`.mscz` parsing:** MuseScore files are not read by AlphaTab today (AlphaTab imports GP/MusicXML/MIDI/alphaTex, not `.mscz`). Using MuseScore's controlled ids requires unzipping `.mscz` → parsing `.mscx`. Flagged as a separate ingest path, not free via the current pipeline.
- **MusicXML `<instrument-sound>` presence is exporter-dependent** — older/简 exporters may omit it; the `<midi-program>` fallback covers those. _(Confidence: high on the scheme; medium on real-world coverage.)_
- **Bank-select / non-GM sound sets** (`playbackInfo.bank` ≠ 0): rare in GP/MIDI hobby files; if present, the program alone may not fully identify the timbre. Out of scope for v1 family mapping.
