import * as pulumi from "@pulumi/pulumi";

import { LambdaWithUrl } from "./lambda-with-url.stack.ts";

/**
 * Pulumi composition root. Phase 0 ships an inline placeholder handler — no app
 * build is wired yet. Phase 1 (the deployable slice) replaces this with the
 * server/ build output (FileArchive) and points `handler` at the Nest entry.
 */
const hello = new LambdaWithUrl("hello", {
  functionName: "notation-hero-hello",
  code: new pulumi.asset.AssetArchive({
    "index.js": new pulumi.asset.StringAsset(
      "exports.handler = async () => ({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello from notation-hero' }) });",
    ),
  }),
  handler: "index.handler",
});

export const url: pulumi.Output<string> = hello.url;
export const logGroupName: pulumi.Output<string> = hello.logGroupName;
