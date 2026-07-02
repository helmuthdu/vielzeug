import { describe, expect, it } from 'vitest';

import { formatCaughtError } from '../formatCaughtError';

describe('formatCaughtError', () => {
  it('prefers the stack trace for an Error instance', () => {
    const err = new Error('boom');

    expect(formatCaughtError(err)).toBe(err.stack);
  });

  it('falls back to the message when an Error has no stack', () => {
    const err = new Error('boom');

    err.stack = undefined;
    expect(formatCaughtError(err)).toBe('boom');
  });

  it('stringifies non-Error thrown values', () => {
    expect(formatCaughtError('a plain string')).toBe('a plain string');
    expect(formatCaughtError(42)).toBe('42');
    expect(formatCaughtError({ code: 'X' })).toBe('[object Object]');
  });
});
