import { describe, expect, it } from 'vitest';

import { ScrollError, ScrollRangeError } from '../errors';

describe('ScrollError — base class', () => {
  it('sets .name to the concrete class name', () => {
    expect(new ScrollError('boom').name).toBe('ScrollError');
    expect(new ScrollRangeError('out of range').name).toBe('ScrollRangeError');
  });

  it('is an instance of Error', () => {
    expect(new ScrollError('boom')).toBeInstanceOf(Error);
    expect(new ScrollRangeError('out of range')).toBeInstanceOf(Error);
  });

  it('supports cause chaining via opts?.cause', () => {
    const cause = new Error('original');
    const err = new ScrollRangeError('out of range', { cause });

    expect(err.cause).toBe(cause);
  });
});

describe('ScrollRangeError — subclass', () => {
  it('is an instanceof ScrollError', () => {
    expect(new ScrollRangeError('out of range')).toBeInstanceOf(ScrollError);
  });
});

describe('ScrollError.is()', () => {
  it('returns true for ScrollError and every subclass', () => {
    expect(ScrollError.is(new ScrollError('boom'))).toBe(true);
    expect(ScrollError.is(new ScrollRangeError('out of range'))).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(ScrollError.is(new Error('plain'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(ScrollError.is(undefined)).toBe(false);
    expect(ScrollError.is('boom')).toBe(false);
    expect(ScrollError.is({ message: 'boom' })).toBe(false);
  });
});
