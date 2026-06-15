# NH Jira Reorg — Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> This is an **API-operations plan** (Jira Cloud), not code. Each task = operation → **verify (read-back)** → checkpoint. All writes are **idempotent** (check-before-create) and **reversible** (rollback noted).

**Goal:** Restructure the NH Jira project into a whole-project structure — 9 Components, 4 Releases, ~11 workstream Epics, 15 ordered Sprints (=goals), and Goals — then re-parent/tag issues, executing **Catalog Preview first**.

**Architecture:** Pure REST + Agile + Goals GraphQL against `leocaseiro.atlassian.net`, Basic-auth with the token in `jira.env`. Scaffolding (additive, safe) lands first; bulk re-parenting (mutates existing issues) is a later, separately-confirmed phase. Spec: `docs/superpowers/specs/2026-06-15-nh-jira-reorg-design.md`.

**Tech Stack:** Jira Cloud REST v3 (`/rest/api/3`), Agile REST (`/rest/agile/1.0`), Goals GraphQL (`/gateway/api/graphql`); `curl` + `jq`; project NH = id `10001`; Scrum board = id `2`.

---

## Task 0: Setup, conventions & safety

**Files:**
- Create: `docs/superpowers/plans/2026-06-16-nh-reorg-run-log.md` (append-only log of created IDs + actions, for traceability + rollback)

- [ ] **Step 1: Auth helper (every shell that hits Jira sources this)**

```bash
set +a; . /Users/leocaseiro/Sites/notation-hero/jira.env; set +a
EMAIL="$JIRA_EMAIL"; TOKEN="$JIRA_TOKEN"; BASE="https://leocaseiro.atlassian.net"
jira(){ curl -sS -u "$EMAIL:$TOKEN" -H "Content-Type: application/json" -H "Accept: application/json" "$@"; }
# verify: should print your account
jira "$BASE/rest/api/3/myself" | jq -r '.displayName + " / " + .accountId'
```
Expected: `Leo Caseiro / 557058:5a008315-8d06-4398-87ff-5221e3d2d591`

- [ ] **Step 2: Conventions (apply to every task below)**
  - **Idempotent:** before any create, GET the collection and skip if a same-named item exists; capture the returned `id` to the run-log.
  - **Verify:** after each create/update, read it back and assert the field.
  - **Rollback:** components/versions → DELETE by id; epics → transition to Cancelled or delete; re-parent → PUT `parent` back to the milestone epic (log the old parent before changing).
  - **No `--no-verify`, no force.** Bulk writes run only after the per-phase confirmation gate.

---

## Task 1: Create Components (9) — additive

**Verify-first list:** `Catalog/CMS, Player, Notation-render, MIDI, Scoring, Infra/AWS, CI-CD/Tooling, Observability, Design-system`

- [ ] **Step 1: List existing components (idempotency)**

Run: `jira "$BASE/rest/api/3/project/NH/components" | jq -r '.[].name'`
Expected: empty (0) on first run.

- [ ] **Step 2: Create each missing component**

```bash
for C in "Catalog/CMS" "Player" "Notation-render" "MIDI" "Scoring" "Infra/AWS" "CI-CD/Tooling" "Observability" "Design-system"; do
  jira -X POST "$BASE/rest/api/3/component" -d "{\"name\":\"$C\",\"project\":\"NH\"}" \
    | jq -r '"created component \(.id): \(.name)"'
done
```

- [ ] **Step 3: Verify + log**

Run: `jira "$BASE/rest/api/3/project/NH/components" | jq -r '.[] | "\(.id)\t\(.name)"' | tee -a docs/superpowers/plans/2026-06-16-nh-reorg-run-log.md`
Expected: 9 rows. Keep this id↔name map — re-parenting needs component ids.

---

## Task 2: Create Releases (4) — additive

Names (rename later if desired): `Catalog Preview`, `Alpha / EAP`, `Beta`, `M1`.

- [ ] **Step 1: List existing versions**

Run: `jira "$BASE/rest/api/3/project/NH/versions" | jq -r '.[].name'`
Expected: empty on first run.

- [ ] **Step 2: Create each**

```bash
for V in "Catalog Preview" "Alpha / EAP" "Beta" "M1"; do
  jira -X POST "$BASE/rest/api/3/version" -d "{\"name\":\"$V\",\"projectId\":10001,\"released\":false}" \
    | jq -r '"created version \(.id): \(.name)"'
done
```

- [ ] **Step 3: Verify + log**

Run: `jira "$BASE/rest/api/3/project/NH/versions" | jq -r '.[] | "\(.id)\t\(.name)"' | tee -a docs/superpowers/plans/2026-06-16-nh-reorg-run-log.md`
Expected: 4 rows. Keep version ids.

---

## Task 3: Create workstream Epics (9 new; reuse NH-14, NH-15)

Reuse: **NH-14** "Design — App UI/UX" (sprints 2,3,14), **NH-15** "Local play" (sprint 7). Create these 9:

| Epic summary | Sprints it serves |
|---|---|
| Foundation & CI/CD | 1 |
| Catalog/CMS & Infra | 4, 10 |
| Player & Notation | 5 |
| Scoring, MIDI & Progress | 7, 9 |
| Observability & SRE | 6, 12 |
| AWS Messaging & Analytics | 7b, 11 |
| Auth & Accounts | 8 |
| Offline Sync | 13 |
| Native & Platform | 15 |

- [ ] **Step 1: List existing epics (idempotency)**

Run: `jira "$BASE/rest/api/3/search/jql" -X POST -d '{"jql":"project=NH AND issuetype=Epic","fields":["summary"],"maxResults":100}' | jq -r '.issues[]? | "\(.key)\t\(.fields.summary)"'`
Expected: the 11 current epics (NH-1, NH-6..NH-15). Confirm none already match the 9 new summaries.

- [ ] **Step 2: Create each new epic**

```bash
for S in "Foundation & CI/CD" "Catalog/CMS & Infra" "Player & Notation" "Scoring, MIDI & Progress" "Observability & SRE" "AWS Messaging & Analytics" "Auth & Accounts" "Offline Sync" "Native & Platform"; do
  jira -X POST "$BASE/rest/api/3/issue" \
    -d "{\"fields\":{\"project\":{\"key\":\"NH\"},\"issuetype\":{\"name\":\"Epic\"},\"summary\":\"$S\"}}" \
    | jq -r '"created epic \(.key): '"$S"'"'
done
```

- [ ] **Step 3: Verify + log**

Run the Step-1 search again; expect 9 new epic keys. Append `key↔summary` to the run-log. Keep the epic keys — re-parenting needs them.

**Rollback:** `jira -X PUT "$BASE/rest/api/3/issue/NH-<key>" -d '{"update":{...}}'` to Cancelled transition, or DELETE if empty.

---

## Task 4: Reconcile + create the 15 Sprints (board 2)

Board 2 ("NH board") is **scrum**. It already has `sprint 1` and `sprint 4`, both named "CI/CD Setup", state **active**.

- [ ] **Step 1: Read existing sprints**

Run: `jira "$BASE/rest/agile/1.0/board/2/sprint" | jq -r '.values[] | "\(.id)\t\(.name)\t\(.state)"'`
Expected: the two "CI/CD Setup" active sprints (ids 1, 4).

- [ ] **Step 2: Rename one, close the duplicate**

Rename sprint id 1 → `1 · Foundation` (PUT), and the dup (id 4) → either repurpose to `4 · Catalog + infra` or close it. Do NOT delete an active sprint with issues without checking contents first:
```bash
jira "$BASE/rest/agile/1.0/sprint/4/issue" | jq -r '.issues | length'   # how many issues in the dup
jira -X POST "$BASE/rest/agile/1.0/sprint" -d '{"name":"1 · Foundation","originBoardId":2}'  # OR PUT to rename id 1
```
(Decision at execution: rename in place vs create-fresh + close dupes. Log the choice.)

- [ ] **Step 3: Create the remaining sprints in order**

```bash
for N in "2 · Wireframes" "3 · Temp design system" "4 · Catalog + infra" "5 · Player" "6 · Sentry (FE)" "7 · Local play + score" "7b · Thin SQS+SNS" "8 · Auth" "9 · Score history" "10 · User upload" "11 · Messaging + analytics" "12 · Deep SRE" "13 · Offline sync" "14 · Better UI" "15 · Native"; do
  jira -X POST "$BASE/rest/agile/1.0/sprint" -d "{\"name\":\"$N\",\"originBoardId\":2}" | jq -r '"created sprint \(.id): \(.name)"'
done
```

- [ ] **Step 4: Verify + log** — re-read board sprints; expect 15 ordered; append id↔name to run-log.

**Note:** future sprints are created in `future` state (correct). Don't start/activate more than your board allows.

---

## Task 5: Create Goals + link (Goals GraphQL)

> ⚠️ **Schema unknown:** endpoint + token verified, but the exact `createGoal` / link-work-item mutation names are NOT yet confirmed. **Step 1 introspects first.**

- [ ] **Step 1: Introspect the goals mutations (named operation required)**

```bash
jira -X POST "$BASE/gateway/api/graphql" -d '{"query":"query Introspect { __schema { mutationType { fields { name } } } }"}' \
  | jq -r '.data.__schema.mutationType.fields[].name' | grep -iE "goal" 
```
Expected: mutation names containing "goal" (create/update/link). Capture exact names + required args (introspect their input types next).

- [ ] **Step 2: Create the 2 parent goals + 15 sprint goals**
Parent: `AWS interview-ready`, `Ship Notation Hero v1`. Sprint goals = the 15 sprint names (outcome phrasing). Use the mutation discovered in Step 1. Log goal ARIs.

- [ ] **Step 3: Link each sprint's epic to its sprint goal**, and AWS sprint goals (4,7b,8,9,10,11,12,13) → parent `AWS interview-ready`; product goals → `Ship Notation Hero v1`. Use the link-work-item / parent-goal mutation. Verify via `getTeamworkGraphContext` on one epic.

**Fallback:** if introspection shows goal mutations are not exposed to API tokens, create the ~17 goals in the **Atlassian Home UI** (small N) and link via the issue Goals field; log that the API path was unavailable.

---

## Task 6: Catalog Preview — re-parent + tag + sprint-assign (CONFIRM GATE before running)

> 🚦 This is the first **mutating** batch. Run only after Leo confirms. Logs old parent of each issue before changing (rollback).

**Issue → target map (sprints 1–4):**

| Issue(s) | Epic | Component | Release | Sprint |
|---|---|---|---|---|
| NH-119, NH-80, NH-83, NH-89, NH-91, NH-93, NH-96, NH-98, NH-104, NH-125, NH-25 | Foundation & CI/CD | CI-CD/Tooling | Catalog Preview | 1 · Foundation |
| NH-133, NH-134, NH-116 | NH-14 (Design) | Design-system | Catalog Preview | 2 · Wireframes |
| (design-system tokens stories — confirm keys) | NH-14 (Design) | Design-system | Catalog Preview | 3 · Temp design system |
| NH-126, NH-79, NH-123, NH-122, NH-118, NH-117 | Catalog/CMS & Infra | Catalog/CMS | Catalog Preview | 4 · Catalog + infra |
| NH-107, NH-110, NH-121 | Catalog/CMS & Infra | Infra/AWS | Catalog Preview | 4 · Catalog + infra |

- [ ] **Step 1: For each issue — log current parent (rollback safety)**

```bash
for K in NH-119 NH-80 ... ; do jira "$BASE/rest/api/3/issue/$K?fields=parent" \
  | jq -r '"\(.key)\told_parent=\(.fields.parent.key // "none")"' | tee -a docs/superpowers/plans/2026-06-16-nh-reorg-run-log.md; done
```

- [ ] **Step 2: Re-parent + set fixVersion + components** (substitute real epic key + version id + component id captured in Tasks 1–3)

```bash
# template — one issue:
jira -X PUT "$BASE/rest/api/3/issue/NH-126" -d '{"fields":{
  "parent":{"key":"NH-<CatalogEpic>"},
  "fixVersions":[{"id":"<CatalogPreviewVersionId>"}],
  "components":[{"id":"<CatalogCmsComponentId>"}]
}}'   # 204 No Content = success
```

- [ ] **Step 3: Add each issue to its sprint**

```bash
jira -X POST "$BASE/rest/agile/1.0/sprint/<sprintId>/issue" -d '{"issues":["NH-126","NH-79","NH-123","NH-122","NH-118","NH-117","NH-107","NH-110","NH-121"]}'  # 204 = success
```

- [ ] **Step 4: Verify the whole release**

```bash
jira "$BASE/rest/api/3/search/jql" -X POST -d '{"jql":"project=NH AND fixVersion=\"Catalog Preview\" ORDER BY parent","fields":["summary","parent","components","customfield_10020"],"maxResults":100}' \
  | jq -r '.issues[] | "\(.key)\t\(.fields.parent.key // "-")\t\(.fields.summary)"'
```
Expected: every sprint 1–4 issue shows the right epic parent; counts match the map.

---

## Task 7: Cleanup (CONFIRM)

- [ ] **Step 1:** Delete junk epic **NH-1** (verify empty first): `jira "$BASE/rest/api/3/search/jql" -X POST -d '{"jql":"parent=NH-1"}' | jq '.issues|length'` → if 0, delete.
- [ ] **Step 2:** Old milestone-epics **NH-6..NH-13** — after their stories are re-parented (later phases), transition to Cancelled or relabel "(archived milestone)". Keep NH-14, NH-15.

---

## Task 8+: Alpha / Beta / M1 phases (detailed when each nears)

Same procedure as Task 6, per the spec's sprint table (spec §6), one release at a time:
- **Alpha / EAP** — sprints 5, 6, 7, 7b (Player port NH-90/88/86/102/84/101/103/105; Sentry NH-124; Local play NH-15/97/92/50; thin SQS/SNS).
- **Beta** — sprints 8–12 (Auth NH-45; Score history NH-120/58/77/74/99; Upload NH-49; Messaging NH-54/51/31; Deep SRE NH-52).
- **M1** — sprints 13–15 (Sync NH-44; Better UI NH-14/108/82; Native NH-46/47/48/78/128/129/130).

Each phase: log-old-parent → re-parent+tag → sprint-assign → verify release. Confirm before running each.

---

## Self-Review

- **Spec coverage:** components (✓ Task 1), releases incl. Catalog Preview (✓ Task 2), 11 epics (✓ Task 3), 15 sprints (✓ Task 4), goals + parents + linking (✓ Task 5), re-parent/tag/sprint (✓ Task 6 + Task 8), cleanup (✓ Task 7), fork-port + native are issue *content* (out of scope for the Jira-structure plan — tracked as the issues themselves).
- **Known unknown flagged:** Goals mutation schema (Task 5 Step 1 introspects; UI fallback documented).
- **Idempotency + rollback:** every create checks-existing; every re-parent logs old parent.
- **Gaps:** sprint-3 "Temp design system" exact issue keys unconfirmed (Task 6 flags "confirm keys") — resolve by reading NH-14 children at execution.
