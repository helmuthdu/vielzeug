/**
 * @vielzeug/wayfinder — debug utilities for router navigation visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugRouter } from '@vielzeug/wayfinder/debug';
 * ```
 */

import type { Router, RouterOptions, RouteState, RouteTable } from './index';

import { createRouter } from './router';

/**
 * Creates a {@link Router} with navigation lifecycle logging pre-wired to `console.debug`.
 *
 * Equivalent to `createRouter(options)` with a `subscribe` listener attached, but imported
 * from a dedicated sub-path so `console.debug` references are tree-shaken from production
 * bundles when this sub-path is not imported.
 *
 * Logs every navigation state change with `[wayfinder:nav]` prefixes showing the pathname,
 * status (`loading` → `idle` / `error`), and matched route names.
 *
 * @example
 * ```ts
 * import { debugRouter } from '@vielzeug/wayfinder/debug';
 *
 * const router = debugRouter({ routes });
 * // [wayfinder:nav] loading  /users
 * // [wayfinder:nav] idle     /users  [users]
 * ```
 */
export function debugRouter<const TRoutes extends RouteTable, TMeta = unknown, TComponent = unknown>(
  options: RouterOptions<TRoutes, TMeta, TComponent>,
): Router<TRoutes, TMeta, TComponent> {
  const router = createRouter<TRoutes, TMeta, TComponent>(options);

  const log = (state: RouteState<TMeta, TComponent>): void => {
    const names = state.matches
      .map((m) => m.name)
      .filter(Boolean)
      .join(', ');
    const suffix = names ? `  [${names}]` : '';

    if (state.status === 'error') {
      console.debug(`[wayfinder:nav] error    ${state.location.pathname}${suffix}`, state.error);
    } else {
      console.debug(`[wayfinder:nav] ${state.status.padEnd(8)} ${state.location.pathname}${suffix}`);
    }
  };

  log(router.getSnapshot());
  router.subscribe(log);

  return router;
}
