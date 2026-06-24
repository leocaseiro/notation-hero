# NH-206 — GitHub→AWS OIDC deploy hardening (review #3)

**Status:** accepted (brainstormed + decided with leocaseiro 2026-06-24) · **Merge-blocker for PR #64** (NH-206 phase-1 AWS slice)
**Spec:** this doc · **Registry:** see the 2026-06-24 Change-log entry in `docs/decisions/decision-registry.md`

---

## Problem

`.github/workflows/deploy.yml` ran `pulumi preview` on `pull_request` under the **same** full read-write deploy role (`AWS_DEPLOY_ROLE_ARN` → `notation-hero-ci-deploy`) used by `pulumi up` on master. A Pulumi program is **arbitrary TypeScript**, so a PR — or a poisoned `infra/` dependency — executing during preview held the deploy role's credentials and could:

- read/exfiltrate the Pulumi **state** (resource IDs, ARNs, Function URL) + decrypt secrets (the preview job was also handed `PULUMI_CONFIG_PASSPHRASE`),
- **overwrite the live Lambda** (`UpdateFunctionCode`), **flip the Function URL auth** `AWS_IAM→NONE`, **repoint/destroy any CloudFront distribution** (`Resource:"*"`), **wipe the SPA + state buckets** (`s3:*`).

The OIDC trust granted that role to **any same-repo `pull_request`**. Forks are blocked (GitHub withholds OIDC tokens from forks + the workflow fork-guard), so the live risk today is a **poisoned PR dependency** or a **future collaborator** — a defense-in-depth hole.

**Severity:** medium-low solo today → **HIGH** once a collaborator can open a same-repo PR (their PR code auto-runs under full write _before_ review). The permissions boundary (`aws-iam-ci-role-boundary.json`) correctly closes IAM privilege-escalation for _created_ roles, but does **not** constrain the deploy role's own S3/CloudFront/Lambda write power.

---

## Decision

**Drop preview-on-PR entirely** (run `pulumi preview` **locally** only) and **narrow the deploy role's trust to a master-only `production` GitHub Environment.** Net effect: **zero AWS credentials on any PR**; the deploy role is assumable only by the master-push `up` job via the `production` environment.

### Why drop preview-on-PR rather than split into a read-only preview role

- This repo is **public** → `pulumi preview` output (resource IDs, ARNs, the Lambda Function URL) lands in **public Actions logs** and a **public PR comment** regardless of how tightly the role is scoped. **There is no private preview in public CI.**
- Even a read-only preview role keeps _some_ PR credential exposure (state read → resource-ID exfil; state-lock DoS).
- leocaseiro previews locally before merging → the automated PR plan-comment is largely redundant.
- Dropping it is **simpler** (one role, no preview job) **and** strictly safer.
- **Trade-off accepted:** no automated infra-diff comment on PRs — recovered by the **agent safety-net** (§4 below).

Research convergence (2026-06-24): OWASP CICD-SEC-4 "Poisoned Pipeline Execution"; role-split prior art (eliasbrange.dev, systemshardening.com); the **readplace.com** baseline runs privileged Pulumi on push-to-`main` only, never on PRs.

---

## Changes (all land in PR #64)

### 1. `deploy.yml` — push-to-master only

- Remove the `pull_request` trigger; keep `push: branches: [master]`.
- **Remove the `preview` job entirely.**
- `up` job: add `environment: production`; add `audience: sts.amazonaws.com` to `configure-aws-credentials` (**H2**).
- Tighten `permissions:` to `id-token: write` + `contents: read` (drop `pull-requests: write`).
- SHA-pin every `uses:` to a commit SHA (**H3**).

### 2. `aws-ci-oidc-bootstrap.sh` — trust = `environment:production`

- Trust `sub` (StringEquals) → `repo:leocaseiro/notation-hero:environment:production` **only** (remove both `ref:refs/heads/master` and `pull_request`).
- Keep `aud = sts.amazonaws.com`.
- ⬅ **leocaseiro re-runs this (admin SSO)** to apply the new trust.

### 3. GitHub Environment `production` (master-only)

- Created via `gh api`; deployment-branch policy = `master` only. **No required reviewers** (zero friction; can add later for a ~30 s self-approval gate).

### 4. Agent safety-net (recovers the dropped diff-comment)

- **AGENTS.md rule:** an agent that changes `infra/` MUST run `pulumi preview` locally and classify the result. If it shows **destructive** (`replace`/`delete`) OR **exposure** (new IAM, S3 public-access, Function-URL auth weakening) changes, it MUST file a **required merge-blocker task** in **both** the PR checklist **and** a Jira Smart Checklist mandatory task (`customfield_10041`, `-!`) describing them. With no AWS SSO session, it states _"preview not run — review locally before merge"_ and still files the task. **Classification only — keep resource IDs/URLs OUT of the public PR.**
- **PR template:** add the infra-preview checklist item + a `## Pulumi preview` section (classification, not full output).
- **CI gate (diff-aware):** extend `tooling/pr-checklist.mjs` — when the PR diff touches `infra/**`, require the `## Pulumi preview` section to be non-empty. Wire an `infra` output from the `changes` paths-filter into the `pr-checklist` job. Add a `tooling/*.test.mjs` case.

### 5. Hardening

- **H2 — audience pin:** explicit `audience: sts.amazonaws.com` (trust already enforces `aud`; belt-and-suspenders).
- **H3 — SHA-pin actions:** pin every `uses:` to a commit SHA (supply-chain; the March-2025 tj-actions compromise hit 18k+ repos).
- **H4 — S3 state-bucket hardening:** versioning + Object Lock (governance) + deny-all-except-CI bucket policy on `notation-hero-pulumi-state-apse2`. ⬅ **runbook for leocaseiro (admin SSO).**
- **H1 — short STS session: NOT adopted.** The first CloudFront create takes ~15-20 min, longer than a 15-min session; kept the 1 h default.

### 6. Decision registry

- Add a 2026-06-24 Change-log entry + flip the CI/CD-OIDC decision's enforcement (master-only trust, no PR creds), per AGENTS.md governance.

### 7. AGENTS.md

- Update the Pulumi-ops note — "PR → preview" is gone; preview is **local-only**; deploy runs via the master-only `production` environment.

---

## leocaseiro's manual steps (AWS admin / one-time)

1. **Re-run** `bash docs/runbooks/aws-ci-oidc-bootstrap.sh` (admin SSO) → applies the `environment:production` trust.
2. **Run the state-bucket hardening runbook** (versioning + Object Lock + deny-all bucket policy) — see `docs/runbooks/aws-s3-state-hardening.sh`.

(The `production` GitHub Environment is created by the PR author via `gh` — command in the runbook.)

---

## Residual threat model (after this change)

**Closed:** every PR-driven write / destroy / inject / exfil path (no AWS creds on PRs at all); infra details no longer leak into public PR logs/comments; the passphrase exposure dissolves (no preview job).

**Remains:**

1. **Supply-chain in the master `up` job** — a poisoned `infra/` dependency runs under the deploy role on master. Mitigated by branch protection + the least-privilege follow-up.
2. **GitHub account/token compromise → push to master → deploy.** Master is now the trust boundary; mitigated by existing branch protection (required `CI Green` + PR reviews) + 2FA.
3. **The deploy role is still broad** (`s3:*`, CloudFront `Resource:"*"`). It is no longer reachable from PRs; tightening it is the follow-up below.

---

## Follow-up (separate NH ticket — not a merge-blocker)

**Tighten `ci-deploy` to least-privilege S3/CloudFront actions** (defense-in-depth for the master `up` path). Deferred because it is finicky and easy to get wrong — a missing action only surfaces when a real deploy fails — so it wants its own end-to-end-tested PR.

---

## Decisions log (2026-06-24 brainstorm with leocaseiro)

| #   | Decision              | Chosen                                        | Over                                      | Reason                                                                                            |
| --- | --------------------- | --------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| D1  | Core fix              | **Drop preview-on-PR** (readplace pattern)    | read-only role split · required reviewers | public repo ⇒ no private preview in CI; solo + local preview ⇒ comment redundant; simpler + safer |
| D2  | Deploy trust          | **`environment:production`**                  | plain `master` ref                        | two independent gates (GitHub env branch-rule + IAM trust); ~zero friction                        |
| D3  | Passphrase in preview | drop it                                       | —                                         | **moot** — no preview job remains                                                                 |
| D4  | Agent-net trigger     | **destructive + exposure**                    | destructive-only · any-diff               | high-signal, low-noise                                                                            |
| D5  | Agent-net location    | **both** (PR checklist + Jira mandatory task) | one or the other                          | PR gate has CI teeth; Jira surfaces it in tracking                                                |
| D6  | Agent-net enforcement | **AGENTS.md rule + CI gate**                  | rule-only                                 | turns the soft obligation into a hard gate                                                        |
| D7  | Hardening             | **H2 + H3 + H4**                              | + H1 · + H5                               | H1 breaks the ~20-min CloudFront create; H5 (harden-runner) deferred                              |
| D8  | Deploy-role `s3:*`    | **leave + follow-up ticket**                  | tighten now                               | no longer PR-exposed; tightening is finicky → its own tested PR                                   |
