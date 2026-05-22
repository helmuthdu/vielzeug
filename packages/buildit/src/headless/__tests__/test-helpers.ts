import { signal } from '@vielzeug/stateit';

import { createListControl, type ListNavigationOptions } from '../nav';
import { createOverlayControl, type OverlayControlOptions } from '../overlay';

/**
 * Creates a `ListControl` with a pre-wired index signal.
 * Useful in unit tests to avoid boilerplate setup.
 */
export const createTestListControl = <T>(items: T[], opts?: Partial<ListNavigationOptions<T>>) => {
  const index = signal(-1);

  return createListControl({
    getIndex: () => index.value,
    getItems: () => items,
    setIndex: (i) => {
      index.value = i;
    },
    ...opts,
  });
};

/**
 * Creates an `OverlayControl` with a temporary `<div>` boundary appended to
 * `document.body`. The returned object extends `OverlayControl` with a
 * `teardown()` helper that calls `cleanup()` and removes the DOM boundary —
 * call it in `afterEach` to prevent DOM leaks across tests.
 *
 * @example
 * ```ts
 * let overlay: ReturnType<typeof createTestOverlayControl>;
 * beforeEach(() => { overlay = createTestOverlayControl(); });
 * afterEach(() => overlay.teardown());
 * ```
 */
export const createTestOverlayControl = (overrides?: Partial<OverlayControlOptions>) => {
  let _isOpen = false;
  const boundary = document.createElement('div');

  document.body.appendChild(boundary);

  const overlay = createOverlayControl({
    getBoundary: () => boundary,
    isOpen: () => _isOpen,
    setOpen: (next) => {
      _isOpen = next;
    },
    ...overrides,
  });

  return {
    ...overlay,
    teardown() {
      overlay.cleanup();
      boundary.remove();
    },
  };
};
