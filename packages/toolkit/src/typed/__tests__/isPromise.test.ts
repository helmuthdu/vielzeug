import { isPromise } from '../isPromise';

describe('isPromise', () => {
  it('should return true for a Promise instance', () => {
    const promise = new Promise((resolve) => resolve(true));
    expect(isPromise(promise)).toBe(true);
  });

  it('should return true for an async function', () => {
    const asyncFn = async () => {};
    expect(isPromise(asyncFn())).toBe(true);
  });

  it('should return false for non-promise values', () => {
    expect(isPromise(null)).toBe(false);
    expect(isPromise(undefined)).toBe(false);
    expect(isPromise(42)).toBe(false);
    expect(isPromise('string')).toBe(false);
    expect(isPromise({})).toBe(false);
    expect(isPromise([])).toBe(false);
  });

  it('should return false for a function that is not async', () => {
    const fn = () => {};
    expect(isPromise(fn())).toBe(false);
  });
});
