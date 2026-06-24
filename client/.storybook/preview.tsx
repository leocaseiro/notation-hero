import type { Preview } from '@storybook/tanstack-react';
// Load the design tokens (teal theme + Public Sans) so stories render themed.
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' shows a11y violations in the test UI without failing the build.
      test: 'todo',
    },
  },
};

export default preview;
