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

  return {
    get count() {
      return v.count;
    },
    destroy: () => v.destroy(),
    invalidate: () => v.invalidate(),
    get items() {
      return v.items;
    },
    measure: (index, size) => v.measure(index, size),
    measureBatch: (entries) => v.measureBatch(entries),
    measureEl: (index, el) => v.measureEl(index, el),
    prepend: (n) => v.prepend(n),
    redraw: () => v.redraw(),
    refresh: () => v.refresh(),
    get scrollOffset() {
      return v.scrollOffset;
    },
    scrollToBottom: (opts) => v.scrollToBottom(opts),
    scrollToIndex: (index, opts) => v.scrollToIndex(index, opts),
    scrollToOffset: (offset, opts) => v.scrollToOffset(offset, opts),
    scrollToTop: (opts) => v.scrollToTop(opts),
    state,
    get stickyItems() {
      return v.stickyItems;
    },
    [Symbol.dispose]: () => v[Symbol.dispose](),
    get totalSize() {
      return v.totalSize;
    },
    update: (next) => v.update(next),
  };
}
