import { debounce } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have cancel, flush, and pending methods', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn);

    expect(typeof debouncedFn.cancel).toBe('function');
    expect(typeof debouncedFn.flush).toBe('function');
    expect(typeof debouncedFn.pending).toBe('function');
  });

  it('should delay execution by specified time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 500);

    debounced('test');
    expect(fn).not.toBeCalled();
    expect(debounced.pending()).toBe(true);

    vi.advanceTimersByTime(499);
    expect(fn).not.toBeCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith('test');
    expect(debounced.pending()).toBe(false);
  });

  it('should use latest arguments from multiple calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(100);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith('third');
  });

  it('should reset delay on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toBeCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toBeCalledTimes(1);
  });

  it('should cancel pending execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('test');
    expect(debounced.pending()).toBe(true);

    debounced.cancel();
    expect(debounced.pending()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(fn).not.toBeCalled();
  });

  it('should flush pending execution immediately', () => {
    const fn = vi.fn().mockReturnValue('result');
    const debounced = debounce(fn, 100);

    debounced('test');
    expect(fn).not.toBeCalled();

    const result = debounced.flush();
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith('test');
    expect(result).toBe('result');
    expect(debounced.pending()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(fn).toBeCalledTimes(1); // still only 1
  });

  it('should return undefined when flushing with no pending call', () => {
    const fn = vi.fn().mockReturnValue('result');
    const debounced = debounce(fn, 100);

    const result = debounced.flush();
    expect(fn).not.toBeCalled();
    expect(result).toBe(undefined);
  });

  it('should preserve this context', () => {
    const context = { value: 42 };
    const fn = vi.fn(function (this: typeof context) {
      return this.value;
    });
    const debounced = debounce(fn, 100);

    debounced.call(context);
    vi.advanceTimersByTime(100);

    expect(fn).toBeCalledTimes(1);
    expect(fn.mock.instances[0]).toBe(context);
  });

  it('should throw for invalid arguments', () => {
    // @ts-expect-error - testing invalid input
    expect(() => debounce('not a function')).toThrow(TypeError);
    expect(() => debounce(() => {}, -1)).toThrow(TypeError);
    // @ts-expect-error - testing invalid input
    expect(() => debounce(() => {}, 'invalid')).toThrow(TypeError);
  });
});
