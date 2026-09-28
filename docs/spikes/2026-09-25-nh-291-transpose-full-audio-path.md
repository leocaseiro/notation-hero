# Spike B — does "Transpose full" reach the audio?

Read-only validation of a P2 code-review finding against PR #176.
Engine: `@coderline/alphatab` **1.8.4** (confirmed from
`web/node_modules/@coderline/alphatab/package.json:3`).
All engine line numbers below are in the installed
`…/node_modules/@coderline/alphatab/dist/alphaTab.core.mjs` (the unminified ESM dist that
`web/` actually loads).

---

## Verdict

**CONFIRMED — and the mechanism is worse than the review described.** Transpose full never
reaches the synth on any path in this app: the drag pushes render-only (as the review says),
_and_ the app's own `playerReady` handler wipes the synth's transposition map immediately after
every MIDI rebuild — so the review's escape hatch ("until something else rebuilds the MIDI
later, at which point the pitch jumps") does not exist either. The maintainer's "it worked" is
explained by the notation moving instantly (it does) and by **Transpose audio** — the slider
directly above it in the same disclosure — being the one that is audible and that survives every
reload.

---

## 1. The traced path, with quoted file:line

### 1.1 The PR's `pushSettings` — `'render'` vs `'midi'`

`web/lib/alphatab/live-settings.ts:13-28`

```ts
function pushSettings(api: AlphaTab.AlphaTabApi, apply: SettingApply): void {
  …
  if (apply === 'midi') {
    api.loadMidiForScore();
    return;
  }
  api.updateSettings();
  if (apply === 'render') queueRender(api);
}
```

and the function under review, `live-settings.ts:63-73`:

```ts
/** Notation AND audio for one track. The other transposition — audio only — is an api method. */
export function setTrackTransposition(api, trackIndex, semitones): void {
  const pitches = [...api.settings.notation.transpositionPitches];
  pitches[trackIndex] = semitones;
  api.settings.notation.transpositionPitches = pitches;
  pushSettings(api, 'render');
}
```

So `'render'` = `updateSettings()` + one rAF-coalesced `render()`. `'midi'` = `loadMidiForScore()`
**and nothing else** — it does not even call `updateSettings()`. Asserted by the PR's own tests,
`web/lib/alphatab/live-settings.test.ts:100-108`.

### 1.2 `updateSettings()` in the engine — stamps the model, never rebuilds MIDI

`alphaTab.core.mjs:45683-45691`

```js
updateSettings() {
    this.settings.handleBackwardsCompatibility();
    const score = this.score;
    if (score) ModelUtils.applyPitchOffsets(this.settings, score);
    this._updateRenderer();
    this._renderer.updateSettings(this.settings);
    this._setupOrDestroyPlayer();
    this._onSettingsUpdated();
}
```

`ModelUtils.applyPitchOffsets` (`:3691-3696`) stamps the **score model** only:

```js
static applyPitchOffsets(settings, score) {
    for (let i = 0; i < score.tracks.length; i++) {
        if (i < settings.notation.displayTranspositionPitches.length) for (const staff of score.tracks[i].staves) staff.displayTranspositionPitch = -settings.notation.displayTranspositionPitches[i];
        if (i < settings.notation.transpositionPitches.length) for (const staff of score.tracks[i].staves) staff.transpositionPitch = -settings.notation.transpositionPitches[i];
    }
}
```

`_renderer.updateSettings` (`:44682-44685`) forwards to the renderer instance only.
`_onSettingsUpdated` (`:48797-48801`) just fires the `settingsUpdated` event. **No MIDI anywhere.**

### 1.3 `_setupOrDestroyPlayer()` — the early return, quoted

`alphaTab.core.mjs:46680-46714`

```js
_setupOrDestroyPlayer() {
    let mode = this.settings.player.playerMode;
    …
    let newPlayer = null;
    if (mode !== this._actualPlayerMode) {
        this._destroyPlayer();
        …
    } else {
        this._updateCursors();
        return false;          // ← :46706-46708 — mode unchanged, nothing else happens
    }
    this._actualPlayerMode = mode;
    if (!newPlayer) return false;
    this._player.instance = newPlayer;
    return false;              // ← :46713 — note: it returns false even when it DID build a player
}
```

The review's early-return claim is **correct**. (Bonus: the method's JSDoc at `:46678` promises
"true if a new player was created", but every return is `false` — an upstream wart. Its one
consumer, `_onScoreLoaded`, therefore always takes the `loadMidiForScore()` branch.)

### 1.4 Every route to the synth's transposition

There are **two** maps inside the synthesizer, and they are independent:

| synth field                            | written by                                                 | read at                                                                                     |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `_transpositionPitches` (`:38879`)     | `applyTranspositionPitches(map)` (`:38931-38941`)          | `channelNoteOn` `:39260`, `channelNoteOff` `:39271`, `channelSetPerNotePitchWheel` `:39405` |
| `_liveTranspositionPitches` (`:38880`) | `setChannelTranspositionPitch(ch, semis)` (`:38918-38930`) | the same three sites, one line below each (`:39261`, `:39272`, `:39406`)                    |

`channelNoteOn` (`:39258-39264`) adds **both**:

```js
channelNoteOn(channel, key, vel) {
    if (!this._channels || channel > this._channels.channelList.length) return;
    if (this._transpositionPitches.has(channel)) key += this._transpositionPitches.get(channel);
    if (this._liveTranspositionPitches.has(channel)) key += this._liveTranspositionPitches.get(channel);
    …
}
```

**`_transpositionPitches` is the notation-transposition map.** Its only playback-side writer is
`loadMidiForScore` — `alphaTab.core.mjs:46722-46743`:

```js
loadMidiForScore() {
    …
    generator.applyTranspositionPitches = false;   // :46732 — the MIDI is generated UNtransposed
    generator.generate();
    …
    player.loadMidiFile(midiFile);                 // :46739
    player.loadBackingTrack(score);
    player.updateSyncPoints(generator.syncPoints);
    player.applyTranspositionPitches(generator.transpositionPitches);   // :46742 — the ONLY push
}
```

The map it pushes is built per channel at `:43019-43021`, from the same setting the PR writes:

```js
_generateChannel(track, channel, playbackInfo) {
    const transpositionPitch = track.index < this._settings.notation.transpositionPitches.length ? this._settings.notation.transpositionPitches[track.index] : -track.staves[0].transpositionPitch;
    this.transpositionPitches.set(channel, transpositionPitch);
```

The only other `player.applyTranspositionPitches(...)` call in the file is the **audio-export**
path (`:48994`), not playback. So: `loadMidiForScore` is indeed the sole route, as claimed.

**`_liveTranspositionPitches` is the audio-only map**, reached by the public
`api.changeTrackTranspositionPitch` (`:46906-46911`):

```js
changeTrackTranspositionPitch(tracks, semitones) {
    for (const track of tracks) {
        this._player.setChannelTranspositionPitch(track.playbackInfo.primaryChannel, semitones);
        this._player.setChannelTranspositionPitch(track.playbackInfo.secondaryChannel, semitones);
    }
}
```

That is the "other transposition — audio only — is an api method" the JSDoc refers to, and the PR
uses it at `web/app/play/TracksPopover.tsx:196`.

### 1.5 Who calls `loadMidiForScore`

1. `player.ready` handler — `:45584-45586` (worker came up).
2. `_onScoreLoaded` — `:48029` `if (!this._setupOrDestroyPlayer()) this.loadMidiForScore();`
   (always true, per §1.3).
3. `_internalRenderTracks`, new-score branch — `:45846`.
4. The app itself, via `pushSettings(api, 'midi')` — the fourteen MIDI-shaping settings rows
   (`web/lib/alphatab/settings-schema.ts:339` … `:457`: song-book bend/dip durations, the eight
   vibrato rows, etc.).

Nothing in the transposition path is on that list.

### 1.6 Does `render()` / `renderScore()` reload the MIDI? **No.**

`alphaTab.core.mjs:46049-46054`

```js
render(renderHints) {
    if (this.uiFacade.canRender) {
        this._renderer.width = this.container.width;
        this._renderer.renderScore(this.score, this._trackIndexes, renderHints);
    } else this.uiFacade.canRenderChanged.on(() => this.render(renderHints));
}
```

`this._renderer` is the `ScoreRendererWrapper` (`:44674-44678`) — renderer only. It does **not**
go through `AlphaTabApiBase._internalRenderTracks`, so no `scoreLoaded`, no `loadMidiForScore`.
The review's assumption is correct.

`_internalRenderTracks` (`:45836-45857`) only reloads MIDI on the `score !== this.score` branch —
a genuinely new score.

### 1.7 The extra finding the review missed — the app wipes the map it would need

`web/app/play/TracksPopover.tsx:237-250` (the component is mounted unconditionally in the
transport bar, `web/app/play/PlayerShell.tsx:1034`, so this handler is always live):

```tsx
useAlphaTabEvent(api, 'playerReady', () => {
  api?.player?.resetChannelStates();
  for (const row of tracksRef.current) {
    applyVolume(row.index, row.volume);
    if (row.mute) applyMute(row.index, true);
    if (row.solo) applySolo(row.index, true);
    if (row.transposeAudio) applyTransposeAudio(row.index, row.transposeAudio);
  }
});
```

`resetChannelStates()` on the synthesizer (`alphaTab.core.mjs:38911-38917`):

```js
resetChannelStates() {
    this._mutedChannels = new Map();
    this._soloChannels = new Map();
    this._liveTranspositionPitches = new Map();
    this.applyTranspositionPitches(new Map());   // ← :38915 clears _transpositionPitches TOO
    this._isAnySolo = false;
}
```

The re-assert loop restores volume, mute, solo and **`transposeAudio`** — it does **not** restore
`transposeFull`. And the ordering makes the wipe land last:

- The browser player is always a **Web Worker** — `BrowserUiFacade.createWorkerPlayer`
  (`:41254-41283`) returns an `AlphaSynthWebWorkerApi` on every branch, so every synth call is an
  async `postMessage` (`loadMidiFile` `:33685-33690`, `applyTranspositionPitches` `:33691-33695`,
  `resetChannelStates` `:33711-33713`).
- Inside `loadMidiForScore` the main thread synchronously posts, in order:
  `loadMidi` → `loadBackingTrack` → `updateSyncPoints` → `applyTranspositionPitches`.
- The worker handles `loadMidi` → `AlphaSynth.loadMidiFile` (`:40054-40064`) →
  `_checkReadyForPlayback()` (`:40037-40048`) → `readyForPlayback.trigger()` →
  `onReadyForPlayback()` posts `alphaSynth.readyForPlayback` back to main (`:50095-50097`).
  `isReadyForPlayback` is `isReady && isSoundFontLoaded && _isMidiLoaded` (`:39794-39796`), so
  once the soundfont is in, **every** MIDI reload re-fires it.
- Main receives that message only at the next task boundary — after it has already queued
  `applyTranspositionPitches`. Its handler then posts `resetChannelStates`, which the worker
  therefore processes **after** the transposition map was set.

Net: after every MIDI (re)load the synth ends with `_transpositionPitches` **empty**.

> Caveat, stated plainly: this ordering is **traced, not executed**. It follows from
> single-threaded message ordering and is deterministic on the code as written, but nobody has run
> it in a browser. A 20-second check in devtools: set Transpose full to +12 on a pitched track,
> press play, then run `api.loadMidiForScore()` in the console — if the pitch jumps up an octave
> and stays, the reset theory is wrong; if it does not move at all, it is right.

A side effect worth a separate ticket: `_transpositionPitches` also carries the **file's own**
transposition when the settings array does not cover a track (`:43020`'s
`: -track.staves[0].transpositionPitch` fallback). Wiping it means a file that ships a transposing
instrument also plays at concert pitch. Not this finding; flagging it.

---

## 2. Why the maintainer's test appeared to work

Five candidates, each tested against the code.

| #   | Candidate                                                                     | Verdict                                                                            |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | He saw the **notation** move and read that as "it worked"                     | **Supported — most likely**                                                        |
| 2   | He heard the **other slider** (Transpose audio), which sits directly above it | **Supported — strong second**                                                      |
| 3   | Something else rebuilt the MIDI, so the audio caught up                       | **Refuted** by §1.7                                                                |
| 4   | The `playerReady` re-assert path re-applies it                                | **Refuted** — that loop re-applies `transposeAudio` only (`TracksPopover.tsx:248`) |
| 5   | Works on track 0 but not later tracks / only before the player started        | **Not the cause here** (see the note below)                                        |

**Candidate 1 (most likely).** The notation genuinely transposes, instantly, on release.
`applyPitchOffsets` writes `staff.transpositionPitch = -semitones` (`:3694`); the printed pitch
comes from `Note.displayValue` → `realValue` → `calculateRealValue(true, …)` (`:6157-6168`), which
subtracts that field — e.g. for a stringed note, `fret + stringTuning - transpositionPitch`, i.e. +`semitones`. The rAF'd `render()` repaints it a frame later. A person who drags "Transpose full",
sees every note move up, and does not A/B the sound against a reference will report "it worked".
Note also that the app's own UI copy is already honest about this: `client/src/components/ui/
TrackRow/TrackRow.tsx:78` says _"Transpose full stay live: they change the drawn score."_

**Candidate 2 (strong second).** The two sliders are adjacent inside the same disclosure —
"Transpose audio" at `TrackRow.tsx:348-365`, "Transpose full" at `:367-383`, same range (−12…+12),
same `+n` readout, ~20 px apart. Transpose audio _is_ audible, immediately, with no MIDI rebuild,
and it **survives** every reload because the same `playerReady` handler re-asserts it
(`TracksPopover.tsx:248`). If both were touched in one session, or if the wrong row was grabbed,
the audio change is real and would be attributed to whichever label was being looked at.

**Candidate 3 (refuted).** This was the review's own hedge. A MIDI rebuild _does_ push the right
map (`:46742`) — but `readyForPlayback` follows it and the app's `resetChannelStates()` clears it
again (§1.7). So there is no "later pitch jump" either. The bug is quieter than the review says,
not louder.

**Candidate 5 (not the cause, but a real adjacent bug).** `setTrackTransposition` does
`pitches[trackIndex] = semitones` on a copy of a possibly-shorter array
(`live-settings.ts:69-71`), which creates **holes** for every lower index. `applyPitchOffsets`
loops `i < length` and reads `transpositionPitches[i]` → `undefined` → `staff.transpositionPitch =
-undefined = NaN` for tracks 0…n−1. The fork playground avoids exactly this by padding with zeros
first (`src/components/AlphaTabRhythmGame/track-item.tsx:133-135`). This is its own defect — it is
the subject of the sibling spike (`spike-sparse-pitches`) and is **not** the explanation for the
audio finding, because it neither adds nor removes the synth push. Worth noting only because a
test on **track 0** (array length 1, no holes) would look clean while a test on track 2 would also
scramble tracks 0 and 1's notation.

---

## 3. Exact repro for both outcomes

### Audio DOES follow — the only sequence that works

1. Open a pitched (non-percussion) file, wait for Play to enable.
2. Open **Tracks**, expand a track, drag **Transpose audio** to +7, release.
3. Press play. → The track sounds a fifth higher. The notation does **not** move.
   Trace: `TracksPopover.tsx:196` → `changeTrackTranspositionPitch` (`:46906`) →
   `setChannelTranspositionPitch` (`:38918`) → `_liveTranspositionPitches` → `channelNoteOn`
   `:39261`.
4. Open another file and come back, or change any MIDI-shaping settings row: the value is
   re-asserted by `TracksPopover.tsx:248` after the reload. It survives.

### Audio does NOT follow — the finding

1. Open a pitched file, wait for Play to enable (the soundfont must be in; this is what arms the
   `readyForPlayback` → `resetChannelStates` cycle).
2. Open **Tracks**, expand a track, drag **Transpose full** to +7, release.
3. Notation moves up a fifth immediately. Press play → the sound is unchanged.
   Trace: `pushSettings(api,'render')` → `updateSettings()` → `_setupOrDestroyPlayer()` hits the
   unchanged-mode early return `:46706-46708` → no `loadMidiForScore` → the synth's
   `_transpositionPitches` is never written.
4. Now force a rebuild — change a vibrato or song-book row in Settings (an `apply: 'midi'` row), or
   re-open the same file. The player stops and rewinds, and the sound is **still** unchanged:
   `loadMidiForScore` pushed the map at `:46742`, then `readyForPlayback` fired and
   `TracksPopover.tsx:243`'s `resetChannelStates()` cleared it (`:38915`).

So the review's claim holds in the **general** case, not a narrow one — and its predicted "pitch
jumps unexpectedly later" does not happen at all.

---

## 4. Fork-playground comparison

The reference playground (branch `rhythm-game`, per
`.claude/local-references.md` §1). alphaTab ^1.8.1.

`src/components/AlphaTabRhythmGame/track-item.tsx:124-139`:

```tsx
const [transposeAudio, setTransposeAudio] = useState<number>(0);
const [transposeFull, setTransposeFull] = useState<number>(0);

useEffectNoMount(() => {
  api.changeTrackTranspositionPitch([track], transposeAudio);
}, [api, track, transposeAudio]);

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

**The playground pushes render only — no `loadMidiForScore`.** It is the exact shape the PR
copied. And it makes the same claim in its tooltip, `track-item.tsx:197`:
_"Fully transposes the track (audio and notation)"_.

**No warning/note about a player restart** anywhere near it. The playground _does_ know the
pattern — `playground-settings.tsx:271-277` defines a `withMidiGenerate` option that calls
`context.api.loadMidiForScore()`, and twelve settings rows use it (`:550`…`:647`) — but
transposition is not one of them.

Upstream's own docs are internally inconsistent: `Settings.notation.transpositionPitches` is
summarised as _"used for rendering and playback"_ (`alphaTab.core.mjs:1505`) while the very next
remark line says only _"considered when displaying the music sheet"_ (`:1511`).

**Conclusion:** the PR inherited a genuine upstream gap, verbatim. It is not a mistake introduced
by this PR — but it is also not a behaviour the playground validates, because the playground has
no `resetChannelStates` re-assert and so at least gets the transposition on the _next_ score load.
Notation-hero does not even get that.

---

## 5. Which resolution the evidence supports

### Option A — `pushSettings(api, 'midi')` + the MIDI-rebuild warning

**Supported in direction, but INCOMPLETE as written.** Two corrections:

1. **It does not work on its own.** Switching to `'midi'` calls `loadMidiForScore`, which pushes
   the map at `:46742` — and then `readyForPlayback` fires and `TracksPopover.tsx:243`'s
   `resetChannelStates()` wipes it again (§1.7). A fix must _also_ re-assert transposeFull in that
   handler, or stop using `resetChannelStates` there. The minimal companion change is one line
   beside the existing `transposeAudio` re-assert:

   ```ts
   if (row.transposeFull) applyTransposeFull(row.index, row.transposeFull);
   ```

   …except `applyTransposeFull` would itself call `loadMidiForScore`, re-entering the cycle. The
   clean form is a direct push of the map — or, simpler, drop `resetChannelStates()` and clear
   mute/solo explicitly, since those are the only states it is actually there to clear.

2. **The cost objection in the review is wrong.** It says A "costs a stop-and-rewind on each
   drag". It does not. The slider already commits on release only:
   `client/src/components/ui/TrackRow/TrackRow.tsx:369-375` feeds `onChange` into a local
   `fullDraft` and calls `onTransposeFullChange` from `onCommit`; `Slider.tsx:105` wires that to
   Base UI's `onValueCommitted`, which fires on pointer-up. So it is **one rebuild per drag**, plus
   one per arrow-key press — the same cost the fourteen `apply: 'midi'` settings rows already pay,
   with the same existing warning string (`settings-schema.ts:86`: _"Rebuilds the MIDI to take
   effect — this stops playback and rewinds to the start."_).

### Option B — relabel as notation-only

**Also supported by the code, and the cheapest honest thing.** The mixer already has a working
audio-only control (`changeTrackTranspositionPitch`, `TracksPopover.tsx:196`), so relabelling
Transpose full to "Transpose notation" costs the user nothing they cannot already do — they set
both sliders to the same value to get both. `TrackRow.tsx:78` already describes it this way.
The JSDoc at `live-settings.ts:63` and the `TrackRow.tsx:368` label would change; no engine
behaviour changes; no stop-and-rewind is introduced.

### Option C (third option) — "push MIDI on commit, not on drag"

**Already the wiring.** §5-A-2: the slider is commit-only today. So "C" is not a distinct option —
it collapses into A, and it removes A's only stated downside.

### Recommendation

**Do A, with its companion fix — but only if Transpose full is meant to be an audio control.**
The decisive axis is product intent, not cost: the cost argument that made B attractive
(a rewind per drag frame) does not exist, because the slider already commits once per release.

- If the control should transpose sound, take **A** and add the re-assert, otherwise the fix is
  invisible and the next reviewer re-files this finding.
- If two adjacent −12…+12 sliders that both change pitch is the real confusion, take **B**: rename
  to "Transpose notation", fix the JSDoc, and let "Transpose audio" own the sound. This is the
  smaller, safer change and it is what the code does today.

Either way, **the `resetChannelStates()` / `transposeFull` gap in `TracksPopover.tsx:242-250` is a
finding in its own right** and should be recorded even if B is chosen — under B it still silently
drops any transposition the _file_ carries (§1.7 note).

---

## Appendix — files read

```
web/lib/alphatab/live-settings.ts
web/lib/alphatab/live-settings.test.ts
web/lib/alphatab/settings-schema.ts
web/app/play/TracksPopover.tsx
web/app/play/PlayerShell.tsx
client/src/components/ui/TrackRow/TrackRow.tsx
client/src/components/ui/Slider/Slider.tsx
web/node_modules/@coderline/alphatab/dist/alphaTab.core.mjs
the reference playground src/components/AlphaTabRhythmGame/track-item.tsx
the reference playground src/components/AlphaTabRhythmGame/playground-settings.tsx
.claude/local-references.md
```

Nothing outside this scratchpad was written. No mutating git command was run.
