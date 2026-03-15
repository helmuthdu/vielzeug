import { isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../craftit';

type TemplateFn = () => string | HTMLResult;
type CaseEntry<T> = readonly [T, TemplateFn];

/**
 * Renders the template matching the current value — like a type-safe `switch`.
 * Cases are `[value, templateFn]` pairs evaluated with strict equality (`===`).
 *
 * The discriminant can be a static value, a reactive Signal, or a getter function.
 * When reactive, the rendered output updates automatically when the value changes.
 *
 * @example
 * import { choose } from '@vielzeug/craftit/directives';
 *
 * // Static
 * html`${choose(section, [
 *   ['home',  () => html`<h1>Home</h1>`],
 *   ['about', () => html`<h1>About</h1>`],
 * ], () => html`<h1>Not found</h1>`)}`
 *
 * // Reactive signal — updates on change
 * const tab = signal('home');
 * html`${choose(tab, [
 *   ['home',  () => html`<home-panel>`],
 *   ['about', () => html`<about-panel>`],
 * ])}`
 *
 * // Reactive getter
 * html`${choose(() => props.view.value, cases)}`
 */
export function choose<T extends PropertyKey>(
  value: ReadonlySignal<T> | (() => T),
  cases: ReadonlyArray<CaseEntry<T>>,
  defaultFn?: TemplateFn,
): TemplateFn;
export function choose<T extends PropertyKey>(
  value: T,
  cases: ReadonlyArray<CaseEntry<T>>,
  defaultFn?: TemplateFn,
): string | HTMLResult;
export function choose<T extends PropertyKey>(
  value: T | ReadonlySignal<T> | (() => T),
  cases: ReadonlyArray<CaseEntry<T>>,
  defaultFn?: TemplateFn,
): string | HTMLResult | TemplateFn {
  const _pick = (v: T): string | HTMLResult => {
    const entry = cases.find(([key]) => key === v);

    return entry ? entry[1]() : (defaultFn?.() ?? '');
  };

  if (isSignal(value)) {
    return () => _pick((value as ReadonlySignal<T>).value);
  }

  if (typeof value === 'function') {
    return () => _pick((value as () => T)());
  }

  return _pick(value as T);
}
