import { vi } from 'vitest';

globalThis.window.URL.createObjectURL = vi.fn();

// Vitest runs on Node + jsdom where URLPattern may be unavailable.
// Keep runtime modern-browser-only while providing a test-only shim.
if (typeof globalThis.URLPattern === 'undefined') {
  class URLPatternShim {
    readonly #paramNames: string[];
    readonly #regex: RegExp;

    constructor(input: URLPatternInit | string, baseURL: string | URL = 'http://localhost') {
      const pathname =
        typeof input === 'string'
          ? new URL(input, baseURL).pathname
          : typeof input.pathname === 'string'
            ? input.pathname
            : '/';

      const names: string[] = [];
      const regexStr = pathname
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\/:([\w]+)\*/g, (_, name: string) => {
          names.push(name);

          return '(?:/(.*)|$)';
        })
        .replace(/:([\w]+)\*/g, (_, name: string) => {
          names.push(name);

          return '(.*)';
        })
        .replace(/:([\w]+)/g, (_, name: string) => {
          names.push(name);

          return '([^/]+)';
        });

      this.#paramNames = names;
      this.#regex = new RegExp(`^${regexStr}$`);
    }

    test(input?: URLPatternInit | string | URL): boolean {
      return this.exec(input) !== null;
    }

    exec(input?: URLPatternInit | string | URL): URLPatternResult | null {
      const pathname =
        input instanceof URL
          ? input.pathname
          : typeof input === 'string'
            ? new URL(input, 'http://localhost').pathname
            : typeof input?.pathname === 'string'
              ? input.pathname
              : '/';

      const match = pathname.match(this.#regex);

      if (!match) return null;

      const groups = Object.fromEntries(this.#paramNames.map((name, i) => [name, match[i + 1] ?? '']));

      return {
        hash: { groups: {}, input: '' },
        hostname: { groups: {}, input: '' },
        inputs: [pathname],
        password: { groups: {}, input: '' },
        pathname: { groups, input: pathname },
        port: { groups: {}, input: '' },
        protocol: { groups: {}, input: '' },
        search: { groups: {}, input: '' },
        username: { groups: {}, input: '' },
      } as URLPatternResult;
    }
  }

  Object.defineProperty(globalThis, 'URLPattern', {
    configurable: true,
    value: URLPatternShim,
    writable: true,
  });
}
