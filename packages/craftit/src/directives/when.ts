import { isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import type { Directive, HTMLResult } from '../internal';

type TemplateFn<V extends string | HTMLResult = string | HTMLResult> = () => V;

export type WhenOptions<V extends string | HTMLResult = string | HTMLResult> = {
  condition: Signal<unknown> | ReadonlySignal<unknown> | (() => unknown) | unknown;
  else?: TemplateFn<V> | null;
  then?: TemplateFn<V> | null;
};

const validateWhenOptions = <V extends string | HTMLResult>(options: WhenOptions<V>): void => {
  if (options.then !== undefined && options.then !== null && typeof options.then !== 'function') {
    throw new Error('[craftit:when] options.then must be a function when provided.');
  }

  if (options.else !== undefined && options.else !== null && typeof options.else !== 'function') {
    throw new Error('[craftit:when] options.else must be a function when provided.');
  }
};

/**
 * Conditionally renders one of two templates based on a condition.
 *
 * - **Signal or getter** — returns a reactive function the engine re-runs automatically.
 * - **Static value** — evaluated once at call time, returns the result directly.
 *
 * @example
 * import { when } from '@vielzeug/craftit/directives';
 *
 * html`${when({ condition: isLoggedIn, then: () => html`<user-panel>`, else: () => html`<login-form>` })}`
 * html`${when({ condition: () => count.value > 0, then: () => html`<span>${count}</span>` })}`
 */
export function when<V extends string | HTMLResult>(options: WhenOptions<V>): Directive | V | string {
  validateWhenOptions(options);

  const { condition } = options;
  const { else: resolvedElse, then: resolvedThen } = options;
  const renderResolved = (): V | string =>
    conditionValue(condition) ? (resolvedThen?.() ?? '') : (resolvedElse?.() ?? '');

  if (isSignal(condition) || typeof condition === 'function') {
    return {
      render: renderResolved,
    };
  }

  return renderResolved();
}

const conditionValue = (condition: WhenOptions['condition']): unknown => {
  if (isSignal(condition)) return (condition as ReadonlySignal<unknown>).value;

  if (typeof condition === 'function') return (condition as () => unknown)();

  return condition;
};
