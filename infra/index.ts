import * as pulumi from "@pulumi/pulumi";

import { LambdaWithUrl } from "./lambda-with-url.stack.ts";

/**
 * Pulumi composition root. Deploys a placeholder API Lambda behind a public
 * Function URL — the `$0` compute shape from the 2026-06-20 spike (§2). The
 * inline handler is a skeleton STUB; the real NestJS app (serverless-express +
 * esbuild bundle from `server/dist`) replaces `code` when Lambda packaging lands.
 *
 * Phase-1 (spike must-verify): flip the Function URL `authType` NONE -> AWS_IAM
 * and add the CloudFront OAC `lambda:InvokeFunctionUrl` permission before any
 * real data ships. Today it is a public, curl-able hello endpoint (no secrets).
 */
const api = new LambdaWithUrl("api", {
  functionName: "notation-hero-api",
  code: new pulumi.asset.AssetArchive({
    "index.js": new pulumi.asset.StringAsset(
      "exports.handler = async () => ({ statusCode: 200, body: 'Notation Hero API — skeleton' });",
    ),
  }),
  handler: "index.handler",
});

export const url: pulumi.Output<string> = api.url;
export const logGroupName: pulumi.Output<string> = api.logGroupName;
