/**
 * Testing utilities for Craft components
 *
 * ⚠️ Requires DOM environment (browser / jsdom / happy-dom)
 *
 * This barrel re-exports the full testing API for convenience.
 * For tree-shaking, import directly from the focused sub-modules.
 */

import { cleanup } from './mount';

export { fire, createPointerEvent } from './events';
export { FLUSH_DEEP, flush, type FlushOptions } from './flush';
export { user } from './interactions';
export { cleanup, mock, mount, type Fixture, type MountOptions, type MountSetup } from './mount';
export { within, type QueryScope } from './query';
export { waitFor, waitForEvent, type WaitOptions } from './wait';
export { renderHook, type HookFixture } from './render-hook';

/**
 * Register auto-cleanup after each test. Call once in your test setup file.
 *
 * @example
 * // vitest.setup.ts
 * import { afterEach } from 'vitest';
 * import { install } from '@vielzeug/craft/testing';
 * install(afterEach);
 */
export function install(afterEachHook: (fn: () => void) => void): void {
  afterEachHook(cleanup);
}
