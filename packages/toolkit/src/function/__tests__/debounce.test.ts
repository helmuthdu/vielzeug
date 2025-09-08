import { debounce } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a debounced function with default options', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn);

    expect(typeof debouncedFn).toBe('function');
  });

  it('should delay function execution by default delay time', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn);

    debouncedFn();

    expect(fn).not.toBeCalled();
    vi.advanceTimersByTime(300); // Default delay
    expect(fn).toBeCalledTimes(1);
  });

  it('should delay function execution by specified delay time', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 500);

    debouncedFn();
    expect(fn).not.toBeCalled();

    vi.advanceTimersByTime(499);
    expect(fn).not.toBeCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toBeCalledTimes(1);
  });

  it('should handle multiple calls correctly', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(fn).not.toBeCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toBeCalledTimes(1);
  });

  it('should pass arguments correctly', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn);

    debouncedFn('test', 123);

    expect(fn).not.toBeCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toBeCalledWith('test', 123);
  });

  it('should handle return values correctly', () => {
    const fn = vi.fn().mockReturnValue('result');
    const debouncedFn = debounce(fn);

    debouncedFn();

    expect(fn).not.toBeCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toReturnWith('result');
  });
});
