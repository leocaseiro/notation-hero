// NH-137 demo: identify a song's PARTS (sections) and export EACH part as its own
// standalone alphaTex chunk (with rebased sync points). Combines NH-196 (sections)
// + NH-137 (slice). Usage: node parts.mjs "<file.gp>"
import * as alphaTab from '@coderline/alphatab';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const { ScoreLoader, AlphaTexImporter } = alphaTab.importer;
const { Gp7Exporter, AlphaTexExporter } = alphaTab.exporter;
const { JsonConverter, Automation, AutomationType } = alphaTab.model;
const Settings = alphaTab.Settings;
const settings = new Settings();
const gzip = (await import('node:zlib')).gzipSync;

const file = process.argv[2];
const orig = ScoreLoader.loadScoreFromBytes(new Uint8Array(readFileSync(file)), settings);
const total = orig.masterBars.length;

// ---- identify PARTS from section markers (NH-196) -> [{name, barStart, barEnd}] (1-based)
const marks = [];
orig.masterBars.forEach((mb, i) => {
  if (mb.section && (mb.section.text || mb.section.marker))
    marks.push({ name: mb.section.text || mb.section.marker, start: i + 1 });
});
const parts = marks.map((m, k) => ({
  name: m.name, barStart: m.start,
  barEnd: k < marks.length - 1 ? marks[k + 1].start - 1 : total,
}));

// ---- slice [a..b] (1-based incl) -> healed standalone score (agent's proven approach)
function slice(a1, b1) {
  const score = JsonConverter.jsonToScore(JsonConverter.scoreToJson(orig), settings);
  const aIdx = a1 - 1, bIdx = b1 - 1, keep = (i) => i >= aIdx && i <= bIdx;

  // carry-forward effective tempo onto the new first bar
  let effTempo = score.tempo;
  for (let i = 0; i <= aIdx && i < score.masterBars.length; i++) {
    const au = score.masterBars[i].tempoAutomations;
    if (au && au.length) effTempo = au[au.length - 1].value;
  }
  const fk = score.masterBars[aIdx];
  if (fk && !(fk.tempoAutomations && fk.tempoAutomations.length)) {
    const a = new Automation(); a.type = AutomationType.Tempo; a.value = effTempo; a.ratioPosition = 0;
    fk.tempoAutomations = [a, ...(fk.tempoAutomations ?? [])];
  }
  // rebase sync points to bar A = 0
  const inRange = score.exportFlatSyncPoints().filter(p => keep(p.barIndex));
  const baseMs = inRange.length ? Math.min(...inRange.map(p => p.millisecondOffset)) : 0;
  const rebased = inRange.map(p => ({ ...p, barIndex: p.barIndex - aIdx, millisecondOffset: p.millisecondOffset - baseMs }));

  // trim + re-index masterBars
  const km = score.masterBars.filter((_, i) => keep(i));
  km.forEach((mb, i) => { mb.index = i; mb.previousMasterBar = i ? km[i-1] : null; mb.nextMasterBar = i < km.length-1 ? km[i+1] : null; });
  score.masterBars = km;
  // trim + re-index each staff's bars
  for (const t of score.tracks) for (const s of t.staves) {
    const kb = s.bars.filter((_, i) => keep(i));
    kb.forEach((b, i) => { b.index = i; b.previousBar = i ? kb[i-1] : null; b.nextBar = i < kb.length-1 ? kb[i+1] : null; });
    s.bars = kb;
  }
  // clear cross-boundary note links so finish() doesn't chase cut-away partners
  for (const t of score.tracks) for (const s of t.staves) for (const b of s.bars) for (const v of b.voices) for (const be of v.beats) for (const n of be.notes) {
    for (const f of ['tieOriginNoteId','tieDestinationNoteId','slurOriginNoteId','slurDestinationNoteId','hammerPullOriginNoteId','hammerPullDestinationNoteId'])
      if (n[f] !== undefined && n[f] !== -1) n[f] = -1;
    n.isTieDestination = false;
  }
  score.finish(settings);

  // heal via GP round-trip (re-derives ties from musical context), then re-apply sync
  const healed = ScoreLoader.loadScoreFromBytes(new Uint8Array(new Gp7Exporter().export(score, settings)), settings);
  if (rebased.length) healed.applyFlatSyncPoints(rebased);
  return { healed, rebased, bars: b1 - a1 + 1 };
}

mkdirSync('/tmp/nh137-parts', { recursive: true });
console.log(`\nSONG: "${orig.title}" — ${total} bars, ${orig.exportFlatSyncPoints().length} sync points total`);
console.log(`PARTS: ${parts.length}\n`);
console.log('part                       bars      Δbars  syncPts  alphaTex(raw)  alphaTex(gz)');
console.log('-'.repeat(82));
for (const p of parts) {
  const { healed, rebased, bars } = slice(p.barStart, p.barEnd);
  const tex = new AlphaTexExporter().exportToString(healed, settings);
  const gz = gzip(Buffer.from(tex)).length;
  const safe = p.name.replace(/[^\w]+/g, '_');
  writeFileSync(`/tmp/nh137-parts/${p.barStart}-${p.barEnd}_${safe}.alphatex`, tex);
  console.log(
    `${p.name.padEnd(24)} ${String(p.barStart+'-'+p.barEnd).padStart(7)} ${String(bars).padStart(7)} ${String(rebased.length).padStart(8)} ${String(tex.length+' ch').padStart(13)} ${String(gz+' B').padStart(13)}`
  );
}
console.log(`\nEach part written to /tmp/nh137-parts/  (standalone alphaTex, sync points rebased to bar 1 = 0ms)`);
