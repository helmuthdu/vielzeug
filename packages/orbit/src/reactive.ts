/**
 * @vielzeug/orbit/reactive — reactive signal adapter for @vielzeug/ripple.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles
 * when ripple is not used:
 * ```ts
 * import { createFloatState } from '@vielzeug/orbit/reactive';
 * ```
 */

import type { ReadonlySignal } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { FloatOptions } from './float';
import type { ComputePositionResult, FloatHandle, ReferenceElement } from './types';

import { float } from './float';

/**
 * Reactive handle returned by `createFloatState`.
 * Extends {@link FloatHandle} with a `position` signal that updates on every reposition.
 */
export interface ReactiveFloatHandle extends FloatHandle {
  /** Reactive signal that holds the most recently computed position. Read-only. */
  readonly position: ReadonlySignal<ComputePositionResult | null>;
}

/**
 * Like `float()` but exposes a reactive {@link Signal} that updates on every position change.
 *
 * DOM styles are **not** automatically applied — use a ripple `effect` to read `position` and apply:
 *
 * ```ts
 * import { createFloatState } from '@vielzeug/orbit/reactive';
 * import { effect } from '@vielzeug/ripple';
 *
 * const { position, dispose } = createFloatState(reference, tooltip, {
 *   placement: 'top',
 *   middleware: [offset(8), flip(), shift({ padding: 6 })],
 * });
 *
 * effect(() => {
 *   const pos = position.value;
 *   if (!pos) return;
 *   tooltip.style.left = `${pos.x}px`;
 *   tooltip.style.top  = `${pos.y}px`;
 * });
 *
 * // on teardown:
 * dispose();
 * ```
 */
export function createFloatState(
  reference: ReferenceElement,
  floating: HTMLElement,
  options: Omit<FloatOptions, 'apply'> = {},
): ReactiveFloatHandle {
  const position = signal<ComputePositionResult | null>(null);

  const handle = float(reference, floating, {
    ...options,
    apply: (result) => {
      position.value = result;
    },
  });

  return Object.assign(handle, {
    position: position as ReadonlySignal<ComputePositionResult | null>,
  });
}
