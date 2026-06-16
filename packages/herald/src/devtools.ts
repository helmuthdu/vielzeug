/**
 * @vielzeug/herald — debug utilities for bus visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugBus } from '@vielzeug/herald/devtools';
 * ```
 */

import type { BehaviorBus, BehaviorBusOptions, BehaviorInitial, Bus, BusLogger, BusOptions, EventMap } from './types';

import { createBehaviorBus } from './behavior-bus';
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

/**
 * Creates a {@link BehaviorBus} with debug logging pre-wired to `console.debug`.
 *
 * Equivalent to `createBehaviorBus(initial, { logger: { debug: console.debug } })` but imported
 * from a dedicated sub-path so `console.debug` references are tree-shaken from
 * production bundles when this sub-path is not imported.
 *
 * @example
 * ```ts
 * import { debugBehaviorBus } from '@vielzeug/herald/devtools';
 *
 * const bus = debugBehaviorBus<MyEvents>({ theme: 'light' });
 * // or redirect warnings:
 * const bus = debugBehaviorBus<MyEvents>({ theme: 'light' }, { logger: { warn: myLogger.warn } });
 * ```
 */
export function debugBehaviorBus<T extends EventMap>(
  initial?: BehaviorInitial<T>,
  options?: Omit<BehaviorBusOptions<T>, 'logger'> & { logger?: { warn?: BusLogger['warn'] } },
): BehaviorBus<T> {
  const { logger, ...rest } = options ?? {};

  return createBehaviorBus<T>(initial, {
    ...rest,
    logger: { debug: console.debug, warn: logger?.warn },
  });
}
