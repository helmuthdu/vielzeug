import { chunk } from '../array/chunk';
import { memo } from '../cache/memo';
import { ArsenalError, ArsenalSerializationError } from '../errors';

describe('ArsenalError', () => {
  it('is instanceof Error with correct name and message', () => {
    const err = new ArsenalSerializationError('test message');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ArsenalError);
    expect(err.name).toBe('ArsenalSerializationError');
    expect(err.message).toBe('test message');
  });

  it('uses standard errors for invalid input and ArsenalSerializationError for serialization failures', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow(RangeError);

    const circular: { self?: unknown } = {};

    circular.self = circular;

    expect(() => memo((value: unknown) => value)(circular)).toThrow(ArsenalSerializationError);
  });

  it('ArsenalSerializationError is an instanceof ArsenalError and Error', () => {
    expect(new ArsenalSerializationError('serialization')).toBeInstanceOf(ArsenalError);
    expect(new ArsenalSerializationError('serialization')).toBeInstanceOf(Error);
  });

  it('has a name matching its constructor', () => {
    expect(new ArsenalSerializationError('').name).toBe('ArsenalSerializationError');
  });

  it('ArsenalError.is() recognizes serialization errors only', () => {
    expect(ArsenalError.is(new ArsenalSerializationError(''))).toBe(true);
    expect(ArsenalError.is(new Error('not arsenal'))).toBe(false);
  });

  it('ArsenalError base accepts opts?.cause for chaining', () => {
    const cause = new Error('original');
    const err = new ArsenalSerializationError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });
});
