import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * One CloudFront distribution, two origins (ADR ARCH-EDGE-1):
 *   - default `/*`   -> a PRIVATE S3 bucket (the built SPA), reached only via OAC.
 *   - ordered `/api/*` -> the NestJS Lambda Function URL, locked to AWS_IAM + OAC.
 *
 * Free-tier posture: this is a plain pay-as-you-go distribution (the perpetual 1 TB / 10M
 * tier). It deliberately does NOT opt into a CloudFront flat-rate pricing plan (the Nov-2025
 * "Free" plan is only 100 GB / 1M). `PriceClass_100` keeps it to the cheapest edge set.
 */
export interface CloudFrontSiteArgs {
  /** The Lambda Function URL (https://<id>.lambda-url.<region>.on.aws/) to front at /api/*. */
  functionUrl: pulumi.Input<string>;
  /** The Lambda function name — used to grant CloudFront permission to invoke it. */
  lambdaFunctionName: pulumi.Input<string>;
}

// Stable AWS-managed policy IDs (global, documented). Exported so the test asserts the SAME
// policy the stack applies. Using the IDs avoids a data-source lookup and keeps the component
// pure + unit-testable.
export const CACHE_OPTIMIZED = "658327ea-f89d-4fab-a63d-7e88639e58f6"; // Managed-CachingOptimized
export const CACHE_DISABLED = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"; // Managed-CachingDisabled
// Managed-AllViewerExceptHostHeader — strips the viewer Host so CloudFront signs SigV4 against
// the Lambda URL's own domain (otherwise the Function URL returns 403 SignatureDoesNotMatch).
export const ORP_ALL_VIEWER_EXCEPT_HOST =
  "b689b0a8-53d0-40ab-baf2-68738e2966ac";

const S3_ORIGIN_ID = "s3-spa";
const LAMBDA_ORIGIN_ID = "lambda-api";

export class CloudFrontSite extends pulumi.ComponentResource {
  public readonly url: pulumi.Output<string>;
  public readonly bucketName: pulumi.Output<string>;
  public readonly distributionId: pulumi.Output<string>;

  constructor(
    name: string,
    args: CloudFrontSiteArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("nh:aws:CloudFrontSite", name, args, opts);

    // --- Private S3 bucket for the SPA (no public access; ACLs disabled) ---
    const bucket = new aws.s3.Bucket(`${name}-spa`, {}, { parent: this });

    new aws.s3.BucketPublicAccessBlock(
      `${name}-spa-pab`,
      {
        bucket: bucket.id,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      { parent: this },
    );

    new aws.s3.BucketOwnershipControls(
      `${name}-spa-owner`,
      { bucket: bucket.id, rule: { objectOwnership: "BucketOwnerEnforced" } },
      { parent: this },
    );

    // --- Origin Access Controls (SigV4 signing for both origins) ---
    const s3Oac = new aws.cloudfront.OriginAccessControl(
      `${name}-s3-oac`,
      {
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
      { parent: this },
    );

    const lambdaOac = new aws.cloudfront.OriginAccessControl(
      `${name}-lambda-oac`,
      {
        originAccessControlOriginType: "lambda",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
      { parent: this },
    );

    // The CloudFront origin domain is the Function URL host (no scheme, no trailing slash).
    const lambdaOriginDomain = pulumi
      .output(args.functionUrl)
      .apply((u) => new URL(u).hostname);

    // SPA client-side routing, scoped to the S3 (default) behaviour ONLY — so it can never
    // rewrite genuine /api/* error responses. (A distribution-wide customErrorResponses
    // 403->index.html would mask real API 401/403/404s — a Phase-2 auth/CRUD hazard.) Here a
    // non-/api, extensionless path is served the app shell and TanStack Router takes over
    // client-side; assets (a file extension) and /api/* pass through untouched.
    const spaRouter = new aws.cloudfront.Function(
      `${name}-spa-router`,
      {
        runtime: "cloudfront-js-2.0",
        publish: true,
        code: [
          "function handler(event) {",
          "  var req = event.request;",
          "  var uri = req.uri;",
          "  if (uri.indexOf('/api/') === 0) { return req; }",
          "  var seg = uri.substring(uri.lastIndexOf('/') + 1);",
          "  if (seg.indexOf('.') !== -1) { return req; }",
          "  req.uri = '/index.html';",
          "  return req;",
          "}",
        ].join("\n"),
      },
      { parent: this },
    );

    // --- The distribution ---
    const distribution = new aws.cloudfront.Distribution(
      `${name}-cdn`,
      {
        enabled: true,
        defaultRootObject: "index.html",
        priceClass: "PriceClass_100",
        httpVersion: "http2and3",
        origins: [
          {
            originId: S3_ORIGIN_ID,
            domainName: bucket.bucketRegionalDomainName,
            originAccessControlId: s3Oac.id,
          },
          {
            originId: LAMBDA_ORIGIN_ID,
            domainName: lambdaOriginDomain,
            originAccessControlId: lambdaOac.id,
            customOriginConfig: {
              httpPort: 80,
              httpsPort: 443,
              originProtocolPolicy: "https-only",
              originSslProtocols: ["TLSv1.2"],
            },
          },
        ],
        // SPA static assets: long edge cache so S3 is barely hit on reads.
        defaultCacheBehavior: {
          targetOriginId: S3_ORIGIN_ID,
          viewerProtocolPolicy: "redirect-to-https",
          allowedMethods: ["GET", "HEAD"],
          cachedMethods: ["GET", "HEAD"],
          compress: true,
          cachePolicyId: CACHE_OPTIMIZED,
          functionAssociations: [
            { eventType: "viewer-request", functionArn: spaRouter.arn },
          ],
        },
        // Dynamic API: no caching, forward everything except Host (so SigV4 stays valid).
        orderedCacheBehaviors: [
          {
            pathPattern: "/api/*",
            targetOriginId: LAMBDA_ORIGIN_ID,
            viewerProtocolPolicy: "redirect-to-https",
            allowedMethods: [
              "GET",
              "HEAD",
              "OPTIONS",
              "PUT",
              "POST",
              "PATCH",
              "DELETE",
            ],
            cachedMethods: ["GET", "HEAD"],
            cachePolicyId: CACHE_DISABLED,
            originRequestPolicyId: ORP_ALL_VIEWER_EXCEPT_HOST,
          },
        ],
        // No distribution-wide customErrorResponses: SPA deep-link routing is handled by the
        // spaRouter CloudFront Function (default behaviour only), so /api/* errors are NOT masked.
        restrictions: { geoRestriction: { restrictionType: "none" } },
        viewerCertificate: { cloudfrontDefaultCertificate: true },
      },
      { parent: this },
    );

    // --- Bucket policy: only this distribution (via OAC) may read objects ---
    new aws.s3.BucketPolicy(
      `${name}-spa-policy`,
      {
        bucket: bucket.id,
        policy: pulumi
          .all([bucket.arn, distribution.arn])
          .apply(([bucketArn, distributionArn]) =>
            JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Sid: "AllowCloudFrontOACRead",
                  Effect: "Allow",
                  Principal: { Service: "cloudfront.amazonaws.com" },
                  Action: "s3:GetObject",
                  Resource: `${bucketArn}/*`,
                  Condition: {
                    StringEquals: { "AWS:SourceArn": distributionArn },
                  },
                },
              ],
            }),
          ),
      },
      { parent: this },
    );

    // --- Allow CloudFront to invoke the Function URL. BOTH actions are required; granting
    //     only InvokeFunctionUrl yields intermittent 403s (per AWS docs). Pinned by SourceArn. ---
    new aws.lambda.Permission(
      `${name}-cf-invoke-url`,
      {
        action: "lambda:InvokeFunctionUrl",
        function: args.lambdaFunctionName,
        principal: "cloudfront.amazonaws.com",
        sourceArn: distribution.arn,
      },
      { parent: this },
    );

    new aws.lambda.Permission(
      `${name}-cf-invoke-fn`,
      {
        action: "lambda:InvokeFunction",
        function: args.lambdaFunctionName,
        principal: "cloudfront.amazonaws.com",
        sourceArn: distribution.arn,
      },
      { parent: this },
    );

    this.url = pulumi.interpolate`https://${distribution.domainName}`;
    this.bucketName = bucket.bucket;
    this.distributionId = distribution.id;

    this.registerOutputs({
      url: this.url,
      bucketName: this.bucketName,
      distributionId: this.distributionId,
    });
  }
}
