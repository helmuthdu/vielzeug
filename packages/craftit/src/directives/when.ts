import { isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import type { Directive, HTMLResult } from '../core/internal';

/**
 * Conditionally renders one of two templates based on a condition.
 *
 * - **Signal or getter** — returns a reactive function the engine re-runs automatically.
 * - **Static value** — evaluated once at call time, returns the result directly.
 *
 * @example
 * import { when } from '@vielzeug/craftit/directives';
 *
 * html`${when(isLoggedIn, () => html`<user-panel>`, () => html`<login-form>`)}`
 * html`${when(() => count.value > 0, () => html`<span>${count}</span>`)}`
 */
export function when<V extends string | HTMLResult>(
  condition: Signal<unknown> | ReadonlySignal<unknown> | (() => unknown),
  thenFn: () => V,
  elseFn?: () => V,
): Directive;
export function when<V extends string | HTMLResult>(condition: unknown, thenFn: () => V, elseFn?: () => V): V | string;
export function when<V extends string | HTMLResult>(
  condition: unknown,
  thenFn: () => V,
  elseFn?: () => V,
): V | string | Directive {
  if (isSignal(condition) || typeof condition === 'function') {
    const get = isSignal(condition) ? () => (condition as ReadonlySignal<unknown>).value : (condition as () => unknown);

    return {
      render: (): string | HTMLResult => (get() ? thenFn() : (elseFn?.() ?? '')),
    };
  }

  return condition ? thenFn() : (elseFn?.() ?? '');
}
