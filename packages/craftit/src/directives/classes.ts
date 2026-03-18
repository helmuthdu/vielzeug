import { isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { computedOrStatic } from '../internal';

type ClassValue = boolean | undefined | null | Signal<boolean> | ReadonlySignal<boolean> | (() => boolean);

/**
 * Build a dynamic class string from an object map of class names to conditions.
 * Conditions can be static booleans, reactive Signals, or getter functions.
 * When any condition is reactive the returned value is a `ReadonlySignal<string>`
 * so it can be bound directly to a `class` attribute.
 *
 * @example
 * import { classes } from '@vielzeug/craftit/directives';
 *
 * // Static — returns a plain string
 * html`<div class=${classes({ foo: true, bar: false })}></div>`
 *
 * // Reactive — returns a signal; no arrow-function wrapper needed
 * html`<div class=${classes({ active: isActive, disabled: isDisabled })}></div>`
 */
export function classes(map: Record<string, ClassValue>): string | ReadonlySignal<string> {
  const entries = Object.entries(map);
  const hasReactive = entries.some(([, v]) => isSignal(v) || typeof v === 'function');

  const _build = (): string =>
    entries
      .filter(([, v]) => {
        if (isSignal(v)) return (v as ReadonlySignal<boolean>).value;

        if (typeof v === 'function') return !!(v as () => boolean)();

        return !!v;
      })
      .map(([k]) => k)
      .join(' ');

  return computedOrStatic(hasReactive, _build);
}
