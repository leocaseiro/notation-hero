import { describe, expect, it } from 'vitest';

import {
  ENGINE_BUNDLE,
  KNOWN_ENGINE_NOISE,
  isKnownEngineNoise,
  isKnownEngineNoiseStack,
} from './known-engine-noise';

const ENGINE = `https://notationhero.com${ENGINE_BUNDLE}`;
const OURS = 'https://notationhero.com/_next/static/chunks/app/play/page-0a1b2c.js';
const [voices, stop] = KNOWN_ENGINE_NOISE.map((noise) => noise.message);

/** The part of a Sentry event the filter reads: one exception, its message and its frames. */
const event = (value: string, filenames: readonly string[]) => ({
  exception: {
    values: [{ value, stacktrace: { frames: filenames.map((filename) => ({ filename })) } }],
  },
});

describe('isKnownEngineNoise, the Sentry filter', () => {
  it('drops each known throw when every frame sits in the engine bundle', () => {
    expect(isKnownEngineNoise(event(voices, [ENGINE, ENGINE]))).toBe(true);
    expect(isKnownEngineNoise(event(stop, [ENGINE]))).toBe(true);
  });

  it('matches frames Sentry has rewritten to app:/// addresses', () => {
    expect(isKnownEngineNoise(event(voices, [`app://${ENGINE_BUNDLE}`]))).toBe(true);
  });

  it('keeps the same message when one frame is our own code', () => {
    expect(isKnownEngineNoise(event(voices, [ENGINE, OURS]))).toBe(false);
  });

  it('keeps any other message, even one thrown inside the engine', () => {
    expect(isKnownEngineNoise(event('Soundfont is not a valid Soundfont2 file', [ENGINE]))).toBe(
      false,
    );
  });

  it('keeps an event it cannot attribute, and never throws on one', () => {
    expect(isKnownEngineNoise(event(voices, []))).toBe(false);
    expect(isKnownEngineNoise({})).toBe(false);
    expect(isKnownEngineNoise({ exception: {} })).toBe(false);
    expect(isKnownEngineNoise({ exception: { values: [] } })).toBe(false);
    expect(isKnownEngineNoise({ exception: { values: [{ value: voices }] } })).toBe(false);
    expect(isKnownEngineNoise({ exception: { values: [{ stacktrace: { frames: [{}] } }] } })).toBe(
      false,
    );
  });

  it('pins the every-exception rule: fails when one exception is known and one is ours', () => {
    expect(
      isKnownEngineNoise({
        exception: {
          values: [
            { value: voices, stacktrace: { frames: [{ filename: ENGINE }, { filename: ENGINE }] } },
            { value: 'Our own error', stacktrace: { frames: [{ filename: OURS }] } },
          ],
        },
      }),
    ).toBe(false);
  });
});

/** A V8 stack string for the known throw: its first line, then one frame in each file given. */
const stack = (...frames: readonly string[]) =>
  [`TypeError: ${voices}`, ...frames.map((frame) => `    at Jn.fromJson (${frame}:1:100)`)].join(
    '\n',
  );

describe('isKnownEngineNoiseStack, the end-to-end gate', () => {
  it('lets the known throw through when every frame sits in the engine bundle', () => {
    expect(isKnownEngineNoiseStack(`TypeError: ${voices}`, stack(ENGINE, ENGINE))).toBe(true);
  });

  it('fails the same words with one frame from our own code', () => {
    expect(isKnownEngineNoiseStack(`TypeError: ${voices}`, stack(ENGINE, OURS))).toBe(false);
  });

  it('fails a stack with no frames at all', () => {
    expect(isKnownEngineNoiseStack(voices, `TypeError: ${voices}`)).toBe(false);
  });

  it('pins the message check: fails an unknown message even when every frame is the engine', () => {
    expect(
      isKnownEngineNoiseStack('Soundfont is not a valid Soundfont2 file', stack(ENGINE, ENGINE)),
    ).toBe(false);
  });
});
