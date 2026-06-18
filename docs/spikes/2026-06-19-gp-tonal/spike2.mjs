// Deeper spike: per-track key detection from NOTES (Krumhansl-Schmuckler),
// tuning, sections, time signatures, tempo. Usage: node spike2.mjs "<file>"
import fs from 'node:fs';
import * as alphaTab from '@coderline/alphatab';
import { Note } from 'tonal';

const { ScoreLoader } = alphaTab.importer;

const PCS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Krumhansl-Schmuckler key profiles
const MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];

function pearson(a, b) {
  const n = a.length, ma = a.reduce((s,x)=>s+x,0)/n, mb = b.reduce((s,x)=>s+x,0)/n;
  let num=0, da=0, db=0;
  for (let i=0;i<n;i++){ const x=a[i]-ma, y=b[i]-mb; num+=x*y; da+=x*x; db+=y*y; }
  return num / (Math.sqrt(da*db) || 1);
}
function rotate(arr, n){ return arr.map((_,i)=>arr[(i+n)%12]); }

// detect key from a 12-bin pitch-class histogram
function detectKey(hist) {
  const total = hist.reduce((s,x)=>s+x,0);
  if (total === 0) return null;
  let best = null;
  for (let tonic=0; tonic<12; tonic++){
    const cMaj = pearson(hist, rotate(MAJ, (12-tonic)%12));
    const cMin = pearson(hist, rotate(MIN, (12-tonic)%12));
    if (!best || cMaj>best.score) best = {tonic, mode:'major', score:cMaj};
    if (cMin>best.score) best = {tonic, mode:'minor', score:cMin};
  }
  return { tonic: PCS[best.tonic], mode: best.mode, confidence: +best.score.toFixed(3) };
}

// weight a note by its rough duration (quarter=1, half=2, eighth=0.5 ...)
function durWeight(beat){ const d = beat.duration; return d>0 ? 4/d : 1; }

const file = process.argv[2];
const score = ScoreLoader.loadScoreFromBytes(new Uint8Array(fs.readFileSync(file)));

console.log('═'.repeat(74));
console.log('FILE :', file.split('/').pop());
console.log('SONG :', score.title || '(none)', '—', score.artist || '');

// embedded key field (what spike #1 reported)
const mb0 = score.masterBars[0];
console.log(`EMBEDDED key field: signature=${mb0.keySignature} type=${mb0.keySignatureType} (0=C/major default)`);

// time signatures + changes
const sigs = [];
score.masterBars.forEach((mb,i)=>{
  const s = `${mb.timeSignatureNumerator}/${mb.timeSignatureDenominator}`;
  if (!sigs.length || sigs[sigs.length-1].sig !== s) sigs.push({bar:i+1, sig:s});
});
console.log('TIME SIG changes:', sigs.map(x=>`bar${x.bar}:${x.sig}`).join('  '));

// tempo changes
const tempos = [];
score.masterBars.forEach((mb,i)=>{
  for (const a of (mb.tempoAutomations||[])) tempos.push({bar:i+1, bpm:a.value});
});
console.log('TEMPO points:', tempos.length ? tempos.slice(0,8).map(t=>`bar${t.bar}:${t.bpm}bpm`).join('  ') : `single ${score.tempo}bpm`);

// sections / parts
const sections = [];
score.masterBars.forEach((mb,i)=>{ if (mb.section && (mb.section.text||mb.section.marker)) sections.push({bar:i+1, name: mb.section.text||mb.section.marker}); });
console.log('SECTIONS:', sections.length ? sections.map(s=>`bar${s.bar}:"${s.name}"`).join('  ') : '(none in file)');

// per-track tuning + key-from-notes
for (const track of score.tracks) {
  const staff = track.staves[0];
  const isPerc = track.staves.some(s=>s.isPercussion);
  if (isPerc) { console.log(`-- ${track.name}  (percussion — skipped)`); continue; }

  const tuning = (staff.tuning && staff.tuning.length)
    ? staff.tuning.map(m=>Note.fromMidi(m)).join(' ') + (staff.tuningName?` [${staff.tuningName}]`:'')
    : '(not stringed / pitched)';

  const hist = new Array(12).fill(0);
  for (const s of track.staves) for (const bar of s.bars) for (const v of bar.voices) for (const b of v.beats) {
    const w = durWeight(b);
    for (const n of b.notes) if (!n.isPercussion) hist[n.realValue % 12] += w;
  }
  const key = detectKey(hist);
  const topPcs = hist.map((v,i)=>({pc:PCS[i],v})).sort((a,b)=>b.v-a.v).slice(0,5).map(x=>x.pc).join(' ');

  console.log(`-- ${track.name}`);
  console.log(`     tuning: ${tuning}`);
  console.log(`     key-from-notes: ${key ? key.tonic+' '+key.mode+'  (conf '+key.confidence+')' : '(no pitched notes)'}   top PCs: ${topPcs}`);
}
