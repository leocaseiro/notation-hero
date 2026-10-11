import { describe, expect, it } from 'vitest';

import { fileType } from './OpenFileControl';

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
