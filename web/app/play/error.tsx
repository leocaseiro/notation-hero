'use client';

import { CrashPage } from '../CrashPage';

export default function PlayerError({
  error,
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  return <CrashPage error={error} reset={reset} heading="The player stopped unexpectedly" />;
}
