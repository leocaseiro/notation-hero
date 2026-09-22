// tooling/make-percussion-free-fixture.mjs — run once, output committed.
//
// Produces web/e2e/fixtures/guitar-no-percussion.gp: a real Guitar Pro 7 file with one track, one
// staff and no percussion. It exists so the "a score with no drum staff still opens and plays"
// criterion is verified by running, not by reading — and it is generated rather than pasted so the
// binary can be rebuilt instead of trusted.
//
// Run from the repo root: node tooling/make-percussion-free-fixture.mjs
import { writeFile } from 'node:fs/promises';

const at = await import('../web/node_modules/@coderline/alphatab/dist/alphaTab.mjs');
// Instance API, not a static: 1.8.4's AlphaTexImporter has no `importFromString`.
const importer = new at.importer.AlphaTexImporter();
importer.initFromString(
  '\\title "Guitar (no percussion)" . 3.3.4 3.3.4 3.3.4 3.3.4 |',
  new at.Settings(),
);
const score = importer.readScore();
await writeFile(
  'web/e2e/fixtures/guitar-no-percussion.gp',
  new at.exporter.Gp7Exporter().export(score),
);
