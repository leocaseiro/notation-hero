import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { test } from 'node:test';

import { findFreePort } from '../web/scripts/dev.mjs';

/** Holds a port open the way a running dev server does, and hands back a way to release it. */
function occupy(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, () => {
      resolve({
        port: server.address().port,
        release: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

test('returns the preferred port when nothing is listening on it', async () => {
  // Port 0 asks the OS for a free port; release it, and that number is free for the search.
  const probe = await occupy(0);
  await probe.release();

  assert.equal(await findFreePort(probe.port), probe.port);
});

// The case the script exists for: a dev server left running in another worktree holds the
// preferred port. `next dev --port N` stops with EADDRINUSE there — Next only moves on by itself
// when NO port was named — so the search has to do the moving.
test('moves to the next port when the preferred one is taken', async () => {
  const held = await occupy(0);
  try {
    const found = await findFreePort(held.port);
    assert.ok(found > held.port, `expected a port above ${held.port}, got ${found}`);
    assert.ok(found <= held.port + 20, `expected a port within 20 of ${held.port}, got ${found}`);
  } finally {
    await held.release();
  }
});

test('skips every taken port, not only the first', async () => {
  const first = await occupy(0);
  let second;
  try {
    // Usually free; if the OS has handed the neighbour to someone else, that is still "taken".
    second = await occupy(first.port + 1).catch(() => null);
    const found = await findFreePort(first.port);
    assert.ok(found > first.port + 1, `expected a port above ${first.port + 1}, got ${found}`);
  } finally {
    await second?.release();
    await first.release();
  }
});

test('gives up with a clear message when the whole range is taken', async () => {
  const held = await occupy(0);
  try {
    await assert.rejects(findFreePort(held.port, { attempts: 1 }), /no free port/i);
  } finally {
    await held.release();
  }
});
