# Fresh worktree / clone — one-time setup runbook

**Extracted from:** `AGENTS.md` on 2026-07-15 during the docs-cleanup trim.

## Node version

Run `nvm use` (or `fnm use` / `asdf install nodejs`) in the repo root before anything else. `.nvmrc` pins Node 24 to match CI. The CI composite (`.github/actions/setup-js`) reads the same `.nvmrc` via `node-version-file:`, so local and CI Node versions stay in sync from one file.

- **Volta users:** `.nvmrc` is not picked up automatically — run `volta pin node@24` once in the repo root, then Volta uses that pin.
- **asdf users:** `asdf install nodejs` requires `legacy_version_file = yes` in `~/.asdfrc` to read `.nvmrc`; otherwise install via `asdf install nodejs 24`.

## Lefthook git hooks (per-worktree)

Lefthook hooks (`pre-commit`, `commit-msg`, `pre-push`) are the local-side of the CI gates. They must be **installed once per worktree**.

1. Run `pnpm install` — this fires the `prepare` script which calls `lefthook install`.
2. If `pnpm install` fails on the `prepare` step with `core.hooksPath is set locally`, the worktree has a stale per-worktree hooks path. Recover with:

   ```sh
   git config --unset-all --local core.hooksPath
   pnpm install --ignore-scripts
   pnpm exec lefthook install
   ```

   (Adding deps in the same recovery state: `pnpm add -D -w <pkg> --ignore-scripts`.)

3. Verify hooks fire:

   ```sh
   git config --get core.hooksPath   # should print nothing (unset)
   ls .git/hooks/pre-commit          # should exist
   ```

   If hooks silently no-op after a worktree move, re-run `pnpm exec lefthook install`.

## Why this matters

If you skip lefthook install, commits land **without** the layout / coverage-ignore / gitleaks / semgrep checks. CI will still catch them on push, but local feedback time is gone. **Never** use `git commit/push --no-verify`.
