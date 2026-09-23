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
            settings-reset messages all land here. Lifted 96px so a toast sits above the
            transport (h-20) instead of on it, including the phone safe area. */}
        <Toaster
          closeButton
          offset={{ bottom: 96 }}
          duration={5000}
          mobileOffset={{
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          }}
        />
      </body>
    </html>
  );
}
