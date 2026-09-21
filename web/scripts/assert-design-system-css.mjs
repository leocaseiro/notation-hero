// Fails the build when the design system's CSS did not reach the output.
//
// app/globals.css does not import the design system's compiled stylesheet — it generates the
// utilities by SCANNING client/ source files (`@source` globs). The selectors below reach the
// bundle only through the `**/*.ts` glob, because they live in plain .ts modules that several
// components share (Slider/SliderClasses.ts, DataTable/ColumnMeta.ts) rather than in a component.
//
// That scan can come back stale with nothing else failing. Vercel derives its build-cache key from
// the branch, framework, root directory, Node version and package manager — never from source
// content — so a restored cache can predate a change to what gets scanned. It happened once
// already: production served a seek rail with no width and no colour, while the same commit's
// preview was correct and every test stayed green. Nothing catches that. The slider keeps its
// role, its value and its keyboard seeking whether or not a single pixel of it is painted, so unit
// tests, end-to-end tests against a clean build, and a person looking at a screenshot all pass.
//
// A red build is the cheapest outcome available here: an invisible control ships silently, a
// failed deploy does not.
//
// This check is the safety net, not the remedy: vercel.json removes .next/cache before every build
// so the stale scan cannot happen in the first place. The whole folder goes, not just its
// turbopack/ subfolder, so the guard keeps working if a Next.js upgrade moves where the scan is
// remembered — it costs about three seconds, and node_modules stays cached either way.
// vercel.json is JSON and cannot carry that reasoning itself, which is why it lives here.
//
// globals.css keeps this folder out of Tailwind's automatic source detection. Without that, the
// check defeats itself: naming a utility here is enough for Tailwind to GENERATE it, so all five
// would be present no matter what the design-system scan did.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.next', 'static');

/** [selector exactly as Tailwind emits it, what breaks on screen when it is absent]. */
const REQUIRED = [
  ['.grow', 'the seek rail collapses to 0 px wide'],
  [String.raw`.bg-muted-foreground\/50`, 'the seek rail paints transparent'],
  ['.border-primary', 'the seek thumb is white on white'],
  ['.cursor-grab', 'the seek thumb loses its drag affordance'],
  ['.text-right', 'right-aligned table columns lose their alignment'],
];

const cssFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });

let files;
try {
  files = cssFiles(OUTPUT_DIR);
} catch {
  throw new Error(`assert-design-system-css: no build output at ${OUTPUT_DIR} — build first.`);
}

if (files.length === 0) {
  throw new Error('assert-design-system-css: the build emitted no stylesheet at all.');
}

const css = files.map((file) => readFileSync(file, 'utf8')).join('\n');
const missing = REQUIRED.filter(([selector]) => !css.includes(selector));

if (missing.length > 0) {
  throw new Error(
    [
      `assert-design-system-css: ${missing.length} of ${REQUIRED.length} required selectors are`,
      `missing from the ${files.length} emitted stylesheet(s). Tailwind did not scan the design`,
      'system as expected — on Vercel that means a stale build cache, so redeploy with',
      '"Use existing Build Cache" unchecked.',
      ...missing.map(([selector, consequence]) => `\n  ${selector} — ${consequence}`),
    ].join(' '),
  );
}

console.log(
  `assert-design-system-css: all ${REQUIRED.length} selectors present in ${files.length} stylesheet(s).`,
);
