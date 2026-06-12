/**
 * @vielzeug/orbit/reactive — reactive signal adapter for @vielzeug/ripple.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles
 * when ripple is not used:
 * ```ts
 * import { createFloatState } from '@vielzeug/orbit/reactive';
 * ```
 */

import type { Signal } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { FloatOptions } from './float';
import type { ComputePositionResult, FloatHandle, ReferenceElement } from './types';

import { warn } from './_warn';
import { float } from './float';

export interface ReactiveFloatHandle {
  /**
   * Reactive signal that holds the most recently computed position.
   * `null` only if the handle was created via the CSS anchor path (`cssAnchor: true`).
   */
  position: Signal<ComputePositionResult | null>;
  /** `true` when position is managed natively by CSS Anchor Positioning. */
  readonly cssAnchor: boolean;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this handle. */
  readonly disposalSignal: AbortSignal;
  /** Removes all event listeners and observers. Always call on teardown. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Manually trigger a position recalculation. */
  update(): void;
  [Symbol.dispose](): void;
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

  const handle: FloatHandle = float(reference, floating, {
    ...options,
    apply: (result) => {
      position.value = result;
    },
  });

  if (import.meta.env.DEV && handle.cssAnchor) {
    warn(
      'createFloatState: CSS Anchor Positioning is active — ' +
        '`position` will remain null. Use a CSS rule or effect instead of reading the signal.',
    );
  }

  return {
    cssAnchor: handle.cssAnchor,
    get disposalSignal(): AbortSignal {
      return handle.disposalSignal;
    },
    dispose: handle.dispose.bind(handle),
    get disposed(): boolean {
      return handle.disposed;
    },
    position,
    [Symbol.dispose](): void {
      handle.dispose();
    },
    update: handle.update.bind(handle),
  };
}
