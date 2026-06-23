// gp-extract.mjs — parse a Guitar Pro file to the raw JSON the seed needs.
// REQUIRES @coderline/alphatab. Run from a dir where it resolves, e.g.:
//   cp this script into ~/Sites/alphaTabWebsite/ and run:  node gp-extract.mjs <file.gp>
// Emits objective data only (title/artist/tempo/timeSig/tracks/sections/key/CHORDS).
// Chords are the real symbols in the .gp (per track: distinct set + change sequence).
// Subjective fields (per-track difficulty, techniques) are NOT in the file — never invented here.
import * as at from '@coderline/alphatab';
import fs from 'fs';

const path = process.argv[2];
const bytes = new Uint8Array(fs.readFileSync(path));
const score = at.importer.ScoreLoader.loadScoreFromBytes(bytes, new at.Settings());
const mb = score.masterBars;

const KEYS = ['Cb','Gb','Db','Ab','Eb','Bb','F','C','G','D','A','E','B','F#','C#'];
const keyName = (ks, type) => {
  // ks: -7..7 (flats..sharps); type 0=major,1=minor
  const idx = ks + 7; const tonic = KEYS[idx] ?? '?';
  return `${tonic} ${type === 1 ? 'minor' : 'major'}`;
};

const sections = [];
mb.forEach((b, i) => { if (b.isSectionStart && b.section) sections.push({ label: b.section.text || b.section.marker || '', startBar: i + 1 }); });
sections.forEach((s, i) => { s.endBar = (i + 1 < sections.length ? sections[i + 1].startBar - 1 : mb.length); });

// real chord symbols carried in the file: per track, the distinct set + the
// de-duped consecutive change sequence (the concrete progression), capped.
const chordsOf = t => {
  const set = new Set(); const seq = [];
  t.staves?.forEach(s => s.bars?.forEach(b => b.voices?.forEach(v => v.beats?.forEach(bt => {
    const n = bt.chord?.name;
    if (n) { set.add(n); if (seq[seq.length - 1] !== n) seq.push(n); }
  }))));
  return { chords: [...set], progression: seq.slice(0, 32) };
};

const tracks = score.tracks.map(t => {
  const st = t.staves?.[0];
  const c = chordsOf(t);
  return {
    idx: t.index,
    name: t.name,
    isPercussion: !!t.staves?.some(s => s.isPercussion),
    tuning: st?.tuning?.length ? st.tuning.slice() : null,
    stringCount: st?.tuning?.length || null,
    chords: c.chords,
    progression: c.progression,
  };
});

const songChords = [...new Set(tracks.flatMap(t => t.chords))];

console.log(JSON.stringify({
  file: path.split('/').pop(),
  title: score.title, artist: score.artist, album: score.album || null,
  tempo: score.tempo,
  bars: mb.length,
  timeSig: mb[0] ? `${mb[0].timeSignatureNumerator}/${mb[0].timeSignatureDenominator}` : null,
  key: mb[0] ? keyName(mb[0].keySignature, mb[0].keySignatureType) : null,
  chords: songChords,
  trackCount: score.tracks.length,
  tracks,
  sectionCount: sections.length,
  sections,
}, null, 2));
