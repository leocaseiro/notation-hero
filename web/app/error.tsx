'use client';

import { CrashPage } from './CrashPage';

export default function AppError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  return <CrashPage error={error} reset={reset} heading="Something went wrong" />;
}
