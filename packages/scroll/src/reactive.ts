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

function withState<THandle extends object, TState>(
  handle: THandle,
  state: Signal<TState>,
): THandle & { readonly state: Signal<TState> } {
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(handle),
      state: { configurable: true, enumerable: true, value: state },
    },
  ) as THandle & { readonly state: Signal<TState> };
}

/**
 * Create a grouped virtualizer whose current state is exposed as a reactive signal.
 *
 * All `GroupVirtualizer` accessors remain live through copied property descriptors.
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

  let userOnChange: ((state: GroupVirtualizerState<T>) => void) | undefined;

  function onChange(next: GroupVirtualizerState<T>): void {
    state.value = next;
    userOnChange?.(next);
  }

  const v = createGroupedVirtualizer<T>(target, { ...options, onChange });
  const reactive = withState(v, state);

  Object.defineProperty(reactive, 'update', {
    configurable: true,
    enumerable: true,
    value(sections: Array<{ items: T[]; label: string }>, next?: Parameters<typeof v.update>[1]) {
      if (!next || !Object.hasOwn(next, 'onChange')) {
        v.update(sections, next);

        return;
      }

      userOnChange = next.onChange;

      const { onChange: _, ...nextOptions } = next;

      v.update(sections, { ...nextOptions, onChange });
    },
  });

  return reactive;
}

/**
 * Create a virtualizer whose current state is exposed as a reactive signal.
 *
 * All `Virtualizer` accessors (count, items, totalSize, scrollOffset, stickyItems)
 * remain live through copied property descriptors, avoiding snapshots from object spread.
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

  let userOnChange: ((state: VirtualizerState) => void) | undefined;

  function onChange(next: VirtualizerState): void {
    state.value = next;
    userOnChange?.(next);
  }

  const v = createVirtualizer(target, { ...options, onChange });
  const reactive = withState(v, state);

  Object.defineProperty(reactive, 'update', {
    configurable: true,
    enumerable: true,
    value(next: Parameters<typeof v.update>[0]) {
      if (!Object.hasOwn(next, 'onChange')) {
        v.update(next);

        return;
      }

      userOnChange = next.onChange;

      const { onChange: _, ...nextOptions } = next;

      v.update({ ...nextOptions, onChange });
    },
  });

  return reactive;
}
