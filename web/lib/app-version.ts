/**
 * The running build's version, e.g. `v26.09.21-1152.4d6d7ea` — see web/scripts/app-version.mjs for
 * how it is built and why the time is Sydney build time.
 *
 * The build command computes it and passes it in the environment, where `next build` inlines it.
 * Read the whole `process.env.NEXT_PUBLIC_APP_VERSION` expression: destructuring `process.env`
 * defeats that substitution, which is a point Next's own docs make outright.
 *
 * The fallback covers anything that renders this without the build step in front of it — a unit
 * test, say. `next dev` sets the variable for the same reason the build does, so the value in the
 * browser is real in both.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
