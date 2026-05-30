import { vi } from 'vitest';

globalThis.window.URL.createObjectURL = vi.fn();

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

if (typeof window !== 'undefined' && !window.localStorage) {
  const localStorageMock = createStorageMock();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
    writable: true,
  });
}
