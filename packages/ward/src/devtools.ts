/**
 * @vielzeug/ward — debug utilities for authorization decision visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugWard } from '@vielzeug/ward/devtools';
 * ```
 */

import type { Ward, WardLoggerContext, WardOptions, WardRule } from './types';

import { createWard } from './factory';

/**
 * Creates a {@link Ward} with authorization decision logging pre-wired to `console.debug`.
 *
 * Equivalent to `createWard(rules, { ...options, logger: ctx => console.debug(...) })` but
 * imported from a dedicated sub-path so `console.debug` references are tree-shaken from
 * production bundles when this sub-path is not imported.
 *
 * Logs every authorization decision made by any decision method (`checkAll`, `explain`)
 * with `[ward:decision]` prefixes showing the outcome,
 * principal, resource, action, and — when a rule matched — its effect.
 *
 * @example
 * ```ts
 * import { debugWard } from '@vielzeug/ward/devtools';
 *
 * const permit = debugWard(rules);
 * permit.explain({ action: 'read', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });
 * // [ward:decision] allow            (allow)  viewer  posts  read
 *
 * permit.explain({ action: 'delete', principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts' });
 * // [ward:decision] no-matching-rule          viewer  posts  delete
 *
 * // Note: `trace()` does NOT fire the logger — it is a side-channel-free inspection tool.
 * ```
 */
export function debugWard<TAction extends string = string, TData = unknown>(
  rules: readonly WardRule<TAction, TData>[],
  options?: Omit<WardOptions<TAction, TData>, 'logger'>,
): Ward<TAction, TData> {
  const logger = (ctx: WardLoggerContext<TAction, TData>): void => {
    const principal = ctx.principal
      ? ctx.principal.roles.length > 0
        ? ctx.principal.roles.join(', ')
        : ctx.principal.id
      : 'anonymous';
    const outcome = ctx.allowed ? 'allow' : ctx.reason;
    const decision = outcome.padEnd(16);
    const effect = 'rule' in ctx ? `(${ctx.rule.effect})`.padEnd(8) : '        ';

    console.debug(`[ward:decision] ${decision}  ${effect}  ${principal}  ${ctx.resource}  ${ctx.action}`);
  };

  return createWard<TAction, TData>(rules, { ...options, logger });
}
