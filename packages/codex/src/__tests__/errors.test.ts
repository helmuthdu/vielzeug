import { describe, expect, it } from 'vitest';

import { CodexError, ToolError } from '../errors.js';

describe('CodexError', () => {
  it('sets name to the constructor name and is an instance of Error', () => {
    const err = new CodexError('boom');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CodexError');
    expect(err.message).toBe('boom');
  });

  it('chains a cause via ErrorOptions', () => {
    const cause = new Error('root cause');
    const err = new CodexError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });

  describe('CodexError.is', () => {
    it('returns true for a CodexError instance', () => {
      expect(CodexError.is(new CodexError('x'))).toBe(true);
    });

    it('returns true for a subclass instance', () => {
      expect(CodexError.is(new ToolError('INVALID_ARG', 'x'))).toBe(true);
    });

    it('returns false for a plain Error', () => {
      expect(CodexError.is(new Error('x'))).toBe(false);
    });

    it('returns false for non-error values', () => {
      expect(CodexError.is('boom')).toBe(false);
      expect(CodexError.is(null)).toBe(false);
      expect(CodexError.is(undefined)).toBe(false);
    });
  });
});

describe('ToolError', () => {
  it('is a CodexError with its own name and carries a machine-readable code', () => {
    const err = new ToolError('INVALID_ARG', 'packageSlug: required non-empty string.');

    expect(err).toBeInstanceOf(CodexError);
    expect(err.name).toBe('ToolError');
    expect(err.code).toBe('INVALID_ARG');
    expect(err.message).toBe('packageSlug: required non-empty string.');
  });

  it.each(['INVALID_ARG', 'NOT_FOUND', 'UNAVAILABLE'] as const)('supports code %s', (code) => {
    expect(new ToolError(code, 'x').code).toBe(code);
  });
});
