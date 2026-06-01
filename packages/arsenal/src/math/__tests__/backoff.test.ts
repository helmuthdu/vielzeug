import { backoff } from '../backoff';

describe('backoff', () => {
  it('returns 1000ms for attempt 0', () => {
    expect(backoff(0)).toBe(1000);
  });

  it('doubles the delay each attempt', () => {
    expect(backoff(1)).toBe(2000);
    expect(backoff(2)).toBe(4000);
    expect(backoff(3)).toBe(8000);
  });

  it('caps at 30 000ms by default', () => {
    expect(backoff(10)).toBe(30_000);
    expect(backoff(100)).toBe(30_000);
  });

  it('respects a custom maxMs cap', () => {
    expect(backoff(10, 5000)).toBe(5000);
    expect(backoff(0, 500)).toBe(500);
  });

  it('always returns a positive number', () => {
    for (let i = 0; i < 20; i++) {
      expect(backoff(i)).toBeGreaterThan(0);
    }
  });
});
