import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // React Compiler 1.0 — stable top-level option; Babel-based, so builds are slower (accepted).
  reactCompiler: true,
  // The app imports @notation-hero/client as raw .tsx source. Next doesn't transpile
  // node_modules (a workspace package is symlinked there), so the JSX won't parse without this.
  transpilePackages: ['@notation-hero/client', '@notation-hero/shared'],
  // Cache Components (Next 16): enables `'use cache: remote'` for durable caching shared across
  // server instances (plain `'use cache'` is in-memory per instance and does NOT survive Vercel
  // cold starts, so Neon would be re-hit on each). Also makes Partial Prerendering the default,
  // so the static shell streams while the cached catalog read resolves.
  cacheComponents: true,
};

export default nextConfig;
