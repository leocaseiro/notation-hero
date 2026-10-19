import { toast } from '@notation-hero/client';
import { captureException } from '@sentry/nextjs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addInstrumentsTag, tagInstruments } from '../../lib/monitoring/report';
import { OpenFileControl, fileType } from './OpenFileControl';
import type * as Sentry from '@sentry/nextjs';

describe('fileType', () => {
  it('names an extension the picker accepts, in lower case', () => {
    expect(fileType('Song.GP5')).toBe('gp5');
    expect(fileType('riff.gp')).toBe('gp');
    expect(fileType('score.musicxml')).toBe('musicxml');
    expect(fileType('.gp')).toBe('gp');
  });

  it('says other for any other extension, and for none', () => {
    expect(fileType('notes.txt')).toBe('other');
    expect(fileType('riff.gp.bak')).toBe('other');
    expect(fileType('README')).toBe('other');
    expect(fileType('song.')).toBe('other');
  });
});

/** Picks `file` the way the hidden input receives it. */
function pick(file: File): void {
  fireEvent.change(screen.getByTestId('open-file-input'), { target: { files: [file] } });
}

/** A file whose read fails the way a moved or deleted file does. */
function unreadable(name: string): File {
  const file = new File(['x'], name);
  file.arrayBuffer = () =>
    Promise.reject(new DOMException('The file could not be read.', 'NotReadableError'));
  return file;
}

/** The instruments tag Sentry's hook would add to a report captured right now. */
const tagNow = () => {
  const event: Sentry.Event = {};
  addInstrumentsTag(event);
  return event.tags?.instruments;
};

describe('the open-file catch', () => {
  beforeEach(() => {
    vi.mocked(captureException).mockReset();
    vi.restoreAllMocks();
  });

  it('reports a read that fails as an E102 warning: its fixed sentence, its type and size', async () => {
    const toastError = vi.spyOn(toast, 'error');
    render(<OpenFileControl onNotation={vi.fn()} />);
    pick(unreadable('Night Drive.gp'));

    await waitFor(() => expect(captureException).toHaveBeenCalledOnce());
    const [[sent, hint]] = vi.mocked(captureException).mock.calls;
    expect((sent as Error).message).toBe(
      'E102: The browser could not read the file — moved, deleted or unmounted after it was picked.',
    );
    expect(hint).toEqual({
      captureContext: {
        level: 'warning',
        tags: { code: 'E102', file_type: 'gp' },
        contexts: { file: { type: 'gp', bytes: 1 } },
      },
    });
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('(Error E102)'), {
      id: 'E102:Night Drive.gp',
    });
  });

  it('reports a failure after the read as an E105 error that keeps its message', async () => {
    const toastError = vi.spyOn(toast, 'error');
    const bug = new Error("Cannot read properties of undefined (reading 'tracks')");
    render(<OpenFileControl onNotation={() => Promise.reject(bug)} />);
    pick(new File(['bytes'], 'song.gp'));

    await waitFor(() => expect(captureException).toHaveBeenCalledOnce());
    expect(vi.mocked(captureException).mock.calls).toEqual([
      [
        bug,
        {
          captureContext: {
            level: 'error',
            tags: { code: 'E105', file_type: 'gp' },
            // Five bytes, sent rounded up to the next power of two.
            contexts: { file: { type: 'gp', bytes: 8 } },
          },
        },
      ],
    ]);
    expect(toastError).toHaveBeenCalledWith(
      'song.gp could not be opened. Something went wrong on our side, not with your file. Try again, or reload the page. (Error E105)',
      { id: 'E105:song.gp' },
    );
  });

  it('carries no instruments tag on either failure, and puts it back once the open ends', async () => {
    // What Sentry's hook reads at the moment of each report, on /play.
    history.replaceState(null, '', '/play');
    const atCapture: unknown[] = [];
    vi.mocked(captureException).mockImplementation(() => {
      atCapture.push(tagNow());
      return 'event-id';
    });
    tagInstruments('drums,030');

    const { unmount } = render(
      <OpenFileControl onNotation={() => Promise.reject(new Error('our bug'))} />,
    );
    pick(unreadable('first.gp'));
    await waitFor(() => expect(atCapture).toHaveLength(1));
    pick(new File(['bytes'], 'second.gp'));
    await waitFor(() => expect(atCapture).toHaveLength(2));

    expect(atCapture).toEqual([undefined, undefined]);
    expect(tagNow()).toBe('drums,030');
    unmount();
  });
});
