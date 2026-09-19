# AGENTS.md — `web/` (the Next.js product client)

> The project contract lives in the repo-root `AGENTS.md`, and the root `CLAUDE.md` imports it.
> Read that first — this file only adds what is specific to this package, plus the Next.js block
> below, which Next.js itself maintains.

## This package

- **Never import `@coderline/alphatab` as a value.** Type-only imports are the rule here and a
  lint fence enforces it (`web/eslint.config.mjs`), because one value import makes Turbopack
  bundle the library a second time and playback silently dies. Runtime AlphaTab values come from
  the awaited namespace object in `web/lib/alphatab/`.
- **`web/public/alphatab/` is generated** by `scripts/vendor-alphatab.mjs`, which `dev` and `build`
  chain explicitly — pnpm does not run `pre<script>` hooks. It is git-ignored; never commit it.
- **`globalThis`, never `window`** — `unicorn/prefer-global-this` is an error, and lint runs with
  `--max-warnings 0`.
- The Playwright script is `test:e2e`, never `test`: the `quality` CI job runs `pnpm -r run test`
  with no browsers installed.

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
