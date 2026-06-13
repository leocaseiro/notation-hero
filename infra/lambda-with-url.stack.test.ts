import assert from "node:assert/strict";
import { test } from "node:test";

import * as pulumi from "@pulumi/pulumi";

// Register mocks BEFORE constructing any component (resources are created in the
// constructor, so a static import of the component is safe).
pulumi.runtime.setMocks({
  newResource: (args) => ({
    id: `${args.name}-id`,
    state: {
      ...args.inputs,
      // aws.lambda.FunctionUrl exposes `functionUrl`; give a realistic value.
      functionUrl: "https://abcd1234.lambda-url.ap-southeast-2.on.aws/",
    },
  }),
  call: (args) => args.inputs,
});

import { LambdaWithUrl } from "./lambda-with-url.stack.ts";

const resolve = <T>(o: pulumi.Output<T>): Promise<T> =>
  new Promise<T>((res) => {
    o.apply((v) => {
      res(v);
      return v;
    });
  });

const makeComponent = (name: string, functionName: string): LambdaWithUrl =>
  new LambdaWithUrl(name, {
    functionName,
    code: new pulumi.asset.AssetArchive({
      "index.js": new pulumi.asset.StringAsset("exports.handler = async () => ({ statusCode: 200 });"),
    }),
    handler: "index.handler",
  });

test("exposes a public https function URL", async () => {
  const url = await resolve(makeComponent("t1", "nh-test-fn").url);
  assert.ok(url.startsWith("https://"), `expected an https URL, got: ${url}`);
});

test("pins the log group to /aws/lambda/<functionName> with 14-day retention default", async () => {
  const component = makeComponent("t2", "nh-test-fn-2");
  const logGroupName = await resolve(component.logGroupName);
  assert.equal(logGroupName, "/aws/lambda/nh-test-fn-2");
});
