/**
 * @adapters/aws — reusable Pulumi ComponentResources (the AWS adapter layer).
 *
 * Lane A (Wave 3) adds the infra primitives the composition root
 * (infra/index.ts) wires together, e.g.:
 *   - LambdaWithUrl        (Lambda + IAM role + Function URL + log group [+ WAF])
 *   - CloudFrontStaticSite (S3 + OAC + CloudFront + ACM)
 *   - DynamoSingleTable    (table + GSIs + IAM policy templates)
 *   - EdgeBasicAuth        (CloudFront Function with a baked credential)
 *   - S3FileBucket         (bucket + lifecycle + event notifications)
 *
 * These wrap @pulumi/aws, added as a dependency when the first primitive lands.
 * The first deliverable is LambdaWithUrl for the hello-world Function URL.
 */
export const adapterPlaceholder =
  "aws adapter — ComponentResources added in Wave 3 (Lane A)";
