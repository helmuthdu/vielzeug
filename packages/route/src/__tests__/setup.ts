import type { Router } from '../router';
import type { RouteTable } from '../types';

export const mockLocation = {
  hash: '',
  pathname: '/',
  search: '',
  state: null as unknown,
};

function assignMockUrl(url: string): void {
  const parsed = new URL(url, 'https://route.test');

  mockLocation.pathname = parsed.pathname;
  mockLocation.search = parsed.search;
  mockLocation.hash = parsed.hash;
}

export const mockHistory = {
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  // Simulate real browser behaviour: pushState/replaceState update the current URL and
  // history.state. Without URL updates, navigate() would re-read the old pathname and
  // recurse indefinitely when middleware calls router.navigate() without awaiting next().
  pushState: vi.fn((state: unknown, _title: string, url: string) => {
    assignMockUrl(url);
    mockHistory.state = state;
  }),
  replaceState: vi.fn((state: unknown, _title: string, url: string) => {
    assignMockUrl(url);
    mockHistory.state = state;
  }),
  state: null as unknown,
};

// Expose mocks on globalThis for simple cross-test access.
Object.assign(globalThis as Record<string, unknown>, {
  mockHistory,
  mockLocation,
});

Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

let activeRouter: { dispose: () => void } | undefined;

/** Starts the router and waits for the initial route handling to complete. */
export async function boot<TRoutes extends RouteTable>(router: Router<TRoutes>): Promise<Router<TRoutes>> {
  activeRouter = router;

  const stateLocation = router.state.location;
  const stateHasQuery = Object.keys(stateLocation.query).length > 0;
  const mockHasQuery = mockLocation.search.length > 1;
  const needsSync =
    stateLocation.pathname !== mockLocation.pathname ||
    stateLocation.hash !== mockLocation.hash.replace(/^#/, '') ||
    stateHasQuery !== mockHasQuery;

  if (needsSync) {
    window.dispatchEvent(new Event('popstate'));
  }

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
  mockLocation.state = null;
  mockHistory.state = null;
}
