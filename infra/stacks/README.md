# Pulumi stack configs

Placeholder. Lane A (Wave 3) initializes the Pulumi project during the AWS
bootstrap — `Pulumi.yaml` (project) + per-stack config (`dev`, `prod`) land
here. See [`docs/cicd-pipeline.md`](../../docs/cicd-pipeline.md).

The first stack deploys a hello-world Lambda Function URL via `@adapters/aws`
(`LambdaWithUrl`), verified in CloudWatch, then the GitHub OIDC provider + CI
deploy role.
