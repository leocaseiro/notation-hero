# NH Jira Reorg — Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> API-operations plan (Jira Cloud), not code. Each task = operation → **verify (read-back)** → checkpoint. All writes **idempotent** (check-before-create) and **reversible** (rollback noted). **Hardened 2026-06-16 from ce-doc-review** (data-safety, idempotency, token handling, live-API corrections).

**Goal:** Restructure NH into 9 Components, 4 Releases, ~11 workstream Epics, 15 ordered Sprints (=goals), and Goals — then re-parent/tag issues, executing **Catalog Preview first**.

**Architecture:** REST + Agile + Goals GraphQL on `leocaseiro.atlassian.net`, Basic-auth token in `jira.env`. Scaffolding (additive) lands first; bulk re-parenting (mutates existing issues) is separately confirmed. Spec: `docs/superpowers/specs/2026-06-15-nh-jira-reorg-design.md`.

**Tech Stack:** Jira Cloud REST v3, Agile REST v1, Goals GraphQL; `curl`+`jq`; project NH=`10001`; Scrum board=`2`; Epic-Link field=`customfield_10014`; Sprint field=`customfield_10020`.

**Live-API facts confirmed by review:** re-parent via `fields.parent` WORKS on this CMP; stories also carry `customfield_10014` (Epic Link) → must realign both. `/rest/api/3/search/jql` returns `total:null` + paginates → never trust counts. Sprint id 1 is **board-1-origin** (not board 2); sprint id 4 is board-2. Goal mutations ARE exposed to the token but `goals_create` requires `containerId` (workspace ARI) + `goalTypeId`.

---

## Task 0: Setup, safety preflight & conventions

- [ ] **Step 1: Auth helper (token NEVER on the command line → use `--netrc`)**

```bash
set +a; . /Users/leocaseiro/Sites/notation-hero/jira.env; set +a
BASE="https://leocaseiro.atlassian.net"
NETRC=$(mktemp); chmod 600 "$NETRC"
printf 'machine leocaseiro.atlassian.net login %s password %s\n' "$JIRA_EMAIL" "$JIRA_TOKEN" > "$NETRC"
jira(){ curl -sS --netrc-file "$NETRC" -H "Content-Type: application/json" -H "Accept: application/json" "$@"; }
trap 'rm -f "$NETRC"' EXIT
jira "$BASE/rest/api/3/myself" | jq -r '.displayName'   # expect: Leo Caseiro
```

- [ ] **Step 2: Token-safety preflight (abort if any fail)**

```bash
git check-ignore -q jira.env && echo "jira.env ignored OK" || { echo "ABORT: jira.env NOT git-ignored"; exit 1; }
RUNLOG=/tmp/nh-reorg-run-log.md   # run-log lives OUTSIDE the repo (never committed)
echo "# NH reorg run-log $(date -u)" > "$RUNLOG"
```

- [ ] **Step 3: BASELINE EXPORT (restore point — do this before ANY write)**

```bash
# Full mutable state of every NH issue → timestamped JSON baseline (the restore point)
jira "$BASE/rest/api/3/search/jql" -X POST -d '{"jql":"project=NH","fields":["summary","parent","customfield_10014","fixVersions","components","labels","customfield_10020","status"],"maxResults":100}' > /tmp/nh-baseline-p1.json
# paginate with nextPageToken until isLast:true (search/jql has NO total) — repeat for each page
cp /tmp/nh-baseline-*.json docs/superpowers/specs/ 2>/dev/null || true   # OPTIONAL: keep a copy (review for secrets before commit)
```

- [ ] **Step 4: Conventions**
  - **DRY_RUN:** every mutating loop honors `DRY_RUN=1` → prints the intended method+URL+body instead of sending. Do a dry run of each phase first.
  - **Idempotent:** before any create (component, version, epic, **sprint**, **goal**) GET the collection and skip-or-reuse by name; log the id.
  - **Counts are unreliable:** for existence/empty checks use `POST /rest/api/3/search/approximate-count` (`{"count":N}`) or `maxResults=1` + `.issues==[]`; for "expect N" verifies, paginate `nextPageToken` until `isLast:true`. NEVER trust `.total` or one page's `.issues|length`.
  - **Per-call error handling:** capture HTTP status (`-w '%{http_code}'` / `--fail-with-body`); abort the loop on non-2xx (201 create / 204 update), log the failing key; back off + retry on 429.
  - **Merge, don't clobber:** when setting `fixVersions`/`components`, READ existing first and append (don't replace) unless the baseline shows empty.
  - **Rollback:** components/versions → DELETE by id; epics/NH-1 → transition to Cancelled (archive), not delete; re-parent → PUT `parent`+`customfield_10014` back from the baseline; goals → delete-goal mutation or UI. Exclusive access during the run (no concurrent UI edits).

---

## Task 1: Components (9) — additive, idempotent

- [ ] **Step 1:** `jira "$BASE/rest/api/3/project/NH/components" | jq -r '.[].name'` (skip existing).
- [ ] **Step 2:** create each missing of `Catalog/CMS, Player, Notation-render, MIDI, Scoring, Infra/AWS, CI-CD/Tooling, Observability, Design-system` via `POST /rest/api/3/component {"name":..,"project":"NH"}` (honor DRY_RUN).
- [ ] **Step 3:** verify 9 exist; append `id\tname` to `$RUNLOG`.

## Task 2: Releases (4) — additive, idempotent

- [ ] **Step 1:** `jira "$BASE/rest/api/3/project/NH/versions" | jq -r '.[].name'` (skip existing).
- [ ] **Step 2:** create each of `Catalog Preview, Alpha / EAP, Beta, M1` via `POST /rest/api/3/version {"name":..,"projectId":10001,"released":false}`.
- [ ] **Step 3:** verify 4; append ids to `$RUNLOG`.

## Task 3: Workstream Epics (9 new; reuse NH-14, NH-15)

Reuse **NH-14** Design (sprints 2,3,14), **NH-15** Local play (sprint 7). Create:

| Epic | Sprint(s) | AWS-track? |
|---|---|---|
| Foundation & CI/CD | 1 | — |
| Catalog/CMS & Infra | **4 only** | ✅ (Lambda·S3·CF·Pulumi) |
| Player & Notation | 5 | — |
| Scoring, MIDI & Progress | 7, 9 | ✅ (DynamoDB @9) |
| Observability & SRE | 6, 12 | ✅ |
| AWS Messaging & Analytics | 7b, 11 | ✅ |
| Auth & Accounts (incl. upload) | 8, **10** | ✅ (Cognito·S3) |
| Offline Sync | 13 | ✅ |
| Native & Platform | 15 | — |

*(Fix from review: sprint-10 "User upload" now under **Auth & Accounts**, not Catalog. AWS-track epics marked so Task 5 goal-linking is explicit.)*

- [ ] **Step 1:** list existing epics (idempotency). **Step 2:** create the 9 (honor DRY_RUN). **Step 3:** verify + log keys.

## Task 4: Sprints (15) on board 2 — reconcile carefully

> 🚦 The two existing **active** sprints are handled per Leo's decision (see the execution-gate question). Sprint **id 1 is board-1-origin**; **id 4 is board-2**. Do NOT close an active sprint until its issues are explicitly re-homed; closing is irreversible via API.

- [ ] **Step 1:** read both: `jira "$BASE/rest/agile/1.0/sprint/{1,4}" | jq '{id,name,state,originBoardId}'` and **dump their issue lists + statuses** to `$RUNLOG`.
- [ ] **Step 2:** apply the **chosen reconciliation** (migrate-then-close / leave-active / rename-id-4) — PUT-rename via `PUT /rest/agile/1.0/sprint/{id} {"name":..}` (NOT POST). Do not rename id 1 to a name that collides with a freshly-created sprint.
- [ ] **Step 3 (idempotent):** read `board/2/sprint`, build name→id set; create only the **missing** of the 15 `N · …` sprints via `POST /rest/agile/1.0/sprint {"name":..,"originBoardId":2}` (future state). Skip-or-reuse by name. **Step 4:** verify 15; log ids.

## Task 5: Goals + link (Goals GraphQL)

- [ ] **Step 1: resolve required inputs** — introspect `goals_create` / link mutation names AND their input types; resolve the workspace **`containerId`** (org→cloudId→workspace ARI) and a valid **`goalTypeId`** (`goals_goalTypes`). Without both, create fails. Log them.
- [ ] **Step 2 (idempotent):** query existing goals by name; create only missing — 2 parents (`AWS interview-ready`, `Ship Notation Hero v1`) + 15 sprint goals — passing `{containerId, name, goalTypeId}`. Log each ARI immediately (resumable). Add goals to the rollback list.
- [ ] **Step 3:** link each sprint's epic → its sprint goal; link the AWS-track sprint goals (sprints 4,7b,8,9,10,11,12,13 per Task 3 table) → `AWS interview-ready`; product ones → `Ship Notation Hero v1`. Verify via `getTeamworkGraphContext` on one epic.
- **Fallback:** if any required id can't be resolved, create the ~17 goals in the Atlassian Home UI and link via the issue Goals field; log that API was unavailable.

## Task 6: Catalog Preview — re-parent + tag + sprint-assign (🚦 CONFIRM GATE)

Issue→target map (sprints 1–4): **S1 Foundation** → Foundation&CI/CD / CI-CD-Tooling: NH-119,80,83,89,91,93,96,98,104,125,25 · **S2 Wireframes** → NH-14 / Design-system: NH-133,134,116 · **S3 Temp DS** → NH-14 / Design-system: *(read NH-14 children at run time to confirm keys)* · **S4 Catalog+infra** → Catalog/CMS&Infra: NH-126,79,123,122,118,117 (Catalog/CMS) + NH-107,110,121 (Infra/AWS). All → release `Catalog Preview`.

- [ ] **Step 1: snapshot** each issue's FULL mutable state (`parent,customfield_10014,fixVersions,components,labels,customfield_10020`) to `$RUNLOG` — the per-issue restore record.
- [ ] **Step 2: re-parent + realign Epic Link + merge tags** (DRY_RUN first):

```bash
# per issue — set parent AND epic-link together; append (not replace) fixVersions/components after reading existing:
jira -X PUT "$BASE/rest/api/3/issue/NH-126" -d '{"fields":{
  "parent":{"key":"<epicKey>"},
  "customfield_10014":"<epicKey>",
  "fixVersions":[<existing...>,{"id":"<CatalogPreviewId>"}],
  "components":[<existing...>,{"id":"<componentId>"}]
}}'   # expect 204; abort loop on non-2xx
```

- [ ] **Step 3:** add issues to their sprint via `POST /rest/agile/1.0/sprint/<id>/issue {"issues":[...]}` (expect 204).
- [ ] **Step 4: diff-verify vs baseline** — re-dump the same fields; assert each issue gained the intended parent/epic-link/version/sprint AND that **no pre-existing fixVersion/component was lost** (diff against `/tmp/nh-baseline-*.json`). Flag any unintended change.

## Task 7: Cleanup (🚦 CONFIRM)

- [ ] **NH-1:** check emptiness with `approximate-count` over `parent=NH-1 OR "Epic Link"=NH-1` (NOT `.issues|length`); if truly empty, **transition to Cancelled (archive), not hard-delete** (irreversible on free tier).
- [ ] Old milestone-epics **NH-6..NH-13:** after their stories are re-parented (later phases), transition to Cancelled / relabel "(archived milestone)". Keep NH-14, NH-15.

## Task 8+: Alpha / Beta / M1 phases

Same hardened procedure as Task 6, per spec §6, one release at a time (snapshot → dry-run → re-parent+epic-link+merge → sprint-assign → diff-verify). Confirm before each.
- **Alpha** sprints 5,6,7,7b · **Beta** 8–12 · **M1** 13–15. (Clarify sprint-7b "NH-51 part" key at run time.)

## Task 9: Credential hygiene (after all phases)

- [ ] Revoke/rotate the API token at id.atlassian.com → Security → API tokens once the reorg is done (it is full-account scope). Regenerate only when next needed.

## Self-Review

Coverage: components/releases/epics/sprints/goals/re-parent/cleanup all present + hardened. Review findings applied: baseline export + DRY_RUN (P0), count-safe checks (P0), sprint id-1/board-1 + PUT-rename + no-blind-close (P0), sprint/goal idempotency (P0), snapshot+merge+epic-link on re-parent (P0/P2), per-call error handling (P1), goals containerId/goalTypeId (P1), token via netrc + run-log out-of-repo + tracked-gitignore + rotation (P1/P2), Catalog-epic=sprint-4 + AWS-track tagging (P1/P2), diff-verify (P2). **Open (Leo's call):** active-sprint reconciliation + board-1 scope.
