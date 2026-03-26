import { isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../internal';

type TemplateFn = () => string | HTMLResult;
type CaseEntry<T> = readonly [T, TemplateFn];

export type ChooseOptions<T extends PropertyKey> = {
  cases: ReadonlyArray<CaseEntry<T>>;
  fallback?: TemplateFn;
  value: T | ReadonlySignal<T> | (() => T);
};

const validateChooseOptions = <T extends PropertyKey>(options: ChooseOptions<T>): void => {
  if (!Array.isArray(options.cases)) {
    throw new Error('[craftit:choose] options.cases must be an array of [key, templateFn] entries.');
  }

  for (let i = 0; i < options.cases.length; i++) {
    const entry = options.cases[i] as unknown;

    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[1] !== 'function') {
      throw new Error(`[craftit:choose] Invalid case at index ${i}. Expected [key, templateFn].`);
    }
  }

  if (options.fallback !== undefined && typeof options.fallback !== 'function') {
    throw new Error('[craftit:choose] options.fallback must be a function when provided.');
  }
};

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
 * html`${choose({
 *   value: section,
 *   cases: [
 *     ['home', () => html`<h1>Home</h1>`],
 *     ['about', () => html`<h1>About</h1>`],
 *   ],
 *   fallback: () => html`<h1>Not found</h1>`,
 * })}`
 *
 * // Reactive signal — updates on change
 * const tab = signal('home');
 * html`${choose({ value: tab, cases: [['home', () => html`<home-panel>`], ['about', () => html`<about-panel>`]] })}`
 *
 * // Reactive getter
 * html`${choose({ value: () => props.view.value, cases })}`
 */
export function choose<T extends PropertyKey>(options: ChooseOptions<T>): string | HTMLResult | TemplateFn {
  validateChooseOptions(options);

  const caseMap = new Map(options.cases);
  const pick = (value: T): string | HTMLResult => (caseMap.get(value) ?? options.fallback ?? emptyTemplate)();
  const { value } = options;

  if (isSignal(value)) {
    return () => pick((value as ReadonlySignal<T>).value);
  }

  if (typeof value === 'function') {
    return () => pick((value as () => T)());
  }

  return pick(value as T);
}

const emptyTemplate = (): string => '';
