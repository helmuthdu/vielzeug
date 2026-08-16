import { describe, expect, it } from 'vitest';

import { PrismError, PrismRenderError } from '../errors';

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
});

describe('PrismRenderError', () => {
  it('is an instanceof PrismError (base-class polymorphism)', () => {
    const err = new PrismRenderError('invalid container');

    expect(err).toBeInstanceOf(PrismError);
    expect(err).toBeInstanceOf(PrismRenderError);
  });
});
