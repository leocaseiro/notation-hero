import { withSentryConfig } from '@sentry/nextjs/config';

import type { SentryBuildOptions } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SPIKE: set explicitly (App Router defaults it to true) so the AlphaTab mount/dispose lifecycle
  // is provably exercised by React 19's dev-only double-invoke.
  reactStrictMode: true,
  // React Compiler 1.0 — stable top-level option; Babel-based, so builds are slower (accepted).
  reactCompiler: true,
  // The app imports @notation-hero/client as raw .tsx source. Next doesn't transpile
  // node_modules (a workspace package is symlinked there), so the JSX won't parse without this.
  transpilePackages: ['@notation-hero/client', '@notation-hero/shared'],
};

// Sentry's build step: it uploads the production build's source maps to Sentry, then deletes them
// from the deploy. Only a production build on Vercel reads the token: Sentry's own command-line
// tools read a variable of the same name from a developer's shell, and a local build must never
// upload with it. VERCEL_ENV needs Vercel's system environment variables on, which the version
// in the wordmark (scripts/app-version.mjs) already relies on. Previews, CI and local builds
// upload nothing — and, with the hook off, print nothing about it either. The build script hands
// `next build` the shell's own VERCEL_ENV, so a VERCEL_ENV line in a web/.env file cannot open
// this gate.
const uploadToken =
  process.env.VERCEL_ENV === 'production' ? process.env.SENTRY_AUTH_TOKEN : undefined;

const sentryBuildOptions: SentryBuildOptions = {
  org: 'leo-caseiro',
  project: 'notation-hero-nextjs',
  authToken: uploadToken,
  // The same variable the build script sets for `next build`, so a report always matches its maps.
  release: { name: process.env.NEXT_PUBLIC_APP_VERSION },
  sourcemaps: { disable: !uploadToken },
  useRunAfterProductionCompileHook: Boolean(uploadToken),
  // Sentry's own default only logs a failed release or upload step, deploys anyway and deletes
  // the maps, so that release's frames stay unreadable. Throwing fails the production build
  // instead, and Vercel keeps the previous deployment live. (Sentry's doc comment says the
  // default already throws; its code does not.)
  errorHandler: (error) => {
    throw error;
  },
  // That hook is for navigation tracing, and this site sends errors only.
  suppressOnRouterTransitionStartWarning: true,
  telemetry: false,
};

if (uploadToken && !(sentryBuildOptions.org && sentryBuildOptions.project)) {
  // Sentry's plugin only warns about a missing slug, then deploys with the maps deleted: the very
  // outcome errorHandler exists to prevent. Fail the production build instead.
  throw new Error(
    'web/next.config.ts: set org and project before SENTRY_AUTH_TOKEN reaches a production build.',
  );
}

export default withSentryConfig(nextConfig, sentryBuildOptions);
