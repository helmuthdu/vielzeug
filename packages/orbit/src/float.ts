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
  getPosition(): ComputePositionResult | null;
  start(): void;
  update(): void;
  [Symbol.dispose](): void;
}

function makePositioner(
  rawDispose: () => void,
  getPosition: () => ComputePositionResult | null,
  start: () => void,
  update: () => void,
): Positioner {
  const controller = new AbortController();
  let disposed = false;

  return {
    get disposalSignal() {
      return controller.signal;
    },
    dispose() {
      if (disposed) return;

      disposed = true;
      controller.abort();
      rawDispose();
    },
    get disposed() {
      return disposed;
    },
    getPosition,
    start(): void {
      if (!disposed) start();
    },
    [Symbol.dispose](): void {
      this.dispose();
    },
    update(): void {
      if (!disposed) update();
    },
  };
}

function resolveContainingBlock(floating: HTMLElement, strategy: PositionStrategy): Element | null {
  if (strategy === 'absolute') return floating.offsetParent instanceof Element ? floating.offsetParent : null;

  return getContainingBlock(floating);
}

function applyDefault(result: ComputePositionResult, floating: HTMLElement, strategy: PositionStrategy): void {
  floating.style.position = strategy;
  floating.style.left = `${result.x}px`;
  floating.style.top = `${result.y}px`;
}

/**
 * Creates a lifecycle-owned floating positioner.
 *
 * The positioner owns coordinate strategy, clipping-boundary resolution, updates, and cleanup.
 * Call `start()` once the elements are mounted, then call `dispose()` when their owner ends.
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
  let active = true;
  let cleanup: (() => void) | undefined;
  let lastPosition: ComputePositionResult | null = null;
  let started = false;

  function update(): void {
    if (!active) return;

    const containingBlock = resolveContainingBlock(floating, strategy);
    const boundary = boundaryOption === 'clippingAncestors' ? getClippingAncestorRect(floating) : boundaryOption;
    const result = computePosition(reference, floating, { boundary, containingBlock, middleware, padding, placement });

    lastPosition = result;
    (apply ?? ((position) => applyDefault(position, floating, strategy)))(result);
  }

  function start(): void {
    if (started) return;

    started = true;

    if (autoUpdateOptions === false) update();
    else cleanup = autoUpdate(reference, floating, update, autoUpdateOptions);
  }

  return makePositioner(
    () => {
      active = false;
      cleanup?.();
    },
    () => lastPosition,
    start,
    update,
  );
}
