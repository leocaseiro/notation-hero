import assert from "node:assert/strict";
import { test } from "vitest";

import * as pulumi from "@pulumi/pulumi";

// Record every resource's resolved inputs so tests can assert on the wiring
// (authType, retention, runtime, ...) — not just the exposed outputs.
const created: Array<{ type: string; inputs: Record<string, unknown> }> = [];

pulumi.runtime.setMocks({
  newResource: (args) => {
    created.push({ type: args.type, inputs: args.inputs });
    return {
      id: `${args.name}-id`,
      state: {
        ...args.inputs,
        // aws.lambda.FunctionUrl exposes `functionUrl`; give a realistic value.
        functionUrl: "https://abcd1234.lambda-url.ap-southeast-2.on.aws/",
      },
    };
  },
  call: (args) => args.inputs,
});

import { LambdaWithUrl } from "./lambda-with-url.stack.ts";

const resolveOutput = <T>(o: pulumi.Output<T>): Promise<T> =>
  new Promise<T>((res) => {
    o.apply((v) => {
      res(v);
      return v;
    });
  });

const inputsOf = (typeSuffix: string): Record<string, unknown> => {
  const match = created.find((r) => r.type.endsWith(typeSuffix));
  assert.ok(match, `expected a created resource of type ...${typeSuffix}`);
  return match.inputs;
};

const makeComponent = (
  name: string,
  args: Partial<{
    runtime: string;
    logRetentionDays: number;
    authorizationType: "NONE" | "AWS_IAM";
    timeoutSeconds: number;
    memorySize: number;
    permissionsBoundaryArn: string;
  }> = {},
): LambdaWithUrl =>
  new LambdaWithUrl(name, {
    functionName: name,
    code: new pulumi.asset.AssetArchive({
      "index.js": new pulumi.asset.StringAsset(
        "exports.handler = async () => ({ statusCode: 200 });",
      ),
    }),
    handler: "index.handler",
    ...args,
  });

test("provisions a public Lambda Function URL over a 14-day-retention log group", async () => {
  created.length = 0;
  const component = makeComponent("nh-hello");

  // Resolving the URL forces the whole resource graph to materialize under the mocks.
  const url = await resolveOutput(component.url);
  assert.ok(url.startsWith("https://"), `expected an https URL, got: ${url}`);

  assert.equal(
    await resolveOutput(component.logGroupName),
    "/aws/lambda/nh-hello",
  );

  const fn = inputsOf(":Function");
  assert.equal(fn.runtime, "nodejs24.x");
  assert.deepEqual(fn.architectures, ["arm64"]);
  // Free-tier guard: a low default timeout + bounded memory.
  assert.equal(fn.timeout, 10);
  assert.equal(fn.memorySize, 512);

  // KTD4: loggingConfig.logGroup (not bare dependsOn) is what redirects logging
  // to the managed group — assert the linkage so a regression to the unmanaged
  // never-expire group fails the test.
  const logging = fn.loggingConfig as { logFormat: string; logGroup: string };
  assert.equal(logging.logFormat, "JSON");
  assert.equal(logging.logGroup, "/aws/lambda/nh-hello");

  const logGroup = inputsOf(":LogGroup");
  assert.equal(logGroup.name, "/aws/lambda/nh-hello");
  assert.equal(logGroup.retentionInDays, 14);

  // The public-endpoint security contract (C2/R1) — flipping to AWS_IAM must fail this.
  assert.equal(inputsOf(":FunctionUrl").authorizationType, "NONE");
});

test("honors runtime and retention overrides", async () => {
  created.length = 0;
  const component = makeComponent("nh-custom", {
    runtime: "nodejs20.x",
    logRetentionDays: 30,
  });
  await resolveOutput(component.url);

  assert.equal(inputsOf(":Function").runtime, "nodejs20.x");
  assert.equal(inputsOf(":LogGroup").retentionInDays, 30);
});

test("locks the Function URL to AWS_IAM and applies timeout/memory overrides", async () => {
  created.length = 0;
  const component = makeComponent("nh-locked", {
    authorizationType: "AWS_IAM",
    timeoutSeconds: 5,
    memorySize: 256,
  });
  await resolveOutput(component.url);

  // AWS_IAM is the Phase-1 lockdown — only a SigV4 caller (CloudFront OAC) may invoke.
  assert.equal(inputsOf(":FunctionUrl").authorizationType, "AWS_IAM");
  const fn = inputsOf(":Function");
  assert.equal(fn.timeout, 5);
  assert.equal(fn.memorySize, 256);
});

test("applies the permissions boundary to the Lambda execution role when provided", async () => {
  created.length = 0;
  const boundary =
    "arn:aws:iam::123456789012:policy/notation-hero-ci-role-boundary";
  const component = makeComponent("nh-bounded", {
    permissionsBoundaryArn: boundary,
  });
  await resolveOutput(component.url);

  // Defence-in-depth (review #1): the exec role must carry the boundary so an over-broad CI
  // grant can never escalate a created role beyond its logging ceiling.
  assert.equal(inputsOf(":Role").permissionsBoundary, boundary);
});
