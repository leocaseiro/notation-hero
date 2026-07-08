import type { StorybookConfig } from '@storybook/tanstack-react';
import tailwindcss from '@tailwindcss/vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/tanstack-react',
  // Tailwind v4 is a Vite plugin; Storybook needs it in its own Vite pipeline so
  // the `@import "tailwindcss"` + `@theme` in src/styles.css compile in stories.
  // `base` lets the built Storybook serve from a subpath (the GitHub Pages
  // per-PR preview at /notation-hero/pr/<n>/); defaults to '/' so dev, a11y, and
  // vr stay unchanged — only the preview workflow sets STORYBOOK_BASE_PATH.
  viteFinal: (cfg) =>
    mergeConfig(cfg, {
      base: process.env.STORYBOOK_BASE_PATH ?? '/',
      plugins: [tailwindcss()],
    }),
};

export default config;
