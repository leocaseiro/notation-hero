import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../lib/monitoring/report', () => ({ reportError: vi.fn() }));
vi.mock('../../lib/alphatab/AlphaTabEngineContext', () => ({
  useAlphaTabEngine: () => ({ engine: null, error: null }),
}));
// Every AlphaTab subscription by event name. One NotationSurface is mounted per case, so one
// handler per name.
const handlers = new Map<string, (args: unknown) => void>();
vi.mock('../../lib/alphatab/useAlphaTab', () => ({
  useAlphaTabEvent: (_api: unknown, name: string, handler: (args: unknown) => void) => {
    handlers.set(name, handler);
  },
}));

// Imported after the vi.mock calls on purpose: Vitest hoists them.
import { reportError } from '../../lib/monitoring/report';
import { NotationSurface } from './NotationSurface';

import type * as AlphaTab from '@coderline/alphatab';

// The clock and the font listener start once an api exists; the renderFinished handler also reads
// its `tracks`.
const STAND_IN_API: unknown = { tracks: [] };
let visibility: DocumentVisibilityState = 'visible';
let fontFailed: ((event: { fontfaces: { family: string }[] }) => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(reportError).mockClear();
  handlers.clear();
  visibility = 'visible';
  fontFailed = undefined;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  // jsdom has no document.fonts; the component listens on it for the font's `loadingerror`.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      addEventListener: (_type: string, listener: typeof fontFailed) => {
        fontFailed = listener;
      },
      removeEventListener: () => {},
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function mount(): void {
  render(
    <NotationSurface
      api={STAND_IN_API as AlphaTab.AlphaTabApi}
      hostRef={{ current: null }}
      viewportRef={{ current: null }}
      notation={null}
      onSoundFontProgress={() => {}}
    />,
  );
}

/** Lets `ms` pass, in whatever visibility the tab has now. */
const pass = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const reports = () => vi.mocked(reportError).mock.calls.map(([, options]) => options);

test('two minutes in a hidden tab raise no E204', () => {
  visibility = 'hidden';
  mount();
  pass(120_000);
  expect(reports()).toEqual([]);
});

test('40 visible seconds, a hidden minute, then 20 more visible seconds raise one E204', () => {
  mount();
  pass(40_000);
  visibility = 'hidden';
  pass(60_000);
  visibility = 'visible';
  expect(reports()).toEqual([]);
  pass(20_000);
  expect(reports()).toEqual([{ code: 'E204', handled: false }]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E204');
});

test('once a render has finished, hiding and showing the tab raises nothing a minute later', () => {
  mount();
  pass(10_000);
  act(() => handlers.get('renderFinished')?.(null));
  visibility = 'hidden';
  pass(30_000);
  visibility = 'visible';
  pass(60_000);
  expect(reports()).toEqual([]);
});

test('after an E203, 60 visible seconds raise no E204, and the banner keeps E203', () => {
  mount();
  act(() => fontFailed?.({ fontfaces: [{ family: 'alphaTab' }] }));
  expect(reports()).toEqual([{ code: 'E203', handled: false }]);
  pass(60_000);
  expect(reports()).toEqual([{ code: 'E203', handled: false }]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E203');
});

test('once an E204 has been raised, hiding and showing the tab raises no second one', () => {
  mount();
  pass(60_000);
  visibility = 'hidden';
  pass(5000);
  visibility = 'visible';
  pass(120_000);
  expect(reports()).toEqual([{ code: 'E204', handled: false }]);
});

test("AlphaTab's error event is reported as an unhandled E202, as it arrived", () => {
  mount();
  const soundFont = new Error('Soundfont is not a valid Soundfont2 file');
  act(() => handlers.get('error')?.(soundFont));
  expect(vi.mocked(reportError).mock.calls).toEqual([
    [soundFont, { code: 'E202', handled: false }],
  ]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E202');
});
