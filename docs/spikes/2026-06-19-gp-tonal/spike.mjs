// Feasibility spike: parse Guitar Pro / MusicXML -> tonal elements
// Usage: node spike.mjs "<file>"
import fs from 'node:fs';
import * as alphaTab from '@coderline/alphatab';
import { Chord, Midi, Note, Key } from 'tonal';

const { ScoreLoader } = alphaTab.importer;
const { KeySignature, KeySignatureType } = alphaTab.model;

// ---- key signature -> human readable -------------------------------------
const SHARP_KEYS = ['C','G','D','A','E','B','F#','C#'];      // 0..+7
const FLAT_KEYS  = ['C','F','Bb','Eb','Ab','Db','Gb','Cb'];  // 0..-7
function keySigToName(ks, type) {
  // ks: -7..+7 (alphaTab KeySignature). type: 0 major / 1 minor
  const major = ks >= 0 ? SHARP_KEYS[ks] : FLAT_KEYS[-ks];
  if (type === KeySignatureType.Minor) {
    // relative minor = major tonic - 3 semitones
    const minorTonic = Note.transpose(major, '-3m');
    return { tonic: minorTonic, type: 'minor', major, accidentals: ks };
  }
  return { tonic: major, type: 'major', major, accidentals: ks };
}

// ---- main -----------------------------------------------------------------
const file = process.argv[2];
const bytes = new Uint8Array(fs.readFileSync(file));
const score = ScoreLoader.loadScoreFromBytes(bytes);

console.log('═'.repeat(72));
console.log('FILE :', file.split('/').pop());
console.log('TITLE:', score.title || '(none)', '—', score.artist || '');
console.log('TRACKS:', score.tracks.length);

// Key from the first master bar's key signature
const mb0 = score.masterBars[0];
const key = keySigToName(mb0.keySignature, mb0.keySignatureType);
console.log(`KEY  : ${key.tonic} ${key.type}  (signature value ${key.accidentals}, relative major ${key.major})`);

// Per-track summary
for (const track of score.tracks) {
  const staff = track.staves[0];
  const isPerc = track.staves.some(s => s.isPercussion);
  // explicit chord diagrams stored on the staff
  const explicitChords = [];
  for (const s of track.staves) {
    if (s.chords) for (const c of s.chords.values()) explicitChords.push(c.name);
  }

  // walk beats: explicit chord names in order + detect chords from notes
  const chordTimeline = [];   // explicit chord names along the bars
  const detectedFromNotes = [];
  let beatCount = 0, polyBeats = 0;

  for (const bar of staff.bars) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        beatCount++;
        if (beat.chord && beat.chord.name) chordTimeline.push(beat.chord.name);
        // gather simultaneous pitched notes -> detect chord
        if (!isPerc && beat.notes && beat.notes.length >= 2) {
          polyBeats++;
          const names = beat.notes
            .filter(n => !n.isPercussion)
            .map(n => Midi.midiToNoteName(n.realValue, { pitchClass: false }))
            .filter(Boolean);
          const pcs = [...new Set(names.map(n => Note.pitchClass(n)))];
          if (pcs.length >= 2) {
            const det = Chord.detect(names);
            if (det.length) detectedFromNotes.push(det[0]);
          }
        }
      }
    }
  }

  console.log('-'.repeat(72));
  console.log(`TRACK: ${track.name}  ${isPerc ? '(percussion)' : ''}  beats=${beatCount} polyphonic=${polyBeats}`);
  if (explicitChords.length) {
    const uniq = [...new Set(explicitChords)];
    console.log(`  explicit chord diagrams (${uniq.length}): ${uniq.join(', ')}`);
  }
  if (chordTimeline.length) {
    console.log(`  chord progression (first 16): ${chordTimeline.slice(0, 16).join(' → ')}`);
  }
  if (detectedFromNotes.length) {
    const uniqDet = [...new Set(detectedFromNotes)];
    console.log(`  chords DETECTED from notes (first 16 unique): ${uniqDet.slice(0, 16).join(', ')}`);
  }
}
