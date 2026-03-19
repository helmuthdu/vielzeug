import { isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../core/internal';

type TemplateFn = () => string | HTMLResult;
type Branch = readonly [unknown, TemplateFn];

/**
 * Multi-branch conditional rendering. Pass branches as individual `[condition, templateFn]`
 * tuples (variadic), with an optional trailing `fallback` function.
 * Renders the first truthy branch, or the fallback when no branch matches.
 *
 * Reactive when any condition is a Signal or getter function — the output updates
 * automatically whenever a reactive condition changes.
 *
 * @example
 * import { match } from '@vielzeug/craftit/directives';
 *
 * // Static — evaluated once
 * html`${match(
 *   [isAdmin,     () => html`<admin-panel>`],
 *   [isModerator, () => html`<mod-panel>`],
 *   () => html`<user-panel>`,
 * )}`
 *
 * // Reactive Signal conditions
 * html`${match(
 *   [isAdmin,    () => html`<admin-panel>`],
 *   [isLoggedIn, () => html`<user-panel>`],
 *   () => html`<guest-panel>`,
 * )}`
 */
export function match(...args: (Branch | TemplateFn)[]): TemplateFn | string | HTMLResult {
  // Separate branches from optional trailing fallback function.
  // A Branch is a tuple [condition, fn] (an array); a TemplateFn is a bare () => ... function.
  const lastArg = args[args.length - 1];
  const hasFallback = typeof lastArg === 'function' && !Array.isArray(lastArg);
  const branches = (hasFallback ? args.slice(0, -1) : args) as Branch[];
  const fallback = hasFallback ? (lastArg as TemplateFn) : undefined;

  const resolve = (cond: unknown): boolean => {
    if (isSignal(cond)) return !!(cond as ReadonlySignal<unknown>).value;

    if (typeof cond === 'function') return !!(cond as () => unknown)();

    return !!cond;
  };

  const evaluate = (): string | HTMLResult => {
    for (const [cond, fn] of branches) {
      if (resolve(cond)) return fn();
    }

    return fallback?.() ?? '';
  };

  const reactive = branches.some(([cond]) => isSignal(cond) || typeof cond === 'function');

  return reactive ? evaluate : evaluate();
}
