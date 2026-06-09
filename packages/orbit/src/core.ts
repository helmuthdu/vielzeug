import type {
  ComputePositionOptions,
  ComputePositionResult,
  Middleware,
  MiddlewareData,
  MiddlewareReset,
  MiddlewareResult,
  MiddlewareState,
  ReferenceElement,
} from './types';

import { baseCoords, toRect } from './utils';

// ── DOM helpers ────────────────────────────────────────────────────────────────────────────────

export function getRects(reference: ReferenceElement, floating: HTMLElement): MiddlewareState['rects'] {
  return {
    floating: toRect(floating.getBoundingClientRect()),
    reference: toRect(reference.getBoundingClientRect()),
  };
}

// ── Internal state helpers ───────────────────────────────────────────────────────────

function mergeState(state: MiddlewareState, result: MiddlewareResult | void): MiddlewareState {
  if (!result) return state;

  return {
    ...state,
    middlewareData: result.data ? Object.assign({}, state.middlewareData, result.data) : state.middlewareData,
    placement: result.placement ?? state.placement,
    x: result.x ?? state.x,
    y: result.y ?? state.y,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────────────────────

/**
 * Deferred one-shot position computation. Runs `computePosition` in the next **microtask** and
 * returns a `Promise<ComputePositionResult>`.
 *
 * Useful for async component lifecycles (e.g. `await nextTick()` in Vue/React) where the
 * synchronous `computePosition` would read stale DOM measurements because layout has not been
 * committed yet. Note: this defers to the microtask queue, not the next animation frame — if you
 * need post-layout measurements use `requestAnimationFrame` instead.
 *
 * @example
 * ```ts
 * const result = await computeOnce(reference, floating, { placement: 'top' });
 * floating.style.left = `${result.x}px`;
 * floating.style.top  = `${result.y}px`;
 * ```
 */
export function computeOnce(
  reference: ReferenceElement,
  floating: HTMLElement,
  options?: ComputePositionOptions,
): Promise<ComputePositionResult> {
  return Promise.resolve().then(() => computePosition(reference, floating, options));
}

/**
 * Runs the middleware pipeline and returns the final position.
 *
 * Position is computed in viewport-relative coordinates assuming `position: fixed`.
 */
export function computePosition(
  reference: ReferenceElement,
  floating: HTMLElement,
  { boundary, containingBlock, middleware = [], padding, placement = 'bottom' }: ComputePositionOptions = {},
): ComputePositionResult {
  if (import.meta.env.DEV) {
    if (reference === floating) {
      console.warn('[orbit] reference and floating are the same element.');
    }

    const rect = floating.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      console.warn('[orbit] Floating element has zero dimensions — is it hidden or detached from the DOM?');
    }

    const pos = getComputedStyle(floating).position;

    if (pos !== 'fixed' && pos !== 'absolute') {
      console.warn(
        `[orbit] Floating element has \`position: ${pos}\`. ` +
          'Orbit computes viewport-relative coordinates and expects position: fixed ' +
          '(or absolute for scoped stacking contexts).',
      );
    }
  }

  const mws = middleware.filter(Boolean) as Middleware[];
  let currentPlacement = placement;
  let middlewareData: MiddlewareData = {};
  let rects = getRects(reference, floating);

  for (let resets = 0; resets < 8; resets += 1) {
    let state: MiddlewareState = {
      ...baseCoords(currentPlacement, rects.reference, rects.floating),
      boundary,
      elements: { floating, reference },
      initialPlacement: placement,
      middlewareData,
      padding,
      placement: currentPlacement,
      rects,
    };

    let reset: MiddlewareReset | undefined;

    for (const mw of mws) {
      const result = mw(state);

      state = mergeState(state, result);
      middlewareData = state.middlewareData;
      reset = result?.reset;

      if (reset) break;
    }

    if (!reset) {
      const result: ComputePositionResult = {
        middlewareData: state.middlewareData,
        placement: state.placement,
        x: state.x,
        y: state.y,
      };

      if (containingBlock) {
        const cb = containingBlock.getBoundingClientRect();

        return { ...result, x: result.x - cb.x, y: result.y - cb.y };
      }

      return result;
    }

    if (reset.rects === 'remeasure') {
      rects = getRects(reference, floating);
    } else if (reset.rects) {
      rects = reset.rects as MiddlewareState['rects'];
    }

    currentPlacement = reset.placement ?? state.placement;
  }

  throw new Error('[orbit] Middleware triggered too many resets in a single compute cycle.');
}
