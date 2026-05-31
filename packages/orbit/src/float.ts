import type {
  ComputePositionOptions,
  ComputePositionResult,
  FloatHandle,
  Middleware,
  Placement,
  ReferenceElement,
} from './types';

import { autoUpdate, type AutoUpdateOptions } from './auto-update';
import { computePosition } from './core';

// ── CSS Anchor Positioning (progressive enhancement) ─────────────────────────────────────────

function isCssAnchorPositioningSupported(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('anchor-name', '--orbit');
}

let anchorCounter = 0;

/**
 * Maps a placement to the CSS `position-area` value.
 * https://drafts.csswg.org/css-anchor-position/#position-area
 */
const POSITION_AREA: Record<Placement, string> = {
  bottom: 'block-end center',
  'bottom-end': 'block-end span-inline-end',
  'bottom-start': 'block-end span-inline-start',
  left: 'inline-start center',
  'left-end': 'inline-start span-block-end',
  'left-start': 'inline-start span-block-start',
  right: 'inline-end center',
  'right-end': 'inline-end span-block-end',
  'right-start': 'inline-end span-block-start',
  top: 'block-start center',
  'top-end': 'block-start span-inline-end',
  'top-start': 'block-start span-inline-start',
};

/** Applies a set of CSS properties to an element and returns a cleanup that restores them. */
function withStyles(el: HTMLElement, props: Record<string, string>): () => void {
  const saved: Record<string, string> = {};

  for (const prop of Object.keys(props)) {
    saved[prop] = el.style.getPropertyValue(prop);
    el.style.setProperty(prop, props[prop]);
  }

  return () => {
    for (const prop of Object.keys(props)) {
      if (saved[prop]) {
        el.style.setProperty(prop, saved[prop]);
      } else {
        el.style.removeProperty(prop);
      }
    }
  };
}

/**
 * Sets up CSS Anchor Positioning on the two elements and returns a cleanup function.
 * The browser handles repositioning natively — no scroll or resize listeners needed.
 */
function setupCssAnchorPositioning(reference: HTMLElement, floating: HTMLElement, placement: Placement): () => void {
  const name = `--orbit-${++anchorCounter}`;

  const cleanupRef = withStyles(reference, { 'anchor-name': name });
  const cleanupFloat = withStyles(floating, {
    position: 'fixed',
    'position-anchor': name,
    'position-area': POSITION_AREA[placement],
    'position-try-fallbacks': 'flip-block, flip-inline, flip-block flip-inline',
  });

  return () => {
    cleanupRef();
    cleanupFloat();
  };
}

// ── float() ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FloatOptions {
  placement?: Placement;
  middleware?: Array<Middleware | null | undefined | false>;
  /**
   * Custom callback to apply the computed position to the DOM.
   * Called once per position update with the full `ComputePositionResult`.
   * Defaults to writing `left` / `top` on the floating element (requires `position: fixed`).
   */
  apply?: (result: ComputePositionResult) => void;
  /**
   * Options for the auto-update loop. Omit to use defaults.
   * Pass `false` to disable auto-updating (position is computed once on call).
   */
  autoUpdate?: AutoUpdateOptions | false;
  /**
   * When `true`, use CSS Anchor Positioning in browsers that support it.
   * Falls back to JS positioning when unsupported or when `middleware` is non-empty.
   *
   * CSS anchor positioning lets the browser handle repositioning natively with no JS overhead.
   * Supports basic `flip-block / flip-inline` fallbacks via `position-try-fallbacks`.
   *
   * @experimental CSS Anchor Positioning support varies by browser.
   */
  preferCssAnchor?: boolean;
  /**
   * The containing block element for `position: absolute` floating elements.
   * Provide the floating element's `offsetParent` to convert viewport-relative
   * coordinates to containing-block-relative coordinates.
   */
  containingBlock?: Element | null;
  /**
   * Default boundary for all overflow-aware middleware. Per-middleware `boundary` takes precedence.
   * Defaults to the visual viewport.
   */
  boundary?: ComputePositionOptions['boundary'];
  /**
   * Default padding for all overflow-aware middleware. Per-middleware `padding` takes precedence.
   * Defaults to `0`.
   */
  padding?: ComputePositionOptions['padding'];
}

function applyDefault(result: ComputePositionResult, floating: HTMLElement): void {
  floating.style.left = `${result.x}px`;
  floating.style.top = `${result.y}px`;
}

/**
 * High-level API: positions the floating element and continuously keeps it updated.
 *
 * Returns a {@link FloatHandle} with `cleanup()`, `update()`, and `getPosition()`.
 * Always call `cleanup()` on teardown to remove listeners.
 *
 * @example
 * ```ts
 * const { cleanup } = float(trigger, tooltip, {
 *   placement: 'top',
 *   middleware: [offset(8), flip(), shift({ padding: 6 })],
 * });
 * // on hide:
 * cleanup();
 * ```
 */
export function float(
  reference: ReferenceElement,
  floating: HTMLElement,
  {
    apply,
    autoUpdate: autoUpdateOptions = {},
    boundary,
    containingBlock,
    middleware,
    padding,
    placement = 'bottom',
    preferCssAnchor = false,
  }: FloatOptions = {},
): FloatHandle {
  const hasMiddleware = middleware && middleware.some(Boolean);
  const useCssAnchor =
    preferCssAnchor &&
    apply == null &&
    !hasMiddleware &&
    reference instanceof HTMLElement &&
    isCssAnchorPositioningSupported();

  if (useCssAnchor) {
    const cleanup = setupCssAnchorPositioning(reference, floating, placement);

    return { cleanup, cssAnchor: true, getPosition: () => null, update: () => {} };
  }

  let lastPosition: ComputePositionResult | null = null;
  const applyFn = apply ?? ((result) => applyDefault(result, floating));

  function update(): void {
    const result = computePosition(reference, floating, { boundary, containingBlock, middleware, padding, placement });

    lastPosition = result;
    applyFn(result);
  }

  if (autoUpdateOptions === false) {
    update();

    return { cleanup: () => {}, cssAnchor: false, getPosition: () => lastPosition, update };
  }

  const cleanup = autoUpdate(reference, floating, update, autoUpdateOptions);

  return { cleanup, cssAnchor: false, getPosition: () => lastPosition, update };
}
