import { Logit } from '@vielzeug/logit';
import { assert } from '../assert';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('assert', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing if the condition is true', () => {
    expect(() => assert(true)).not.toThrow();
  });

  it('should throw an error if the condition is false', () => {
    expect(() => assert(false, 'Test error')).toThrowError('Test error');
  });

  it('should throw a default error message if no message is provided', () => {
    expect(() => assert(false)).toThrowError('Assertion failed');
  });

  it('should log a warning if bypass is true', () => {
    assert(false, 'Test warning', { bypass: true });
    expect(Logit.warn).toHaveBeenCalledWith('Test warning');
  });

  it('should include context in the error message', () => {
    const context = { value: 42 };
    expect(() => assert(false, 'Test error', { args: context })).toThrowError(
      'Test error\nArguments: {\n  "value": 42\n}',
    );
  });

  it('should use the provided ErrorType', () => {
    class CustomError extends Error {}
    // @ts-expect-error
    expect(() => assert(false, 'Custom error', { type: CustomError })).toThrowError(CustomError);
  });

  it('should handle multiple conditions', () => {
    expect(() => assert([true, true])).not.toThrow();
    expect(() => assert([true, false], 'One condition failed')).toThrowError('One condition failed');
  });
});
