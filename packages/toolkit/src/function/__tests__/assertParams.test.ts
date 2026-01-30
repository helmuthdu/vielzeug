import { describe, expect, it, vi, afterEach } from 'vitest';
import { Logit } from '@vielzeug/logit';
import { assertParams } from '../assertParams';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('assertParams', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not throw if all keys are present and not empty', () => {
    const params = { id: '123', name: 'John' };
    expect(() => assertParams(params, ['id', 'name'])).not.toThrow();
  });

  it('should throw if a key is missing', () => {
    const params = { id: '123' };
    // @ts-expect-error
    expect(() => assertParams(params, ['name'])).toThrowError(
      'Missing required parameter: "name"',
    );
  });

  it('should throw if a key is an empty string', () => {
    const params = { id: '123', name: '' };
    expect(() => assertParams(params, ['name'])).toThrowError(
      'Missing required parameter: "name"',
    );
  });

  it('should throw with multiple missing keys', () => {
    const params = {};
    // @ts-expect-error
    expect(() => assertParams(params, ['id', 'name'])).toThrowError(
      'Missing required parameters: "id", "name"',
    );
  });

  it('should include context name if provided', () => {
    const params = { id: '123', name: '' };
    expect(() => assertParams(params, ['name'], 'UserUpdate')).toThrowError(
      'Missing required parameter: "name" in "UserUpdate"',
    );
  });

  it('should throw if params is null or undefined', () => {
    // @ts-expect-error
    expect(() => assertParams(null, ['id'])).toThrowError('Missing parameters object');
    // @ts-expect-error
    expect(() => assertParams(undefined, ['id'])).toThrowError('Missing parameters object');
  });

  it('should support custom error type', () => {
    class CustomError extends Error {}
    const params = { id: '' };
    expect(() => assertParams(params, ['id'], 'Context', { type: CustomError })).toThrowError(CustomError);
  });

  it('should support bypass mode', () => {
    const params = { id: '' };
    assertParams(params, ['id'], 'Context', { bypass: true });
    expect(Logit.warn).toHaveBeenCalledWith('Missing required parameter: "id" in "Context"');
  });

  it('should handle empty keys array', () => {
    const params = { id: '123' };
    expect(() => assertParams(params, [])).not.toThrow();
  });
});
