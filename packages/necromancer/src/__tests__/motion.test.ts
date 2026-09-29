import { afterEach, describe, expect, it, vi } from 'vitest';

import { shouldReduceMotion } from '../index';

describe('shouldReduceMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubMatches = (matches: boolean): void => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches })),
    );
  };

  it('keeps full motion without consulting the media query', () => {
    stubMatches(true);

    expect(shouldReduceMotion('full')).toBe(false);
    expect(vi.mocked(matchMedia)).not.toHaveBeenCalled();
  });

  it('reduces motion for an explicit reduced preference', () => {
    stubMatches(false);

    expect(shouldReduceMotion('reduced')).toBe(true);
    expect(vi.mocked(matchMedia)).not.toHaveBeenCalled();
  });

  it('follows the system media query for the system mode', () => {
    stubMatches(true);
    expect(shouldReduceMotion('system')).toBe(true);
    expect(vi.mocked(matchMedia)).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');

    vi.mocked(matchMedia).mockClear();
    stubMatches(false);
    expect(shouldReduceMotion('system')).toBe(false);
  });

  it('keeps full motion when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(shouldReduceMotion('system')).toBe(false);
  });
});
