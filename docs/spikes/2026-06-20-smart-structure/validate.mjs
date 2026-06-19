// validate.mjs — NH-200 R3: honest accuracy read vs ground truth.
//
// Section approximation NEVER reads section markers (methods a/b/c use repeats,
// chords, and self-similarity only), so the marker files double as ground truth
// directly — no stripping needed. We score predicted boundaries against the real
// markers at ±1 and ±2 bar tolerance (bar 1, the trivial song-start boundary, is
// excluded from scoring so it can't inflate the numbers).
//
// Key-change timeline is checked against known expectations (single-key songs vs
// the modulating Africa / Bohemian Rhapsody).
//
// Usage: node validate.mjs
import {
  loadScore,
  meta,
  markerBoundaries,
  readStructure,
} from './lib.mjs';
import {
  boundariesFromRepeats,
  boundariesFromChords,
  boundariesFromNovelty,
  mergeBoundaries,
} from './sections.mjs';
import { keyTimeline } from './keychanges.mjs';

const CORPUS = '/Users/leocaseiro/Music/AlphaTab-RhythmGame';

// clean-marker ground truth (verified: real intro/verse/chorus markers)
const GROUND_TRUTH = ["I'm Yours - Jason Mraz.gp", 'Coldplay-Yellow-06-26-2025.gp'];
// marker-less targets (qualitative — no bar-aligned ground truth)
const MARKERLESS = ['Toto - Africa.gp', 'Bohemian Rhapsody.gp', 'Happiness is a Warm Gun.gp'];

function score(predicted, truth, tol) {
  const pred = predicted.filter((b) => b !== 1);
  const tru = truth.filter((b) => b !== 1);
  const used = new Array(tru.length).fill(false);
  let tp = 0;
  for (const p of pred) {
    let bi = -1;
    let bd = Infinity;
    for (let i = 0; i < tru.length; i++) {
      if (used[i]) continue;
      const d = Math.abs(p - tru[i]);
      if (d <= tol && d < bd) {
        bd = d;
        bi = i;
      }
    }
    if (bi >= 0) {
      used[bi] = true;
      tp++;
    }
  }
  const fp = pred.length - tp;
  const fn = tru.length - tp;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, precision, recall, f1 };
}

const pct = (x) => (x * 100).toFixed(0).padStart(3) + '%';
const row = (cells, w) => cells.map((c, i) => String(c).padEnd(w[i])).join(' ');

function methodsFor(score_) {
  const repeats = boundariesFromRepeats(score_);
  const chords = boundariesFromChords(score_);
  const novelty = boundariesFromNovelty(score_);
  const mergedAll = mergeBoundaries({ repeats, chords, novelty }).map((m) => m.bar);
  const mergedVote2 = mergeBoundaries({ repeats, chords, novelty })
    .filter((m) => m.votes >= 2)
    .map((m) => m.bar);
  return { repeats, chords, novelty, 'merged(all)': mergedAll, 'merged(votes>=2)': mergedVote2 };
}

console.log('\n================  SECTION-BOUNDARY ACCURACY (vs file markers)  ================\n');
const W = [26, 18, 11, 11, 11];
console.log(row(['song / method', 'pred boundaries', 'P@1/R@1', 'P@2/R@2', 'F1@2'], W));
console.log('-'.repeat(80));
for (const f of GROUND_TRUTH) {
  const s = loadScore(`${CORPUS}/${f}`);
  const m = meta(s, f);
  const truth = markerBoundaries(s);
  console.log(`${m.title} — ${truth.length} true markers, ${m.bars} bars`);
  const methods = methodsFor(s);
  for (const [name, pred] of Object.entries(methods)) {
    const a = score(pred, truth, 1);
    const b = score(pred, truth, 2);
    console.log(
      row(
        ['  ' + name, pred.filter((x) => x !== 1).length, `${pct(a.precision)}/${pct(a.recall)}`, `${pct(b.precision)}/${pct(b.recall)}`, pct(b.f1)],
        W,
      ),
    );
  }
  console.log('');
}

console.log('\n================  KEY-CHANGE TIMELINE CHECK  ================\n');
const KW = [26, 8, 34, 6];
console.log('legend: M = major, m = minor');
console.log(row(['song', 'spans', 'timeline', 'check'], KW));
console.log('-'.repeat(78));
const keyExpect = {
  "I'm Yours - Jason Mraz.gp": { spans: 1, note: 'single B major', ok: (t) => t.length === 1 && t[0].key?.tonic === 'B' && t[0].key?.type === 'major' },
  'Coldplay-Yellow-06-26-2025.gp': { spans: 1, note: 'single B major', ok: (t) => t.length === 1 && t[0].key?.tonic === 'B' && t[0].key?.type === 'major' },
  'Toto - Africa.gp': { spans: '>1', note: 'modulates', ok: (t) => t.length > 1 },
  'Bohemian Rhapsody.gp': { spans: '>1', note: 'modulates', ok: (t) => t.length > 1 },
  'Happiness is a Warm Gun.gp': { spans: '?', note: 'exploratory', ok: () => true },
};
for (const f of [...GROUND_TRUTH, ...MARKERLESS]) {
  const s = loadScore(`${CORPUS}/${f}`);
  const m = meta(s, f);
  const t = keyTimeline(s);
  const exp = keyExpect[f];
  const summary = t.map((x) => `${x.key ? x.key.tonic + (x.key.type === 'major' ? 'M' : 'm') : '?'}[${x.barStart}-${x.barEnd}]`).join(' ');
  const ok = exp.ok(t) ? 'PASS' : 'FAIL';
  console.log(row([m.title.slice(0, 24), t.length, summary.slice(0, 33), ok], KW));
}

console.log('\n================  MARKER-LESS SECTION APPROXIMATION (qualitative)  ================\n');
for (const f of MARKERLESS) {
  const s = loadScore(`${CORPUS}/${f}`);
  const m = meta(s, f);
  const st = readStructure(s);
  const methods = methodsFor(s);
  console.log(`${m.title} [${m.bars} bars, ${st.repeats.length} repeat marks, ${st.sections.length} file markers]`);
  console.log(`  merged(votes>=2) boundaries: ${methods['merged(votes>=2)'].join(', ') || '(none)'}`);
  console.log(`  merged(all) count: ${methods['merged(all)'].length}`);
}
console.log('\nNote: "Bohemian Rhapsody with sections.gp" is NOT bar-aligned ground truth');
console.log('(3 annotation texts, 139 vs 122 bars) — excluded from scored accuracy.\n');
