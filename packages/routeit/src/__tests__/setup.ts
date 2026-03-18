import type { Router } from '../router';

export const mockLocation = {
  hash: '',
  pathname: '/',
  search: '',
};

export const mockHistory = {
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  // Simulate real browser behaviour: pushState/replaceState update the current URL.
  // Without this, navigate() would re-read the old pathname from the mock and recurse
  // indefinitely when a middleware calls router.navigate() without awaiting next().
  pushState: vi.fn((_state: unknown, _title: string, url: string) => {
    mockLocation.pathname = url;
  }),
  replaceState: vi.fn((_state: unknown, _title: string, url: string) => {
    mockLocation.pathname = url;
  }),
};

// Keep compatibility with older tests that access mocks via globalThis.
Object.assign(globalThis as Record<string, unknown>, {
  mockHistory,
  mockLocation,
});

Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

let activeRouter: Router | undefined;

/** Starts the router and waits for the initial route handling to complete. */
export async function boot(router: Router): Promise<Router> {
  activeRouter = router;
  router.start();
  await new Promise<void>((r) => setTimeout(r, 10));

  return router;
}

export function disposeRouter(): void {
  activeRouter?.dispose();
  activeRouter = undefined;
}

export function resetMocks(): void {
  vi.clearAllMocks();
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockLocation.hash = '';
}
