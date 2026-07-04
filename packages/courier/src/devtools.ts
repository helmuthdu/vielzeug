/**
 * @vielzeug/courier — debug utilities for HTTP client visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugCourier } from '@vielzeug/courier/devtools';
 * ```
 */

import type { Courier, CourierOptions } from './courier';

import { createCourier } from './courier';
import { withLogging } from './interceptors';

/**
 * Creates a {@link Courier} with request/response logging pre-wired to `console.debug`.
 *
 * Equivalent to `createCourier(options)` with `client.use(withLogging())` already
 * registered, but imported from a dedicated sub-path so the `console.debug` reference
 * is tree-shaken from production bundles when this sub-path is not imported.
 *
 * **Development only.** `withLogging()` logs the full request URL, including any query
 * parameters — if those may contain tokens or PII, use `createCourier()` with a custom
 * `withLogging({ logger })` that sanitizes the URL instead, or none at all in production.
 *
 * @example
 * ```ts
 * import { debugCourier } from '@vielzeug/courier/devtools';
 *
 * const client = debugCourier({ baseUrl: 'https://api.example.com' });
 * await client.api.get('/users');
 * // GET https://api.example.com/users 200 (42ms)
 * ```
 */
export function debugCourier(options?: CourierOptions): Courier {
  const client = createCourier(options);

  client.use(withLogging());

  return client;
}
