import { isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import type { HTMLResult } from '../craftit';

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
): () => string | HTMLResult;
export function when<V extends string | HTMLResult>(condition: unknown, thenFn: () => V, elseFn?: () => V): V | string;
export function when<V extends string | HTMLResult>(
  condition: unknown,
  thenFn: () => V,
  elseFn?: () => V,
): V | string | (() => string | HTMLResult) {
  if (isSignal(condition) || typeof condition === 'function') {
    const get = isSignal(condition) ? () => (condition as ReadonlySignal<unknown>).value : (condition as () => unknown);

    return (): string | HTMLResult => (get() ? thenFn() : (elseFn?.() ?? ''));
  }

  return condition ? thenFn() : (elseFn?.() ?? '');
}
