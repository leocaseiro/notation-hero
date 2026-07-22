import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // @notation-hero/client's own components import via '@/lib/utils' etc; per tsconfig.json, that
  // alias resolves against THIS app's tsconfig (`@/*` -> `../client/src/*`), the same rule Turbopack
  // applies to the transpiled package at build/dev time (NH-275 D2). Vitest runs on Vite, not
  // Turbopack, so it needs the equivalent resolution wired in explicitly.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
    // @notation-hero/client + @notation-hero/shared ship raw .ts(x) (no built dist); inline them so
    // Vite transforms the workspace source in tests instead of trying to load pre-built output.
    server: { deps: { inline: ['@notation-hero/client', '@notation-hero/shared'] } },
  },
});
