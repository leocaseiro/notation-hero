# Spike A — "Transpose full writes a sparse array, poisoning lower tracks"

Read-only validation spike against PR #176. Engine under test: **`@coderline/alphatab` 1.8.4**
(confirmed in
`web/node_modules/@coderline/alphatab/package.json:3`).

---

## Verdict

**CONFIRMED** — the mechanism is real, reproduced against the real engine, and reachable from the
UI; the proposed `while (pitches.length <= trackIndex) pitches.push(0)` fix is **correct for the
NaN but not quite right on the fill value** (it silently discards a transposition the file itself
carries — the very invariant this PR's own comments promise to keep). And the maintainer's
intuition is backed by the code: the fork playground does **not** use the same approach — it
already does the densify, in a line written by alphaTab's own author.

---

## 1. What the engine actually does

### 1.1 The loop — bounded by `.length`, never guarded against `undefined`

`web/node_modules/@coderline/alphatab/dist/alphaTab.core.mjs:3691-3696`, verbatim:

```js
static applyPitchOffsets(settings, score) {
    for (let i = 0; i < score.tracks.length; i++) {
        if (i < settings.notation.displayTranspositionPitches.length) for (const staff of score.tracks[i].staves) staff.displayTranspositionPitch = -settings.notation.displayTranspositionPitches[i];
        if (i < settings.notation.transpositionPitches.length) for (const staff of score.tracks[i].staves) staff.transpositionPitch = -settings.notation.transpositionPitches[i];
    }
}
```

- It iterates `i < score.tracks.length` — **over TRACKS**, and the array is consulted only through
  the guard `i < transpositionPitches.length`.
- That guard tests **`.length`, not presence**. A hole at index 0 of a length-3 array passes it.
- No `Object.keys`, no `for...of` over the array, no `?? 0`, no `Number.isFinite` — nothing that
  would skip or coerce a missing entry. `-undefined` is `NaN`, and `NaN` is written straight onto
  the staff.

Identical in the maintainer's 1.9.0 fork —
`alphaTab's own source packages/alphatab/src/model/ModelUtils.ts:93-106` — so this is
not something a version bump fixes. **Densifying at the call site is the engine's contract.**

Called on every settings push: `alphaTab.core.mjs:45686` (inside `updateSettings()`, which is what
`pushSettings` calls) and `:45837` (top of `_internalRenderTracks`).

### 1.2 Where the NaN lands — notation

- `alphaTab.core.mjs:6157-6168` — `Note.calculateRealValue`:
  `const transpositionPitch = applyTranspositionPitch ? this.beat.voice.bar.staff.transpositionPitch : 0;`
  then `return this.fret + this.stringTuning - transpositionPitch;` → **`NaN` note value**.
  Percussion escapes one line earlier (`if (this.isPercussion) return this.percussionArticulation;`),
  so drum _notation_ is immune — drum _audio_ is not (§1.4).
- `alphaTab.core.mjs:63725-63737` — the tab renderer: `let fret = n.fret - n.beat.voice.bar.staff.transpositionPitch;`
  → the printed tab number becomes `NaN`.

### 1.3 Is the array really sparse at that moment? — yes, and nothing normalises it

| Question                                     | Answer                                                                                                   | Evidence                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Declared default                             | `transpositionPitches = []` — a plain field, **no setter**                                               | `alphaTab.core.mjs:1513`                                                                                          |
| PR resets it to `[]` before every score      | yes                                                                                                      | `web/lib/alphatab/live-settings.ts:85-89`, called at `web/app/play/NotationSurface.tsx:52` _before_ `renderScore` |
| JSON deserialiser densifies?                 | **no** — raw assignment                                                                                  | `alphaTab.core.mjs:29708`: `case "transpositionpitches": obj.transpositionPitches = v; return true;`              |
| `handleBackwardsCompatibility()` touches it? | **no** — it only fixes `player.playerMode`                                                               | `alphaTab.core.mjs:30147-30149`                                                                                   |
| Worker/structured-clone densifies?           | **no** — holes survive the clone; `Environment.prepareForPostMessage` only unwraps Vue `__v_raw` proxies | `alphaTab.core.mjs:29679`, `:33691-33694`, and the Node check in §2                                               |

So at the moment of the first drag the array is genuinely `[]`, and
`live-settings.ts:69-71` turns it into a length-N array with holes below `trackIndex`.

One correction to the review's wording: from the **second** drag onward the array is no longer
sparse at all. `[...sparse]` goes through the iterator, which yields `undefined` for holes, so the
copy is dense — full of real `undefined` values. Equally poisonous (`-undefined === NaN`), so the
verdict is unchanged, but the defect is "`undefined` entries", not "holes".

### 1.4 The MIDI path — same array, same hole, drums included

`MidiFileGenerator` reads the identical array with the identical `.length` guard:

- `alphaTab.core.mjs:43011-43017` — `buildTranspositionPitches`
- `alphaTab.core.mjs:43020-43021` — `_generateChannel`:

  ```js
  const transpositionPitch =
    track.index < this._settings.notation.transpositionPitches.length
      ? this._settings.notation.transpositionPitches[track.index]
      : -track.staves[0].transpositionPitch;
  this.transpositionPitches.set(channel, transpositionPitch);
  ```

  A hole is inside `length`, so the ternary takes the **first** branch and stores `undefined`.

The MIDI file itself is generated untransposed (`generator.applyTranspositionPitches = false`,
`alphaTab.core.mjs:46732`) and the offset is applied live in the synth
(`player.applyTranspositionPitches(generator.transpositionPitches)`, `:46742`). So the `undefined`
reaches note-on arithmetic:

- `alphaTab.core.mjs:39259-39260` — `channelNoteOn`: `if (this._transpositionPitches.has(channel)) key += this._transpositionPitches.get(channel);` → **`key` is `NaN`**. There is **no channel-9
  exemption here**, so drum channels are hit like any other. (The `!== 9` skip at `:38933` only
  covers already-sounding voices on a _change_.)
- `alphaTab.core.mjs:39101` — `noteOn` filters regions with
  `if (key < region.loKey || key > region.hiKey || …) continue;`. With `key = NaN` both comparisons
  are **false**, so it does _not_ skip: it starts a voice with `playingKey = NaN`, and
  `Voice.calcPitchRatio` (`:39xxx`, `const note = this.playingKey + …`) produces `NaN`
  `pitchInputTimecents`.
- `alphaTab.core.mjs:39271-39276` — `channelNoteOff` matches on `v.playingKey !== key`; `NaN !== NaN`
  is **true**, so the voice is skipped and **never released**.

So the audio failure is not a clean mute — it is NaN-pitched voices that can never be turned off.

---

## 2. The empirical run

Method: the installed `dist/alphaTab.core.mjs` was copied byte-for-byte into the scratchpad and
given **one** extra line, `export { ModelUtils };`, because `ModelUtils` is not in the public
`model` barrel. Everything executed below — `applyPitchOffsets`, `ScoreLoader`,
`MidiFileGenerator.buildTranspositionPitches` — **is the engine's own code, not a replication.**
The only replication is CASE D (three lines of synth arithmetic), and it is labelled as such.

Scripts (scratchpad, nothing written inside the repo):
`repro.mjs`, `repro-punk.mjs`, `repro-realfiles.mjs`, `repro-filecarried.mjs`, `scan-transpose.mjs`.

### 2.1 Synthetic 3-track score — `node repro.mjs`

```
================ CASE A — PR code (spread + index assign) ================
start  transpositionPitches = []
after  transpositionPitches = [ <2 empty items>, 2 ] | length = 3
  has own index 0?  false
  has own index 1?  false
  arr[0] = undefined  -arr[0] = NaN

--- CASE A after engine applyPitchOffsets ---
┌─────────┬───┬──────────┬──────────────────────────┬────────────────┐
│ (index) │ i │ track    │ staff.transpositionPitch │ note.realValue │
├─────────┼───┼──────────┼──────────────────────────┼────────────────┤
│ 0       │ 0 │ 'Drums'  │ NaN                      │ 0              │
│ 1       │ 1 │ 'Bass'   │ NaN                      │ NaN            │
│ 2       │ 2 │ 'Guitar' │ -2                       │ 57             │
└─────────┴───┴──────────┴──────────────────────────┴────────────────┘
MIDI map (engine buildTranspositionPitches): ch9=undefined ch2=undefined ch3=undefined ch4=2 ch5=2

================ CASE B — playground code (densify, then assign) ================
after  transpositionPitches = [ 0, 0, 2 ] | length = 3
--- CASE B after engine applyPitchOffsets ---
│ 0 │ 'Drums'  │ -0 │ 0  │
│ 1 │ 'Bass'   │ -0 │ 31 │
│ 2 │ 'Guitar' │ -2 │ 57 │
MIDI map (engine buildTranspositionPitches): ch9=0 ch2=0 ch3=0 ch4=2 ch5=2

================ CASE C — PR code called TWICE ================
after  transpositionPitches = [ undefined, undefined, 4 ] | length = 3
  sparse any more? has own index 0 = true
│ 0 │ 'Drums'  │ NaN │ 0   │
│ 1 │ 'Bass'   │ NaN │ NaN │
│ 2 │ 'Guitar' │ -4  │ 59  │
MIDI map: ch9=undefined ch2=undefined ch3=undefined ch4=4 ch5=4

================ CASE D — synth key arithmetic (REPLICATION of :39260) ================
drum note-on key after channel map lookup: NaN | Number.isNaN = true
```

`ch9=undefined` is the whole story for a drum app: the drum channel's transposition becomes
`undefined`, and every drum note-on key becomes `NaN`.

### 2.2 Real scores — `node repro-realfiles.mjs "<ACDC>" "<Angra>"`

```
### ACDC-Back in black.gp — Transpose full +2 on row 2 (Bass)
│ i │ name            │ perc  │ ch │ staff.transpositionPitch │ first note.realValue │ synth map[ch] │
│ 0 │ 'Rhythm Guitar' │ false │  0 │ NaN                      │ NaN                  │ undefined     │
│ 1 │ 'Solos'         │ false │  4 │ NaN                      │ NaN                  │ undefined     │
│ 2 │ 'Bass'          │ false │ 28 │ -2                       │ 42                   │ 2             │
│ 3 │ 'Bass Drum'     │ true  │  9 │ 0                        │ 44                   │ -0            │

### Angra - Nothing To Say.gp — Transpose full +2 on row 8
│ 0 │ 'Andre'        │ false │  0 │ NaN │ NaN │ undefined │
│ 1 │ 'Kiko'         │ false │  2 │ NaN │ NaN │ undefined │
│ 2 │ 'Rafael'       │ false │  4 │ NaN │ NaN │ undefined │
│ 3 │ 'Luis'         │ false │  6 │ NaN │ NaN │ undefined │
│ 4 │ 'Ricardo'      │ true  │  9 │ NaN │   8 │ undefined │   ← the DRUM track, silenced
│ 5 │ 'Keyboard I'   │ false │  8 │ NaN │ NaN │ undefined │
│ 6 │ 'Keyboard II'  │ false │ 11 │ NaN │ NaN │ undefined │
│ 7 │ 'Keyboard III' │ false │ 13 │ NaN │ NaN │ undefined │
│ 8 │ ''             │ false │ 15 │  -2 │  66 │ 2         │
```

One drag on row 8 corrupts **eight** tracks, drums included.

### 2.3 The file the review named — `node repro-punk.mjs`

```
Punk.gp tracks
│ index │ name                │ isPercussion │ Transpose full reachable? │ primaryChannel │
│ 0     │ 'Drumkit'           │ true         │ 'NO (row locked)'         │ 9              │
│ 1     │ 'Distortion Guitar' │ false        │ 'YES'                     │ 0              │
│ 2     │ 'Drumkit Left'      │ true         │ 'NO (row locked)'         │ 9              │

=== PR code, Transpose full +2 on row 1 ===
  transpositionPitches = [ <1 empty item>, 2 ]
│ 0 │ 'Drumkit'           │ staff.transpositionPitch = NaN │ synth map ch9 = -0 │
│ 1 │ 'Distortion Guitar' │ -2                             │ 2                  │
│ 2 │ 'Drumkit Left'      │ 0                              │ -0                 │
```

**Nuance worth telling the maintainer:** the review picked the one local file where the damage is
invisible. Row 0 does get `staff.transpositionPitch = NaN`, but it is percussion, so
`calculateRealValue` returns the articulation and the drawn notes are unharmed; and its audio is
rescued by accident — track 2 shares channel 9 and, being _outside_ the array's length, re-writes
`ch9` to the correct `-0` on the later loop pass (`alphaTab.core.mjs:43011-43017`). Punk.gp is a
false negative for manual testing, not evidence the bug is absent. ACDC and Angra show the real
behaviour.

### 2.4 Worker/JSON path (Node check)

```
orig  [ <2 empty items>, 2 ] len 3 has0 false
clone [ <2 empty items>, 2 ] len 3 has0 false | -c[0] = NaN
```

`structuredClone` preserves the holes, so the worker renderer computes the same `NaN`.

---

## 3. Reachability

**Reachable. No index gating exists.**

- `web/app/play/TracksPopover.tsx:314-355` — `tracks.map(...)` renders a `TrackRow` for **every**
  track, and passes `transposeFull` / `onTransposeFullChange` unconditionally.
- The only lock is percussion, and it is about drums, not index:
  `TracksPopover.tsx:346-351` sets `expandUnavailable` when `track.isPercussion`
  (`web/lib/alphatab/mixer-tracks.ts:88`, `track.staves.some((s) => s.isPercussion)`).
- `client/src/components/ui/TrackRow/TrackRow.tsx:368-380` renders the "Transpose full" slider
  inside the disclosure; any non-percussion row, at any index, can open it.

On **Punk.gp** (§2.3) row 1 "Distortion Guitar" is exactly such a row — the review's claim is
correct. On ACDC and Angra several rows qualify, and the higher the row, the more tracks it
poisons.

Additional reachability note: this survives a score change only because `clearTrackTranspositions`
(`live-settings.ts:85-89`) runs first — which is also why the array is guaranteed virgin, i.e. the
bug fires on the **first** drag of every session, not just after unusual sequences.

---

## 4. The fork-playground comparison — answering the maintainer directly

> _"If this is a bug, why isn't it happening also in the fork playground? We use the same approach,
> don't we?"_

**No — the playground does not use the same approach. It densifies first, and that single missing
loop is the whole difference.**

The reference playground (branch `rhythm-game`, `@coderline/alphatab ^1.8.1`),
`src/components/AlphaTabRhythmGame/track-item.tsx:131-138`:

```js
useEffectNoMount(() => {
  const pitches = api.settings.notation.transpositionPitches;
  while (pitches.length < track.index + 1) {
    pitches.push(0);
  }
  pitches[track.index] = transposeFull;
  api.updateSettings();
  api.render();
}, [api, track, transposeFull]);
```

Identical code at `src/components/AlphaTabPlayground/track-item.tsx:135-142`.

Provenance, from `git blame` / `git log` in that repo (read-only):

- The playground copy was written by **alphaTab's own author** — in `224c52b9 feat: Add Playground page (#128)`, 2025-05-19.
- The rhythm-game copy is the maintainer's own verbatim port, `d36672b8d`, 2026-02-08.

So of the hypotheses put to this spike:

| Hypothesis                                 | Verdict                                                                                                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| It seeds the array for all tracks up front | **This is it** — `while (pitches.length < track.index + 1) pitches.push(0)`                                                                                                                                      |
| It only ever touches track 0               | No — it is keyed on `track.index`, rendered per track                                                                                                                                                            |
| It goes through a different API            | No — it writes `settings.notation.transpositionPitches` directly (it _also_ has `api.changeTrackTranspositionPitch`, but that is the separate audio-only control, mirrored in the PR at `TracksPopover.tsx:200`) |
| It hits the same bug and nobody noticed    | No — the densify makes it impossible                                                                                                                                                                             |
| The fork's engine version differs          | No — `applyPitchOffsets` is byte-identical in the 1.9.0 fork source (`alphaTab's own source packages/alphatab/src/model/ModelUtils.ts:93-106`)                                                                   |

Two smaller differences, neither of which matters for correctness: the playground mutates the live
array **in place** (the PR copies with a spread and reassigns — fine either way), and it calls
`api.updateSettings(); api.render();` directly where the PR routes through
`pushSettings(api, 'render')` (`live-settings.ts:26-27`, same two calls with the render coalesced).

**Bottom line for the maintainer:** the PR is the playground code _minus its first three lines_.
Those three lines are the fix.

---

## 5. Is the proposed fix right?

> `while (pitches.length <= trackIndex) pitches.push(0);` before the assignment

**Correct for the reported P1, and arithmetically identical to upstream's own line**
(`length <= trackIndex` ⟺ `length < trackIndex + 1`). CASE B in §2.1 is that fix running, and it
produces clean `-0` / real note values / `ch9=0`. Ship it — it closes the bug.

**But the fill value `0` is slightly wrong, and it breaks an invariant this PR documents itself.**

`live-settings.ts:82-83` and `NotationSurface.tsx:49-50` both promise: _"Clearing first also leaves
a transposition the FILE itself carries intact."_ Densifying with `0` writes over exactly that.
`node repro-filecarried.mjs` — an alphaTex score whose first track carries `\transpose -2`
(the importer path is `alphaTab.core.mjs:13016`; MusicXML's is `:17154`):

```
as imported            : Bb Trumpet=2  Guitar=0
pitches=[] (clear only): Bb Trumpet=2  Guitar=0      ← today's behaviour, promise kept
densify-with-0 + [1]=2 : Bb Trumpet=0  Guitar=-2  | array = [ 0, 2 ]    ← promise broken
seed-from-score + [1]=2: Bb Trumpet=2  Guitar=-2  | array = [ -2, 2 ]   ← promise kept
```

### Recommended fix

Fill from the score's current stamp rather than from `0` — which is precisely the fallback
alphaTab's own MIDI generator uses for an out-of-range index
(`alphaTab.core.mjs:43013` and `:43020`: `… : -track.staves[0].transpositionPitch`), so notation
and MIDI stay in agreement:

```ts
export function setTrackTransposition(
  api: AlphaTab.AlphaTabApi,
  trackIndex: number,
  semitones: number,
): void {
  const tracks = api.score?.tracks ?? [];
  const pitches = [...api.settings.notation.transpositionPitches];
  // applyPitchOffsets is bounded by this array's LENGTH, not by which entries exist
  // (alphaTab 1.8.4 ModelUtils.applyPitchOffsets), so every index below trackIndex must hold a
  // real number — a hole reaches the engine as `-undefined`, i.e. NaN, on every lower track.
  // Seed from what the score already carries, not 0: 0 would erase a transposition the FILE
  // brought with it. This is the same fallback alphaTab's own MIDI generator uses.
  while (pitches.length <= trackIndex) {
    pitches.push(-(tracks[pitches.length]?.staves[0]?.transpositionPitch ?? 0));
  }
  pitches[trackIndex] = semitones;
  api.settings.notation.transpositionPitches = pitches;
  pushSettings(api, 'render');
}
```

Idempotent across repeat drags: after the first pass `staff.transpositionPitch === -pitches[i]`, so
re-seeding reproduces the same value.

### Severity split, if the triage wants to sequence it

|                    | Severity             | Note                                                                                                                                                                                                                                                                                                              |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `NaN` (holes)  | **P1, ships broken** | Silent — no throw, no console error. Drawn pitches go `NaN`, lower tracks' audio starts unreleasable NaN-pitched voices, drum channel 9 included. Reachable on the first drag on any non-percussion row above index 0.                                                                                            |
| The `0` fill value | **P3**               | Only bites files carrying their own `transpositionPitch` (alphaTex `\transpose`, transposing MusicXML parts). None of the 25 local `.gp*` scores do — they carry `displayTranspositionPitch = -12`, a **different array** this code never touches. Worth fixing in the same edit because it costs one expression. |

### Test that would have caught it

A unit test asserting the array is dense after one write, e.g.
`setTrackTransposition(api, 2, 2)` ⇒ `transpositionPitches.every((p) => Number.isFinite(p))`,
or an integration assertion that no `staff.transpositionPitch` is `NaN` after a transpose.

---

## Appendix — scratchpad artefacts

```
(the spike's session scratchpad — not committed; these are the throwaway scripts behind the run above)
  engine.patched.mjs     copy of the installed 1.8.4 dist + one `export { ModelUtils };` line
  repro.mjs              synthetic 3-track, cases A/B/C/D
  repro-punk.mjs         resources/charts/Punk.gp
  repro-realfiles.mjs    ACDC-Back in black.gp, Angra - Nothing To Say.gp
  repro-filecarried.mjs  alphaTex \transpose — the fill-value question
  scan-transpose.mjs     swept 25 local .gp/.gp5/.gpx for file-carried transposition
```

Nothing outside this scratchpad was written; no git command mutated any repository.
