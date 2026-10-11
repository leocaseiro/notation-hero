import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * The fake DSN every build of this lane reports to (`webServer.env` in
 * web/playwright.e2e.config.ts). `.invalid` is reserved and never resolves (RFC 6761), so a page
 * that does not install this recorder sends its session ping nowhere.
 */
const SENTRY_HOST = 'https://sentry.invalid';

/** What the tests read from a recorded error or warning event. */
export interface RecordedEvent {
  readonly level?: string;
  readonly message?: string;
  readonly tags?: Readonly<Record<string, string>>;
  readonly contexts?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly exception?: {
    readonly values?: readonly {
      readonly value?: string;
      readonly mechanism?: { readonly handled?: boolean };
    }[];
  };
  readonly breadcrumbs?: readonly {
    readonly category?: string;
    readonly message?: string;
    readonly data?: Readonly<Record<string, unknown>>;
  }[];
  readonly sdk?: {
    readonly integrations?: readonly string[];
    readonly settings?: { readonly infer_ip?: string };
  };
}

export interface SentryRecorder {
  /** Every envelope body as it arrived, for "this text appears nowhere" checks. */
  readonly raw: () => string[];
  /** Error and warning events only — never a session ping or a client report. */
  readonly events: () => RecordedEvent[];
}

/** An envelope body: a header line, then pairs of item-header and payload lines. */
function eventsIn(body: string): RecordedEvent[] {
  const lines = body.split('\n').filter((line) => line.length > 0);
  const events: RecordedEvent[] = [];
  for (let at = 1; at + 1 < lines.length; at += 2) {
    const header = JSON.parse(lines[at]) as { readonly type?: string };
    if (header.type === 'event') events.push(JSON.parse(lines[at + 1]) as RecordedEvent);
  }
  return events;
}

/**
 * Routes every request to the fake DSN host, answers it, and records its envelope. Install it
 * BEFORE the first `page.goto`: a report can leave during the first load.
 */
export async function recordSentry(page: Page): Promise<SentryRecorder> {
  const bodies: string[] = [];
  await page.route(`${SENTRY_HOST}/**`, async (route) => {
    bodies.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return { raw: () => [...bodies], events: () => bodies.flatMap((body) => eventsIn(body)) };
}

/** The events tagged with `code`. */
export const withCode = (recorder: SentryRecorder, code: string): RecordedEvent[] =>
  recorder.events().filter((event) => event.tags?.code === code);

/** The first exception's message, as it was sent. */
export const messageOf = (event: RecordedEvent): string | undefined =>
  event.exception?.values?.[0]?.value;

/**
 * Throws an uncaught error in the page and waits until its report arrives. A throw from a timer
 * reaches the page's `error` handler; a throw directly inside `page.evaluate` only rejects the
 * evaluate call. Every case that expects nothing else to be sent ends with one: without it, a
 * recorder that captured nothing at all would pass. Never add a sentinel's text to the known-noise
 * list — the Sentry filter reads that list too.
 */
export async function throwSentinel(
  page: Page,
  recorder: SentryRecorder,
  text: string,
  // The message the report should carry once the names filter has run, when that differs.
  sent: string = text,
): Promise<RecordedEvent> {
  await page.evaluate((message) => {
    setTimeout(() => {
      throw new Error(message);
    }, 0);
  }, text);
  await expect
    .poll(() => recorder.events().filter((event) => messageOf(event) === sent).length, {
      timeout: 15_000,
    })
    .toBe(1);
  const sentinel = recorder.events().find((event) => messageOf(event) === sent);
  if (sentinel === undefined) throw new Error(`the sentinel "${sent}" was never recorded`);
  return sentinel;
}
