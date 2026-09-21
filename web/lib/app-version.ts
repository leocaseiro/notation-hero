/**
 * The running build's version, shown in the wordmark's tooltip. One of three shapes:
 *
 *   local                          a developer machine
 *   pr-168.26.09.21-1143.5f027f6   a Vercel preview, named by the pull request it belongs to
 *   v0.26.09.21-1143.5f027f6       production, named by the release line
 *
 * See web/scripts/app-version.mjs for how each is built and why the time is Sydney build time.
 *
 * The build command computes it and passes it in the environment, where `next build` inlines it.
 * Read the whole `process.env.NEXT_PUBLIC_APP_VERSION` expression: destructuring `process.env`
 * defeats that substitution, which is a point Next's own docs make outright.
 *
 * The fallback is `local` rather than something like `unknown` because it is only reached where
 * the build command did not run — `next dev`, or a unit test — and those ARE local. A deployed
 * page showing `local` would mean Vercel's system environment variables are switched off, which
 * is worth seeing rather than papering over.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'local';
