import * as pulumi from "@pulumi/pulumi";

import { LambdaWithUrl } from "./lambda-with-url.stack.ts";

/**
 * Pulumi composition root (NH-150). Wires the hello-world handler's esbuild
 * BUILD OUTPUT (apps/handler-hello/dist) into the LambdaWithUrl component — never
 * the handler's source (H4/H9). Run `nx build @notation-hero/handler-hello`
 * before `pulumi up` so dist/ exists.
 */
const hello = new LambdaWithUrl("hello", {
  functionName: "notation-hero-hello",
  code: new pulumi.asset.FileArchive("../apps/handler-hello/dist"),
  handler: "index.handler",
});

export const url: pulumi.Output<string> = hello.url;
export const logGroupName: pulumi.Output<string> = hello.logGroupName;
