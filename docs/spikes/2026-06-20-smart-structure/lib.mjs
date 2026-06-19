// lib.mjs — shared core for the NH-200 smart-structure spike.
// Reproduces NH-196's proven tonal core (Krumhansl-Schmuckler detectKey +
// duration-weighted pitch-class histogram) and adds per-bar feature extraction
// and structure reading used by keychanges.mjs / sections.mjs / validate.mjs.
//
// NH-196 reference lives on branch `alphatab-tonal-spike`
// (docs/spikes/2026-06-19-gp-tonal/spike2.mjs) — reproduced here so this spike
// is self-contained on its own branch.
import fs from 'node:fs';
import * as alphaTab from '@coderline/alphatab';
import { Note, Chord } from 'tonal';

const { ScoreLoader } = alphaTab.importer;

export const PCS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Schmuckler key profiles (DO NOT change these numbers — from NH-196).
const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / (Math.sqrt(da * db) || 1);
}

function rotate(arr, n) {
  return arr.map((_, i) => arr[(i + n) % 12]);
}

// detect key from a 12-bin pitch-class histogram → { tonic, type, confidence }
export function detectKey(hist) {
  const total = hist.reduce((s, x) => s + x, 0);
  if (total === 0) return null;
  let best = null;
  for (let tonic = 0; tonic < 12; tonic++) {
    const cMaj = pearson(hist, rotate(MAJ, (12 - tonic) % 12));
    const cMin = pearson(hist, rotate(MIN, (12 - tonic) % 12));
    if (!best || cMaj > best.score) best = { tonic, type: 'major', score: cMaj };
    if (cMin > best.score) best = { tonic, type: 'minor', score: cMin };
  }
  return { tonic: PCS[best.tonic], type: best.type, confidence: +best.score.toFixed(3) };
}

// quarter=1, half=2, eighth=0.5 — AlphaTab Duration enum: Quarter=4, Half=2, Eighth=8.
function durWeight(beat) {
  const d = beat.duration;
  return d > 0 ? 4 / d : 1;
}

export function loadScore(file) {
  return ScoreLoader.loadScoreFromBytes(new Uint8Array(fs.readFileSync(file)));
}

export function barCount(score) {
  return score.masterBars.length;
}

// One duration-weighted 12-bin pitch-class histogram per bar index, summed across
// all tracks/staves/voices/beats. Percussion notes are skipped (no pitch).
export function perBarHistograms(score) {
  const n = barCount(score);
  const hists = Array.from({ length: n }, () => new Array(12).fill(0));
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (let bi = 0; bi < staff.bars.length && bi < n; bi++) {
        const bar = staff.bars[bi];
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            const w = durWeight(beat);
            for (const note of beat.notes) {
              if (note.isPercussion) continue;
              const pc = (((note.realValue % 12) + 12) % 12); // sign-safe; skip non-finite
              if (Number.isInteger(pc)) hists[bi][pc] += w;
            }
          }
        }
      }
    }
  }
  return hists;
}

// Per-bar best chord label via tonal Chord.detect on the bar's distinct pitch
// classes. Returns 'NC' (no chord) when nothing is detected. Used by the
// chord-progression change-point method.
export function perBarChordLabels(score) {
  const n = barCount(score);
  const labels = new Array(n).fill('NC');
  // collect distinct pitch-class names present per bar (pitched notes only)
  const pcSets = Array.from({ length: n }, () => new Set());
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (let bi = 0; bi < staff.bars.length && bi < n; bi++) {
        for (const voice of staff.bars[bi].voices) {
          for (const beat of voice.beats) {
            for (const note of beat.notes) {
              if (note.isPercussion) continue;
              const pc = (((note.realValue % 12) + 12) % 12); // sign-safe; skip non-finite
              if (Number.isInteger(pc)) pcSets[bi].add(PCS[pc]);
            }
          }
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const names = [...pcSets[i]];
    if (names.length < 2) continue;
    const detected = Chord.detect(names, { assumePerfectFifth: true });
    if (detected.length) labels[i] = detected[0];
  }
  return labels;
}

// Per-bar ENERGY/TEXTURE signal — the discriminator pitch-class content lacks.
// Combines three always-available cues (research roadmap N1): note loudness
// (DynamicValue enum 0=PPP..louder), onset density (notes/bar incl. percussion),
// and active-track count (instrumentation entering = chorus). Returns a 0..1
// normalized energy per bar plus the mean register (mean sounding MIDI of pitched
// notes), which tends to be higher in choruses.
export function perBarEnergy(score) {
  const n = barCount(score);
  const veloSum = new Array(n).fill(0);
  const veloCnt = new Array(n).fill(0);
  const density = new Array(n).fill(0);
  const active = new Array(n).fill(0);
  const regSum = new Array(n).fill(0);
  const regCnt = new Array(n).fill(0);
  for (const track of score.tracks) {
    for (let bi = 0; bi < n; bi++) {
      let trackActive = false;
      for (const staff of track.staves) {
        const bar = staff.bars[bi];
        if (!bar) continue;
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            if (beat.isRest) continue;
            for (const note of beat.notes) {
              density[bi] += 1;
              veloSum[bi] += Number.isFinite(note.dynamics) ? note.dynamics : 4; // default ~MF
              veloCnt[bi] += 1;
              trackActive = true;
              if (!note.isPercussion && Number.isFinite(note.realValue)) {
                regSum[bi] += note.realValue;
                regCnt[bi] += 1;
              }
            }
          }
        }
      }
      if (trackActive) active[bi] += 1;
    }
  }
  const veloAvg = veloSum.map((v, i) => (veloCnt[i] ? v / veloCnt[i] : 0));
  const register = regSum.map((v, i) => (regCnt[i] ? v / regCnt[i] : 0));
  const norm = (arr) => { const mx = Math.max(...arr, 1e-9); return arr.map((v) => v / mx); };
  const nd = norm(density);
  const na = norm(active);
  const nv = norm(veloAvg);
  const energy = nd.map((_, i) => (nd[i] + na[i] + nv[i]) / 3);
  return { energy, register, density, active, velocity: veloAvg };
}

// Explicit chord-diagram name per bar (Beat.chordId → Staff.chords map), or null.
// Richer/cleaner than chord-from-notes (research roadmap Tier-1).
export function perBarExplicitChords(score) {
  const n = barCount(score);
  const out = new Array(n).fill(null);
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      const chords = staff.chords;
      if (!chords || !chords.size) continue;
      for (let bi = 0; bi < staff.bars.length && bi < n; bi++) {
        for (const voice of staff.bars[bi].voices) {
          for (const beat of voice.beats) {
            if (beat.chordId && !out[bi]) {
              const c = chords.get(beat.chordId);
              if (c && c.name) out[bi] = c.name;
            }
          }
        }
      }
    }
  }
  return out;
}

// Per-bar vocal activity — is any vocal-named track sounding in the bar? Vocal
// presence helps separate sung sections (verse/chorus) from instrumental ones.
export function perBarVocalActive(score) {
  const n = barCount(score);
  const out = new Array(n).fill(false);
  const isVocal = (t) => /voc|sing|vox|melod/i.test(t.name || '');
  for (const track of score.tracks) {
    if (!isVocal(track)) continue;
    for (const staff of track.staves) {
      for (let bi = 0; bi < staff.bars.length && bi < n; bi++) {
        const bar = staff.bars[bi];
        if (bar && !bar.isRestOnly) out[bi] = true;
      }
    }
  }
  return out;
}

// Structure read straight from the file (markers, time sigs, tempo, repeats).
export function readStructure(score) {
  const sections = [];
  const timeSignatures = [];
  const tempos = [];
  const repeats = [];
  score.masterBars.forEach((mb, i) => {
    const bar = i + 1; // 1-based bar number for human-facing output
    if (mb.section && (mb.section.text || mb.section.marker)) {
      sections.push({ bar, name: mb.section.text || mb.section.marker });
    }
    const sig = `${mb.timeSignatureNumerator}/${mb.timeSignatureDenominator}`;
    if (!timeSignatures.length || timeSignatures[timeSignatures.length - 1].sig !== sig) {
      timeSignatures.push({ bar, sig });
    }
    for (const a of mb.tempoAutomations || []) tempos.push({ bar, bpm: a.value });
    if (mb.isRepeatStart || mb.isRepeatEnd || mb.repeatCount > 0) {
      repeats.push({ bar, isStart: !!mb.isRepeatStart, isEnd: !!mb.isRepeatEnd, count: mb.repeatCount, alt: mb.alternateEndings });
    }
  });
  return { sections, timeSignatures, tempos, repeats, bars: barCount(score) };
}

// Ground-truth section boundaries (1-based bar numbers where a marker starts),
// always including bar 1 as the song start. Used by the validation harness.
export function markerBoundaries(score) {
  const bounds = new Set([1]);
  score.masterBars.forEach((mb, i) => {
    if (mb.section && (mb.section.text || mb.section.marker)) bounds.add(i + 1);
  });
  return [...bounds].sort((a, b) => a - b);
}

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function normalize(vec) {
  const s = vec.reduce((x, y) => x + y, 0);
  return s === 0 ? vec.slice() : vec.map((v) => v / s);
}

export function meta(score, file) {
  return {
    file: file.split('/').pop(),
    title: score.title || '(none)',
    artist: score.artist || '',
    bars: barCount(score),
  };
}
