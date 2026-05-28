/**
 * Testing utilities for Craftit components
 *
 * ⚠️ Requires DOM environment (browser / jsdom / happy-dom)
 *
 * This barrel re-exports the full testing API for convenience.
 * For tree-shaking, import directly from the focused sub-modules.
 */

import { cleanup } from './mount';

export { fire, createPointerEvent } from './events';
export { flush, type FlushOptions } from './flush';
export { user } from './interactions';
export {
  cleanup,
  mock,
  mount,
  _mountedElements,
  _componentTagCounter,
  _resetCounters,
  type Fixture,
  type MountOptions,
  type MountSetup,
} from './mount';
export { within, type QueryScope } from './query';
export { waitFor, waitForEvent, type WaitOptions } from './wait';

/**
 * Register auto-cleanup after each test. Call once in your test setup file.
 *
 * @example
 * // vitest.setup.ts
 * import { afterEach } from 'vitest';
 * import { install } from '@vielzeug/craftit/testing';
 * install(afterEach);
 */
export function install(afterEachHook: (fn: () => void) => void): void {
  afterEachHook(cleanup);
}
