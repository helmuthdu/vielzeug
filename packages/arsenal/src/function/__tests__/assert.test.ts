import { assert } from '../assert';

describe('assert', () => {
  it('should do nothing if the condition is true', () => {
    expect(() => assert(true)).not.toThrow();
  });

  it('should throw an error if the condition is false', () => {
    expect(() => assert(false, 'Test error')).toThrowError('Test error');
  });

  it('should throw a default error message if no message is provided', () => {
    expect(() => assert(false)).toThrowError('Assertion failed');
  });

  it('should use the provided ErrorType', () => {
    class CustomError extends Error {}

    expect(() => assert(false, 'Custom error', { type: CustomError as ErrorConstructor })).toThrowError(CustomError);
  });

  it('should throw a TypeError when type is TypeError', () => {
    expect(() => assert(false, 'type error', { type: TypeError })).toThrowError(TypeError);
  });
});
