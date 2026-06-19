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
import { loadScore, meta, perBarHistograms, perBarChordLabels, perBarExplicitChords, perBarEnergy, normalize, cosine } from './lib.mjs';

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

// shared: change-points from a per-bar chord-root sequence (windowed root novelty)
function rootChangePoints(roots, win) {
  const n = roots.length;
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
    // a chordless window has no harmonic info: 1-cosine(empty,x)=1 would fake a change
    novelty[i] = empty(before) || empty(after) ? 0 : 1 - cosine(before, after);
  }
  return pickPeaks(novelty, n);
}

export function boundariesFromChords(score, win = CHORD_WIN) {
  return rootChangePoints(perBarChordLabels(score).map(chordRootPc), win);
}

// 4th boundary voter — change-points from EXPLICIT chord diagrams when the file
// carries them. Strong when chord changes align with sections (Yellow boundary
// F1 reached 95%); returns [] when no diagrams exist (e.g. drum-only charts), so
// it only ever ADDS signal — it never replaces the detected-chord voter, which
// stays useful on uniform chord-loop songs (I'm Yours) where diagrams are sparse.
export function boundariesFromExplicitChords(score, win = CHORD_WIN) {
  const explicit = perBarExplicitChords(score);
  if (!explicit.some((x) => x)) return [];
  return rootChangePoints(explicit.map((x) => (x ? chordRootPc(x) : -1)), win);
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
export function labelSegments(score, boundaries, forceFirstBar = true) {
  const feats = perBarHistograms(score).map(normalize);
  const n = feats.length;
  if (n === 0) return [];
  // clamp to real bars; optionally force a bar-1 start (off when caller's boundaries
  // are exact section starts, e.g. validation, so no phantom pre-segment is created)
  const sorted = [...new Set(boundaries)].filter((b) => b >= 1 && b <= n).sort((a, b) => a - b);
  if (forceFirstBar && (!sorted.length || sorted[0] !== 1)) sorted.unshift(1);
  if (!sorted.length) return [];
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

// ---- per-segment energy + register (research roadmap N1) ----
// Choruses are louder / denser / higher than verses even in the same key — the
// signal pitch-class similarity misses. attachEnergy adds a 0..1 `energy` and a
// mean `register` (MIDI) to each segment from perBarEnergy. Call before nameSections.
export function attachEnergy(score, segments) {
  const { energy, register } = perBarEnergy(score);
  return segments.map((s) => {
    let e = 0;
    let ec = 0;
    let r = 0;
    let rc = 0;
    for (let i = s.barStart - 1; i <= s.barEnd - 1; i++) {
      if (i < 0 || i >= energy.length) continue;
      e += energy[i];
      ec++;
      if (register[i] > 0) { r += register[i]; rc++; }
    }
    return { ...s, energy: ec ? e / ec : 0, register: rc ? r / rc : 0 };
  });
}

// ---- rule-based role naming, ENERGY-AWARE (intro/verse/chorus/bridge/outro) ----
// Repetition says "this recurs"; energy says "this is the loud one" → it splits
// verse from chorus where pitch content can't. A recurring segment with above-mean
// intensity (energy + a register bonus) is a chorus; a recurring quieter one is a
// verse; unique first/last/late segments are intro/outro/bridge.
export function nameSections(segments) {
  const segs = segments.map((s) => ({ ...s }));
  const n = segs.length;
  if (!n) return segs;
  const counts = {};
  segs.forEach((s) => { counts[s.label] = (counts[s.label] || 0) + 1; });
  const totalBars = segs[n - 1].barEnd;
  const energyOf = (s) => (Number.isFinite(s.energy) ? s.energy : 0);
  const regs = segs.map((s) => s.register || 0).filter((x) => x > 0);
  const rMin = Math.min(...regs, 0);
  const rMax = Math.max(...regs, 1);
  // intensity = energy + a register bonus. NOTE: tonic-stability and vocal-presence
  // bonuses were tried (step 2) and REGRESSED naming (Yellow 86%->57%) — vocals/tonic
  // are present in both verse and chorus here, so they're non-discriminating. Reverted.
  const intensity = (s) => energyOf(s) + 0.5 * (s.register > 0 ? (s.register - rMin) / (rMax - rMin || 1) : 0);
  // split recurring segments into chorus (loud) vs verse (quiet) at their mean intensity
  const recurring = segs.filter((s) => counts[s.label] >= 2);
  const meanRecInt = recurring.length ? recurring.reduce((a, s) => a + intensity(s), 0) / recurring.length : Infinity;
  const lengths = segs.map((s) => s.barEnd - s.barStart + 1);
  const medianLen = [...lengths].sort((a, b) => a - b)[Math.floor(lengths.length / 2)] || 1;
  const meanEnergy = segs.reduce((a, s) => a + energyOf(s), 0) / n;
  segs.forEach((s, i) => {
    const pos = s.barStart / totalBars;
    const len = s.barEnd - s.barStart + 1;
    const recurs = counts[s.label] >= 2;
    // position/length priors take precedence over the energy split (research N4):
    // first short/quiet = intro; last quiet/unique = outro; unique mid-late = bridge.
    if (i === 0 && (energyOf(s) < meanEnergy || len <= medianLen)) s.role = 'Intro';
    else if (i === n - 1 && (!recurs || intensity(s) < meanRecInt)) s.role = 'Outro';
    else if (!recurs && pos >= 0.5 && pos <= 0.9) s.role = 'Bridge';
    else if (recurs) s.role = intensity(s) >= meanRecInt ? 'Chorus' : 'Verse';
    else s.role = 'Section';
  });
  // number repeated roles: Verse 1, Verse 2, Chorus 1 …
  const totalRole = {};
  segs.forEach((s) => { totalRole[s.role] = (totalRole[s.role] || 0) + 1; });
  const seen = {};
  segs.forEach((s) => {
    if (s.role !== 'Section' && totalRole[s.role] > 1) {
      seen[s.role] = (seen[s.role] || 0) + 1;
      s.roleName = `${s.role} ${seen[s.role]}`;
    } else s.roleName = s.role;
  });
  return segs;
}

export function approximate(score, opts = {}) {
  const repeats = boundariesFromRepeats(score);
  const chords = boundariesFromChords(score);
  const explicitChords = boundariesFromExplicitChords(score);
  const novelty = boundariesFromNovelty(score);
  const merged = mergeBoundaries({ repeats, chords, explicitChords, novelty }, opts.tol ?? 1);
  const mergedBars = merged.map((m) => m.bar);
  const segments = nameSections(attachEnergy(score, labelSegments(score, mergedBars)));
  return { repeats, chords, explicitChords, novelty, merged, segments };
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
  console.log('  segments (rule-based role · structural class):');
  for (const s of r.segments) console.log(`    ${s.roleName.padEnd(10)} (class ${s.label})  bars ${s.barStart}-${s.barEnd}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
