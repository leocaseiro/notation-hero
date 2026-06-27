# Spike — NestJS 11 on Lambda + SWC build — 2026-06-17

> **Feeds:** `ARCH-LAMBDA-1`, `ARCH-FMT-1`, `ARCH-BUILD-1`. Node 24 (`nodejs24.x`), arm64, Function URL, free tier.

## HTTP API Lambda

- **Adapter:** **`@codegenie/serverless-express`** (the maintained fork; **v5.0.0, Apr 2026, Node 24 support**). NOT `@vendia/serverless-express` (abandoned) or `aws-serverless-express` (dead).
- **Cached singleton** outside the handler (bootstrap Nest once per cold start):

  ```ts
  let server: Handler;
  export const handler = async (e, c, cb) => {
    server = server ?? (await bootstrap());
    return server(e, c, cb);
  };
  ```

- **Function URL = API Gateway v2 payload** → adapter auto-detects; pin `eventSourceName:'AWS_API_GATEWAY_V2'` only if an edge case appears. No API Gateway (12-mo-only). arm64, 512–1024 MB. Skip SnapStart/Provisioned Concurrency for a free-tier portfolio.

## Worker Lambdas (same codebase)

- **`NestFactory.createApplicationContext`** (DI container, no HTTP server). Cache the context; resolve via `ctx.get(Service)`. **Slim root module per worker** (import only what it needs → smaller bundle/cold start). Idiomatic "many entry points, one codebase".

## SWC build

- `.swcrc`: `jsc.parser.decorators:true`, `transform.legacyDecorator:true` + **`decoratorMetadata:true`** (Nest DI + class-validator need it), **`keepClassNames:true`**, `module.type:"commonjs"`, `jsc.target:"es2022"`, `baseUrl`.
- `nest build --builder swc` compiles fast but **does not bundle** — pair with esbuild.
- **esbuild per entry:** `--bundle --format=cjs --platform=node --target=node24 --minify --keep-names --external:@aws-sdk/*`. CJS (decorators/reflect-metadata/serverless-express are CJS-rooted; ESM adds friction for no gain — tree-shaking happens at bundle time regardless). `dist/package.json` `{"type":"commonjs"}` if root is `"type":"module"`.
- **AWS SDK v3:** mark `@aws-sdk/*` external (in the runtime) + import individual clients; revisit only on a measured cold-start regression (the v3.577 size bump).
- **`reflect-metadata`** imported first in each entry; bundle it (don't external).
- **Swagger CLI plugin doesn't run under SWC** — hand-write `@ApiProperty()`, or run a `generate-metadata.ts` pre-build step, or (chosen) use **oRPC** so OpenAPI comes from the contract and `@nestjs/swagger` isn't needed.

## Toolchain

**SWC (compile, decorator metadata) → esbuild (bundle per entry) → Pulumi (zip + deploy).** esbuild alone can't emit decorator metadata (`@anatine/esbuild-decorators` reintroduces the slow compiler) — let SWC own metadata, esbuild own bundling/tree-shaking.

## Sources

[NestJS serverless FAQ](https://docs.nestjs.com/faq/serverless) · [NestJS SWC recipe](https://docs.nestjs.com/recipes/swc) · [@codegenie/serverless-express](https://www.npmjs.com/package/@codegenie/serverless-express) · [Function URL = APIGW v2](https://www.serverless.com/blog/aws-lambda-function-urls-with-serverless-framework) · [AJ Stuyvenberg — AWS SDK cold start](https://aaronstuyvenberg.com/posts/aws-sdk-comparison) · [esbuild #257 (no decorator metadata)](https://github.com/evanw/esbuild/issues/257) · [nestjs/swagger #2493](https://github.com/nestjs/swagger/issues/2493) · queried 2026-06-17.
