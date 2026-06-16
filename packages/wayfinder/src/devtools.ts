/**
 * @vielzeug/wayfinder — debug utilities for router navigation visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugRouter } from '@vielzeug/wayfinder/devtools';
 * ```
 */

import type { Router, RouterOptions, RouteState, RouteTable } from './index';

import { createRouter } from './router';

/** Options for {@link debugRouter}. Extends {@link RouterOptions} with debug-specific settings. */
export interface DebugRouterOptions<
  TRoutes extends RouteTable,
  TMeta = unknown,
  TComponent = unknown,
> extends RouterOptions<TRoutes, TMeta, TComponent> {
  /**
   * Label used in log prefixes. Defaults to `'nav'`, producing `[wayfinder:nav]`.
   * Useful when running multiple routers (e.g. a main router and a modal router)
   * so their log output can be distinguished:
   * ```ts
   * debugRouter({ label: 'modal', routes });
   * // [wayfinder:modal] loading  /confirm
   * ```
   */
  label?: string;
}

/**
 * Creates a {@link Router} with navigation lifecycle logging pre-wired to `console.debug`.
 *
 * Equivalent to `createRouter(options)` with a `subscribe` listener attached, but imported
 * from a dedicated sub-path so `console.debug` references are tree-shaken from production
 * bundles when this sub-path is not imported.
 *
 * Logs every navigation state change with `[wayfinder:<label>]` prefixes showing the pathname,
 * status (`loading` → `idle` / `error`), and matched route names.
 *
 * @example
 * ```ts
 * import { debugRouter } from '@vielzeug/wayfinder/devtools';
 *
 * const router = debugRouter({ routes });
 * // [wayfinder:nav] loading  /users
 * // [wayfinder:nav] idle     /users  [users]
 *
 * // Multi-router setup:
 * const modal = debugRouter({ label: 'modal', routes: modalRoutes });
 * // [wayfinder:modal] loading  /confirm
 * ```
 */
export function debugRouter<const TRoutes extends RouteTable, TMeta = unknown, TComponent = unknown>(
  options: DebugRouterOptions<TRoutes, TMeta, TComponent>,
): Router<TRoutes, TMeta, TComponent> {
  const { label = 'nav', ...routerOptions } = options;
  const router = createRouter<TRoutes, TMeta, TComponent>(routerOptions);
  const prefix = `[wayfinder:${label}]`;

  const log = (state: RouteState<TMeta, TComponent>): void => {
    const names = state.matches
      .map((m) => m.name)
      .filter(Boolean)
      .join(', ');
    const suffix = names ? `  [${names}]` : '';

    if (state.status === 'error') {
      console.debug(`${prefix} error    ${state.location.pathname}${suffix}`, state.error);
    } else {
      console.debug(`${prefix} ${state.status.padEnd(8)} ${state.location.pathname}${suffix}`);
    }
  };

  router.subscribe(log);

  return router;
}
