import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SPIKE: set explicitly (App Router defaults it to true) so the AlphaTab mount/dispose lifecycle
  // is provably exercised by React 19's dev-only double-invoke.
  reactStrictMode: true,
  // React Compiler 1.0 — stable top-level option; Babel-based, so builds are slower (accepted).
  reactCompiler: true,
  // The app imports @notation-hero/client as raw .tsx source. Next doesn't transpile
  // node_modules (a workspace package is symlinked there), so the JSX won't parse without this.
  transpilePackages: ['@notation-hero/client'],
};

export default nextConfig;
