// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initScheme } from './scheme';

type Listener = (event: { matches: boolean }) => void;
let systemDark = false;
const listeners = new Set<Listener>();

function stubMatchMedia(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    get matches() {
      return systemDark;
    },
    media: query,
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }));
}

const setSystemDark = (value: boolean): void => {
  systemDark = value;
  for (const listener of listeners) listener({ matches: value });
};

let dispose: (() => void) | undefined;

beforeEach(() => {
  systemDark = false;
  listeners.clear();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  stubMatchMedia();
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  vi.unstubAllGlobals();
});

describe('initScheme', () => {
  it('follows the OS preference until the visitor chooses', () => {
    setSystemDark(true);
    const theme = initScheme();
    dispose = theme.dispose;
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(theme.current()).toBe('dark');

    setSystemDark(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists an explicit choice and stops following the OS', () => {
    const theme = initScheme();
    dispose = theme.dispose;
    theme.set('dark');
    expect(localStorage.getItem('brettzeug:scheme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    setSystemDark(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores a stored choice on the next visit', () => {
    localStorage.setItem('brettzeug:scheme', 'dark');
    const theme = initScheme();
    dispose = theme.dispose;
    expect(theme.current()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('defaults to light when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const theme = initScheme();
    dispose = theme.dispose;
    expect(theme.current()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
