import assert from "node:assert/strict";
import { test } from "node:test";

import * as pulumi from "@pulumi/pulumi";

const created: Array<{ type: string; inputs: Record<string, unknown> }> = [];

pulumi.runtime.setMocks({
  newResource: (args) => {
    created.push({ type: args.type, inputs: args.inputs });
    return {
      id: `${args.name}-id`,
      state: {
        ...args.inputs,
        arn: `arn:aws:mock:::${args.name}`,
        domainName: `${args.name}.cloudfront.net`,
        bucketRegionalDomainName: `${args.name}.s3.ap-southeast-2.amazonaws.com`,
        bucket: args.name,
      },
    };
  },
  call: (args) => args.inputs,
});

const {
  CloudFrontSite,
  CACHE_OPTIMIZED,
  CACHE_DISABLED,
  ORP_ALL_VIEWER_EXCEPT_HOST,
} = await import("./cloudfront-site.stack.ts");

const resolveOutput = <T>(o: pulumi.Output<T>): Promise<T> =>
  new Promise<T>((res) => {
    o.apply((v) => {
      res(v);
      return v;
    });
  });

const findAll = (typeSuffix: string): Array<Record<string, unknown>> =>
  created.filter((r) => r.type.endsWith(typeSuffix)).map((r) => r.inputs);

const findOne = (typeSuffix: string): Record<string, unknown> => {
  const all = findAll(typeSuffix);
  assert.equal(all.length >= 1, true, `expected a resource ...${typeSuffix}`);
  return all[0]!;
};

async function buildSite(): Promise<void> {
  created.length = 0;
  const site = new CloudFrontSite("site", {
    functionUrl: "https://abcd1234.lambda-url.ap-southeast-2.on.aws/",
    lambdaFunctionName: "notation-hero-api",
  });
  // Resolve outputs + flush the dependent applies (bucket policy / permissions read distribution.arn).
  await resolveOutput(site.url);
  await resolveOutput(site.bucketName);
  await new Promise((r) => setTimeout(r, 100));
}

test("S3 bucket is private and readable only by this distribution via OAC", async () => {
  await buildSite();

  const pab = findOne(":BucketPublicAccessBlock");
  assert.equal(pab.blockPublicAcls, true);
  assert.equal(pab.blockPublicPolicy, true);
  assert.equal(pab.ignorePublicAcls, true);
  assert.equal(pab.restrictPublicBuckets, true);

  const ownership = findOne(":BucketOwnershipControls");
  assert.deepEqual(ownership.rule, { objectOwnership: "BucketOwnerEnforced" });

  const policyDoc = JSON.parse(findOne(":BucketPolicy").policy as string) as {
    Statement: Array<{
      Principal: { Service: string };
      Action: string;
      Condition: { StringEquals: Record<string, string> };
    }>;
  };
  const stmt = policyDoc.Statement[0]!;
  assert.equal(stmt.Principal.Service, "cloudfront.amazonaws.com");
  assert.equal(stmt.Action, "s3:GetObject");
  const sourceArn = stmt.Condition.StringEquals["AWS:SourceArn"];
  assert.ok(
    sourceArn && sourceArn !== "*",
    "SourceArn must pin one distribution",
  );
});

test("two OACs (s3 + lambda) both sign sigv4 always", async () => {
  await buildSite();
  const oacs = findAll(":OriginAccessControl");
  assert.equal(oacs.length, 2);
  const byType = Object.fromEntries(
    oacs.map((o) => [o.originAccessControlOriginType, o]),
  );
  for (const t of ["s3", "lambda"]) {
    assert.ok(byType[t], `missing OAC for ${t}`);
    assert.equal(byType[t]!.signingBehavior, "always");
    assert.equal(byType[t]!.signingProtocol, "sigv4");
  }
});

test("distribution has two origins and a distinct /api/* behavior", async () => {
  await buildSite();
  const dist = findOne(":Distribution");

  const origins = dist.origins as Array<Record<string, unknown>>;
  assert.equal(origins.length, 2);
  const originIds = origins.map((o) => o.originId).sort();
  assert.deepEqual(originIds, ["lambda-api", "s3-spa"]);

  // The lambda origin is HTTPS-only and OAC-signed.
  const lambdaOrigin = origins.find((o) => o.originId === "lambda-api")!;
  assert.ok(lambdaOrigin.originAccessControlId);

  // The s3 origin must ALSO carry an OAC id (symmetry with the lambda origin) — dropping it
  // breaks the private-bucket fetch, so pin it so the wiring can't silently regress.
  const s3Origin = origins.find((o) => o.originId === "s3-spa")!;
  assert.ok(
    s3Origin.originAccessControlId,
    "s3-spa origin must carry an OAC id",
  );

  const customCfg = lambdaOrigin.customOriginConfig as {
    originProtocolPolicy: string;
    originReadTimeout: number;
  };
  assert.equal(customCfg.originProtocolPolicy, "https-only");
  // review #5: CF origin read-timeout pinned just above the 10s Lambda timeout (not the 30s default).
  assert.equal(customCfg.originReadTimeout, 12);

  // Free-tier guard: pay-as-you-go cheapest edge set (NOT a flat-rate plan).
  assert.equal(dist.priceClass, "PriceClass_100");

  // Default /* caches (SPA); /api/* does not, and forwards all-except-Host. Both force HTTPS.
  const def = dist.defaultCacheBehavior as Record<string, unknown>;
  assert.equal(def.targetOriginId, "s3-spa");
  assert.equal(def.cachePolicyId, CACHE_OPTIMIZED);
  assert.equal(def.viewerProtocolPolicy, "redirect-to-https");

  const ordered = dist.orderedCacheBehaviors as Array<Record<string, unknown>>;
  assert.equal(ordered.length, 1);
  assert.equal(ordered[0]!.pathPattern, "/api/*");
  assert.equal(ordered[0]!.targetOriginId, "lambda-api");
  assert.equal(ordered[0]!.cachePolicyId, CACHE_DISABLED);
  assert.equal(ordered[0]!.originRequestPolicyId, ORP_ALL_VIEWER_EXCEPT_HOST);
  assert.equal(ordered[0]!.viewerProtocolPolicy, "redirect-to-https");
});

test("SPA routing is a default-behaviour CloudFront Function and does NOT mask /api errors", async () => {
  await buildSite();
  const dist = findOne(":Distribution");

  // No distribution-wide error rewrite (which would turn /api/* 403/404 into 200 + index.html).
  assert.equal(dist.customErrorResponses, undefined);

  // A viewer-request Function serves the SPA shell for non-/api, extensionless paths.
  const fn = findOne(":Function");
  assert.equal(fn.runtime, "cloudfront-js-2.0");
  assert.match(fn.code as string, /index\.html/);
  assert.match(fn.code as string, /\/api\//); // it special-cases /api/ to pass through

  const def = dist.defaultCacheBehavior as Record<string, unknown>;
  const assoc = def.functionAssociations as Array<Record<string, unknown>>;
  assert.equal(assoc.length, 1);
  assert.equal(assoc[0]!.eventType, "viewer-request");

  // The /api/* behaviour has NO function association — API responses pass through unchanged.
  const ordered = dist.orderedCacheBehaviors as Array<Record<string, unknown>>;
  assert.equal(ordered[0]!.functionAssociations, undefined);
});

test("grants CloudFront BOTH invoke permissions, pinned to the distribution", async () => {
  await buildSite();
  const perms = findAll(":Permission");
  assert.equal(perms.length, 2);
  const actions = perms.map((p) => p.action).sort();
  assert.deepEqual(actions, [
    "lambda:InvokeFunction",
    "lambda:InvokeFunctionUrl",
  ]);
  for (const p of perms) {
    assert.equal(p.principal, "cloudfront.amazonaws.com");
    assert.ok(p.sourceArn, "permission must pin a sourceArn");
    assert.notEqual(p.sourceArn, "*");
  }
});
