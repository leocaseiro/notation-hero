// Starts `next dev` on port 3002, or on the next free port when 3002 is taken.
//
// `next dev --port 3002` stops with EADDRINUSE when the port is busy: Next moves on to the next
// port by itself ONLY when no port was named (`allowRetry = portSource === 'default'` in
// next/dist/cli/next-dev.js). Naming no port is not an option — its default is 3000, which the
// client SPA uses, with the API on 3001. And a busy 3002 is routine in this repo: every worktree
// runs its own dev server, and one left running in another worktree holds the port for days.
// So the search happens here, and Next is still handed an explicit port.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { appVersion } from './app-version.mjs';

const PREFERRED_PORT = 3002;

/**
 * @param {number} port
 * @returns {Promise<boolean>} true when nothing is listening on `port`
 */
function isFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    // No host, on purpose: that binds every interface (`::`), which is the bind `next dev` makes.
    // Probing only 127.0.0.1 can call a port free that Next then fails to take.
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

/**
 * The first free port at or above `preferred`. Bounded, so a machine with something badly wrong
 * gets an error to read instead of a search that walks the whole port range.
 *
 * @param {number} preferred
 * @param {{ attempts?: number }} [options]
 * @returns {Promise<number>}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export async function findFreePort(preferred, { attempts = 20 } = {}) {
  for (let port = preferred; port < preferred + attempts; port += 1) {
    if (await isFree(port)) return port;
  }
  throw new Error(
    `No free port between ${preferred} and ${preferred + attempts - 1}. ` +
      'Stop a dev server you no longer need and try again.',
  );
}

// Only start the server when invoked directly, so the test can import findFreePort without
// side effects.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const port = await findFreePort(PREFERRED_PORT);
  if (port !== PREFERRED_PORT) {
    // Said BEFORE Next's own banner, because the banner alone does not explain why the usual
    // address shows a different (often older) app.
    console.log(
      `dev: port ${PREFERRED_PORT} is in use — most likely a dev server still running in another ` +
        `worktree. Using port ${port} instead: http://localhost:${port}`,
    );
  }

  // Next's own entry file, run by THIS node — never `next` looked up on PATH. A PATH lookup runs
  // whatever program of that name comes first, and it only works at all when pnpm started this
  // script; the resolved file works however it was started.
  const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const next = spawn(process.execPath, [nextBin, 'dev', '--port', String(port)], {
    stdio: 'inherit',
    // The same version the build inlines, so the wordmark's tooltip reads the same here as it
    // does in production instead of falling back to a placeholder. An outer value wins, which is
    // what lets a test pin it.
    env: { NEXT_PUBLIC_APP_VERSION: appVersion(), ...process.env },
  });
  // Ctrl-C reaches the whole foreground process group, so Next receives it by itself. Forwarding
  // covers a signal sent to THIS process only (a supervisor's `kill`), which would otherwise
  // leave Next running with nothing in front of it.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => next.kill(signal));
  }
  next.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}
