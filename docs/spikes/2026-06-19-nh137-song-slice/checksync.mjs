import * as alphaTab from '@coderline/alphatab';
import { readFileSync } from 'node:fs';
const { ScoreLoader } = alphaTab.importer;
const s = new alphaTab.Settings();
const f = process.argv[2];
const score = ScoreLoader.loadScoreFromBytes(new Uint8Array(readFileSync(f)), s);
const sp = score.exportFlatSyncPoints();
console.log(`${f.split('/').pop()}: tracks=${score.tracks.length} bars=${score.masterBars.length} syncPoints=${sp.length} backingTrack=${!!score.backingTrack} rawAudio=${score.backingTrack?.rawAudioFile? score.backingTrack.rawAudioFile.length+'B':'none'} tuning0=${JSON.stringify(score.tracks[0].staves[0].tuning)}`);
if (sp.length) console.log('  first 5 sync:', JSON.stringify(sp.slice(0,5)));
