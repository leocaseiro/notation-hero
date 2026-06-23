#!/usr/bin/env bash
# Bootstrap the GitHub Actions -> AWS OIDC deploy role for notation-hero (NH-206).
# One-time, admin/SSO only. Idempotent: reuses an existing OIDC provider / role.
#
#   aws sso login --profile notation-hero        # if your SSO session expired
#   bash docs/runbooks/aws-ci-oidc-bootstrap.sh
#
# Prints the deploy-role ARN at the end -> use it for the GH variable AWS_DEPLOY_ROLE_ARN.
set -euo pipefail

PROFILE="${AWS_PROFILE:-notation-hero}"
ROLE_NAME="notation-hero-ci-deploy"
REPO="leocaseiro/notation-hero"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Running as: $(aws sts get-caller-identity --query Arn --output text --profile "$PROFILE")"
echo "(Ctrl-C now if that is NOT your admin/SSO identity.)"

# 1) OIDC provider (account-global) — reuse if present, else create.
PROVIDER_ARN="$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn | [0]" \
  --output text --profile "$PROFILE")"
if [ "$PROVIDER_ARN" = "None" ] || [ -z "$PROVIDER_ARN" ]; then
  PROVIDER_ARN="$(aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
    --query 'OpenIDConnectProviderArn' --output text --profile "$PROFILE")"
  echo "Created OIDC provider: $PROVIDER_ARN"
else
  echo "Reusing OIDC provider: $PROVIDER_ARN"
fi

# 1b) Permissions boundary — the CEILING for every role the deploy role is allowed to create.
# The deploy policy REQUIRES this boundary on each CreateRole, so a created role can never exceed
# Lambda logging — this is what neutralises the CreateRole + AttachRolePolicy + PassRole
# privilege-escalation path. Managed-policy docs are immutable, so an update = a new default
# version (IAM keeps at most 5 versions; prune the oldest if create-policy-version ever errors).
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --profile "$PROFILE")"
BOUNDARY_NAME="notation-hero-ci-role-boundary"
BOUNDARY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${BOUNDARY_NAME}"
if aws iam get-policy --policy-arn "$BOUNDARY_ARN" --profile "$PROFILE" >/dev/null 2>&1; then
  aws iam create-policy-version --policy-arn "$BOUNDARY_ARN" \
    --policy-document "file://${SCRIPT_DIR}/aws-iam-ci-role-boundary.json" \
    --set-as-default --profile "$PROFILE" >/dev/null
  echo "Updated permissions boundary: $BOUNDARY_ARN"
else
  aws iam create-policy --policy-name "$BOUNDARY_NAME" \
    --policy-document "file://${SCRIPT_DIR}/aws-iam-ci-role-boundary.json" \
    --description "Ceiling for notation-hero CI-created Lambda exec roles (least-privilege boundary)" \
    --profile "$PROFILE" >/dev/null
  echo "Created permissions boundary: $BOUNDARY_ARN"
fi

# 2) Trust policy — only this repo's master ref + same-repo PRs may assume the role.
TRUST_FILE="$(mktemp)"
trap 'rm -f "$TRUST_FILE"' EXIT
cat > "$TRUST_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "${PROVIDER_ARN}" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": [
            "repo:${REPO}:ref:refs/heads/master",
            "repo:${REPO}:pull_request"
          ]
        }
      }
    }
  ]
}
EOF

# 3) Create or update the deploy role.
if aws iam get-role --role-name "$ROLE_NAME" --profile "$PROFILE" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" \
    --policy-document "file://$TRUST_FILE" --profile "$PROFILE"
  echo "Updated trust policy on existing role $ROLE_NAME"
else
  aws iam create-role --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_FILE" \
    --description "GitHub Actions OIDC deploy role for notation-hero (pulumi up)" \
    --profile "$PROFILE"
  echo "Created role $ROLE_NAME"
fi

# 4) Attach the deploy permission set (inline policy from the committed JSON).
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name notation-hero-ci-deploy \
  --policy-document "file://${SCRIPT_DIR}/aws-iam-ci-deploy.json" \
  --profile "$PROFILE"
echo "Attached deploy permission policy to $ROLE_NAME"

# 5) The role ARN — set this as the GH Actions variable AWS_DEPLOY_ROLE_ARN.
ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text --profile "$PROFILE")"
echo
echo "DEPLOY ROLE ARN: $ROLE_ARN"
