// NH-137 spike: produce bars A..B of a song as a STANDALONE notation.
// Proves (headless, Node): clone-to-GP (approach 1), JSON round-trip (approach 2),
// alphaTex export (approach 3), and sync-point rebasing for a slice.
//
// Usage: node slice.mjs "<file.gp>" <barAfrom1based> <barBfrom1based>
import * as alphaTab from '@coderline/alphatab';
import { readFileSync, writeFileSync } from 'node:fs';

// namespaced exports
const { ScoreLoader, AlphaTexImporter } = alphaTab.importer;
const { Gp7Exporter, AlphaTexExporter } = alphaTab.exporter;
const { JsonConverter } = alphaTab.model;
const Settings = alphaTab.Settings;
const at = { ScoreLoader, AlphaTexImporter, Gp7Exporter, AlphaTexExporter, JsonConverter };

const [, , file, aArg, bArg] = process.argv;
const A = parseInt(aArg ?? '1', 10);   // 1-based inclusive
const B = parseInt(bArg ?? '4', 10);   // 1-based inclusive
const settings = new Settings();

function load(path) {
  const bytes = new Uint8Array(readFileSync(path));
  return at.ScoreLoader.loadScoreFromBytes(bytes, settings);
}

function describe(score, label) {
  const mbCount = score.masterBars.length;
  const t0 = score.tracks[0];
  const barCount = t0?.staves?.[0]?.bars?.length ?? 0;
  // count notes in first track staff 0
  let notes = 0;
  for (const bar of t0.staves[0].bars)
    for (const v of bar.voices) for (const be of v.beats) notes += be.notes.length;
  const sp = score.exportFlatSyncPoints();
  const bt = score.backingTrack;
  const audioLen = bt?.rawAudioFile ? bt.rawAudioFile.length : 0;
  console.log(`  [${label}] title="${score.title}" tracks=${score.tracks.length} masterBars=${mbCount} t0bars=${barCount} t0notes(staff0)=${notes} tempo=${score.tempo} sync=${sp.length} backingTrack=${!!bt} rawAudio=${audioLen}B`);
  return { mbCount, barCount, notes, sp, audioLen };
}

// ---------- THE SLICE: keep only masterBars [A-1 .. B-1] and the matching bars on every staff
// Strategy: rebuild by deleting bars outside the range from every staff + masterBars,
// then re-link & finish. AlphaTab models are mutable; bars are arrays we can splice.
function sliceScore(orig, a1, b1) {
  // re-load a fresh copy so we never mutate the original in memory
  const json = at.JsonConverter.scoreToJson(orig);
  const score = at.JsonConverter.jsonToScore(json, settings);

  const aIdx = a1 - 1, bIdx = b1 - 1;               // 0-based inclusive
  const keep = (i) => i >= aIdx && i <= bIdx;

  // CARRY-FORWARD effective tempo at bar A. Tempo automations only sit on bars where
  // the tempo CHANGES, so a slice starting mid-song would lose the initial tempo and
  // fall back to 120 BPM. Scan all bars up to (and including) A for the last tempo and
  // inject it onto the bar that will become the new first bar.
  let effTempo = score.tempo; // default/initial
  for (let i = 0; i <= aIdx && i < score.masterBars.length; i++) {
    const autos = score.masterBars[i].tempoAutomations;
    if (autos && autos.length) effTempo = autos[autos.length - 1].value;
  }
  const AutomationCtor = alphaTab.model.Automation;
  const AutomationTypeE = alphaTab.model.AutomationType;
  const firstKept = score.masterBars[aIdx];
  const hasTempoAtA = firstKept.tempoAutomations && firstKept.tempoAutomations.length > 0;
  if (firstKept && !hasTempoAtA) {
    const a = new AutomationCtor();
    a.type = AutomationTypeE.Tempo;
    a.value = effTempo;
    a.ratioPosition = 0;
    firstKept.tempoAutomations = [a, ...(firstKept.tempoAutomations ?? [])];
  }

  // 1) sync points BEFORE we drop masterBars (rebase bar index + ms offset to A=0)
  const baseMs = (() => {
    // find earliest sync ms at/after bar A so the slice's audio starts at 0
    const all = score.exportFlatSyncPoints();
    const inRange = all.filter(p => keep(p.barIndex));
    if (inRange.length === 0) return 0;
    return Math.min(...inRange.map(p => p.millisecondOffset));
  })();
  const rebasedSync = score.exportFlatSyncPoints()
    .filter(p => keep(p.barIndex))
    .map(p => ({ ...p, barIndex: p.barIndex - aIdx, millisecondOffset: p.millisecondOffset - baseMs }));

  // 2) trim master bars AND re-index them 0..N-1 + rebuild prev/next links
  const keptMaster = score.masterBars.filter((_, i) => keep(i));
  keptMaster.forEach((mb, i) => {
    mb.index = i;
    mb.previousMasterBar = i > 0 ? keptMaster[i - 1] : null;
    mb.nextMasterBar = i < keptMaster.length - 1 ? keptMaster[i + 1] : null;
    // drop a leftover repeat-open/close that would dangle past the slice edge
  });
  score.masterBars = keptMaster;

  // 3) trim each staff's bars in every track AND re-index 0..N-1 + rebuild links.
  //    Bar.masterBar is a positional getter (score.masterBars[bar.index]),
  //    so bar.index MUST line up with the trimmed masterBars array.
  for (const t of score.tracks)
    for (const s of t.staves) {
      const kept = s.bars.filter((_, i) => keep(i));
      kept.forEach((bar, i) => {
        bar.index = i;
        bar.previousBar = i > 0 ? kept[i - 1] : null;
        bar.nextBar = i < kept.length - 1 ? kept[i + 1] : null;
      });
      s.bars = kept;
    }

  // 3b) CLEAR cross-boundary note links. Ties / hammer-ons / slurs / let-ring are
  //     resolved by note-id during finish(); if an origin/destination note lived in a
  //     bar we cut away, finish() crashes (dangling id) or mis-chains. We null out the
  //     *-NoteId fields on every kept note so finish() only chains within the slice.
  let clearedLinks = 0;
  for (const t of score.tracks)
    for (const s of t.staves)
      for (const bar of s.bars)
        for (const v of bar.voices)
          for (const be of v.beats)
            for (const n of be.notes) {
              // ids referencing notes that may be outside the slice
              for (const f of ['tieOriginNoteId','tieDestinationNoteId','slurOriginNoteId',
                               'slurDestinationNoteId','hammerPullOriginNoteId','hammerPullDestinationNoteId']) {
                if (n[f] !== undefined && n[f] !== -1) { n[f] = -1; clearedLinks++; }
              }
              // also drop isTieDestination flag on first bar so finish doesn't seek an origin
              n.isTieDestination = false;
            }

  // 4) re-finish so ticks / durations / fermata lookups rebuild on the trimmed model
  score.finish(settings);
  if (clearedLinks) console.log(`  (cleared ${clearedLinks} cross-boundary note-link refs before finish)`);

  // 5) re-apply rebased sync points onto the trimmed score
  if (rebasedSync.length) score.applyFlatSyncPoints(rebasedSync);

  return { score, rebasedSync, baseMs };
}

const atVersion = JSON.parse(readFileSync('node_modules/@coderline/alphatab/package.json', 'utf8')).version;
console.log(`\n=== NH-137 slice spike — alphatab ${atVersion} ===`);
console.log(`file: ${file}\nrange: bars ${A}..${B} (1-based inclusive)\n`);

const orig = load(file);
const before = describe(orig, 'ORIGINAL');

const { score: sliced, rebasedSync, baseMs } = sliceScore(orig, A, B);
const after = describe(sliced, 'SLICED  ');
console.log(`  rebased sync points (bar A -> index 0, ms baseline ${baseMs}):`, JSON.stringify(rebasedSync));

const expectBars = B - A + 1;
console.log(`\n  EXPECT sliced bars == ${expectBars} -> ${after.barCount === expectBars ? 'PASS' : 'FAIL (' + after.barCount + ')'}`);

// ---------- APPROACH 1: export sliced score to a NEW .gp (Gp7), reload, verify
// Re-attach the original embedded audio blob so Gp7Exporter can re-embed it (the JSON
// clone inside sliceScore drops rawAudioFile because it is @json_ignore).
if (orig.backingTrack?.rawAudioFile && sliced.backingTrack) {
  sliced.backingTrack.rawAudioFile = orig.backingTrack.rawAudioFile;
  console.log(`  (re-attached ${orig.backingTrack.rawAudioFile.length}B audio blob to slice for GP export)`);
}
const gpBytes = new at.Gp7Exporter().export(sliced, settings);
writeFileSync('/tmp/nh137-spike/out-slice.gp', Buffer.from(gpBytes));
const gpReload = at.ScoreLoader.loadScoreFromBytes(new Uint8Array(gpBytes), settings);
const gp = describe(gpReload, 'GP-RELOAD');
console.log(`  APPROACH 1 (GP clone+export+reload): bytes=${gpBytes.length} bars=${gp.barCount} notes=${gp.notes} sync=${gp.sp.length} -> ${gp.barCount === expectBars ? 'PASS bars' : 'FAIL bars'}`);

// The sliced in-memory score still carries dangling cross-boundary note-id links in
// each Note's private _noteIdBag (ties/hammer-ons whose partner was cut away). The GP
// exporter heals these (re-derives ties from musical context), so we round-trip the
// slice THROUGH GP once and use that healed score as the basis for JSON + alphaTex.
const healed = gpReload; // already reloaded from the exported .gp above — links are clean
// re-assert the rebased sync points on the healed score (so JSON/alphaTex can carry them)
if (rebasedSync.length) healed.applyFlatSyncPoints(rebasedSync);
console.log(`  (healed score sync after re-apply: ${healed.exportFlatSyncPoints().length})`);

// ---------- APPROACH 2: JSON serialize the (healed) sliced score, reload, verify
const sliceJson = at.JsonConverter.scoreToJson(healed);
writeFileSync('/tmp/nh137-spike/out-slice.json', sliceJson);
const jsonReload = at.JsonConverter.jsonToScore(sliceJson, settings);
const js = describe(jsonReload, 'JSON-RELD');
console.log(`  APPROACH 2 (JSON of slice): jsonChars=${sliceJson.length} bars=${js.barCount} notes=${js.notes} sync=${js.sp.length} -> ${js.barCount === expectBars ? 'PASS bars' : 'FAIL bars'}`);

// ---------- APPROACH 3: alphaTex export of the sliced score, reload, verify
let texOk = false, texLen = 0, texReloadBars = 0, texNotes = 0, texSync = 0, texErr = '';
try {
  const tex = new at.AlphaTexExporter().exportToString(healed, settings);
  writeFileSync('/tmp/nh137-spike/out-slice.alphatex', tex);
  texLen = tex.length;
  // reload alphaTex
  const imp = new at.AlphaTexImporter();
  imp.initFromString(tex, settings);
  const texScore = imp.readScore();
  const r = describe(texScore, 'TEX-RELD ');
  texReloadBars = r.barCount; texNotes = r.notes; texSync = r.sp.length;
  texOk = true;
  console.log(`  APPROACH 3 (alphaTex of slice): texChars=${texLen} bars=${texReloadBars} notes=${texNotes} sync=${texSync} -> ${texReloadBars === expectBars ? 'PASS bars' : 'FAIL bars'}`);
} catch (e) {
  texErr = e?.message ?? String(e);
  console.log(`  APPROACH 3 (alphaTex of slice): ERROR -> ${texErr}`);
}

console.log('\n=== storage footprint of THIS slice ===');
console.log(`  GP bytes:        ${gpBytes.length}`);
console.log(`  JSON chars:      ${sliceJson.length}`);
console.log(`  alphaTex chars:  ${texOk ? texLen : 'n/a'}`);
