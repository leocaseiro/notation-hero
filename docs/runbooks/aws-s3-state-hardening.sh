#!/usr/bin/env bash
# Harden the Pulumi self-managed S3 state bucket for notation-hero (NH-206 review #3, H4).
# One-time, admin/SSO only. The state file is the single most important thing you own — the
# record of ALL your infra. After this it survives an accidental or malicious overwrite/delete,
# and only the CI deploy role + your admin identity can touch the bucket.
#
#   aws sso login --profile notation-hero        # if your SSO session expired
#   bash docs/runbooks/aws-s3-state-hardening.sh
#
# Assumes the bucket already exists (created during NH-206 setup; pinned in infra/Pulumi.yaml).
set -euo pipefail

PROFILE="${AWS_PROFILE:-notation-hero}"
BUCKET="${PULUMI_STATE_BUCKET:-notation-hero-pulumi-state-apse2}"
ROLE_NAME="notation-hero-ci-deploy"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --profile "$PROFILE")"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "Hardening s3://${BUCKET} (account ${ACCOUNT_ID})"
echo "Running as: $(aws sts get-caller-identity --query Arn --output text --profile "$PROFILE")"

# 1) Versioning — the core recovery control. Every overwrite/delete keeps the prior version,
#    so a corrupted or wiped state file is one `list-object-versions` + copy away from recovery.
#    REQUIRED before Object Lock (step 4).
aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled --profile "$PROFILE"
echo "  versioning: enabled"

# 2) Block ALL public access (belt-and-suspenders; this bucket must never be public).
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile "$PROFILE"
echo "  public-access: blocked"

# 3) Bucket policy — TLS-only, AND deny every principal EXCEPT the CI deploy role and this
#    account's own identities (root + IAM Identity Center / SSO roles). Resource-side lockdown:
#    even if some IAM policy ever grants s3 on this bucket, only `pulumi up` + your admin get in.
#    NOTE: an account admin/root can always re-PUT this policy, so a wrong ARN can't lock you out
#    permanently — but VERIFY access after running (echo at the end).
POLICY_FILE="$(mktemp)"
trap 'rm -f "$POLICY_FILE"' EXIT
cat > "$POLICY_FILE" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::${BUCKET}", "arn:aws:s3:::${BUCKET}/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyExceptCiDeployAndAccount",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::${BUCKET}", "arn:aws:s3:::${BUCKET}/*"],
      "Condition": {
        "StringNotLike": {
          "aws:PrincipalArn": [
            "${ROLE_ARN}",
            "arn:aws:iam::${ACCOUNT_ID}:root",
            "arn:aws:iam::${ACCOUNT_ID}:role/aws-reserved/sso.amazonaws.com/*"
          ]
        }
      }
    }
  ]
}
JSON
aws s3api put-bucket-policy --bucket "$BUCKET" \
  --policy "file://${POLICY_FILE}" --profile "$PROFILE"
echo "  bucket policy: TLS-only + deny-all-except CI-deploy/admin"

# 4) (Strongest, OPTIONAL) Object Lock — immutable versions so state history can't be permanently
#    deleted, even by a compromised deploy role. GOVERNANCE mode + a 7-day default retention:
#    `pulumi up` still writes new versions freely (only DELETING a version within 7 days is
#    blocked, which Pulumi never does in a normal up). An admin with s3:BypassGovernanceRetention
#    can override if ever needed.
#    CAVEAT: Object Lock can only be enabled on a bucket CREATED with it. If this errors with
#    InvalidBucketState, migrate once: create a NEW bucket with `--object-lock-enabled-for-bucket`,
#    `aws s3 sync` the state across, then repoint infra/Pulumi.yaml `backend.url` + the
#    PULUMI_STATE_BUCKET GitHub variable. Until then, versioning (step 1) is your recovery control.
if aws s3api put-object-lock-configuration --bucket "$BUCKET" \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":7}}}' \
  --profile "$PROFILE" 2>/dev/null; then
  echo "  object-lock: GOVERNANCE, 7-day default retention"
else
  echo "  object-lock: SKIPPED — bucket not created with Object Lock (see step 4 note); versioning still protects you"
fi

echo
echo "Done. Verify:"
echo "  aws s3api get-bucket-versioning  --bucket ${BUCKET} --profile ${PROFILE}"
echo "  aws s3 ls s3://${BUCKET} --profile ${PROFILE}   # confirm YOU can still read it"

# ---------------------------------------------------------------------------------------------
# Related one-time setup (NOT AWS — documented here so deploy setup lives in one place):
#
# GitHub 'production' environment — the second gate the OIDC trust depends on. The deploy role
# trusts ONLY `repo:leocaseiro/notation-hero:environment:production`, which GitHub mints solely
# for a job that references this environment; the environment is restricted to the master branch.
# Already created by the PR author via:
#
#   gh api --method PUT repos/leocaseiro/notation-hero/environments/production --input - <<'EOF'
#   {"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
#   EOF
#   gh api --method POST repos/leocaseiro/notation-hero/environments/production/deployment-branch-policies \
#     -f name=master -f type=branch
#
# After running THIS script, also re-run docs/runbooks/aws-ci-oidc-bootstrap.sh (admin) so the
# role trust switches to environment:production. See docs/specs/2026-06-24-nh-206-oidc-deploy-hardening.md.
