import { isReactive, type Readable } from '@vielzeug/ripple';
import type { MaybeSignal } from '../types';

/**
 * Normalizes a `MaybeSignal<T>` into a `Readable<T>`. Plain values are wrapped
 * in a constant readable so chart factories can `.value`/`.peek` uniformly and
 * drop repeated `isReactive()` checks per render.
 */
export function resolveMaybeSignal<T>(value: MaybeSignal<T>): Readable<T> {
  return isReactive(value)
    ? value
    : {
        peek: () => value,
        subscribe: () => () => {},
        get value() {
          return value;
        },
      };
}
