import { computed } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createThemeController, type ThemeController } from '../theme';

type FakeMedia = {
  addEventListener: (_: 'change', cb: () => void) => void;
  matches: boolean;
  removeEventListener: () => void;
};

let media: FakeMedia;
let changeHandlers: Array<() => void>;
let originalMatchMedia: typeof window.matchMedia;

function setSystemDark(matches: boolean): void {
  media.matches = matches;
  for (const handler of changeHandlers) handler();
}

describe('createThemeController', () => {
  let root: HTMLElement;
  let controller: ThemeController | undefined;

  beforeEach(() => {
    root = document.createElement('html');
    changeHandlers = [];
    media = {
      addEventListener: (_type, cb) => {
        changeHandlers.push(cb);
      },
      matches: false,
      removeEventListener: () => {},
    };
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => media as unknown as MediaQueryList) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    controller?.dispose();
    controller = undefined;
    window.matchMedia = originalMatchMedia;
  });

  it('applies the light class and color-scheme for an explicit light preference', () => {
    controller = createThemeController({ initial: 'light', root });

    expect(root.classList.contains('light')).toBe(true);
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });

  it('applies the dark class and color-scheme for an explicit dark preference', () => {
    controller = createThemeController({ initial: 'dark', root });

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('resolves system against the OS preference', () => {
    media.matches = true;
    controller = createThemeController({ initial: 'system', root });

    expect(controller.resolved.value).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('re-applies when the OS preference changes in system mode', () => {
    controller = createThemeController({ initial: 'system', root });
    expect(controller.resolved.value).toBe('light');

    setSystemDark(true);

    expect(controller.resolved.value).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('ignores OS changes while pinned to an explicit mode', () => {
    controller = createThemeController({ initial: 'light', root });

    setSystemDark(true);

    expect(controller.resolved.value).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('switches the applied theme when the preference is set', () => {
    controller = createThemeController({ initial: 'light', root });

    controller.setPreference('dark');

    expect(root.classList.contains('dark')).toBe(true);
    expect(controller.preference.value).toBe('dark');
  });

  it('exposes resolved as a reactive readable', () => {
    controller = createThemeController({ initial: 'light', root });
    const isDark = computed(() => controller?.resolved.value === 'dark');

    expect(isDark.value).toBe(false);

    controller.setPreference('dark');

    expect(isDark.value).toBe(true);
  });

  it('stops applying after dispose', () => {
    controller = createThemeController({ initial: 'light', root });
    controller.dispose();

    expect(controller.disposed).toBe(true);

    controller.setPreference('dark');

    expect(root.classList.contains('dark')).toBe(false);
  });

  it('suppresses nested shadow transitions during application and restores owned DOM synchronously', () => {
    root = document.createElement('section');
    root.setAttribute('data-theme-switching', 'consumer');
    root.style.transition = 'color 1s';
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const nested = document.createElement('div');
    const inner = nested.attachShadow({ mode: 'open' });
    shadow.append(nested);
    root.append(host);
    const flush = vi.spyOn(root, 'offsetHeight', 'get').mockImplementation(() => {
      expect(root.querySelector('style')?.textContent).toContain('transition: none !important');
      expect(shadow.querySelector('style')?.textContent).toContain('transition: none !important');
      expect(inner.querySelector('style')?.textContent).toContain('transition: none !important');
      return 0;
    });

    controller = createThemeController({ initial: 'light', root });
    controller.setPreference('dark');

    expect(flush).toHaveBeenCalledTimes(2);
    expect(root.getAttribute('data-theme-switching')).toBe('consumer');
    expect(root.style.transition).toBe('color 1s');
    expect(root.querySelector('style')).toBeNull();
    expect(shadow.querySelector('style')).toBeNull();
    expect(inner.querySelector('style')).toBeNull();
  });
});
