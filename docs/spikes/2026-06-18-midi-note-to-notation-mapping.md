# MIDI-note → notation mapping (multi-zone → one note) — prior art

| | |
|---|---|
| **Date documented** | 2026-06-18 |
| **Origin** | `drum-tutor-clone` phase (former name of Notation Hero) |
| **Status** | Prior art — feature/product research, drafted but never implemented in production |
| **Related spikes** | `webmidi-input-ios-bridge` (the MIDI input bridge — do NOT re-derive here), `game-scoring-engine`, `alphatab-integration` |
| **Original plan docs** | `~/Sites/alphaTabWebsite/MIDI_MAPPING_PLAN_SUMMARY.md` + 5 files (~2,200 lines) under `src/components/AlphaTabRhythmGame/` |

## TL;DR

E-drums with multi-zone pads send a **different MIDI note per zone** (ride cymbal: bell, edge, bow), but drum **notation uses only ONE MIDI note per instrument**. The feature lets the user **map several MIDI inputs onto a single target note**, so hitting any mapped zone counts as a valid hit. This many-to-one mapping is so central it gave the project its early identity ("multi-zone → one note").

A complete plan already exists (~2,200 lines, drafted Feb 2026, **never built in production**): a `MidiMapping` reverse table, a `MidiMappingContext` + settings UI + per-kit presets (Roland TD / Yamaha DTX), LocalStorage persistence evolving to per-user DynamoDB, and a tiny (~10–15 LoC) hook into the existing scoring matcher. This doc captures that prior art so a future session does not re-derive it. **The MIDI input bridge itself is out of scope here — see the `webmidi-input-ios-bridge` spike.**

---

## The problem (verbatim from prior art)

> E-drums with multi-zone instruments send different MIDI notes per zone:
> - Ride cymbal: bell (51), edge (52), bow (53)
> - Crash cymbals: edge and bow zones
> - Multi-zone pads: various strike zones
>
> But drum notations typically use only **one MIDI note** per instrument.

**Solution:** allow users to map multiple MIDI inputs to a single target note, so all zones count as valid hits.

```
User hits ride edge (sends MIDI 52)
User has mapping: 52 → 51
Notation expects: 51
Result: ✓ Valid score!
```

### Original requirement (scope.md, the user's own words)

> **line 54** — user should be able to map the midi note for each instrument to the notation. (e.g. hitting either **51, 53, 59 and 93** from the midi input should consider as a **ride 51** hit from notation).
> **line 55** — for the **pedal hi-hat**, we should allow the user select to **ignore errors on extra hits, but still count the correct hits** (because the pedal hi-hat is a special case — it is not just a hit note, but also a preparation for the hi-hat closed/opened).

> ⚠️ **Discrepancy to resolve:** the PLAN models the ride as **51/52/53** (bell/edge/bow); scope.md says **51/53/59/93**. Same instrument, two different mapped-note sets. Re-derive against a real kit/GM note chart before coding.

---

## Spec / findings (prior art)

### Data structure — a reverse, many-to-one table

```typescript
interface MidiMapping {
  entries: [
    {
      targetNote: 51,            // what the NOTATION expects
      mappedNotes: [51, 52, 53]  // accept ANY of these incoming MIDI notes
    }
  ]
}
```

The lookup is "incoming note → which targetNote does it belong to" (reverse of how a human reads it). `targetNote` is always included in its own `mappedNotes` so an un-mapped hit still scores.

### Architecture (old React + AlphaTab codebase)

**3 files to create:**
- `midi-mapping-context.tsx` — `MidiMappingContext`: mapping state, getter/setter methods, LocalStorage integration, sync via existing `settingsSyncEmitter`.
- `midi-mapping-settings.tsx` — `MidiMappingSettings`: UI panel (styled like the existing practice-mode settings), preset dropdown, mapping editor with a live **MIDI listener** (hit a pad → it captures the note), custom-preset management.
- `midi-mapping-presets.tsx` — `MidiMappingPresets`: pre-configured kit templates (**Yamaha DTX, Roland TD-50**, …), extensible for future kits.

**2 files to modify:**
- `MidiRhythmGame.tsx` — resolve the incoming MIDI note through the mapping, then pass the **mapped** note to the existing match logic (~10–15 lines).
- `practice-mode-settings.tsx` — add a button to open the mapping settings panel.

### Scoring flow (MIDI in → match → score)

```
MIDI Input (52)
   ↓
Check Mapping (52 → 51)
   ↓
Match Notation (51)
   ↓
Green Circle + Score ✓
```

Mapping is a thin resolve step **in front of** the existing matcher — it does not replace scoring, it normalizes the input note first. Defaults to "no mapping" (incoming note used as-is), so it is a non-breaking, opt-in feature.

### User flow

1. Click "MIDI Mapping Settings" in practice mode.
2. Select a preset (e.g. "Yamaha DTX") **or** create a custom mapping.
3. Mapping auto-applies during gameplay.
4. Hit any mapped e-drum zone → all mapped zones count as valid for that notation note.

### Persistence

- **LocalStorage key:** `alphaTab_midi_mapping`
- Survives refresh; cross-tab sync via `settingsSyncEmitter`.
- **Cloud evolution (refined design doc):** *"User-editable MIDI mapping UI … Stored per-user in **DynamoDB, cached locally**."* So the intended path is **LocalStorage-first, cloud-sync-later** (cloud sync arrives with auth — Cognito, deferred to ~M1).

### Performance & edge cases

- O(n) lookup, ~1–5 ms overhead per MIDI event ("no perceptible latency cost").
- **Pedal hi-hat special case:** a per-instrument toggle to *ignore extra hits but still count correct hits*; the hit-feedback layer **suppresses the red "wrong/extra hit" cross specifically for the pedal-hi-hat lane**.
- Velocity is read separately from `noteon.velocity` (ghost-note dynamics) — orthogonal to mapping; routed to a dynamics-aware scorer (flagged v1.5).

### Estimated work (old stack)

6–9 hours total: Phase 1 core infra (4–5h), Phase 2 scoring integration (1–2h), Phase 3 UI wiring (30m–1h). **Stale for the new stack.**

---

## Decisions reached then (labeled prior art)

- **Mapping shape = reverse many-to-one** (`targetNote` ← `mappedNotes[]`), not one-to-one. *(prior art)*
- **Mapping is a pre-step to scoring, not a rewrite of it** — resolve note, then feed existing matcher. *(prior art)*
- **Ship presets for Roland TD-50 + Yamaha DTX**, extensible registry for more kits; allow fully custom user mappings. *(prior art)*
- **Persistence = LocalStorage first → per-user DynamoDB (cached locally) once auth exists.** *(prior art)*
- **Opt-in / non-breaking** — defaults to no mapping. *(prior art)*
- **Pedal hi-hat gets a dedicated "ignore extra hits" toggle** + suppressed wrong-hit cross. *(prior art, from scope.md)*

---

## Re-verify before building (2026)

1. **Note numbers per kit** — the plan only *names* presets; it never publishes full per-pad note tables for Roland TD-50/TD-17/TD-27 or Yamaha DTX. And the ride mapping is internally inconsistent (51/52/53 vs 51/53/59/93). **Re-derive every preset against real kit MIDI implementation charts / the GM percussion map.**
2. **AlphaTab version + drum API** — prior art used `@coderline/alphatab ^1.8.1` (MPL-2.0 fork at `~/Sites/alphaTabWebsite`, branch `rhythm-game`). Re-check current version, the percussion note API, and the overlay/`boundsLookup` positioning before trusting any note constants.
3. **Stack re-map (the big one)** — the plan targets React Context + LocalStorage + `settingsSyncEmitter`. The clean-slate stack is **Vite SPA + TanStack + Dexie (offline-first) + oRPC + Drizzle**. Re-map: `MidiMappingContext` → TanStack/Dexie state; LocalStorage → Dexie; cloud sync → oRPC + Drizzle. Do **not** copy the React Context / LocalStorage mechanics verbatim.
4. **Cloud persistence home** — confirm per-user MIDI mapping lives in the DynamoDB **user-profile** store (per-user data), not the catalogue. Cloud sync is **post-M1** (Cognito auth deferred to ~Sept 2026), so LocalStorage/Dexie is the v1 reality.
5. **MIDI input bridge** — getting the raw zone notes (Web MIDI, iPad Safari, Capacitor CoreMIDI) is covered by **`webmidi-input-ios-bridge`**; re-verify platform support there, not here.
6. **Effort estimate** (6–9h, ~10–15 LoC integration) is for the old React code — re-estimate for the new stack.

---

## Sources / quotes

- **`~/Sites/alphaTabWebsite/MIDI_MAPPING_PLAN_SUMMARY.md`** (pasted into session `53466813-…` / worktree `pensive-boyd-6d17e3`) — the executive summary of the 5-file, 2,200-line plan. Source of the problem statement, `MidiMapping` interface, scoring flow, component breakdown, LocalStorage key, success criteria ("MIDI 51, 52, 53 all score for notation note 51").
- The 5 underlying docs (referenced, located at `src/components/AlphaTabRhythmGame/`): `MIDI_MAPPING_INDEX.md` (373L), `MIDI_MAPPING_QUICK_REF.md` (181L), `MIDI_MAPPING_PLAN.md` (503L), `MIDI_MAPPING_VISUAL_GUIDE.md` (455L), `MIDI_MAPPING_IMPLEMENTATION_SUMMARY.md` (275L).
- **scope.md** (drum-tutor-clone, `claude/pensive-boyd-6d17e3`), lines 54–55 — the original user requirement, incl. the "51, 53, 59 and 93 → ride 51" example and the pedal-hi-hat special case.
- **Design doc** `docs/design-stack.md` (office-hours, 2026-06-03) — the refined v1 features line: *"User-editable MIDI mapping UI … Stored per-user in DynamoDB, cached locally."* and the doc-review finding flagging the missing mapping UI (*"Scope line 54 demands user-editable MIDI-note→notation mapping … call out a mapping table stored in user profile (S3 or local) and a UI to edit it"*).
- **Project resume note** (session `53466813-…`) — *"MIDI mapping feature plan | `~/Sites/alphaTabWebsite/MIDI_MAPPING_PLAN_SUMMARY.md`"* and the build-order plan: *"Week 3-4 — MIDI mapping feature: Implement … `MidiMappingContext`, `MidiMappingSettings`, `MidiMappingPresets`. LocalStorage persistence first; cloud sync later when AWS is wired."*
