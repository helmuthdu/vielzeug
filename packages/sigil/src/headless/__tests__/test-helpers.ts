import { createListControl, type ListNavigationOptions } from '../nav';
import { createOverlayControl, type OverlayControlOptions } from '../overlay';

/**
 * Creates a `ListControl` for use in unit tests.
 */
export const createTestListControl = <T>(items: T[], opts?: Partial<ListNavigationOptions<T>>) => {
  return createListControl({
    getItems: () => items,
    ...opts,
  });
};

/**
 * Creates an `OverlayControl` with a temporary `<div>` boundary appended to
 * `document.body`. The returned object extends `OverlayControl` with a
 * `teardown()` helper that aborts the lifecycle signal and removes the DOM boundary —
 * call it in `afterEach` to prevent DOM leaks across tests.
 *
 * @example
 * ```ts
 * let overlay: ReturnType<typeof createTestOverlayControl>;
 * beforeEach(() => { overlay = createTestOverlayControl(); });
 * afterEach(() => overlay.teardown());
 * ```
 */
export const createTestOverlayControl = (overrides?: Partial<Omit<OverlayControlOptions, 'signal'>>) => {
  let _isOpen = false;
  const controller = new AbortController();
  const boundary = document.createElement('div');

  document.body.appendChild(boundary);

  const overlay = createOverlayControl({
    getBoundary: () => boundary,
    isOpen: () => _isOpen,
    setOpen: (next) => {
      _isOpen = next;
    },
    signal: controller.signal,
    ...overrides,
  });

  return {
    ...overlay,
    teardown() {
      controller.abort();
      boundary.remove();
    },
  };
};
