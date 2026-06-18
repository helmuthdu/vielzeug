import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMES, resolveRetryDelay } from '../retry';

describe('DEFAULT_TIMES', () => {
  it('equals 1 (single attempt, no retries)', () => {
    expect(DEFAULT_TIMES).toBe(1);
  });
});

describe('resolveRetryDelay', () => {
  it('calls a function delay with the attempt index', () => {
    const results = [0, 1, 2].map((attempt) => resolveRetryDelay(attempt, (a) => a * 100));

    expect(results).toEqual([0, 100, 200]);
  });

  it('returns a static number delay', () => {
    expect(resolveRetryDelay(0, 500)).toBe(500);
    expect(resolveRetryDelay(3, 500)).toBe(500);
  });

  it('clamps negative static delays to 0', () => {
    expect(resolveRetryDelay(0, -100)).toBe(0);
  });

  it('clamps negative function delays to 0', () => {
    expect(resolveRetryDelay(0, () => -50)).toBe(0);
  });

  it('returns 0 when function returns Infinity', () => {
    expect(resolveRetryDelay(0, () => Infinity)).toBe(0);
  });

  it('returns 0 when static delay is Infinity', () => {
    expect(resolveRetryDelay(0, Infinity)).toBe(0);
  });

  it('returns a finite non-negative number for the default jitter backoff', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const delay = resolveRetryDelay(attempt);

      expect(delay).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(delay)).toBe(true);
    }
  });
});
