import { DocsContainer } from '@storybook/addon-docs/blocks';
import { useEffect, useState } from 'react';
import { themes } from 'storybook/theming';
import type { Decorator, Preview } from '@storybook/tanstack-react';
import type { ComponentProps } from 'react';

import { A11Y_TAGS } from '../src/a11y-tags';
// Load the design tokens (teal theme + Public Sans) so stories render themed.
import '../src/styles.css';

// Toggle our real `.dark` theme class on <html> from a toolbar control so stories
// render in the actual app theme — not Storybook's fixed "dark background" canvas,
// which paints #333 without applying our theme (the source of the false Ghost
// contrast failure). a11y checks then reflect the real rendered colors.
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return <Story />;
};

// Docs (autodocs) pages render inside Storybook's own `.sbdocs` container, which paints
// its own light background/text independent of our app tokens. So the canvas/story view
// themes via the decorator above, but Docs pages stay light when you pick Dark. The
// decorator already toggles `.dark` on the docs <html>; mirror it here (React hooks are
// fine in the container — only Storybook preview hooks like useGlobals are not) so the
// Docs chrome (background, text, tables, borders) flips with the same toolbar control.
const ThemedDocsContainer = (props: ComponentProps<typeof DocsContainer>) => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setIsDark(html.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return <DocsContainer {...props} theme={isDark ? themes.dark : themes.light} />;
};

// The Playwright a11y suite (client/src/**/*.a11y.ts) runs its own scoped AxeBuilder sweep on each
// story. The addon's automatic axe run (parameters.a11y.test below) races that sweep on the same
// iframe — axe-core is non-reentrant, so overlapping runs throw "Axe is already running" and flake
// the suite under parallel workers. playwright.config.ts sets STORYBOOK_DISABLE_A11Y_AUTORUN when
// it serves Storybook for the tests, so we turn the addon's auto-run off for that run only. Local
// `pnpm storybook` never sets it, so the interactive a11y panel keeps auto-running axe as before.
const a11yAutorunDisabled = import.meta.env.STORYBOOK_DISABLE_A11Y_AUTORUN === '1';

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    docs: { container: ThemedDocsContainer },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // Our theme owns the canvas background (body @apply bg-background); the
    // backgrounds addon's fixed colors would fight it, so disable it.
    backgrounds: { disable: true },
    a11y: {
      // Auto-run axe on each story for the interactive panel; turned off under the Playwright a11y
      // run (see a11yAutorunDisabled above) so it can't race the spec's own AxeBuilder sweep.
      test: a11yAutorunDisabled ? 'off' : 'error',
      // Scope axe to WCAG 2.0/2.1 levels A + AA (includes 4.5:1 color contrast).
      options: {
        runOnly: {
          type: 'tag',
          values: [...A11Y_TAGS],
        },
      },
    },
  },
};

export default preview;
