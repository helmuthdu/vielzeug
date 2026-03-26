import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { toKebab } from '../internal';

type StyleValue =
  | string
  | number
  | undefined
  | null
  | Signal<string | number>
  | ReadonlySignal<string | number>
  | (() => string | number | null | undefined);

/** Properties that are unitless — numbers are NOT suffixed with 'px'. */
const UNITLESS = new Set([
  'animationIterationCount',
  'columnCount',
  'flex',
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'gridColumn',
  'gridRow',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
]);

const toCssValue = (prop: string, val: string | number): string => {
  if (typeof val === 'number' && !UNITLESS.has(prop)) return `${val}px`;

  return String(val);
};

/**
 * Build a dynamic inline style string from an object map of CSS properties to values.
 * Supports camelCase property names (auto-converted to kebab-case). Number values
 * automatically get a `px` suffix except for unitless properties (opacity, zIndex, etc.).
 *
 * When any value is a reactive Signal or getter function the returned value is a
 * `ReadonlySignal<string>` that updates automatically — no arrow-function wrapper needed.
 *
 * @example
 * import { style } from '@vielzeug/craftit/directives';
 *
 * // Static — returns a plain string
 * html`<div style=${style({ color: 'red', fontSize: 16 })}></div>`
 *
 * // Reactive — returns a signal
 * html`<div style=${style({ fontSize: size, color: theme })}></div>`
 */
export function style(map: Record<string, StyleValue>): string | ReadonlySignal<string> {
  const entries = Object.entries(map);
  const hasReactive = entries.some(([, v]) => isSignal(v) || typeof v === 'function');

  const build = (): string => {
    const parts: string[] = [];

    for (const [k, v] of entries) {
      const raw = isSignal(v)
        ? (v as ReadonlySignal<string | number>).value
        : typeof v === 'function'
          ? (v as () => string | number | null | undefined)()
          : v;

      if (raw != null && raw !== '') parts.push(`${toKebab(k)}:${toCssValue(k, raw as string | number)}`);
    }

    return parts.join(';');
  };

  return hasReactive ? computed(build) : build();
}
