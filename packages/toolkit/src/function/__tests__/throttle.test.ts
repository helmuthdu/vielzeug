import { beforeAll } from 'vitest';
import { throttle } from '../throttle';

describe('throttle', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  it('should call the function immediately on the first call', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 1000);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not call the function again if called within the throttle period', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 1000);

    throttledFn();
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should call the function again after the throttle period has passed', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 1000);

    throttledFn();
    vi.advanceTimersByTime(1000);
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should pass the correct arguments to the throttled function', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 1000);

    throttledFn('arg1', 'arg2');
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should use the default throttle time of 700ms if no time is provided', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn);

    throttledFn();
    vi.advanceTimersByTime(700);
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
