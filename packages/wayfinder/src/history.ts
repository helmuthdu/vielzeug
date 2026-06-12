import type { HistoryDriver } from './types';

/** Creates a history driver backed by the browser History API. */
export function createBrowserHistory(): HistoryDriver {
  return {
    back() {
      window.history.back();
    },
    get location() {
      return {
        hash: window.location.hash,
        pathname: window.location.pathname,
        search: window.location.search,
        // State lives on window.history.state, not window.location.
        state: window.history.state,
      };
    },
    push(url, state) {
      window.history.pushState(state, '', url);
    },
    replace(url, state) {
      window.history.replaceState(state, '', url);
    },
    subscribe(listener) {
      window.addEventListener('popstate', listener);

      return () => window.removeEventListener('popstate', listener);
    },
  };
}

type MemoryLocation = { hash: string; pathname: string; search: string; state: unknown };

/**
 * Creates an in-memory history driver. Suitable for SSR, tests, and non-browser environments.
 *
 * Semantics mirror the browser History API:
 * - `push()` and `replace()` update the location silently (no listener notification),
 *   matching `pushState`/`replaceState` which do not fire `popstate`.
 * - `back()` moves one entry back and notifies subscribers, matching a browser back-button press.
 */
export function createMemoryHistory(initialPath = '/'): HistoryDriver {
  const parsed = new URL(initialPath, 'http://localhost');
  const stack: MemoryLocation[] = [
    { hash: parsed.hash, pathname: parsed.pathname, search: parsed.search, state: null },
  ];
  let cursor = 0;
  const listeners = new Set<() => void>();

  return {
    back() {
      if (cursor <= 0) return;

      cursor -= 1;
      listeners.forEach((l) => l());
    },
    get location(): MemoryLocation {
      return stack[cursor]!;
    },
    push(url, state = null) {
      const p = new URL(url, 'http://localhost');

      stack.splice(cursor + 1);
      stack.push({ hash: p.hash, pathname: p.pathname, search: p.search, state });
      cursor = stack.length - 1;
      // Silent — mirrors browser pushState semantics. Router drives navigation via #handleRoute directly.
    },
    replace(url, state = null) {
      const p = new URL(url, 'http://localhost');

      stack[cursor] = { hash: p.hash, pathname: p.pathname, search: p.search, state };
      // Silent — mirrors browser replaceState semantics.
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}
