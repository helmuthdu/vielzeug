/**
 * Testing utilities for Ore components
 *
 * ⚠️ Requires DOM environment (browser / jsdom / happy-dom)
 *
 * This is the package's only public testing entry point.
 */

import { cleanup } from './mount';

// Testing-only error: flush() is its only thrower in this package (a pending-work timeout :
// see flush.ts). Exported here (not from the main `.` entry) so components with no interest
// in the testing sub-path don't carry a testing-only error class in their public type surface.
// Generic DOM interaction helpers belong to @vielzeug/assay, not this Ore-specific test API:
// including the jsdom ElementInternals/FormData polyfill, which form-associated-component
// suites install directly from assay (`installFormInternalsPolyfill`).
export { type FlushOptions, flush, OreTimeoutError } from './flush';
export { cleanup, type Fixture, type MountOptions, type MountSetup, mount } from './mount';
export { type HookFixture, renderHook } from './render-hook';

/**
 * Register auto-cleanup after each test. Call once in your test setup file.
 *
 * @example
 * // vitest.setup.ts
 * import { afterEach } from 'vitest';
 * import { install } from '@vielzeug/ore/testing';
 * install(afterEach);
 */
export function install(afterEachHook: (fn: () => void) => void): void {
  afterEachHook(cleanup);
}
