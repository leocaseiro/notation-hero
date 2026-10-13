/**
 * AlphaTab 1.8.4 throws two errors that break nothing a person can see. Two readers must agree on
 * them: the Sentry filter (web/instrumentation-client.ts), which drops them before they use the
 * monthly quota, and the end-to-end gate (web/e2e/page-errors.ts), which lets them through. One
 * list, so fixing NH-335 or NH-338 means deleting one entry here, and both follow.
 *
 * Each is excused only when EVERY stack frame sits inside the vendored engine bundle. The messages
 * are generic — the engine indexes `.voices` in 62 places — so the same words thrown from our own
 * code still fail the gate and still reach Sentry. The bundle PATH is matched rather than frame
 * names: the build is minified and its names change with every engine version, but
 * web/scripts/vendor-alphatab.mjs serves the engine at a fixed path. A browser's own
 * `[native code]` frame (WebKit's, on NH-338) is neither ours nor the engine's, so the Sentry
 * filter skips it.
 *
 * Never add a test's own sentinel error here: the Sentry filter reads this list too, and would drop
 * it.
 */

/** The vendored engine bundle, as web/scripts/vendor-alphatab.mjs serves it. */
export const ENGINE_BUNDLE = '/alphatab/esm/alphaTab.core.mjs';

export const KNOWN_ENGINE_NOISE: readonly {
  readonly ticket: string;
  /** V8's wording (Chrome, Edge) — the text the Chromium-only end-to-end cases wait for. */
  readonly message: string;
  /** Every browser engine's wording of the same throw, as measured; any one matches. */
  readonly wordings: readonly RegExp[];
}[] = [
  {
    // NH-335. Thrown on the MAIN thread, by the engine's listener on its worker, while it
    // deserializes a score the worker sent back. Nothing observable follows — the score renders,
    // a transposition reaches the staff, and playback runs. Ordinary Guitar Pro files reach it:
    // guitar-no-percussion.gp, alphatex-GP5.gp5 and alphatex-GPX.gpx all do — once per open when
    // measured on 2026-10-13; an earlier CI run counted seven in one test case. Every frame of
    // every occurrence is the engine's:
    //     at Jn.fromJson        (…/alphatab/esm/alphaTab.core.mjs)
    //     at jn.Zu              (…/alphatab/esm/alphaTab.core.mjs)
    //     at Worker.<anonymous> (…/alphatab/esm/alphaTab.core.mjs)
    ticket: 'NH-335',
    message: "Cannot read properties of undefined (reading 'voices')",
    // Measured against a production build: Chromium 149, Firefox 148, WebKit 26.5. Firefox and
    // WebKit quote the expression that was undefined, which is minified engine code.
    wordings: [
      /Cannot read properties of undefined \(reading 'voices'\)/,
      /can't access property "voices", .+ is undefined/,
      /undefined is not an object \(evaluating '[^']*\.voices'\)/,
    ],
  },
  {
    // NH-338. The engine's AudioWorklet output has no "has started" flag: play() reaches
    // source.start(0) only inside an async promise, while pause() calls source.stop(0) at once, so
    // a Pause pressed before that promise settles stops a node that never started. Measured 7 of
    // 10 quick Pause presses. The remedy that helps a person — holding Pause back until the output
    // has started — costs responsiveness, and NH-338 carries that decision.
    ticket: 'NH-338',
    message: 'cannot call stop without calling start first',
    // Chromium and WebKit share this wording; Firefox has its own.
    wordings: [
      /cannot call stop without calling start first/,
      /Start has not been called on this AudioBufferSourceNode/,
    ],
  },
];

const isKnownMessage = (message: string): boolean =>
  KNOWN_ENGINE_NOISE.some((noise) => noise.wordings.some((wording) => wording.test(message)));

const isEngineFile = (file: string): boolean => file.includes(ENGINE_BUNDLE);

/**
 * For the end-to-end gate: a page error, read from its message and its V8 stack string. A stack
 * with no frames never qualifies — an unattributable throw is exactly what the gate must not let
 * through.
 */
export function isKnownEngineNoiseStack(message: string, stack: string): boolean {
  const frames = stack.split('\n').filter((line) => line.trimStart().startsWith('at '));
  return (
    isKnownMessage(message) && frames.length > 0 && frames.every((frame) => isEngineFile(frame))
  );
}

/** The part of a Sentry event the filter reads. Sentry's own `ErrorEvent` fits this shape. */
export interface NoiseEvent {
  readonly exception?: {
    readonly values?: readonly {
      readonly value?: string;
      readonly stacktrace?: { readonly frames?: readonly { readonly filename?: string }[] };
    }[];
  };
}

/**
 * For Sentry's `beforeSend`: whether EVERY exception in the event is known engine noise, read from
 * Sentry's structured frames. An event with no exception, or an exception with no frames, never
 * qualifies. It must never throw: Sentry 11 drops an event whose `beforeSend` throws.
 */
export function isKnownEngineNoise(event: NoiseEvent): boolean {
  const exceptions = event.exception?.values ?? [];
  return (
    exceptions.length > 0 &&
    exceptions.every((exception) => {
      // WebKit adds a frame for the browser's own function the engine called (NH-338's
      // `stop@[native code]`). It is neither ours nor the engine's, so it neither counts nor blocks.
      const frames = (exception.stacktrace?.frames ?? []).filter(
        (frame) => frame.filename !== '[native code]',
      );
      return (
        isKnownMessage(exception.value ?? '') &&
        frames.length > 0 &&
        frames.every((frame) => isEngineFile(frame.filename ?? ''))
      );
    })
  );
}
