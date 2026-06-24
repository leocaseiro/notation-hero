// Builds the NestJS lambdalith into a single CJS file for AWS Lambda (dist-lambda/index.js).
//
// Two stages, on purpose:
//   1. `nest build` — the project's SWC builder compiles src/ -> dist/ (CommonJS). SWC emits
//      `emitDecoratorMetadata` (esbuild cannot), so the compiled JS already carries the
//      `design:paramtypes` metadata NestJS dependency injection needs.
//   2. esbuild bundles the COMPILED handler into one self-contained file. Because stage 1
//      already lowered every `@Decorator` to plain `_ts_decorate(...) / Reflect.metadata(...)`
//      calls, esbuild never sees decorator syntax and cannot strip the metadata — it only
//      resolves `require()`s and inlines them (no node_modules shipped; pnpm's symlinked
//      store does not zip cleanly).
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);

console.log('[build:lambda] 1/2 nest build (SWC compile, emits decorator metadata)...');
// pnpm puts node_modules/.bin on PATH when running this script, so `nest` resolves.
execSync('nest build', { stdio: 'inherit' });

console.log(
  '[build:lambda] 2/2 esbuild bundle dist/entry/http.handler.js -> dist-lambda/index.js...',
);
await build({
  entryPoints: ['dist/entry/http.handler.js'],
  outfile: 'dist-lambda/index.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  keepNames: true,
  // Trim cold-start parse time. minifyWhitespace + minifySyntax are DI-safe; do NOT add
  // minifyIdentifiers — NestJS resolves providers by class name (keepNames preserves them,
  // and the DI smoke below would catch a metadata regression).
  minifyWhitespace: true,
  minifySyntax: true,
  // NestJS lazily `require()`s these optional packages inside try/catch; they are not
  // installed, so keep them external — the runtime require fails gracefully as Nest expects.
  external: [
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-fastify',
    'class-transformer',
    'class-validator',
    'cache-manager',
  ],
});

// DI smoke: invoke the bundled handler against /api/health. If esbuild ever strips the
// decorator metadata (e.g. a regression to esbuild-of-TS), NestJS DI breaks and this throws —
// failing the build instead of only surfacing at runtime in Lambda.
const { handler } = require('./dist-lambda/index.js');
const smokeEvent = {
  version: '2.0',
  rawPath: '/api/health',
  rawQueryString: '',
  headers: { host: 'smoke.local' },
  requestContext: { http: { method: 'GET', path: '/api/health' } },
  isBase64Encoded: false,
};
const smoke = await handler(smokeEvent, {});
if (smoke.statusCode !== 200) {
  throw new Error(
    `[build:lambda] DI smoke failed: GET /api/health -> ${smoke.statusCode} (expected 200). ` +
      'The bundle likely lost decorator metadata — check the SWC/esbuild pipeline.',
  );
}

console.log(
  '[build:lambda] done -> server/dist-lambda/index.js (Lambda handler: index.handler); DI smoke OK (/api/health 200)',
);
