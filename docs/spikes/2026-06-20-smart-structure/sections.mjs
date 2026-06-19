// sections.mjs — NH-200 R2: section/part approximation for marker-less songs.
//
// Three independent rule-based signals, then a merge/vote:
//   (a) repeats  — Guitar Pro repeat structure (isRepeatStart/isRepeatEnd/alt endings)
//   (b) chords   — chord-progression change-points (harmonic-phrase novelty on chord roots)
//   (c) novelty  — bar self-similarity matrix + Foote checkerboard-kernel novelty
// Boundaries are 1-based bar numbers; bar 1 is always a boundary (song start).
// Segments are labelled by structural class (A/B/C…) via histogram similarity —
// NOT guessed intro/verse/chorus names (that is a harder semantic problem).
//
// Usage: node sections.mjs "<path to .gp>"
import { Chord, Note } from 'tonal';
import { loadScore, meta, perBarHistograms, perBarChordLabels, normalize, cosine } from './lib.mjs';

export const KERNEL_H = 4; // Foote checkerboard half-width (bars)
export const CHORD_WIN = 4; // method (b) comparison window (bars)
export const MIN_SPACING = 4; // minimum bars between detected boundaries
export const LABEL_SIM = 0.9; // cosine threshold for "same structural class"
export const NOVELTY_K = 0.5; // peak threshold = mean + K*std

// ---- method (a): Guitar Pro repeat structure ----
export function boundariesFromRepeats(score) {
  const bounds = new Set([1]);
  const n = score.masterBars.length;
  score.masterBars.forEach((mb, i) => {
    const bar = i + 1;
    if (mb.isRepeatStart) bounds.add(bar);
    if (mb.isRepeatEnd && bar + 1 <= n) bounds.add(bar + 1);
    if (mb.alternateEndings) bounds.add(bar);
  });
  return [...bounds].filter((b) => b >= 1 && b <= n).sort((a, b) => a - b);
}

// ---- method (b): chord-progression change-points ----
function chordRootPc(label) {
  if (!label || label === 'NC') return -1;
  const got = Chord.get(label);
  if (!got || !got.tonic) return -1;
  // tonal's chroma handles every spelling (Cb/Fb/B#/E#/double-accidentals); the
  // old hand-rolled .replace() chain silently dropped them to -1.
  const c = Note.chroma(got.tonic);
  return Number.isInteger(c) ? c : -1;
}

export function boundariesFromChords(score, win = CHORD_WIN) {
  const labels = perBarChordLabels(score);
  const n = labels.length;
  const roots = labels.map(chordRootPc);
  // root histogram over a window
  const rootHist = (from, to) => {
    const h = new Array(12).fill(0);
    for (let i = from; i <= to; i++) if (i >= 0 && i < n && roots[i] >= 0) h[roots[i]]++;
    return h;
  };
  const novelty = new Array(n).fill(0);
  const empty = (h) => h.every((x) => x === 0);
  for (let i = 1; i < n; i++) {
    const before = rootHist(i - win, i - 1);
    const after = rootHist(i, i + win - 1);
    // a chordless window has no harmonic info: 1-cosine(empty,x)=1 would fake a
    // change. Treat "no chords" as "no signal", not "maximum change".
    novelty[i] = empty(before) || empty(after) ? 0 : 1 - cosine(before, after);
  }
  return pickPeaks(novelty, n);
}

// ---- method (c): self-similarity matrix + Foote checkerboard novelty ----
export function selfSimilarity(score) {
  const feats = perBarHistograms(score).map(normalize);
  const n = feats.length;
  const ssm = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    const s = cosine(feats[i], feats[j]);
    ssm[i][j] = s;
    ssm[j][i] = s;
  }
  return ssm;
}

export function boundariesFromNovelty(score, h = KERNEL_H) {
  const ssm = selfSimilarity(score);
  const n = ssm.length;
  const novelty = new Array(n).fill(0);
  for (let c = 0; c < n; c++) {
    let sum = 0;
    for (let a = -h; a < h; a++) {
      for (let b = -h; b < h; b++) {
        const i = c + a;
        const j = c + b;
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const sign = a < 0 === b < 0 ? 1 : -1; // checkerboard: ++/-- quadrants +, cross -
        sum += sign * ssm[i][j];
      }
    }
    novelty[c] = sum;
  }
  return pickPeaks(novelty, n);
}

// ---- shared peak picker: local maxima above mean+K*std, min spacing, bar 1 forced ----
function pickPeaks(novelty, n) {
  if (n < 1) return []; // 0-bar score → no boundaries (consistent with boundariesFromRepeats)
  const vals = novelty.filter((v) => v !== 0);
  const mean = vals.reduce((s, x) => s + x, 0) / (vals.length || 1);
  const std = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / (vals.length || 1)) || 1;
  const thresh = mean + NOVELTY_K * std;
  const peaks = [1];
  // seed below 1 so the trivial bar-1 boundary never spacing-gates the first real
  // peak (a section change in bars 2-4 would otherwise be silently dropped).
  let lastPeak = 1 - MIN_SPACING;
  for (let i = 1; i < n - 1; i++) {
    const bar = i + 1;
    if (novelty[i] >= thresh && novelty[i] >= novelty[i - 1] && novelty[i] >= novelty[i + 1] && bar - lastPeak >= MIN_SPACING) {
      peaks.push(bar);
      lastPeak = bar;
    }
  }
  return peaks;
}

// ---- merge / vote across the three methods ----
export function mergeBoundaries(sets, tol = 1) {
  const all = [];
  for (const [method, list] of Object.entries(sets)) for (const b of list) all.push({ bar: b, method });
  all.sort((a, b) => a.bar - b.bar);
  const clusters = [];
  for (const { bar, method } of all) {
    const last = clusters[clusters.length - 1];
    // Join only if within tol of BOTH ends — a fixed anchor, not a drifting mean.
    // (A running rounded-mean center let evenly-spaced runs grow past tol and
    // collapse distinct boundaries into one inflated-vote cluster.)
    if (last && bar - last.bars[0] <= tol && bar - last.bars[last.bars.length - 1] <= tol) {
      last.bars.push(bar);
      last.methods.add(method);
    } else {
      clusters.push({ bars: [bar], methods: new Set([method]) });
    }
  }
  return clusters
    .map((c) => ({ bar: c.bars[Math.floor((c.bars.length - 1) / 2)], votes: c.methods.size, methods: [...c.methods] }))
    .sort((a, b) => a.bar - b.bar);
}

// ---- label segments by structural class (A/B/C…) ----
export function labelSegments(score, boundaries) {
  const feats = perBarHistograms(score).map(normalize);
  const n = feats.length;
  if (n === 0) return [];
  // clamp to real bars + always start at bar 1, so segments never invert or run past the song
  const sorted = [...new Set(boundaries)].filter((b) => b >= 1 && b <= n).sort((a, b) => a - b);
  if (!sorted.length || sorted[0] !== 1) sorted.unshift(1);
  const segs = [];
  for (let s = 0; s < sorted.length; s++) {
    const start = sorted[s];
    const end = (s + 1 < sorted.length ? sorted[s + 1] - 1 : n);
    const acc = new Array(12).fill(0);
    for (let i = start - 1; i <= end - 1; i++) if (i >= 0 && i < n) for (let p = 0; p < 12; p++) acc[p] += feats[i][p];
    segs.push({ barStart: start, barEnd: end, centroid: normalize(acc) });
  }
  const classes = [];
  const A = 'A'.charCodeAt(0);
  for (const seg of segs) {
    let best = -1;
    let bestSim = 0;
    classes.forEach((c, ci) => {
      const sim = cosine(seg.centroid, c);
      if (sim > bestSim) {
        bestSim = sim;
        best = ci;
      }
    });
    if (best >= 0 && bestSim >= LABEL_SIM) seg.label = String.fromCharCode(A + best);
    else {
      classes.push(seg.centroid);
      seg.label = String.fromCharCode(A + classes.length - 1);
    }
    delete seg.centroid;
  }
  return segs;
}

export function approximate(score, opts = {}) {
  const repeats = boundariesFromRepeats(score);
  const chords = boundariesFromChords(score);
  const novelty = boundariesFromNovelty(score);
  const merged = mergeBoundaries({ repeats, chords, novelty }, opts.tol ?? 1);
  const mergedBars = merged.map((m) => m.bar);
  const segments = labelSegments(score, mergedBars);
  return { repeats, chords, novelty, merged, segments };
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node sections.mjs "<file.gp>"');
    process.exit(1);
  }
  const score = loadScore(file);
  const m = meta(score, file);
  const r = approximate(score);
  console.log(`${m.title} — ${m.artist}  [${m.bars} bars]`);
  console.log(`  (a) repeats  boundaries: ${r.repeats.join(', ') || '(none)'}`);
  console.log(`  (b) chords   boundaries: ${r.chords.join(', ')}`);
  console.log(`  (c) novelty  boundaries: ${r.novelty.join(', ')}`);
  console.log(`  merged (bar:votes): ${r.merged.map((x) => `${x.bar}:${x.votes}`).join('  ')}`);
  console.log('  segments:');
  for (const s of r.segments) console.log(`    ${s.label}  bars ${s.barStart}-${s.barEnd}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
