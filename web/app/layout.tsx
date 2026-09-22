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
            settings-reset messages all land here. */}
        <Toaster />
      </body>
    </html>
  );
}
