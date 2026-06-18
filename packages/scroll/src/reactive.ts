/**
 * F1: Ripple integration layer.
 * Wraps `createVirtualizer` so the current state is exposed as a reactive
 * `Signal<VirtualizerState>` from `@vielzeug/ripple`.
 */
import { signal, type Signal } from '@vielzeug/ripple';

import {
  createGroupedVirtualizer,
  type GroupVirtualizer,
  type GroupVirtualizerOptions,
  type GroupVirtualizerState,
} from './grouped-virtualizer';
import {
  createVirtualizer,
  type ScrollTarget,
  type Virtualizer,
  type VirtualizerOptions,
  type VirtualizerState,
} from './virtualizer';

export type { Signal };

export interface ReactiveGroupVirtualizer<T> extends GroupVirtualizer<T> {
  /** Reactive signal carrying the current grouped virtualizer state. */
  readonly state: Signal<GroupVirtualizerState<T>>;
}

export interface ReactiveVirtualizer extends Virtualizer {
  /** Reactive signal carrying the current virtualizer state. */
  readonly state: Signal<VirtualizerState>;
}

/**
 * Create a grouped virtualizer whose current state is exposed as a reactive signal.
 *
 * All `GroupVirtualizer` accessors remain live — they are proxied through to the
 * underlying virtualizer on every access.
 *
 * @example
 * ```ts
 * const v = createReactiveGroupedVirtualizer(el, { sections, estimateItemSize: 48 });
 * effect(() => {
 *   const { headers, items, stickyHeader, totalSize } = v.state.value;
 *   render(headers, items, totalSize);
 * });
 * ```
 */
export function createReactiveGroupedVirtualizer<T>(
  target: ScrollTarget,
  options: Omit<GroupVirtualizerOptions<T>, 'onChange'>,
): ReactiveGroupVirtualizer<T> {
  const state = signal<GroupVirtualizerState<T>>({ headers: [], items: [], stickyHeader: null, totalSize: 0 });

  const v = createGroupedVirtualizer<T>(target, {
    ...options,
    onChange: (s) => {
      state.value = s;
    },
  });

  return new Proxy(v, {
    get(t, p, r) {
      if (p === 'state') return state;

      return Reflect.get(t, p, r);
    },
  }) as unknown as ReactiveGroupVirtualizer<T>;
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

  return new Proxy(v, {
    get(t, p, r) {
      if (p === 'state') return state;

      return Reflect.get(t, p, r);
    },
  }) as unknown as ReactiveVirtualizer;
}
