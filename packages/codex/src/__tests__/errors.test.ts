import { describe, expect, it } from 'vitest';

import { CodexError, ToolArgError } from '../errors.js';

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
      expect(CodexError.is(new ToolArgError('x'))).toBe(true);
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

describe('ToolArgError', () => {
  it('is a CodexError with its own name', () => {
    const err = new ToolArgError('packageSlug: required non-empty string.');

    expect(err).toBeInstanceOf(CodexError);
    expect(err.name).toBe('ToolArgError');
    expect(err.message).toBe('packageSlug: required non-empty string.');
  });
});
