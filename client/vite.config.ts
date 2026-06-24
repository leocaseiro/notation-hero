/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Local dev: the SPA prefers :3000 (the dev script's --port; Vite picks the next free port if
  // taken, so use the URL it prints) and proxies /api/* to the NestJS server on :3001 — so the
  // app is same-origin locally exactly as it is behind CloudFront in production.
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
    // React Compiler (1.0 GA) — wired via @rolldown/plugin-babel + the preset
    // exported by @vitejs/plugin-react v6 (the old react({ babel }) option was removed).
    babel({ presets: [reactCompilerPreset()] }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})

export default config
