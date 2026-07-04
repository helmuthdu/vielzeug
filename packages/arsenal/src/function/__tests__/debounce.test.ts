import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from '../debounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('debounce — trailing (default)', () => {
  it('does not invoke immediately', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d();
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes after the delay', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on repeated calls within the window', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d();
    vi.advanceTimersByTime(50);
    d();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls with the most recent arguments', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d(1);
    d(2);
    d(3);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('cancel() prevents the pending call', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d();
    d.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('pending() returns true within window, false after', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d();
    expect(d.pending()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(d.pending()).toBe(false);
  });

  it('flush() invokes immediately and clears the timer', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d('x');
    d.flush();
    expect(fn).toHaveBeenCalledWith('x');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush() returns undefined when no call is pending', () => {
    const fn = vi.fn(() => 42);
    const d = debounce(fn, 100);

    expect(d.flush()).toBeUndefined();
  });
});

describe('debounce — leading only', () => {
  it('invokes immediately on the first call', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: false });

    d();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignores calls within the cooldown window', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: false });

    d();
    d();
    d();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('fires again after the cooldown window elapses', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: false });

    d();
    vi.advanceTimersByTime(100);
    d();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel() resets the cooldown so leading fires again', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: false });

    d();
    d.cancel();
    d();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('debounce — leading + trailing', () => {
  it('fires on both the leading and trailing edges', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: true });

    d('first');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('first');

    d('second');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });

  it('trailing call uses the most recent args', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: true });

    d('a');
    d('b');
    d('c');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('fires exactly once for a single call — regression for the leading+trailing double-fire bug', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100, { leading: true, trailing: true });

    d('only');
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('debounce — no-op configuration', () => {
  it('warns when both leading and trailing are false', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    debounce(vi.fn(), 100, { leading: false, trailing: false });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/arsenal]'));
    warnSpy.mockRestore();
  });
});
