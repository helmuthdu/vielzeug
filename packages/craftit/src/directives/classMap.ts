import { computed, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

/**
 * Produces a reactive string of class names from an object map.
 *
 * Each key is a class name. Its value may be:
 * - a static `boolean`
 * - a `Signal<boolean>`
 * - a getter `() => boolean`
 *
 * Returns a `ReadonlySignal<string>` that can be used directly in a template
 * class attribute:
 *
 * @example
 * ```ts
 * html`<div class="${classMap({ active: isActive, hidden: () => !isVisible.value })}"></div>`
 * ```
 */
export const classMap = (
  map: Record<string, (() => boolean) | ReadonlySignal<boolean> | boolean>,
): ReadonlySignal<string> => {
  return computed(() =>
    Object.entries(map)
      .filter(([, v]) => (typeof v === 'function' ? v() : isSignal(v) ? v.value : v))
      .map(([k]) => k)
      .join(' '),
  );
};
