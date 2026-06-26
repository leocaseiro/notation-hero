# NH-197 — Playwright e2e lane + traces in CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Playwright end-to-end (e2e) lane that runs against the built SPA with `/api/catalog` mocked by MSW, and wire it into CI as a blocking gate that uploads traces + the HTML report so a failed run is replayable via `npx playwright show-trace`.

**Architecture:** A second, isolated Playwright config (`playwright.e2e.config.ts`) drives a `vite preview` server (the production build) — separate from the existing `playwright.config.ts` that drives Storybook for VR/a11y. MSW (via the official `@msw/playwright` bridge) intercepts network at Playwright's `context.route` layer and is the sole source of `/api/*` data under preview (preview does **not** honor Vite's dev-only `server.proxy`). A new `e2e` CI job mirrors the `a11y` job (ubuntu + on-demand Chromium), is registered in the `ci-green` aggregate gate, and uploads `playwright-report/` + `test-results/` with `if: ${{ !cancelled() }}` so flaky-then-passed traces are kept.

**Tech Stack:** Playwright `@playwright/test@1.61.1` (already present), `msw@2.14.6`, `@msw/playwright@0.6.7`, Vite 8 (`build` + `preview`), pnpm workspaces, GitHub Actions.

## Global Constraints

_Every task's requirements implicitly include this section._

- **Dependency pins (exact, no caret):** `msw@2.14.6`, `@msw/playwright@0.6.7`. `@playwright/test` stays at its current `^1.61.1`. Before ever bumping `@msw/playwright` past `0.6.7`, manually review the changelog/npm diff (pre-1.0; osv advisory lag).
- **Action SHA-pinning:** every GitHub Action is pinned to a commit SHA with a trailing `# vN` comment — never a mutable tag. `actions/upload-artifact` v4 = `ea165f8d65b6e75b540449e92b4886f43607fa02` (v4.6.2, resolved 2026-06-26).
- **Trace policy (D5):** `trace: 'on-first-retry'`; upload step uses `if: ${{ !cancelled() }}` (NOT `if: failure()`), 7-day retention, `if-no-files-found: ignore`.
- **MSW loud-failure:** the fixture uses `onUnhandledRequest: 'error'` so a mock miss fails at the network layer, not as a vague assertion.
- **Least privilege:** the workflow stays `permissions: contents: read`. Only if the upload step is denied (403) add a **job-scoped** `permissions: { contents: read, actions: write }` to the `e2e` job — never workflow-level.
- **Formatting:** Prettier with semicolons, single quotes, trailing commas, `printWidth: 100`. ESLint enforces formatting in `client/`. Markdown is Prettier-formatted too.
- **Naming / layout guard:** e2e test files use the `*.e2e.ts` suffix and live under `client/e2e/` (sidesteps `check-layout.sh` Rule 3, which only fires on `*.test.*`/`*.spec.*`, and the Vitest matcher `src/**/*.{test,spec}.{ts,tsx}`). The `client/e2e/mocks/` dir is allowed (only `__mocks__/` is banned, not `mocks/`).
- **Never bypass hooks:** no `--no-verify`. Commit at every green checkpoint.

---

## File Structure

```
client/
  playwright.config.ts            # EXISTING — VR + a11y vs Storybook (UNCHANGED)
  playwright.e2e.config.ts        # NEW — e2e vs the built app (vite preview on :4173)
  package.json                    # MODIFY — add msw + @msw/playwright devDeps; add test:e2e scripts
  e2e/
    smoke.e2e.ts                  # NEW — placeholder smoke test = the reusable template
    mocks/
      handlers.ts                 # NEW — MSW request handlers (typed; mirrors CatalogResponse)
.github/workflows/ci.yml          # MODIFY — add `e2e` job + 4 ci-green wiring edits
AGENTS.md                         # MODIFY — add e2e bullet + an e2e subsection (show-trace)
client/README.md                  # MODIFY — add test:e2e scripts rows + e2e debugging note
pnpm-lock.yaml                    # MODIFY (generated) — `pnpm install` after the dep add
docs/plans/2026-06-26-001-feat-nh-197-e2e-traces-plan.md  # THIS FILE
```

No change needed: `client/.gitignore` already ignores `test-results` + `playwright-report`; `client/vite.config.ts` Vitest `include` already excludes `client/e2e/`.

**Task → deliverable map:**

- **Task 1** — the e2e lane runs green locally (`pnpm --filter @notation-hero/client run test:e2e`). Produces: the two `client/e2e/` files, the e2e config, the deps, the `test:e2e`/`test:e2e:ui` scripts.
- **Task 2** — CI runs the lane as a blocking gate and uploads artifacts. Consumes Task 1's `test:e2e` script and its `client/playwright-report/` + `client/test-results/` output paths.
- **Task 3** — docs explain how to run e2e and debug a CI failure via traces. Consumes the script names + the `show-trace` command.

---

## Task 1: Stand up the e2e lane (green locally)

**Files:**

- Modify: `client/package.json` (add 2 devDeps + 2 scripts)
- Create: `client/e2e/mocks/handlers.ts`
- Create: `client/playwright.e2e.config.ts`
- Create: `client/e2e/smoke.e2e.ts`
- Modify (generated): `pnpm-lock.yaml`

**Interfaces:**

- Produces:
  - npm scripts `test:e2e` = `playwright test --config=playwright.e2e.config.ts` and `test:e2e:ui` = same `+ --ui`, both in `@notation-hero/client`.
  - `export const handlers` (array of MSW request handlers) from `client/e2e/mocks/handlers.ts`.
  - Output dirs (relative to `client/`): `playwright-report/` (HTML report) and `test-results/` (traces) — consumed by Task 2's upload step.
- Consumes: existing app routes (`/` → `Home`, `/about` → `About`), the nav `<Link to="/about">About</Link>` in `client/src/routes/__root.tsx`, and the live `/api/catalog` fetch in `client/src/components/About.tsx`.

---

- [ ] **Step 1: Add the dependencies and scripts to `client/package.json`**

In the `"scripts"` block, add these two lines immediately after the `"test:a11y"` line:

```jsonc
    "test:e2e": "playwright test --config=playwright.e2e.config.ts",
    "test:e2e:ui": "playwright test --config=playwright.e2e.config.ts --ui",
```

In `"devDependencies"`, add these two entries (keep the block alphabetically sorted — `@msw/playwright` sorts under `@m…` after `@babel/core`/`@axe-core`, and `msw` sorts under the unscoped names near `jsdom`). Exact pins, no caret:

```jsonc
    "@msw/playwright": "0.6.7",
```

```jsonc
    "msw": "2.14.6",
```

> Placement detail: `@msw/playwright` goes in the `@…` scoped group (e.g. right after `"@babel/core"`); `msw` goes in the unscoped group (e.g. right after `"jsdom"`). syncpack (`pnpm run syncpack`) is a CI gate — exact pins are fine; it flags version _mismatches_ across packages, and these deps exist only in `client`.

- [ ] **Step 2: Install so the lockfile updates**

Run (from repo root):

```bash
pnpm install
```

Expected: resolves and writes `pnpm-lock.yaml` with `msw@2.14.6` + `@msw/playwright@0.6.7`. `@msw/playwright`'s peer dep is `msw@^2.12.10` — `2.14.6` satisfies it, so no peer warning.

- [ ] **Step 3: Confirm the `@msw/playwright` fixture API against the installed types**

Run:

```bash
cat client/node_modules/@msw/playwright/build/index.d.mts
```

Expected (verified against the published v0.6.7 declarations): `defineNetworkFixture(options)` where `options` is `{ context: BrowserContext; handlers?: AnyHandler[]; onUnhandledRequest?: UnhandledRequestStrategy; skipAssetRequests?: boolean /* default true */ }`, returning a `NetworkFixture` with `.enable(): Promise<void>` and `.disable(): Promise<void>` (plus MSW `SetupApi` methods like `.use()`). If the signature differs, adjust Step 6's fixture wiring to match the installed types before proceeding.

- [ ] **Step 4: Create the MSW handlers**

Create `client/e2e/mocks/handlers.ts`:

```ts
import { http, HttpResponse } from "msw";

// Mirrors the server's CatalogResponse (server/src/modules/catalog/catalog.controller.ts),
// hand-synced for Phase 1. Phase 2: type this against the shared oRPC contract via
// InferRouterOutputs<typeof contract>['catalog']['list'] so drift becomes a compile error.
interface CatalogPlayable {
  id: string;
  title: string;
  kind: "song" | "pattern" | "lesson";
  difficulty: string;
}

interface CatalogResponse {
  items: CatalogPlayable[];
  count: number;
}

const catalog: CatalogResponse = {
  count: 1,
  items: [
    {
      id: "single-stroke-roll",
      title: "Single Stroke Roll",
      kind: "pattern",
      difficulty: "Debut",
    },
  ],
};

// Wildcard origin (`*/api/catalog`) so matching does not depend on referer-based relative-URL
// resolution — robust regardless of how the request URL is formed.
export const handlers = [
  http.get("*/api/catalog", () => HttpResponse.json(catalog)),
];
```

- [ ] **Step 5: Create the e2e Playwright config**

Create `client/playwright.e2e.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

// Separate from playwright.config.ts (which boots Storybook for VR/a11y). This lane runs the
// built app via `vite preview`, so trace/HTML reporting is scoped to e2e only.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.{ts,tsx}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Record a trace on the retry of a first-failed test (D5). With retries:2 in CI a failure
  // produces a replayable trace; the CI upload step uses `if: !cancelled()` so the trace is kept
  // even when the retry passes (a flaky run we still want to debug).
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  reporter: [["html"], ["list"]],
  // `vite preview` serves ONLY the static production build — it does NOT honor `server.proxy`
  // (that is dev-only). So `/api/*` has no backend here; MSW is the sole source of catalog data.
  // `--strictPort` fails loudly on a port collision instead of serving a stale app. Timeout
  // covers a cold `vite build` + preview boot on a CI runner. Playwright runs this command with
  // cwd = the config's directory (client/), so `pnpm build`/`pnpm preview` hit the client package.
  webServer: {
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 6: Write the smoke test (the reusable template)**

Create `client/e2e/smoke.e2e.ts`:

```ts
import { test as testBase, expect } from "@playwright/test";
import { defineNetworkFixture, type NetworkFixture } from "@msw/playwright";
import { handlers } from "./mocks/handlers";

interface Fixtures {
  network: NetworkFixture;
}

// MSW intercepts via Playwright's network layer (context.route). `onUnhandledRequest: 'error'`
// makes any unmocked /api/* call fail loudly; `skipAssetRequests` (default true) lets the app's
// own HTML/JS/CSS through. `auto: true` enables the mock for every test without naming the fixture.
const test = testBase.extend<Fixtures>({
  network: [
    async ({ context }, use) => {
      const network = defineNetworkFixture({
        context,
        handlers,
        onUnhandledRequest: "error",
      });
      await network.enable();
      await use(network);
      await network.disable();
    },
    { auto: true },
  ],
});

test("home → about via in-app link renders the mocked catalog, clean boot", async ({
  page,
}) => {
  // Register console/page-error capture BEFORE navigation so boot-time failures are caught.
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // 1. Load home and assert it renders.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Notation Hero", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Skeleton ready.")).toBeVisible();

  // 2. Navigate to /about by clicking the in-app <Link> (exercises client-side routing —
  //    the e2e-only value jsdom unit tests cannot see).
  await page.getByRole("link", { name: "About", exact: true }).click();

  // 3. About heading + the MSW-mocked catalog item render (page -> mocked API -> rendered data).
  await expect(
    page.getByRole("heading", { name: "About Notation Hero", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Single Stroke Roll")).toBeVisible();

  // 4. The production build booted clean — no console errors during the journey.
  expect(consoleErrors).toEqual([]);
});
```

- [ ] **Step 7: Run the lane — expect green**

Run (from repo root):

```bash
pnpm --filter @notation-hero/client run test:e2e
```

Expected: Playwright runs `pnpm build && pnpm preview` on :4173, the single smoke test passes (`1 passed`). First run also downloads the Chromium browser if missing — if it errors with "browser not found", run `pnpm --filter @notation-hero/client exec playwright install chromium` once, then re-run.

> If `onUnhandledRequest: 'error'` trips on a static asset (e.g. `favicon.ico`), confirm it's an asset extension — `skipAssetRequests` (default true) should let it through. If a specific extensionless asset trips it, narrow the handler or add the path; do NOT relax `onUnhandledRequest` away from `'error'`.

- [ ] **Step 8: Prove the trace is produced on failure (verification, then revert)**

Temporarily change the Step 6 assertion `'Single Stroke Roll'` to `'Nonexistent Piece'`. Run with CI semantics so retries (and therefore the trace) are active:

```bash
CI=true pnpm --filter @notation-hero/client run test:e2e
ls client/test-results
```

Expected: the test fails, retries, and a `trace.zip` appears under `client/test-results/<test-dir>/`. Open it to confirm the timeline:

```bash
pnpm --filter @notation-hero/client exec playwright show-trace client/test-results/*/trace.zip
```

Then **revert** the assertion back to `'Single Stroke Roll'`.

- [ ] **Step 9: Prove `onUnhandledRequest: 'error'` fails loudly (verification, then revert)**

Temporarily change the handler matcher in `client/e2e/mocks/handlers.ts` from `'*/api/catalog'` to `'*/api/catalogXXX'` (so the real call is unhandled). Run:

```bash
pnpm --filter @notation-hero/client run test:e2e
```

Expected: the test fails at the **network layer** with an MSW unhandled-request error mentioning `GET /api/catalog` — NOT a vague "Could not reach the API" / missing-text assertion. Then **revert** the matcher back to `'*/api/catalog'`.

- [ ] **Step 10: Typecheck + lint the new files**

Run:

```bash
pnpm --filter @notation-hero/client run typecheck
pnpm --filter @notation-hero/client run lint
```

Expected: both pass. (Lint also enforces Prettier formatting on the new `.ts` files.)

- [ ] **Step 11: Confirm the layout guard and unit tests are unaffected**

Run:

```bash
bash tooling/check-layout.sh
pnpm --filter @notation-hero/client run test
```

Expected: layout guard prints "Layout guard OK …" (the `client/e2e/` dir and `*.e2e.ts` files don't trip Rule 1/3). Vitest runs only `src/**/*.{test,spec}.{ts,tsx}` — unchanged pass count, e2e files excluded.

- [ ] **Step 12: Commit**

```bash
git add client/package.json pnpm-lock.yaml client/playwright.e2e.config.ts client/e2e/
git commit -m "test(e2e): stand up Playwright e2e lane with MSW mock + traces (NH-197)"
```

---

## Task 2: Wire the e2e job into CI + the ci-green gate

**Files:**

- Modify: `.github/workflows/ci.yml` (add the `e2e` job; 4 edits to `ci-green`)

**Interfaces:**

- Consumes: Task 1's `test:e2e` script and its `client/playwright-report/` + `client/test-results/` output paths.
- Produces: a blocking `e2e` CI job whose result is enforced by `ci-green`, and a `playwright-e2e-report` artifact.

---

- [ ] **Step 1: Add the `e2e` job**

In `.github/workflows/ci.yml`, insert this job **immediately after the `vr` job block** (after its last line `run: pnpm --filter @notation-hero/client run test:vr`, before the `# Secret scanning …` comment):

```yaml
# End-to-end — Playwright against the built SPA (`vite preview`), with /api/catalog mocked by
# MSW. Models the `a11y` job (ubuntu + on-demand Chromium); unlike `vr` it is not pixel-exact,
# so no Playwright container. Uploads traces + the HTML report so a CI failure is replayable via
# `npx playwright show-trace`. Path-filtered on `code`; blocks merge via ci-green.
e2e:
  needs: changes
  if: ${{ needs.changes.outputs.code == 'true' }}
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
    - uses: ./.github/actions/setup-js
    - name: Install Playwright Chromium
      run: pnpm --filter @notation-hero/client exec playwright install --with-deps chromium
    - name: e2e tests (Playwright vs built app)
      run: pnpm --filter @notation-hero/client run test:e2e
    - name: Upload traces + HTML report
      # NOT `if: failure()` — that would drop the trace of a flaky-then-passed run (D5).
      if: ${{ !cancelled() }}
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
      with:
        name: playwright-e2e-report
        path: |
          client/playwright-report/
          client/test-results/
        retention-days: 7
        if-no-files-found: ignore
```

- [ ] **Step 2: Register `e2e` in the `ci-green` `needs:` list (edit 1 of 4)**

In the `ci-green` job's `needs:` array, add `e2e,` after `vr,`:

```yaml
a11y,
vr,
e2e,
secret-scan,
```

- [ ] **Step 3: Add the `e2e` result variable (edit 2 of 4)**

In the `Verify required jobs passed` run-block, add the `e2e` assignment after the `vrr=` line:

```bash
          vrr="${{ needs.vr.result }}"
          e2e="${{ needs.e2e.result }}"
          s="${{ needs.secret-scan.result }}"
```

- [ ] **Step 4: Add `e2e` to the debug echo (edit 3 of 4)**

Update the `echo` line to include `e2e=$e2e` after `vr=$vrr`:

```bash
          echo "changes=$ch quality=$q build=$b a11y=$acc vr=$vrr e2e=$e2e secret-scan=$s sast=$a deps-cve=$d pr-title=$p pr-checklist=$c"
```

> The spec enumerates three edits (needs, var, loop). This echo update is part of the same variable block — without it the debug line silently omits `e2e`. Including it keeps the printed status consistent with the enforced set.

- [ ] **Step 5: Add `e2e:$e2e` to the verification loop (edit 4 of 4)**

Update the `for job in …` line to include `e2e:$e2e` after `vr:$vrr`:

```bash
          for job in quality:$q build:$b a11y:$acc vr:$vrr e2e:$e2e secret-scan:$s sast:$a deps-cve:$d pr-title:$p pr-checklist:$c; do
```

- [ ] **Step 6: Validate the workflow YAML + the wiring locally**

Run (macOS ships Ruby with YAML; this parses the file and asserts `e2e` appears in all four spots):

```bash
ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml"); puts "YAML OK"'
grep -n 'e2e' .github/workflows/ci.yml
```

Expected: `YAML OK`, and `grep` shows: the `e2e:` job key, the `needs:` entry, the `e2e="${{ needs.e2e.result }}"` var, the `e2e=$e2e` echo, and the `e2e:$e2e` loop entry (plus the job's `test:e2e` run line). Confirm the upload action line reads `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4`.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(e2e): add blocking e2e job with trace/report upload, register in ci-green (NH-197)"
```

---

## Task 3: Document the e2e lane (AGENTS.md + client/README.md)

**Files:**

- Modify: `AGENTS.md` (extend the "VR & a11y testing" section)
- Modify: `client/README.md` (scripts table + an e2e subsection)

**Interfaces:**

- Consumes: the `test:e2e` script name, the `playwright-e2e-report` artifact name, and `npx playwright show-trace`.

---

- [ ] **Step 1: Add the e2e bullet to AGENTS.md's test-layers list**

In `AGENTS.md`, in the `## VR & a11y testing (client/ — Storybook + Playwright)` section, add a fourth bullet after the **VR** bullet (the line ending `Pixel-exact, so baselines are **per-OS**.`):

```markdown
- **e2e** — Playwright against the built SPA (`vite preview`, **not** Storybook), with
  `/api/catalog` mocked by MSW (`*.e2e.ts`, separate `playwright.e2e.config.ts`); the `e2e` CI
  job, **blocks merge**. On failure it uploads traces + the HTML report (D5: `if: !cancelled()`)
  so a CI failure is replayable locally.
```

- [ ] **Step 2: Add an e2e subsection to AGENTS.md**

In `AGENTS.md`, immediately before the `## Setup in a fresh worktree / clone` heading, insert:

````markdown
### e2e tests (Playwright vs the built app)

The e2e lane has its own config (`client/playwright.e2e.config.ts`) and runs against the
production build served by `vite preview` — a different server from the Storybook one VR/a11y use.
Because `vite preview` serves only static files (no dev `server.proxy`), **MSW is the sole source
of `/api/*` data** (`client/e2e/mocks/handlers.ts`); the fixture uses `onUnhandledRequest: 'error'`
so an unmocked API call fails loudly.

```bash
pnpm --filter @notation-hero/client test:e2e       # build -> preview -> run the smoke test
pnpm --filter @notation-hero/client test:e2e:ui    # interactive UI mode
```
````

**Debugging a CI failure (traces):** the `e2e` job uploads a `playwright-e2e-report` artifact on
every non-cancelled run (so flaky-then-passed traces are kept too). Download it from the run's
**Artifacts** section, unzip, then open the trace timeline (DOM snapshots, network, console,
action-by-action):

```bash
npx playwright show-trace path/to/test-results/<test>/trace.zip
```

````

- [ ] **Step 3: Add the e2e rows to the client/README.md scripts table**

In `client/README.md`, in the Scripts table, add these two rows after the `test:a11y` row:

```markdown
| `pnpm --filter @notation-hero/client test:e2e`        | e2e tests (Playwright vs built app, MSW)      |
| `pnpm --filter @notation-hero/client test:e2e:ui`     | e2e tests, interactive UI mode                |
````

- [ ] **Step 4: Add an e2e subsection to client/README.md**

In `client/README.md`, immediately after the `### Accessibility (a11y) tests` subsection (before `### Formatting & linting`), insert:

````markdown
### End-to-end (e2e) tests

Unlike VR/a11y (which run against Storybook), e2e runs against the **built app** served by
`vite preview`, with a **separate config** (`playwright.e2e.config.ts`) and test dir (`e2e/`).

```bash
pnpm --filter @notation-hero/client test:e2e          # build -> preview (:4173) -> smoke test
pnpm --filter @notation-hero/client test:e2e:ui       # interactive UI mode
```

- `vite preview` serves only the static build (no dev `server.proxy`), so **MSW is the sole source
  of `/api/*`** — handlers live in `e2e/mocks/handlers.ts`; the fixture sets
  `onUnhandledRequest: 'error'` so an unmocked API call fails at the network layer.
- The smoke test (`e2e/smoke.e2e.ts`) is the **reusable template**: load a page → navigate via an
  in-app link → assert the MSW-mocked data renders → assert a clean console boot. Copy it for
  future feature tests.

**Debugging a failing e2e (traces):** `trace: 'on-first-retry'` records a replayable timeline. CI
uploads it as the `playwright-e2e-report` artifact (kept even on flaky-then-passed runs). Download,
unzip, then:

```bash
pnpm --filter @notation-hero/client exec playwright show-trace test-results/<test>/trace.zip
```
````

- [ ] **Step 5: Check formatting**

Run (from repo root):

```bash
pnpm exec prettier --check AGENTS.md client/README.md
```

Expected: both report formatted. If Prettier reports drift, run `pnpm exec prettier --write AGENTS.md client/README.md` and re-check.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md client/README.md
git commit -m "docs(e2e): document the e2e lane + trace debugging (NH-197)"
```

---

## Final verification — full local gate (before push)

Run each acceptance-criteria command from repo root and confirm all pass:

- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test`
- [ ] `pnpm run build`
- [ ] `pnpm --filter @notation-hero/client run test:e2e`
- [ ] `bash tooling/check-layout.sh`
- [ ] Plan doc committed (commit this file with Task 1, or as a standalone `docs:` commit first).

## CI verification (requires a push — confirm with Leo first)

The artifact-upload + gating behavior can only be confirmed in GitHub Actions:

1. Push the branch / open the PR → confirm the `e2e` job runs and `ci-green` waits on it.
2. (Optional, on a scratch commit) force a failing assertion → confirm the run uploads the
   `playwright-e2e-report` artifact and that `if: ${{ !cancelled() }}` also fires on a
   flaky-then-passed run. Revert.
3. Confirm `actions/upload-artifact` is not denied under `permissions: contents: read`. If it 403s,
   add a **job-scoped** `permissions: { contents: read, actions: write }` to the `e2e` job only.

**Escape hatch (D3):** if the lane proves flaky and blocks unrelated PRs, the unblock is a one-line
revert of the four `ci-green` edits (the job keeps running, just stops gating). Record this in the
PR description.

---

## Self-review against the spec

- **Acceptance criteria coverage:**
  - `trace: 'on-first-retry'` + `reporter: [['html'], ['list']]` → Task 1 Step 5. ✅
  - Client-only smoke test vs built app, `/api/catalog` mocked, asserts routing + mocked item + clean boot → Task 1 Step 6. ✅
  - `onUnhandledRequest: 'error'` → Task 1 Step 6 (+ proof in Step 9). ✅
  - `e2e` job runs, registered in `ci-green` (4 edits), uploads `client/playwright-report/` + `client/test-results/` with `if: ${{ !cancelled() }}` + 7-day retention, SHA-pinned upload → Task 2. ✅
  - `show-trace` documented in AGENTS.md + client/README.md → Task 3. ✅
  - lint/typecheck/test/build/test:e2e all pass → Final verification gate. ✅
- **Decisions D1–D5:** D1 separate config (T1 S5); D2/D2-mock client-only + MSW (T1 S4/S6); D3 block + escape hatch (T2 + CI-verification); D4 deferred (comment in handlers.ts); D5 on-first-retry + !cancelled() (T1 S5 / T2 S1). ✅
- **"Verify at implementation" items:** `@msw/playwright` fixture API (T1 S3, resolved to `defineNetworkFixture({context, handlers, onUnhandledRequest})` + `.enable()/.disable()`); upload-artifact SHA (resolved to `ea165f8…`); job-scoped permissions only if 403 (CI-verification S3); 3-edit ci-green wiring (T2, expanded to 4 incl. echo). ✅
- **Type consistency:** `CatalogResponse`/`CatalogPlayable` shapes in `handlers.ts` match `About.tsx`/`catalog.controller.ts`. `handlers` export name consumed by `smoke.e2e.ts`. `NetworkFixture` type matches the installed declaration. ✅
- **Placeholder scan:** every code/edit step contains literal content and exact anchors; no TBD/TODO. ✅
