import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import { CloudFrontSite } from './cloudfront-site.stack.ts';
import { LambdaWithUrl } from './lambda-with-url.stack.ts';
import { requireEnv } from './require-env.ts';

/**
 * Pulumi composition root — the ARCH-EDGE-1 two-origin slice (NH-206 Phase 1):
 *   browser -> CloudFront -> { `/*` = S3 (SPA static), `/api/*` = NestJS Lambda Function URL }.
 *
 * The Function URL is locked to AWS_IAM and reachable only by CloudFront (via OAC); the SPA
 * bucket is private (OAC). Build both artifacts before `pulumi preview`/`up`:
 *   pnpm --filter @notation-hero/server run build:lambda   (-> server/dist-lambda)
 *   pnpm --filter @notation-hero/client run build          (-> client/dist)
 */

// The Neon nh_app (DML, least-privilege) url — the ONLY connection string the Lambda receives.
// Wrapped as a secret so it never appears in plaintext in stack state or the deploy log.
const databaseUrl = pulumi.secret(requireEnv('NEON_DATABASE_URL'));

// The Lambda exec role must carry the CI permissions boundary: the deploy policy REQUIRES it on
// every CreateRole (privesc guard — review #1). REQUIRED one-time/admin step BEFORE `pulumi up`:
// run docs/runbooks/aws-ci-oidc-bootstrap.sh, which creates this boundary policy in the account.
const ciRoleBoundaryArn = aws.getCallerIdentityOutput().accountId.apply((accountId) => {
  const arn = `arn:aws:iam::${accountId}:policy/notation-hero-ci-role-boundary`;
  // Preflight (review #6): if the boundary policy is missing, fail fast with the remedy instead
  // of an opaque CreateRole AccessDenied on first deploy. `api` consumes this Output below
  // (permissionsBoundaryArn), so the check runs on every preview/up — local and CI alike.
  return aws.iam.getPolicy({ arn }).then(
    () => arn,
    (err: unknown) => {
      // Can't read the policy (e.g. the role isn't yet granted iam:GetPolicy) -> don't block;
      // only a definitive "does not exist" should stop the deploy. An AccessDenied can't tell
      // "boundary absent" from "boundary present but unreadable", so WARN loudly rather than
      // skip silently — if it really is missing it resurfaces as the CreateRole failure this
      // preflight pre-empts, but now with a breadcrumb (review #6 / adversarial).
      const msg = err instanceof Error ? err.message : String(err);
      if (/not authorized|accessdenied/i.test(msg)) {
        pulumi.log.warn(
          `Could not verify the CI permissions boundary at ${arn} (iam:GetPolicy denied) — ` +
            'proceeding as if it exists. If a later CreateRole fails, run ' +
            'docs/runbooks/aws-ci-oidc-bootstrap.sh (admin) to create it.',
        );
        return arn;
      }
      throw new Error(
        `CI permissions boundary not found at ${arn}. ` +
          `Run docs/runbooks/aws-ci-oidc-bootstrap.sh (admin) before deploying (NH-206).`,
      );
    },
  );
});

const api = new LambdaWithUrl('api', {
  functionName: 'notation-hero-api',
  code: new pulumi.asset.FileArchive('../server/dist-lambda'),
  handler: 'index.handler',
  // Lockdown (ADR ARCH-LAMBDA-1): only a SigV4 caller (CloudFront OAC) may invoke. No CORS —
  // the browser reaches /api/* same-origin through CloudFront.
  authorizationType: 'AWS_IAM',
  // Defence-in-depth (review #1): cap the exec role to its logging-only ceiling.
  permissionsBoundaryArn: ciRoleBoundaryArn,
  // Runtime DB access (NH-79): inject the nh_app url as DATABASE_URL. The owner url
  // (NEON_MIGRATION_URL) is NEVER injected here — it is CI-migrate-only (§3 strict invariant).
  // NODE_ENV=production keeps Express in production mode (no stack in its default error handler) as
  // a backstop behind DbExceptionFilter (review A3).
  environment: { DATABASE_URL: databaseUrl, NODE_ENV: 'production' },
});

const site = new CloudFrontSite('site', {
  functionUrl: api.url,
  lambdaFunctionName: api.function.name,
});

// --- Upload the built SPA (client/dist) to the private bucket, declaratively ---
const SPA_DIR = path.resolve('../client/dist');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function uploadDir(bucket: pulumi.Input<string>, dir: string, prefix = ''): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      uploadDir(bucket, abs, key);
      continue;
    }
    // The S3 key is unique, but sanitizing non-alnum chars to "_" is lossy and could collapse
    // two distinct keys to one Pulumi name. Append a hash of the key to keep the name injective.
    const keyHash = createHash('sha1').update(key).digest('hex').slice(0, 8);
    const resourceName = `spa-${key.replace(/[^a-zA-Z0-9-]/g, '_')}-${keyHash}`;
    new aws.s3.BucketObjectv2(resourceName, {
      bucket,
      key,
      source: new pulumi.asset.FileAsset(abs),
      contentType:
        CONTENT_TYPES[path.extname(entry.name).toLowerCase()] ?? 'application/octet-stream',
      // The SPA shell must revalidate (it points at hashed assets); the hashed assets are immutable.
      cacheControl: key === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
  }
}

if (!fs.existsSync(SPA_DIR)) {
  throw new Error(
    `SPA build not found at ${SPA_DIR}. Run \`pnpm --filter @notation-hero/client run build\` before pulumi.`,
  );
}
uploadDir(site.bucketName, SPA_DIR);

// The public, recruiter-clickable URL.
export const cloudfrontUrl: pulumi.Output<string> = site.url;
// The raw Function URL (now private — curling it directly should return 403).
export const functionUrl: pulumi.Output<string> = api.url;
export const logGroupName: pulumi.Output<string> = api.logGroupName;
export const spaBucket: pulumi.Output<string> = site.bucketName;
