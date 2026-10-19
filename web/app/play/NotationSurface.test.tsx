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
// What iterating `document.fonts` gives: FontFace-like entries. By default AlphaTab's music font is
// still on its way, the state every browser puts it in within a fraction of a second.
let faces: { family: string; status: FontFaceLoadStatus }[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(reportError).mockClear();
  handlers.clear();
  visibility = 'visible';
  fontFailed = undefined;
  faces = [{ family: 'alphaTab', status: 'loading' }];
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  // jsdom has no document.fonts; the component listens on it for the font's `loadingerror`, and
  // reads its faces when the 60 visible seconds end.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      addEventListener: (_type: string, listener: typeof fontFailed) => {
        fontFailed = listener;
      },
      removeEventListener: () => {},
      [Symbol.iterator]: () => faces[Symbol.iterator](),
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

test.each(['loading', 'loaded'] as const)(
  'an error event before the first render stops the clock: 60 visible seconds raise neither E204 nor E206 (font %s)',
  (status) => {
    faces = [{ family: 'alphaTab', status }];
    mount();
    act(() => handlers.get('error')?.(new Error('the bundled score could not be loaded')));
    pass(60_000);
    expect(reports()).toEqual([{ code: 'E202', handled: false }]);
    expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E202');
  },
);

// Firefox gives the family WITH its quotes; Chromium and WebKit without.
test('60 visible seconds with the music font loaded raise one E206, not an E204', () => {
  faces = [{ family: '"alphaTab"', status: 'loaded' }];
  mount();
  pass(60_000);
  expect(reports()).toEqual([{ code: 'E206', handled: false }]);
  expect(vi.mocked(reportError).mock.calls[0]?.[0]).toEqual(
    new Error('The score did not draw within 60 visible seconds, although the music font arrived'),
  );
  expect(screen.getByTestId('engine-error')).toHaveTextContent(
    'Error E206: the score could not be drawn. Reload the page.',
  );
});

test('60 visible seconds with the music font still loading raise E204, whatever other font loaded', () => {
  faces = [
    { family: 'Inter', status: 'loaded' },
    { family: '"alphaTab"', status: 'loading' },
  ];
  mount();
  pass(60_000);
  expect(reports()).toEqual([{ code: 'E204', handled: false }]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E204');
});

test('a loadingerror whose family carries quotes, as in Firefox, raises E203', () => {
  mount();
  act(() => fontFailed?.({ fontfaces: [{ family: '"alphaTab"' }] }));
  expect(reports()).toEqual([{ code: 'E203', handled: false }]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E203');
});
