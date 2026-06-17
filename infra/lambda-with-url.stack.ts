import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Reusable Pulumi component (NH-150): a Node Lambda fronted by a public
 * Function URL, with a managed CloudWatch LogGroup (explicit retention).
 *
 * Lives in `infra/` (type:infra) because it is deploy-time IaC importing
 * `@pulumi/*` — the live depcruise H9 forbids `infra → adapters` source, and
 * `.stack` is the approved role suffix for a stack building block. The handler
 * runtime code lives in `apps/` and is packaged via FileArchive(dist) (H1–H4).
 */
export interface LambdaWithUrlArgs {
  /**
   * Explicit function name — REQUIRED so the LogGroup name (`/aws/lambda/<name>`)
   * is deterministic and the group can be created before the function (otherwise
   * Lambda lazily auto-creates an unmanaged, never-expire group).
   */
  functionName: pulumi.Input<string>;
  /** Archive of the handler's esbuild build output (apps/handler-hello/dist). */
  code: pulumi.Input<pulumi.asset.Archive>;
  /** Lambda handler string, e.g. "index.handler". */
  handler: pulumi.Input<string>;
  /** Defaults to "nodejs24.x" (AWS Lambda's newest Node runtime). */
  runtime?: pulumi.Input<string>;
  /** CloudWatch log retention; defaults to 14 days. */
  logRetentionDays?: pulumi.Input<number>;
}

export class LambdaWithUrl extends pulumi.ComponentResource {
  public readonly function: aws.lambda.Function;
  public readonly url: pulumi.Output<string>;
  public readonly logGroupName: pulumi.Output<string>;

  constructor(name: string, args: LambdaWithUrlArgs, opts?: pulumi.ComponentResourceOptions) {
    super("nh:aws:LambdaWithUrl", name, args, opts);

    const assumeRole = aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          actions: ["sts:AssumeRole"],
          principals: [{ type: "Service", identifiers: ["lambda.amazonaws.com"] }],
        },
      ],
    });

    const role = new aws.iam.Role(`${name}-role`, { assumeRolePolicy: assumeRole.json }, { parent: this });

    new aws.iam.RolePolicyAttachment(
      `${name}-basic-exec`,
      { role: role.name, policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole },
      { parent: this },
    );

    // Create the LogGroup first, name pinned to the function name, so Lambda
    // uses it instead of lazily creating an unmanaged never-expire group.
    const logGroup = new aws.cloudwatch.LogGroup(
      `${name}-logs`,
      {
        name: pulumi.interpolate`/aws/lambda/${args.functionName}`,
        retentionInDays: args.logRetentionDays ?? 14,
      },
      { parent: this },
    );

    this.function = new aws.lambda.Function(
      `${name}-fn`,
      {
        name: args.functionName,
        role: role.arn,
        handler: args.handler,
        runtime: args.runtime ?? "nodejs24.x",
        architectures: ["arm64"],
        code: args.code,
        // loggingConfig.logGroup (not bare dependsOn) is what redirects logging
        // to the managed group; dependsOn makes the ordering explicit.
        loggingConfig: { logFormat: "JSON", logGroup: logGroup.name },
      },
      { parent: this, dependsOn: [logGroup] },
    );

    const functionUrl = new aws.lambda.FunctionUrl(
      `${name}-url`,
      {
        functionName: this.function.name,
        // Public endpoint (no SigV4) so it is curl-able — throwaway hello-world,
        // no data/secrets. AWS auto-attaches the public-access policy; no
        // aws.lambda.Permission resource is required.
        authorizationType: "NONE",
        cors: { allowOrigins: ["*"], allowMethods: ["GET"] },
      },
      { parent: this },
    );

    this.url = functionUrl.functionUrl;
    this.logGroupName = logGroup.name;

    this.registerOutputs({
      url: this.url,
      functionArn: this.function.arn,
      logGroupName: this.logGroupName,
    });
  }
}
