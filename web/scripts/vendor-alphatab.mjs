// Copies AlphaTab's prebuilt ESM + assets out of node_modules into web/public/alphatab/.
//
// AlphaTab spawns a render worker and an audio worklet and locates them from `import.meta.url`.
// Turbopack does not leave that usable in a production chunk, so the worker construction fails and
// playback silently dies while notation still renders. Serving the prebuilt ESM from public/
// restores a real http URL, which makes `Environment.webPlatform` report `BrowserModule`.
//
// Generated output: web/public/alphatab/ is git-ignored and rebuilt before every dev and build.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * [source path under dist/, destination path under the output directory].
 *
 * The four ESM files land under their PLAIN names on purpose: alphaTab.min.mjs imports
 * './alphaTab.core.mjs' internally, so a minified copy kept under a '.min' name would make the
 * browser fetch the 2.3 MB unminified core instead of the 1.1 MB minified one.
 */
export const VENDOR_FILES = [
  ['alphaTab.min.mjs', 'esm/alphaTab.mjs'],
  ['alphaTab.core.min.mjs', 'esm/alphaTab.core.mjs'],
  ['alphaTab.worker.min.mjs', 'esm/alphaTab.worker.mjs'],
  ['alphaTab.worklet.min.mjs', 'esm/alphaTab.worklet.mjs'],
  ['soundfont/sonivox.sf3', 'soundfont/sonivox.sf3'],
  ['soundfont/LICENSE', 'soundfont/LICENSE'],
  ['font/Bravura.woff2', 'font/Bravura.woff2'],
  ['font/Bravura-OFL.txt', 'font/Bravura-OFL.txt'],
];

/**
 * @param {{ dist: string, out: string }} options
 * @returns {string[]} the destination paths written, relative to `out`
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function vendorAlphaTab({ dist, out }) {
  const copied = [];
  for (const [from, to] of VENDOR_FILES) {
    const source = path.join(dist, from);
    if (!existsSync(source)) {
      throw new Error(
        `vendor-alphatab: missing source ${source} — run pnpm install, or check that ` +
          '@coderline/alphatab is still pinned at 1.8.4.',
      );
    }
    const destination = path.join(out, to);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    copied.push(to);
  }
  return copied;
}

// Only copy when invoked directly, so the test can import vendorAlphaTab without side effects.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const copied = vendorAlphaTab({
    dist: path.resolve(HERE, '../node_modules/@coderline/alphatab/dist'),
    out: path.resolve(HERE, '../public/alphatab'),
  });
  console.log(`vendor-alphatab: copied ${copied.length} files into web/public/alphatab/`);
}
