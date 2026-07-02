import { describe, expect, it } from 'vitest';

import { SandboxError } from '../errors.js';

describe('SandboxError', () => {
  it('is instanceof Error and SandboxError with correct name and message', () => {
    const err = new SandboxError('something went wrong');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SandboxError);
    expect(err.name).toBe('SandboxError');
    expect(err.message).toBe('something went wrong');
  });

  it('accepts opts?.cause for error chaining', () => {
    const cause = new Error('original failure');
    const err = new SandboxError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });

  it('a subclass reports its own constructor name via new.target', () => {
    class SandboxFooError extends SandboxError {}

    const err = new SandboxFooError('foo failed');

    expect(err.name).toBe('SandboxFooError');
    expect(err).toBeInstanceOf(SandboxFooError);
    expect(err).toBeInstanceOf(SandboxError);
    expect(err).toBeInstanceOf(Error);
  });

  it('a subclass instance has the subclass prototype (instanceof works after setPrototypeOf)', () => {
    class SandboxFooError extends SandboxError {}

    const err = new SandboxFooError('foo failed');

    expect(Object.getPrototypeOf(err)).toBe(SandboxFooError.prototype);
  });

  describe('is()', () => {
    it('returns true for a direct SandboxError instance', () => {
      expect(SandboxError.is(new SandboxError('boom'))).toBe(true);
    });

    it('returns true for a subclass instance', () => {
      class SandboxFooError extends SandboxError {}

      expect(SandboxError.is(new SandboxFooError('boom'))).toBe(true);
    });

    it('returns false for a plain Error', () => {
      expect(SandboxError.is(new Error('boom'))).toBe(false);
    });

    it('returns false for non-error values (null, undefined, string, object)', () => {
      expect(SandboxError.is(null)).toBe(false);
      expect(SandboxError.is(undefined)).toBe(false);
      expect(SandboxError.is('boom')).toBe(false);
      expect(SandboxError.is({ message: 'boom', name: 'SandboxError' })).toBe(false);
    });
  });
});
