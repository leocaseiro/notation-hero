import { Toaster } from '@notation-hero/client';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Notation Hero',
  description: 'Learn an instrument by playing real notation.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* One Toaster for the whole app: the unsupported-file, engine-failure and
            settings-reset messages all land here.

            WHERE the toast sits is the design system's call, not this file's: Sonner.tsx pins
            position and both offsets from its own occlusion measurements, and
            web/e2e/toast-occlusion.e2e.ts re-runs them in CI. This file used to lift the toast
            96px off the bottom, from when the design system placed it bottom-right; overriding
            `offset` now leaves the top-right toaster with no top offset, which drops it straight
            onto the header. */}
        <Toaster closeButton duration={5000} />
      </body>
    </html>
  );
}
