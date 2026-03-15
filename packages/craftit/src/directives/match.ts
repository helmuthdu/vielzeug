import { isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../craftit';

type TemplateFn = () => string | HTMLResult;
type Branch = readonly [unknown, TemplateFn];

/**
 * Multi-branch conditional rendering. Evaluates each `[condition, templateFn]` tuple
 * in order and renders the first truthy branch. An optional trailing fallback function
 * is rendered when no branch matches.
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
 * // Reactive — re-evaluates when signals change
 * const role = signal<'admin' | 'mod' | 'user'>('user');
 * html`${match(
 *   [() => role.value === 'admin', () => html`<admin-panel>`],
 *   [() => role.value === 'mod',   () => html`<mod-panel>`],
 *   () => html`<user-panel>`,
 * )}`
 *
 * // Reactive Signal conditions
 * html`${match(
 *   [isAdmin, () => html`<admin-panel>`],
 *   [isLoggedIn, () => html`<user-panel>`],
 *   () => html`<guest-panel>`,
 * )}`
 */
export function match(...args: [...ReadonlyArray<Branch>, TemplateFn]): TemplateFn | string | HTMLResult;
export function match(...args: ReadonlyArray<Branch>): TemplateFn | string | HTMLResult;
export function match(...args: Array<Branch | TemplateFn>): TemplateFn | string | HTMLResult {
  const last = args.at(-1);
  let branches: Branch[];
  let fallback: TemplateFn | undefined;

  if (typeof last === 'function') {
    fallback = last as TemplateFn;
    branches = args.slice(0, -1) as Branch[];
  } else {
    branches = args as Branch[];
  }

  const _resolve = (cond: unknown): boolean => {
    if (isSignal(cond)) return !!(cond as ReadonlySignal<unknown>).value;

    if (typeof cond === 'function') return !!(cond as () => unknown)();

    return !!cond;
  };

  const _eval = (): string | HTMLResult => {
    for (const [cond, fn] of branches) {
      if (_resolve(cond)) return fn();
    }

    return fallback?.() ?? '';
  };

  const reactive = branches.some(([cond]) => isSignal(cond) || typeof cond === 'function');

  return reactive ? _eval : _eval();
}
