import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  document.documentElement.className = '';
});

describe('theme preference', () => {
  it('tracks system color-scheme changes while system mode is active', async () => {
    const media = new EventTarget() as MediaQueryList & { matches: boolean };
    media.matches = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
    const { setThemePreference, themePreference } = await import('./theme');

    expect(document.documentElement.classList.contains('light')).toBe(true);
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    setThemePreference('light');
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(themePreference.value).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
