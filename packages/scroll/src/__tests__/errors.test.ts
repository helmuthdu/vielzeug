import { describe, expect, it } from 'vitest';

import { ScrollConfigError, ScrollError, ScrollRangeError } from '../errors';

describe('ScrollError: base class', () => {
  it('sets .name to the concrete class name', () => {
    expect(new ScrollConfigError('invalid option').name).toBe('ScrollConfigError');
    expect(new ScrollError('boom').name).toBe('ScrollError');
    expect(new ScrollRangeError('out of range').name).toBe('ScrollRangeError');
  });

  it('is an instance of Error', () => {
    expect(new ScrollConfigError('invalid option')).toBeInstanceOf(Error);
    expect(new ScrollError('boom')).toBeInstanceOf(Error);
    expect(new ScrollRangeError('out of range')).toBeInstanceOf(Error);
  });

  it('supports cause chaining via opts?.cause', () => {
    const cause = new Error('original');
    const err = new ScrollRangeError('out of range', { cause });

    expect(err.cause).toBe(cause);
  });
});

describe('ScrollRangeError: subclass', () => {
  it('is an instanceof ScrollError', () => {
    expect(new ScrollRangeError('out of range')).toBeInstanceOf(ScrollError);
  });
});
