import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { fileURLToPath } from "node:url";

// The composition root (index.ts) is what wires the REAL Function URL to AWS_IAM (ARCH-LAMBDA-1).
// It can't be imported in a unit test — at module load it resolves + reads ../client/dist (a build
// artifact absent during `pnpm test`) and would throw. So pin the security-critical wiring by
// source: if `authorizationType: "AWS_IAM"` is ever dropped or weakened here, the LambdaWithUrl
// default ("NONE") would silently deploy a PUBLIC, curl-able Function URL — this fails first.
// (review #1 / adversarial: the AWS_IAM lock previously lived on a single untested line.)
const indexSrc = readFileSync(
  fileURLToPath(new URL("./index.ts", import.meta.url)),
  "utf8",
);

test("composition root locks the api Function URL to AWS_IAM (guards a public regression)", () => {
  assert.match(
    indexSrc,
    /authorizationType:\s*"AWS_IAM"/,
    'infra/index.ts must wire the api Lambda Function URL to "AWS_IAM"; removing it falls back ' +
      'to the LambdaWithUrl "NONE" default — a public, curl-able endpoint.',
  );
});
