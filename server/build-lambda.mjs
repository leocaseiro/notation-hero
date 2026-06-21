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
import { build } from 'esbuild';

console.log('[build:lambda] 1/2 nest build (SWC compile, emits decorator metadata)...');
// pnpm puts node_modules/.bin on PATH when running this script, so `nest` resolves.
execSync('nest build', { stdio: 'inherit' });

console.log('[build:lambda] 2/2 esbuild bundle dist/lambda/handler.js -> dist-lambda/index.js...');
await build({
  entryPoints: ['dist/lambda/handler.js'],
  outfile: 'dist-lambda/index.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  keepNames: true,
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

console.log('[build:lambda] done -> server/dist-lambda/index.js (Lambda handler: index.handler)');
