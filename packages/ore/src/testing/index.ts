/**
 * Testing utilities for Ore components
 *
 * ⚠️ Requires DOM environment (browser / jsdom / happy-dom)
 *
 * This barrel re-exports the full testing API for convenience.
 * For tree-shaking, import directly from the focused sub-modules.
 */

import { installFormInternalsPolyfill } from './form-internals-polyfill';
import { cleanup } from './mount';

// Testing-only error: flush() is its only thrower in this package (a pending-work timeout —
// see flush.ts). Exported here (not from the main `.` entry) so components with no interest
// in the testing sub-path don't carry a testing-only error class in their public type surface.
// Generic DOM interaction helpers belong to @vielzeug/assay, not this Ore-specific test API.
export { OreTimeoutError } from '../errors';

export { debugFlush, flush, type FlushOptions } from './flush';
export { walkFlatTree } from './dom';
export { installFormInternalsPolyfill } from './form-internals-polyfill';
export { cleanup, mock, mount, mountComponent, type Fixture, type MountOptions, type MountSetup } from './mount';
export { renderHook, type HookFixture } from './render-hook';
export { resetOreForTests } from './reset';

export type InstallOptions = {
  /**
   * Polyfill the jsdom/happy-dom gaps in `ElementInternals`/`FormData`/`<form>.reset()`
   * that `useField()` needs (see `installFormInternalsPolyfill`). Global monkey-patches,
   * so opt in only when the suite tests form-associated components.
   * @default false
   */
  formInternals?: boolean;
};

/**
 * Register auto-cleanup after each test. Call once in your test setup file.
 * Pass `{ formInternals: true }` when testing form-associated (`useField`) components.
 *
 * @example
 * // vitest.setup.ts
 * import { afterEach } from 'vitest';
 * import { install } from '@vielzeug/ore/testing';
 * install(afterEach, { formInternals: true });
 */
export function install(afterEachHook: (fn: () => void) => void, options: InstallOptions = {}): void {
  afterEachHook(cleanup);

  if (options.formInternals) installFormInternalsPolyfill();
}
