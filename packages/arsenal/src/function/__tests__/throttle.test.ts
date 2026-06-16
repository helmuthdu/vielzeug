import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { throttle } from '../throttle';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('throttle — leading only (default)', () => {
  it('invokes immediately on the first call', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);

    t();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignores calls within the throttle window', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);

    t();
    t();
    t();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('fires again after the window elapses', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);

    t();
    vi.advanceTimersByTime(100);
    t();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel() resets state so next call fires immediately', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);

    t();
    vi.advanceTimersByTime(50);
    t.cancel();
    t();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('pending() returns false — leading-only has no queued trailing call', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);

    t();
    expect(t.pending()).toBe(false);
  });

  it('flush() returns undefined when nothing is pending', () => {
    const fn = vi.fn(() => 99);
    const t = throttle(fn, 100);

    t();
    expect(t.flush()).toBeUndefined();
  });
});

describe('throttle — leading: false', () => {
  it('does not invoke immediately', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: false, trailing: false });

    t();
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not fire at all without trailing', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: false, trailing: false });

    t();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('throttle — trailing edge', () => {
  it('schedules a trailing call with the last args', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: true, trailing: true });

    t(1);
    expect(fn).toHaveBeenCalledWith(1);

    t(2);
    t(3);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('pending() returns true when a trailing call is scheduled', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: true, trailing: true });

    t();
    t();
    expect(t.pending()).toBe(true);
  });

  it('flush() fires the trailing call immediately', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: true, trailing: true });

    t('a');
    t('b');
    t.flush();
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('cancel() drops the trailing call', () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: true, trailing: true });

    t(1);
    t(2);
    t.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
