import { describe, expect, it } from 'vitest';

import { KeymapError, KeymapParseError } from '../errors';
import { createKeymap } from '../keymap';
import { parseShortcut } from '../parser';

describe('KeymapError', () => {
  it('sets name to the concrete subclass name', () => {
    const err = new KeymapParseError('boom');

    expect(err.name).toBe('KeymapParseError');
  });

  it('is an instance of both KeymapError and Error', () => {
    const err = new KeymapParseError('boom');

    expect(err).toBeInstanceOf(KeymapError);
    expect(err).toBeInstanceOf(Error);
  });

  it('supports a cause via ErrorOptions', () => {
    const cause = new Error('root cause');
    const err = new KeymapError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });

  describe('real throw sites surface KeymapParseError instances', () => {
    it('parseShortcut() throws a KeymapParseError for an invalid step', () => {
      expect(() => parseShortcut('ctrl')).toThrow(KeymapParseError);
    });

    it('parseShortcut() throws a KeymapParseError for an ambiguous step', () => {
      expect(() => parseShortcut('ctrl+k+j')).toThrow(KeymapParseError);
    });

    it('createKeymap() propagates KeymapParseError from an invalid initial binding', () => {
      expect(() => createKeymap({ ctrl: () => {} })).toThrow(KeymapParseError);
    });
  });
});
