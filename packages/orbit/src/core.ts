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

import { baseCoords, MIDDLEWARE_NAME, MIDDLEWARE_ORDER_RULES, toRect } from './utils';

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
    middlewareData: result.data ? { ...state.middlewareData, ...result.data } : state.middlewareData,
    placement: result.placement ?? state.placement,
    x: result.x ?? state.x,
    y: result.y ?? state.y,
  };
}

// ── Dev-mode middleware ordering validation ───────────────────────────────────

function validateMiddlewareOrder(middleware: Middleware[]): void {
  const names = middleware.map((mw) => (mw as unknown as Record<symbol, string>)[MIDDLEWARE_NAME] ?? null);

  for (const [before, after] of MIDDLEWARE_ORDER_RULES) {
    const beforeIdx = names.indexOf(before);
    const afterIdx = names.indexOf(after);

    if (beforeIdx !== -1 && afterIdx !== -1 && beforeIdx < afterIdx) {
      throw new Error(
        `[orbit] computePosition(): "${before}" must come after "${after}". ` +
          `Recommended order: offset → flip/autoPlacement → shift → size → arrow.`,
      );
    }
  }

  if (names.includes('flip') && names.includes('autoPlacement')) {
    throw new Error('[orbit] computePosition(): use either flip() or autoPlacement(), not both.');
  }
}

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

    validateMiddlewareOrder(middleware.filter(Boolean) as Middleware[]);
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
