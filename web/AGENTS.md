# AGENTS.md — `web/` (the Next.js product client)

> The project contract lives in the repo-root `AGENTS.md`, and the root `CLAUDE.md` imports it.
> Read that first — this file only adds what is specific to this package, plus the Next.js block
> below, which Next.js itself maintains.

## This package

- **Never import `@coderline/alphatab` as a value.** Type-only imports are the rule here and a
  lint fence enforces it (`web/eslint.config.mjs`), because one value import makes Turbopack
  bundle the library a second time and playback silently dies. Runtime AlphaTab values come from
  the awaited namespace object in `web/lib/alphatab/`.
- **Every `catch` reports.** Each `catch` clause and `.catch()` callback in `web/` calls
  `reportError` or `noteError` from `web/lib/monitoring/report.ts` inside the catch itself — a lint
  rule in `web/eslint.config.mjs` enforces it, and `tooling/silent-catch-fence.test.sh` proves the
  rule still fires. A deliberate silence is
  `// eslint-disable-next-line no-restricted-syntax -- <reason>` on the line above the `catch`.
  Storage the browser refuses is the visitor's, not a bug:
  `if (isStorageRefusal(error)) noteError(error, '…'); else reportError(error);`, written in place.
  The lint rule cannot see a report made in only one branch of the catch, a `.catch(namedHandler)`
  given a function by name, or a rejection handled as the second argument of `.then(ok, onError)`:
  green lint is not proof that every path reports.
  `reportError` keeps the error's message for every code except E101–E103 (and an E202 whose message
  is empty), and the names filter removes names, not a file's contents. A catch around code that
  reads or parses the visitor's file, such as the cached-score path E104 is reserved for, needs a
  fixed sentence: add its code to `FIXED_MESSAGES` in `web/lib/monitoring/report.ts`, and to the
  fixed-sentence test beside it.
- **`web/public/alphatab/` is generated** by `scripts/vendor-alphatab.mjs`, which `dev` and `build`
  chain explicitly — pnpm does not run `pre<script>` hooks. It is git-ignored; never commit it.
- **`globalThis`, never `window`** — `unicorn/prefer-global-this` is an error, and lint runs with
  `--max-warnings 0`.
- The Playwright scripts are `test:e2e` (behaviour + axe) and `test:vr` / `test:vr:update` (the ten
  page shots) — never `test`: the `quality` CI job runs `pnpm -r run test` with no browsers
  installed. Every LOCAL invocation must name its project; the `web` CI job runs both lanes in one
  unscoped `playwright test` so a single `next build` serves them.

## Next.js agent rules (managed by Next.js — do not hand-edit)

Next.js re-writes the block between its two markers on every `next dev` / `next build`, and
compares it byte for byte. Anything outside the markers is preserved, so this file is ours; only
that block is theirs. Because this file exists and hosts the block, Next.js skips creating a
`web/CLAUDE.md` — keeping one agent file in this package instead of two.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
