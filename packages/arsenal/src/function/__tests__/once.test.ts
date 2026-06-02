import { once } from '../once';

describe('once', () => {
  it('calls the wrapped function only once', () => {
    const fn = vi.fn(() => Math.random());
    const onceRandom = once(fn);

    onceRandom();
    onceRandom();
    onceRandom();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns the same result on every call', () => {
    const onceRandom = once(() => Math.random());
    const first = onceRandom();

    expect(onceRandom()).toBe(first);
    expect(onceRandom()).toBe(first);
  });

  it('passes arguments on the first call', () => {
    const fn = vi.fn((x: number) => x * 2);
    const onceFn = once(fn);

    expect(onceFn(5)).toBe(10);
    expect(onceFn(99)).toBe(10); // ignores subsequent args
  });

  it('reset() allows the function to run again', () => {
    const fn = vi.fn(() => 42);
    const onceFn = once(fn);

    onceFn();
    onceFn.reset();
    onceFn();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns undefined after reset until next call', () => {
    const onceFn = once(() => 7);

    expect(onceFn()).toBe(7);
    onceFn.reset();

    const result = onceFn();

    expect(result).toBe(7); // re-runs after reset
  });
});
