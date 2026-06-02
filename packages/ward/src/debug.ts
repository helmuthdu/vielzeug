/**
 * @vielzeug/ward — debug utilities for authorization decision visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugWard } from '@vielzeug/ward/debug';
 * ```
 */

import type { Ward, WardLoggerContext, WardOptions, WardRuleInput } from './types';

import { createWard } from './factory';

/**
 * Creates a {@link Ward} with authorization decision logging pre-wired to `console.debug`.
 *
 * Equivalent to `createWard(rules, { ...options, logger: ctx => console.debug(...) })` but
 * imported from a dedicated sub-path so `console.debug` references are tree-shaken from
 * production bundles when this sub-path is not imported.
 *
 * Logs every `can()` / `canAll()` / `canAny()` / `checkAll()` decision with `[ward:decision]`
 * prefixes showing the principal, resource, action, and outcome.
 *
 * @example
 * ```ts
 * import { debugWard } from '@vielzeug/ward/debug';
 *
 * const permit = debugWard(rules);
 * permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
 * // [ward:decision] allow          viewer  posts  read
 *
 * permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete');
 * // [ward:decision] no-matching-rule  viewer  posts  delete
 * ```
 */
export function debugWard<TAction extends string = string, TData = unknown>(
  rules: readonly WardRuleInput<TAction, TData>[],
  options?: Omit<WardOptions<TAction, TData>, 'logger'>,
): Ward<TAction, TData> {
  const logger = (ctx: WardLoggerContext<TAction, TData>): void => {
    const principal = ctx.principal
      ? ctx.principal.roles.length > 0
        ? ctx.principal.roles.join(', ')
        : ctx.principal.id
      : 'anonymous';
    const decision = ctx.decision.padEnd(16);

    console.debug(`[ward:decision] ${decision}  ${principal}  ${ctx.resource}  ${ctx.action}`);
  };

  return createWard<TAction, TData>(rules, { ...options, logger });
}
