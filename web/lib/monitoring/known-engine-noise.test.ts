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

// Firefox and WebKit word both throws differently, and write each stack line as fn@url:line:col.
// The messages and stacks below were recorded from a production build of this app, opening
// guitar-no-percussion.gp (NH-335) and pressing Play then Pause (NH-338).
const FIREFOX_VOICES =
  'can\'t access property "voices", e.tracks[t.get(...)].staves[t.get(...)].bars[t.get(...)] is undefined';
const WEBKIT_VOICES =
  'undefined is not an object (evaluating \'e.tracks[t.get("trackIndex")].staves[t.get("staffIndex")].bars[t.get("barIndex")].voices\')';
const FIREFOX_STOP =
  'AudioScheduledSourceNode.stop: Start has not been called on this AudioBufferSourceNode.';

/** A Firefox or WebKit stack's lines, as the file of each frame: the url in each `fn@url:line:col`. */
const framesOf = (...lines: readonly string[]) =>
  lines.map((line) => line.slice(line.indexOf('@') + 1).replace(/:\d+:\d+$/, ''));

const FIREFOX_VOICES_STACK = framesOf(
  `fromJson@${ENGINE}:51:527535`,
  `Zu@${ENGINE}:51:530833`,
  `jn/<@${ENGINE}:51:529858`,
);
const WEBKIT_VOICES_STACK = framesOf(`fromJson@${ENGINE}:51:527551`, `Zu@${ENGINE}:51:530841`);
const FIREFOX_STOP_STACK = framesOf(
  `pause@${ENGINE}:51:392512`,
  `pause@${ENGINE}:51:650057`,
  `handleWorkerMessage@${ENGINE}:51:522462`,
  `Hn/<@${ENGINE}:51:519570`,
);

describe('isKnownEngineNoise, in Firefox and WebKit', () => {
  it("drops NH-335 in each engine's own words when every frame is the engine's", () => {
    expect(isKnownEngineNoise(event(FIREFOX_VOICES, FIREFOX_VOICES_STACK))).toBe(true);
    expect(isKnownEngineNoise(event(WEBKIT_VOICES, WEBKIT_VOICES_STACK))).toBe(true);
  });

  it("drops Firefox's NH-338 when every frame is the engine's", () => {
    expect(isKnownEngineNoise(event(FIREFOX_STOP, FIREFOX_STOP_STACK))).toBe(true);
  });

  it('keeps the same words when one frame is our own code', () => {
    const ours = framesOf(`fromJson@${ENGINE}:51:527535`, `t@${OURS}:1:60471`);
    expect(isKnownEngineNoise(event(FIREFOX_VOICES, ours))).toBe(false);
    expect(isKnownEngineNoise(event(WEBKIT_VOICES, ours))).toBe(false);
  });

  it('keeps another property read on undefined, in every wording', () => {
    for (const value of [
      "Cannot read properties of undefined (reading 'notes')",
      'can\'t access property "notes", e.bars[t] is undefined',
      "undefined is not an object (evaluating 'e.bars[t].notes')",
    ])
      expect(isKnownEngineNoise(event(value, FIREFOX_VOICES_STACK))).toBe(false);
  });

  it("drops WebKit's NH-338, whose stack starts in the browser's own stop()", () => {
    const webkitStopStack = framesOf(
      'stop@[native code]',
      `pause@${ENGINE}:51:392516`,
      `pause@${ENGINE}:51:650062`,
      `handleWorkerMessage@${ENGINE}:51:522462`,
    );
    expect(isKnownEngineNoise(event(stop, webkitStopStack))).toBe(true);
  });

  it("keeps a stack of only the browser's own frames: nothing ties it to the engine", () => {
    expect(isKnownEngineNoise(event(stop, framesOf('stop@[native code]')))).toBe(false);
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
