import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
    // @notation-hero/client + @notation-hero/shared ship raw .ts(x) (no built dist); inline them so
    // Vite transforms the workspace source in tests instead of trying to load pre-built output.
    server: { deps: { inline: ['@notation-hero/client', '@notation-hero/shared'] } },
  },
});
