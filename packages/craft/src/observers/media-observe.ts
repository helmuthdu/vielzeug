import { type ReadonlySignal, signal, onCleanup } from '@vielzeug/ripple';

/**
 * Observes a CSS media query via `window.matchMedia`. Returns a `ReadonlySignal`
 * that is `true` when the query matches and `false` when it does not.
 * Must be called inside a `mount()` callback.
 */
export const mediaObserver = (query: string): ReadonlySignal<boolean> => {
  const mql = window.matchMedia(query);
  const matches = signal(mql.matches);
  const handler = (e: MediaQueryListEvent) => {
    matches.value = e.matches;
  };

  mql.addEventListener('change', handler);
  onCleanup(() => mql.removeEventListener('change', handler));

  return matches;
};
