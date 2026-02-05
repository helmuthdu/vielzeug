import { throttle } from '../throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have cancel, flush, and pending methods', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn);

    expect(typeof throttledFn.cancel).toBe('function');
    expect(typeof throttledFn.flush).toBe('function');
    expect(typeof throttledFn.pending).toBe('function');
  });

  it('should execute immediately on first call (leading)', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 1000);

    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('should execute on trailing edge with latest args', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 1000);

    throttled('a'); // leading
    throttled('b');
    throttled('c'); // latest

    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('should respect custom delay', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 500);

    throttled();
    vi.advanceTimersByTime(499);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1); // no trailing call because no queued args

    throttled();
    expect(fn).toHaveBeenCalledTimes(2); // enough time passed
  });

  it('should support leading: false option', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 1000, { leading: false, trailing: true });

    throttled('test');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('test');
  });

  it('should support trailing: false option', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 1000, { leading: true, trailing: false });

    throttled('a'); // leading call
    throttled('b'); // ignored

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('should cancel pending calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 1000);

    throttled('a');
    throttled('b'); // queued
    expect(throttled.pending()).toBe(true);

    throttled.cancel();
    expect(throttled.pending()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1); // only 'a' was called
  });

  it('should flush pending calls immediately', () => {
    const fn = vi.fn().mockReturnValue('result');
    const throttled = throttle(fn, 1000);

    throttled('a');
    throttled('b'); // queued

    const result = throttled.flush();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
    expect(result).toBe('result');
    expect(throttled.pending()).toBe(false);
  });

  it('should preserve this context', () => {
    const context = { value: 42 };
    const fn = vi.fn(function (this: typeof context) {
      return this.value;
    });
    const throttled = throttle(fn, 1000);

    throttled.call(context);
    throttled.call(context);

    vi.advanceTimersByTime(1000);
    expect(fn.mock.instances).toEqual([context, context]);
  });

  it('should throw for invalid arguments', () => {
    // @ts-expect-error - testing invalid input
    expect(() => throttle('not a function')).toThrow(TypeError);
    expect(() => throttle(() => {}, -1)).toThrow(TypeError);
    // @ts-expect-error - testing invalid input
    expect(() => throttle(() => {}, 'invalid')).toThrow(TypeError);
  });
});
