import { type AutoUpdateOptions, autoUpdate } from './auto-update';
import { getContainingBlock } from './containing-block';
import { computePosition } from './core';
import { getClippingAncestorRect } from './overflow';
import type { ComputePositionOptions, ComputePositionResult, ReferenceElement } from './types';

export type PositionStrategy = 'absolute' | 'fixed';

export interface PositionerOptions extends Omit<ComputePositionOptions, 'boundary' | 'containingBlock'> {
  apply?: (result: ComputePositionResult) => void;
  autoUpdate?: AutoUpdateOptions | false;
  boundary?: ComputePositionOptions['boundary'] | 'clippingAncestors';
  strategy?: PositionStrategy;
}

export interface Positioner {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getPosition(): ComputePositionResult;
  update(): void;
  [Symbol.dispose](): void;
}

function resolveContainingBlock(floating: HTMLElement, strategy: PositionStrategy): Element | null {
  if (strategy === 'absolute') return floating.offsetParent instanceof Element ? floating.offsetParent : null;

  return getContainingBlock(floating);
}

/** @internal — default apply: sets position, left, top on the floating element. */
export function applyDefault(result: ComputePositionResult, floating: HTMLElement, strategy: PositionStrategy): void {
  floating.style.position = strategy;
  floating.style.left = `${result.x}px`;
  floating.style.top = `${result.y}px`;
}

/**
 * Creates a lifecycle-owned floating positioner.
 *
 * The positioner starts immediately and owns coordinate strategy, clipping-boundary resolution,
 * updates, and cleanup. Create it after the elements mount and dispose it when their owner ends.
 */
export function createPositioner(
  reference: ReferenceElement,
  floating: HTMLElement,
  {
    apply,
    autoUpdate: autoUpdateOptions = {},
    boundary: boundaryOption = 'clippingAncestors',
    middleware,
    padding,
    placement = 'bottom',
    strategy = 'fixed',
  }: PositionerOptions = {},
): Positioner {
  const controller = new AbortController();
  let active = true;
  let disposed = false;
  let cleanup: (() => void) | undefined;
  let lastPosition: ComputePositionResult;

  function update(): void {
    if (!active) return;

    const containingBlock = resolveContainingBlock(floating, strategy);
    const boundary = boundaryOption === 'clippingAncestors' ? getClippingAncestorRect(floating) : boundaryOption;
    const result = computePosition(reference, floating, { boundary, containingBlock, middleware, padding, placement });

    lastPosition = result;
    (apply ?? ((position) => applyDefault(position, floating, strategy)))(result);
  }

  const positioner: Positioner = {
    get disposalSignal() {
      return controller.signal;
    },
    dispose() {
      if (disposed) return;

      disposed = true;
      active = false;
      controller.abort();
      cleanup?.();
    },
    get disposed() {
      return disposed;
    },
    getPosition: () => lastPosition,
    [Symbol.dispose]() {
      this.dispose();
    },
    update() {
      if (!disposed) update();
    },
  };

  if (autoUpdateOptions === false) update();
  else cleanup = autoUpdate(reference, floating, update, autoUpdateOptions);

  return positioner;
}
