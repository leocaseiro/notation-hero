// Test feature #2: read a no-chord file, INJECT a chord diagram onto a beat,
// export back to .gp, reload, and confirm the chord survived.
import fs from 'node:fs';
import * as alphaTab from '@coderline/alphatab';
const { ScoreLoader } = alphaTab.importer;
const { Gp7Exporter } = alphaTab.exporter;
const { Chord } = alphaTab.model;

const src = "/Users/leocaseiro/Music/AlphaTab-RhythmGame/Cpm22-Dias Atrás - sync with mp3 by Leo - finished.gp";
const score = ScoreLoader.loadScoreFromBytes(new Uint8Array(fs.readFileSync(src)));

// pick the first pitched (non-percussion) track + its first staff
const track = score.tracks.find(t => !t.staves.some(s => s.isPercussion));
const staff = track.staves[0];

// build a chord diagram and attach it to the FIRST beat that has >=2 notes
const chord = new Chord();
chord.name = 'TEST-Bm';
chord.firstFret = 1;
chord.strings = [2,3,4,4,2,-1];   // dummy shape, high->low
chord.staff = staff;
const chordId = 'injected-1';
staff.addChord(chordId, chord);

let injected = false;
outer:
for (const bar of staff.bars) for (const v of bar.voices) for (const b of v.beats) {
  if (b.notes && b.notes.length >= 2) { b.chordId = chordId; injected = true; break outer; }
}

const bytes = new Gp7Exporter().export(score);   // returns Uint8Array
const out = '/tmp/gp-spike/_roundtrip.gp';
fs.writeFileSync(out, Buffer.from(bytes));

// reload and verify
const re = ScoreLoader.loadScoreFromBytes(new Uint8Array(fs.readFileSync(out)));
const reStaff = re.tracks.find(t=>!t.staves.some(s=>s.isPercussion)).staves[0];
const names = [];
if (reStaff.chords) for (const c of reStaff.chords.values()) names.push(c.name);

console.log('injected onto a beat:', injected);
console.log('export produced bytes:', bytes.length);
console.log('reloaded file chord names:', names);
console.log('RESULT:', names.includes('TEST-Bm') ? '✅ chord survived round-trip' : '❌ chord lost');
