// keychanges.mjs — NH-200 R1: windowed key-change (modulation) timeline.
//
// Sliding-window Krumhansl-Schmuckler over per-bar pitch-class histograms, then
// hysteresis (minimum segment length) to collapse window jitter into a stable
// keyChanges[] timeline. Single-key songs collapse to one span; modulating songs
// (e.g. Africa) yield more than one.
//
// Usage: node keychanges.mjs "<path to .gp>"  [windowBars] [minSegBars]
import { loadScore, meta, perBarHistograms, detectKey } from './lib.mjs';

export const DEFAULT_WINDOW = 8; // sliding-window size in bars
export const DEFAULT_MIN_SEG = 4; // hysteresis: a key must hold this many bars to count

function aggregate(hists, from, to) {
  const sum = new Array(12).fill(0);
  for (let i = from; i <= to; i++) {
    if (i < 0 || i >= hists.length) continue;
    for (let p = 0; p < 12; p++) sum[p] += hists[i][p];
  }
  return sum;
}

// Per-bar smoothed key label from a centered window.
function perBarKeys(hists, window) {
  const half = Math.floor(window / 2);
  return hists.map((_, i) => {
    const k = detectKey(aggregate(hists, i - half, i + half));
    return k ? { label: `${k.tonic} ${k.type}`, ...k } : { label: null };
  });
}

function toRuns(labels) {
  const runs = [];
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i].label;
    const last = runs[runs.length - 1];
    if (last && last.label === l) last.end = i;
    else runs.push({ start: i, end: i, label: l });
  }
  return runs;
}

// Merge runs shorter than minSeg into their stronger-confidence neighbour until
// every surviving run is long enough (or only one remains).
function applyHysteresis(perBar, minSeg) {
  const labels = perBar.map((p) => ({ label: p.label }));
  for (;;) {
    const runs = toRuns(labels);
    if (runs.length <= 1) break;
    let shortest = null;
    for (const r of runs) {
      const len = r.end - r.start + 1;
      if (len < minSeg && (!shortest || len < shortest.len)) shortest = { ...r, len };
    }
    if (!shortest) break;
    const idx = runs.findIndex((r) => r.start === shortest.start);
    const prev = runs[idx - 1];
    const next = runs[idx + 1];
    // pick the neighbour to absorb this short run: higher mean confidence, else longer
    const conf = (r) => {
      if (!r) return -1;
      let s = 0;
      let n = 0;
      for (let i = r.start; i <= r.end; i++) {
        if (perBar[i].confidence != null) {
          s += perBar[i].confidence;
          n++;
        }
      }
      return n ? s / n : -1;
    };
    const absorb = conf(prev) >= conf(next) ? prev : next;
    if (!absorb) break;
    for (let i = shortest.start; i <= shortest.end; i++) labels[i].label = absorb.label;
  }
  return toRuns(labels);
}

// Public: stable key-change timeline. Each span's key is re-derived from the
// aggregated histogram over the whole span (cleaner than averaging windows).
export function keyTimeline(score, opts = {}) {
  const window = opts.window ?? DEFAULT_WINDOW;
  const minSeg = opts.minSeg ?? DEFAULT_MIN_SEG;
  const hists = perBarHistograms(score);
  if (!hists.length) return [];
  const perBar = perBarKeys(hists, window);
  const runs = applyHysteresis(perBar, minSeg);
  return runs.map((r) => {
    const k = detectKey(aggregate(hists, r.start, r.end));
    return {
      barStart: r.start + 1,
      barEnd: r.end + 1,
      key: k ? { tonic: k.tonic, type: k.type } : null,
      confidence: k ? k.confidence : 0,
    };
  });
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node keychanges.mjs "<file.gp>" [windowBars] [minSegBars]');
    process.exit(1);
  }
  const window = process.argv[3] ? +process.argv[3] : DEFAULT_WINDOW;
  const minSeg = process.argv[4] ? +process.argv[4] : DEFAULT_MIN_SEG;
  const score = loadScore(file);
  const m = meta(score, file);
  const timeline = keyTimeline(score, { window, minSeg });
  console.log(`${m.title} — ${m.artist}  [${m.bars} bars]  (window=${window}, minSeg=${minSeg})`);
  console.log(`keyChanges: ${timeline.length} span(s)`);
  for (const s of timeline) {
    const k = s.key ? `${s.key.tonic} ${s.key.type}` : '(none)';
    console.log(`  bars ${s.barStart}-${s.barEnd}: ${k}  (conf ${s.confidence})`);
  }
  console.log(JSON.stringify(timeline));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
