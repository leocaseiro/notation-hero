import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Scrub from './scrub';
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

// The remembered names live for the whole tab, so each case starts from a fresh copy of the module.
let scrub: typeof Scrub;
beforeEach(async () => {
  vi.resetModules();
  scrub = await import('./scrub');
});

const SCORE: Scrub.ScoreFacts = {
  title: 'Night Drive',
  subTitle: '',
  artist: 'The Example Band',
  album: 'Demo Tapes',
  words: '',
  music: '',
  copyright: '',
  tab: 'Tabbed By Someone',
  instructions: '',
  notices: '',
  tracks: [
    { name: 'Lead Guitar ', shortName: 'L.Gt.' },
    { name: 'Drums (Left Kit)', shortName: 'Drums (Lef' },
    { name: '1', shortName: '1' },
  ],
};

/** An event Sentry built from a thrown Error, with one of our own frames. */
const thrown = (value: string): ErrorEvent => ({
  type: undefined,
  exception: {
    values: [
      {
        type: 'TypeError',
        value,
        stacktrace: { frames: [{ filename: 'app:///_next/static/chunks/Night Drive.js' }] },
      },
    ],
  },
});
const valueOf = (event: ErrorEvent) => event.exception?.values?.[0]?.value;

describe('the names filter', () => {
  it('replaces the file name, the title, the credits and every track name', () => {
    scrub.rememberOpenFile('night-drive.gp');
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent(
      thrown('night-drive.gp: Night Drive by The Example Band, tab Tabbed By Someone, Lead Guitar'),
    );
    expect(valueOf(event)).toBe('[file]: [file] by [file], tab [file], [file]');
  });

  it('leaves names shorter than three characters alone', () => {
    scrub.rememberScore(SCORE);
    expect(valueOf(scrub.scrubEvent(thrown('Error 1 of 2')))).toBe('Error 1 of 2');
  });

  it('never touches stack frames', () => {
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent(thrown('x'));
    expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(
      'app:///_next/static/chunks/Night Drive.js',
    );
  });

  it('stores a name trimmed, the form the mixer shows', () => {
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent(
      thrown("Cannot read properties of undefined (reading 'Lead Guitar')"),
    );
    expect(valueOf(event)).toBe("Cannot read properties of undefined (reading '[file]')");
  });

  it('replaces the longest name first, so a longer name goes whole', () => {
    scrub.rememberScore(SCORE);
    expect(valueOf(scrub.scrubEvent(thrown('Drums (Left Kit) is muted')))).toBe('[file] is muted');
  });

  it('matches a name as written, never as a pattern', () => {
    scrub.rememberOpenFile('Song (Live) [v2].gp');
    scrub.rememberOpenFile('C++ Riff $1.gp');
    scrub.rememberScore({ ...SCORE, tracks: [{ name: '.*+', shortName: '' }] });
    expect(
      valueOf(scrub.scrubEvent(thrown('Song (Live) [v2].gp and C++ Riff $1.gp, track .*+'))),
    ).toBe('[file] and [file], track [file]');
    expect(valueOf(scrub.scrubEvent(thrown('a.b.c')))).toBe('a.b.c');
  });

  it('filters an event built from text, in its message and in its exception', () => {
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent({
      type: undefined,
      message: 'Night Drive failed',
      exception: { values: [{ value: 'Night Drive failed' }] },
    });
    expect(event.message).toBe('[file] failed');
    expect(valueOf(event)).toBe('[file] failed');
  });

  it('never forgets a name within the tab', () => {
    scrub.rememberOpenFile('first-song.gp');
    scrub.rememberOpenFile('second-song.gp');
    expect(valueOf(scrub.scrubEvent(thrown('first-song.gp failed')))).toBe('[file] failed');
  });
});

describe('the address cut', () => {
  it("cuts the event's page address at its first ? or #", () => {
    const event = scrub.scrubEvent({
      type: undefined,
      request: { url: 'https://notationhero.com/play?fbclid=abc#x' },
    });
    expect(event.request?.url).toBe('https://notationhero.com/play');
  });

  it('cuts navigation, fetch and xhr breadcrumbs', () => {
    const navigation = scrub.scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/?fbclid=abc#x', to: '/play#bar-3' },
    });
    expect(navigation.data).toEqual({ from: '/', to: '/play' });
    const fetched = scrub.scrubBreadcrumb({
      category: 'fetch',
      data: { method: 'GET', url: '/play?_rsc=1a2b' },
    });
    expect(fetched.data).toEqual({ method: 'GET', url: '/play' });
  });
});

describe('an event or breadcrumb the filter does not expect', () => {
  it('passes it through untouched, and never throws', () => {
    const bare: ErrorEvent = { type: undefined };
    expect(scrub.scrubEvent(bare)).toEqual({ type: undefined });
    expect(scrub.scrubEvent({ type: undefined, exception: { values: [{}] } })).toEqual({
      type: undefined,
      exception: { values: [{}] },
    });
    const empty: Breadcrumb = {};
    expect(scrub.scrubBreadcrumb(empty)).toEqual({});
    expect(scrub.scrubBreadcrumb({ category: 'navigation', data: { from: 42 } })).toEqual({
      category: 'navigation',
      data: { from: 42 },
    });
  });
});
