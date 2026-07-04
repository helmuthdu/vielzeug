import { chunk } from '../array/chunk';
import { memo } from '../cache/memo';
import { ArsenalError, ArsenalSerializationError, ArsenalValidationError } from '../errors';

describe('ArsenalError', () => {
  it('is instanceof Error with correct name and message', () => {
    const err = new ArsenalValidationError('test message');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ArsenalError);
    expect(err).toBeInstanceOf(ArsenalValidationError);
    expect(err.name).toBe('ArsenalValidationError');
    expect(err.message).toBe('test message');
  });

  it('each error condition throws the correct named subclass', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow(ArsenalValidationError);

    const circular: { self?: unknown } = {};

    circular.self = circular;

    expect(() => memo((value: unknown) => value)(circular)).toThrow(ArsenalSerializationError);
  });

  it('each named subclass is an instanceof ArsenalError and Error', () => {
    expect(new ArsenalValidationError('invalid')).toBeInstanceOf(ArsenalError);
    expect(new ArsenalValidationError('invalid')).toBeInstanceOf(Error);
    expect(new ArsenalSerializationError('serialization')).toBeInstanceOf(ArsenalError);
    expect(new ArsenalSerializationError('serialization')).toBeInstanceOf(Error);
  });

  it('each subclass has a correct .name matching the constructor', () => {
    expect(new ArsenalValidationError('').name).toBe('ArsenalValidationError');
    expect(new ArsenalSerializationError('').name).toBe('ArsenalSerializationError');
  });

  it('ArsenalError.is() returns true for any subclass', () => {
    expect(ArsenalError.is(new ArsenalValidationError(''))).toBe(true);
    expect(ArsenalError.is(new ArsenalSerializationError(''))).toBe(true);
    expect(ArsenalError.is(new Error('not arsenal'))).toBe(false);
  });

  it('ArsenalError base accepts opts?.cause for chaining', () => {
    const cause = new Error('original');
    const err = new ArsenalSerializationError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });
});
