import { devOnly, warn } from './_dev';
import { OrbitConfigError } from './errors';
import type {
  ComputePositionOptions,
  ComputePositionResult,
  MiddlewareData,
  MiddlewareReset,
  MiddlewareResult,
  MiddlewareState,
  ReferenceElement,
} from './types';
import { baseCoords, toRect } from './utils';

// ── DOM helpers ────────────────────────────────────────────────────────────────────────────────

/** Reads the bounding rects of the reference and floating elements from the DOM. */
function getRects(reference: ReferenceElement, floating: HTMLElement): MiddlewareState['rects'] {
  return {
    floating: toRect(floating.getBoundingClientRect()),
    reference: toRect(reference.getBoundingClientRect()),
  };
}

// ── Internal state helpers ───────────────────────────────────────────────────────────

function mergeState(state: MiddlewareState, result: MiddlewareResult | undefined): MiddlewareState {
  if (!result) return state;

  return {
    ...state,
    middlewareData: result.data
      ? (Object.assign(Object.create(null), state.middlewareData, result.data) as MiddlewareData)
      : state.middlewareData,
    placement: result.placement ?? state.placement,
    x: result.x ?? state.x,
    y: result.y ?? state.y,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────────────────────

/** Maximum number of pipeline restarts allowed per `computePosition` call before throwing. */
const MAX_RESETS = 8;

// ── Public API ────────────────────────────────────────────────────────────────────────────────

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
  const mws = middleware;

  if (reference === floating) {
    warn('computePosition: reference and floating are the same element.');
  }

  let currentPlacement = placement;
  let middlewareData: MiddlewareData = {};
  let rects = getRects(reference, floating);

  devOnly(() => {
    if (rects.floating.width === 0 && rects.floating.height === 0) {
      warn('computePosition: floating element has zero dimensions — is it hidden or detached from the DOM?');
    }

    const pos = getComputedStyle(floating).position;

    if (pos !== 'fixed' && pos !== 'absolute') {
      warn(
        `computePosition: floating element has \`position: ${pos}\`. ` +
          'Orbit computes viewport-relative coordinates and expects position: fixed ' +
          '(or absolute for scoped stacking contexts).',
      );
    }
  });

  for (let resets = 0; resets < MAX_RESETS; resets += 1) {
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

    if (reset.remeasure) {
      rects = getRects(reference, floating);
    } else if (reset.rects != null) {
      rects = reset.rects;
    }

    currentPlacement = reset.placement ?? state.placement;
  }

  throw new OrbitConfigError('Middleware triggered too many resets in a single compute cycle.');
}
