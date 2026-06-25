/**
 * @vielzeug/ore — debug utilities for component update visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugFlush } from '@vielzeug/ore/devtools';
 * ```
 */

import type { FlushOptions } from './testing/flush';

import { flush } from './testing/flush';

/**
 * Flushes pending reactive updates with debug logging pre-wired to `console.debug`.
 *
 * Equivalent to `flush({ ...options, logger: console.debug })` but imported from a
 * dedicated sub-path so the `console.debug` reference is tree-shaken from production
 * bundles when this sub-path is not imported.
 *
 * Logs each turn and timing phase to `console.debug` so you can diagnose
 * unexpected update order or timing issues.
 *
 * @example
 * ```ts
 * import { debugFlush } from '@vielzeug/ore/devtools';
 *
 * // in a test
 * await debugFlush();
 * // [flush] starting with maxTurns=5
 * // [flush] microtask turn 1/5
 * // ...
 * ```
 */
export async function debugFlush(options?: Omit<FlushOptions, 'logger'>): Promise<void> {
  return flush({ ...options, logger: console.debug });
}
