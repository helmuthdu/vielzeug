import { describe, expect, it } from 'vitest';

import { PrismDisposedError, PrismError, PrismRenderError } from '../errors';

describe('PrismError', () => {
  it('sets name to the concrete subclass name', () => {
    const err = new PrismRenderError('bad config');

    expect(err.name).toBe('PrismRenderError');
  });

  it('preserves the message', () => {
    const err = new PrismRenderError('bad config');

    expect(err.message).toBe('bad config');
  });

  it('is a real Error instance (stack, instanceof Error)', () => {
    const err = new PrismRenderError('bad config');

    expect(err).toBeInstanceOf(Error);
    expect(typeof err.stack).toBe('string');
  });

  it('chains a cause via ErrorOptions', () => {
    const cause = new Error('root cause');
    const err = new PrismRenderError('bad config', { cause });

    expect(err.cause).toBe(cause);
  });

  describe('static is()', () => {
    it('returns true for any PrismError subclass instance', () => {
      expect(PrismError.is(new PrismRenderError('x'))).toBe(true);
      expect(PrismError.is(new PrismDisposedError('x'))).toBe(true);
      expect(PrismError.is(new PrismError('x'))).toBe(true);
    });

    it('returns false for a plain Error', () => {
      expect(PrismError.is(new Error('x'))).toBe(false);
    });

    it('returns false for non-error values', () => {
      expect(PrismError.is('not an error')).toBe(false);
      expect(PrismError.is(null)).toBe(false);
      expect(PrismError.is(undefined)).toBe(false);
      expect(PrismError.is({ message: 'fake' })).toBe(false);
    });
  });
});

describe('PrismRenderError', () => {
  it('is an instanceof PrismError (base-class polymorphism)', () => {
    const err = new PrismRenderError('invalid container');

    expect(err).toBeInstanceOf(PrismError);
    expect(err).toBeInstanceOf(PrismRenderError);
  });
});

describe('PrismDisposedError', () => {
  it('is constructible and an instanceof PrismError even though no code path throws it yet', () => {
    const err = new PrismDisposedError('method called after dispose');

    expect(err).toBeInstanceOf(PrismError);
    expect(err.name).toBe('PrismDisposedError');
  });
});
