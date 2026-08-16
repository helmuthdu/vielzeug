import { describe, expect, it } from 'vitest';

import { SandboxConfigurationError, SandboxError } from '../errors.js';

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

  it('identifies configuration errors as SandboxError instances', () => {
    const err = new SandboxConfigurationError('invalid origin');

    expect(err).toBeInstanceOf(SandboxError);
    expect(err.name).toBe('SandboxConfigurationError');
  });
});
