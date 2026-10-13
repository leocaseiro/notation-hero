import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

/**
 * The privacy filter every report passes through before it leaves the browser.
 *
 * The names filter: a file name, a score's title or credits, or a track name quoted in an error's
 * message becomes `[file]`. Click breadcrumbs are off (web/instrumentation-client.ts), so what is
 * left to filter is an error's own text. No message quotes a name today, but a future bug could,
 * and E105, E901, E201–E204 and E206 keep their message.
 *
 * The address cut: a page address loses everything from its first `?` or `#`. Sentry 11's
 * `dataCollection` settings remove neither from the event's address or from its breadcrumbs.
 */

/** The parts of a score that can name it. AlphaTab's own `Score` fits this shape. */
export interface ScoreFacts {
  readonly title: string;
  readonly subTitle: string;
  readonly artist: string;
  readonly album: string;
  readonly words: string;
  readonly music: string;
  readonly copyright: string;
  readonly tab: string;
  readonly instructions: string;
  readonly notices: string;
  readonly tracks: readonly { readonly name: string; readonly shortName: string }[];
}

const REDACTED = '[file]';

// Shorter names are skipped, so a track named `1` cannot rewrite unrelated text.
const SHORTEST_NAME = 3;

// Every name seen in this tab, longest first, so a name that contains a shorter one goes whole.
// Never cleared: an error about one file can be sent after the next file opens.
let names: readonly string[] = [];

function remember(text: string): void {
  const name = text.trim();
  if (name.length < SHORTEST_NAME || names.includes(name)) return;
  names = [...names, name].toSorted((a, b) => b.length - a.length);
}

/** Called when a file is picked or dropped, before it is read. */
export function rememberOpenFile(fileName: string): void {
  remember(fileName);
}

/**
 * Called as soon as a file parses, before the new score replaces the open one: an E105 thrown
 * after the parse, or a crash drawing the new title, keeps its message and is sent before
 * AlphaTab's score-loaded event.
 */
export function rememberScore(score: ScoreFacts): void {
  const credits = [
    score.title,
    score.subTitle,
    score.artist,
    score.album,
    score.words,
    score.music,
    score.copyright,
    score.tab,
    score.instructions,
    score.notices,
  ];
  for (const text of credits) remember(text);
  for (const track of score.tracks) {
    remember(track.name);
    remember(track.shortName);
  }
}

/** `text` with every remembered name replaced, matched as written — never as a pattern. */
function scrubText(text: string): string {
  let scrubbed = text;
  for (const name of names) scrubbed = scrubbed.replaceAll(name, REDACTED);
  return scrubbed;
}

/** An address cut at its first `?` or `#`. */
function cutAddress(address: string): string {
  const cut = address.search(/[?#]/);
  return cut === -1 ? address : address.slice(0, cut);
}

/** Each stack frame's file address cut and its function name filtered, whatever their shape. */
function scrubFrames(frames: unknown): void {
  if (!Array.isArray(frames)) return;
  for (const frame of frames as unknown[]) {
    if (typeof frame !== 'object' || frame === null) continue;
    const fields = frame as { filename?: unknown; function?: unknown };
    if (typeof fields.filename === 'string') fields.filename = cutAddress(fields.filename);
    if (typeof fields.function === 'string') fields.function = scrubText(fields.function);
  }
}

/**
 * Sentry's `beforeSend` half: the names out of the event's free text — each exception's value, the
 * event's `message` and each stack frame's function name — and its page addresses cut: the event's
 * own and each stack frame's file address. Sentry gives a frameless uncaught error one frame named
 * after the page's full address, and it can parse a line of a multi-line message as a frame whose
 * function name is message text. Our own frames' addresses carry no query, so source maps still
 * match them. When a thrown non-Error object is passed to Sentry, it is copied whole into
 * `extra.__serialized__`, which this filter deletes to prevent unfiltered content from leaving. It
 * must never throw: Sentry 11 drops an event whose `beforeSend` throws.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (typeof event.message === 'string') event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (!exception) continue;
    if (typeof exception.value === 'string') exception.value = scrubText(exception.value);
    scrubFrames(exception.stacktrace?.frames);
  }
  if (typeof event.request?.url === 'string') event.request.url = cutAddress(event.request.url);
  if (event.extra && typeof event.extra === 'object') {
    Reflect.deleteProperty(event.extra, '__serialized__');
  }
  return event;
}

/**
 * Sentry's `beforeBreadcrumb`: navigation breadcrumbs carry `from` and `to`, fetch and xhr
 * breadcrumbs carry `url`. Each is cut when it is recorded.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const { data } = breadcrumb;
  if (data == null) return breadcrumb;
  for (const key of ['from', 'to', 'url']) {
    const value: unknown = data[key];
    if (typeof value === 'string') data[key] = cutAddress(value);
  }
  return breadcrumb;
}
