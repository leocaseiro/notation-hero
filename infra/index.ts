/**
 * Pulumi COMPOSITION ROOT (hexagonal layout).
 *
 * Where the deployable stack is assembled: imports each app's infra
 * (apps/<app>/infra.ts) plus the cross-cutting resources (the shared DynamoDB
 * single-table + S3 file bucket), instantiating the reusable Pulumi
 * ComponentResources from @adapters/aws.
 *
 * STUB: Wave 3 (Lane A) fills this in. First deliverable = one hello-world
 * Lambda Function URL via @adapters/aws LambdaWithUrl, verified in CloudWatch,
 * then the GitHub OIDC provider + CI deploy role. See docs/cicd-pipeline.md.
 *
 *   // Lane A:
 *   // import { LambdaWithUrl } from "@adapters/aws";
 *   // export const hello = new LambdaWithUrl("hello", { ... });
 */
export const compositionRoot =
  "infra composition root — resources added in Wave 3 (Lane A)";
