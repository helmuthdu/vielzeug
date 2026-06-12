/**
 * @vielzeug/herald — debug utilities for bus visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugBus } from '@vielzeug/herald/devtools';
 * ```
 */

import type { Bus, BusLogger, BusOptions, EventMap } from './types';

import { createBus } from './bus';

/**
 * Creates a {@link Bus} with debug logging pre-wired to `console.debug`.
 *
 * Equivalent to `createBus({ logger: { debug: console.debug } })` but imported
 * from a dedicated sub-path so `console.debug` references are tree-shaken from
 * production bundles when this sub-path is not imported.
 *
 * Logs subscription registrations/removals, emissions, and disposal with
 * `[herald:*]` prefixes. Pass `logger.warn` to also redirect or silence warnings.
 *
 * @example
 * ```ts
 * import { debugBus } from '@vielzeug/herald/devtools';
 *
 * const bus = debugBus<MyEvents>();
 * // or redirect to a custom logger:
 * const bus = debugBus<MyEvents>({ logger: { warn: myLogger.warn } });
 * ```
 */
export function debugBus<T extends EventMap>(
  options?: Omit<BusOptions<T>, 'logger'> & { logger?: { warn?: BusLogger['warn'] } },
): Bus<T> {
  const { logger, ...rest } = options ?? {};

  return createBus<T>({
    ...rest,
    logger: { debug: console.debug, warn: logger?.warn },
  });
}
