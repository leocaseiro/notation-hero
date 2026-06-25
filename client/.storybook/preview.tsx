import type { Decorator, Preview } from '@storybook/tanstack-react';
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
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // Our theme owns the canvas background (body @apply bg-background); the
    // backgrounds addon's fixed colors would fight it, so disable it.
    backgrounds: { disable: true },
    a11y: {
      // Fail the test run on accessibility violations.
      test: 'error',
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
