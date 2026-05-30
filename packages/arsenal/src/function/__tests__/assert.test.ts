import { assert } from '../assert';

describe('assert', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('should include context in the error message', () => {
    const context = { value: 42 };

    expect(() => assert(false, 'Test error', { args: context })).toThrowError(
      'Test error\nArguments: {\n  "value": 42\n}',
    );
  });

  it('should handle circular references in args without throwing', () => {
    const circular: Record<string, unknown> = { a: 1 };

    circular['self'] = circular;

    expect(() => assert(false, 'Circular', { args: circular })).toThrowError('Circular');
  });

  it('should include serializable keys when args contains circular references', () => {
    const circular: Record<string, unknown> = { safe: 'value' };

    circular['loop'] = circular;

    let caughtError: Error | undefined;

    try {
      assert(false, 'Partial', { args: circular });
    } catch (e) {
      caughtError = e as Error;
    }

    expect(caughtError?.message).toContain('safe: "value"');
    expect(caughtError?.message).toContain('loop: [circular]');
  });

  it('should use the provided ErrorType', () => {
    class CustomError extends Error {}

    expect(() => assert(false, 'Custom error', { type: CustomError as any })).toThrowError(CustomError);
  });
});
