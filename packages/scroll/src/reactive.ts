/**
 * F1: Ripple integration layer.
 * Wraps `createVirtualizer` so the current state is exposed as a reactive
 * `Signal<VirtualizerState>` from `@vielzeug/ripple`.
 */
import { signal, type Signal } from '@vielzeug/ripple';

import {
  createVirtualizer,
  type ScrollTarget,
  type Virtualizer,
  type VirtualizerOptions,
  type VirtualizerState,
} from './virtualizer';

export type { Signal };

export interface ReactiveVirtualizer extends Virtualizer {
  /** Reactive signal carrying the current virtualizer state. */
  readonly state: Signal<VirtualizerState>;
}

/**
 * Create a virtualizer whose current state is exposed as a reactive signal.
 *
 * All `Virtualizer` accessors (count, items, totalSize, scrollOffset, stickyItems)
 * remain live — they are proxied through to the underlying virtualizer on every
 * access. A Proxy is used instead of object spread, which would snapshot getter
 * values at construction time and cause stale reads after state changes.
 *
 * @example
 * ```ts
 * const v = createReactiveVirtualizer(el, { count: 1000, estimateSize: 40 });
 * effect(() => {
 *   const { items, totalSize } = v.state.value;
 *   render(items, totalSize);
 * });
 * ```
 */
export function createReactiveVirtualizer(
  target: ScrollTarget,
  options: Omit<VirtualizerOptions, 'onChange'>,
): ReactiveVirtualizer {
  const state = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });

  const v = createVirtualizer(target, {
    ...options,
    onChange: (s) => {
      state.value = s;
    },
  });

  return new Proxy(v as unknown as ReactiveVirtualizer, {
    get(target, prop, receiver) {
      if (prop === 'state') return state;

      return Reflect.get(target as object, prop, receiver);
    },
  });
}
