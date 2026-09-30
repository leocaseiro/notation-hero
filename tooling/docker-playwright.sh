#!/usr/bin/env bash
#
# Run one package's Playwright script inside the pinned Playwright container, so pixel baselines
# render the way CI renders them. macOS and Linux rasterize fonts differently (subpixel vs
# grayscale antialiasing, different glyph metrics), so the committed `-linux` set is the only
# source of truth and must never be regenerated natively on a Mac.
#
# Usage:
#   bash tooling/docker-playwright.sh @notation-hero/client test:vr
#   bash tooling/docker-playwright.sh @notation-hero/web    test:vr:update
#
# One helper for both packages rather than four inlined `docker run` lines: the inlined form had
# already reached ~400 characters each, and the two new ones need two extra volumes, which is drift
# before a line is written. Shadowing web/'s build output during a client/ run is harmless, so both
# packages share the full volume list.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: bash tooling/docker-playwright.sh <pnpm-filter> <script>" >&2
  exit 2
fi

# Keep this pin in lockstep with @playwright/test AND with the `container:` lines of the `vr` and
# `web` CI jobs; regenerate baselines on the bump. tooling/workflow-guards.test.mjs asserts all
# three agree with the installed version AND carry one shared digest, so a partial bump fails CI
# rather than silently comparing baselines under a renderer they were not made with.
#
# Pinned by digest, not by tag alone: a tag can be re-pushed, and this script mounts your whole
# working tree read-write. Re-take the digest on every bump with buildx — NOT with
# `docker manifest inspect --verbose`, whose reported digest does NOT resolve when used as a pin
# (measured: this registry serves a different digest per Accept header):
#   docker buildx imagetools inspect mcr.microsoft.com/playwright:v1.61.1-noble --format '{{.Manifest.Digest}}'
IMAGE=mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48

# The anonymous volumes shadow paths that must NOT be written back onto the host bind mount:
#   * every package's node_modules + the store — so the local darwin install is untouched
#   * web/.next            — `next build` inside the container would clobber the local dev build
#   * web/public/alphatab  — scripts/vendor-alphatab.mjs writes here on every build
# Both web/ paths are git-ignored, so nothing could reach a commit; this is about not wrecking the
# working tree. web/test-results/ and the *-snapshots/ folders are deliberately NOT shadowed —
# those are the results a developer needs to read afterwards.
#
# --ignore-scripts does two jobs. It skips the lefthook `prepare` (its git call cannot resolve a
# worktree's .git inside the container), AND it keeps dependency lifecycle scripts from running as
# root while the host working tree is bind-mounted read-write — the same reason the `web` CI job's
# install line carries it. The image bakes the browsers in, so there is no `playwright install`.
docker run --rm \
  -v "$PWD":/work \
  -v /work/node_modules \
  -v /work/client/node_modules \
  -v /work/server/node_modules \
  -v /work/shared/node_modules \
  -v /work/infra/node_modules \
  -v /work/web/node_modules \
  -v /work/web/.next \
  -v /work/web/public/alphatab \
  -v /work/.pnpm-store \
  -w /work "$IMAGE" \
  bash -c 'corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter "$1" run "$2"' _ "$1" "$2"
