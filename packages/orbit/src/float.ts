import type { Cleanup, ComputePositionResult, Middleware, Placement, ReferenceElement } from './types';

import { type AutoUpdateOptions, autoUpdate } from './auto-update';
import { computePosition } from './core';

// ── CSS Anchor Positioning (progressive enhancement) ─────────────────────────

let _cssAnchorSupported: boolean | undefined;

function isCssAnchorPositioningSupported(): boolean {
  if (_cssAnchorSupported !== undefined) return _cssAnchorSupported;

  _cssAnchorSupported = typeof CSS !== 'undefined' && CSS.supports('anchor-name', '--orbit');

  return _cssAnchorSupported;
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

/**
 * Sets up CSS Anchor Positioning on the two elements and returns a cleanup function.
 * The browser handles repositioning natively — no scroll or resize listeners needed.
 */
function setupCssAnchorPositioning(reference: HTMLElement, floating: HTMLElement, placement: Placement): Cleanup {
  const name = `--orbit-${++anchorCounter}`;
  const refEl = reference;

  const prevAnchorName = refEl.style.getPropertyValue('anchor-name');
  const prevPositionAnchor = floating.style.getPropertyValue('position-anchor');
  const prevPosition = floating.style.position;
  const prevPositionArea = floating.style.getPropertyValue('position-area');
  const prevTryFallbacks = floating.style.getPropertyValue('position-try-fallbacks');

  refEl.style.setProperty('anchor-name', name);
  floating.style.setProperty('position-anchor', name);
  floating.style.position = 'fixed';
  floating.style.setProperty('position-area', POSITION_AREA[placement]);
  floating.style.setProperty('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline');

  return (): void => {
    if (prevAnchorName) {
      refEl.style.setProperty('anchor-name', prevAnchorName);
    } else {
      refEl.style.removeProperty('anchor-name');
    }

    if (prevPositionAnchor) {
      floating.style.setProperty('position-anchor', prevPositionAnchor);
    } else {
      floating.style.removeProperty('position-anchor');
    }

    floating.style.position = prevPosition;

    if (prevPositionArea) {
      floating.style.setProperty('position-area', prevPositionArea);
    } else {
      floating.style.removeProperty('position-area');
    }

    if (prevTryFallbacks) {
      floating.style.setProperty('position-try-fallbacks', prevTryFallbacks);
    } else {
      floating.style.removeProperty('position-try-fallbacks');
    }
  };
}

// ── float() ──────────────────────────────────────────────────────────────────

export interface FloatOptions {
  placement?: Placement;
  middleware?: Array<Middleware | null | undefined | false>;
  /**
   * Custom callback to apply the computed position to the DOM.
   * Defaults to writing `left` / `top` on the floating element (requires `position: fixed`).
   */
  apply?: (result: ComputePositionResult, elements: { floating: HTMLElement; reference: ReferenceElement }) => void;
  /**
   * Options for the auto-update loop. Omit to use defaults.
   * Pass `autoUpdate: false` to disable auto-updating (position is computed once on call).
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
}

function applyDefault(result: ComputePositionResult, elements: { floating: HTMLElement }): void {
  elements.floating.style.left = `${result.x}px`;
  elements.floating.style.top = `${result.y}px`;
}

/**
 * High-level API: positions the floating element and continuously keeps it updated.
 *
 * Returns a cleanup function — **always call it** to remove scroll/resize listeners.
 *
 * @example
 * ```ts
 * const cleanup = float(trigger, tooltip, {
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
    apply = applyDefault,
    autoUpdate: autoUpdateOptions = {},
    middleware,
    placement = 'bottom',
    preferCssAnchor = false,
  }: FloatOptions = {},
): Cleanup {
  const hasMiddleware = middleware && middleware.some(Boolean);
  const useCssAnchor =
    preferCssAnchor &&
    apply === applyDefault &&
    !hasMiddleware &&
    reference instanceof HTMLElement &&
    isCssAnchorPositioningSupported();

  if (useCssAnchor) {
    return setupCssAnchorPositioning(reference, floating, placement);
  }

  function update(): void {
    const result = computePosition(reference, floating, { middleware, placement });

    apply(result, { floating, reference });
  }

  if (autoUpdateOptions === false) {
    update();

    return (): void => {};
  }

  return autoUpdate(reference, floating, update, autoUpdateOptions);
}
