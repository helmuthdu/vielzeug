import type { ComputePositionOptions, ComputePositionResult, FloatHandle, Placement, ReferenceElement } from './types';

import { autoUpdate, type AutoUpdateOptions } from './auto-update';
import { computePosition } from './core';

// ── makeHandle ────────────────────────────────────────────────────────────────

/**
 * Constructs a {@link FloatHandle} with idempotent dispose, disposalSignal, and disposed getter.
 * @internal — exported for use by ssr.ts and devtools.ts only.
 */
export function makeHandle(
  rawDispose: () => void,
  getPosition: () => ComputePositionResult | null,
  update: () => void,
): FloatHandle {
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
    [Symbol.dispose](): void {
      this.dispose();
    },
    update,
  };
}

// ── CSS Anchor Positioning ────────────────────────────────────────────────────

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
  const saved: Record<string, string | undefined> = {};

  for (const prop of Object.keys(props)) {
    const prev = el.style.getPropertyValue(prop);

    saved[prop] = prev !== '' ? prev : undefined;
    el.style.setProperty(prop, props[prop]);
  }

  return () => {
    for (const prop of Object.keys(props)) {
      const prev = saved[prop];

      if (prev !== undefined) {
        el.style.setProperty(prop, prev);
      } else {
        el.style.removeProperty(prop);
      }
    }
  };
}

function setupCssAnchorPositioning(
  reference: HTMLElement,
  floating: HTMLElement,
  placement: Placement,
  fallbacks: string,
): () => void {
  const name = `--orbit-${++anchorCounter}`;

  const cleanupRef = withStyles(reference, { 'anchor-name': name });
  const cleanupFloat = withStyles(floating, {
    position: 'fixed',
    'position-anchor': name,
    'position-area': POSITION_AREA[placement],
    'position-try-fallbacks': fallbacks,
  });

  return () => {
    cleanupRef();
    cleanupFloat();
  };
}

export interface CssAnchorHandle extends FloatHandle {
  /** Always `true` — position is managed natively by CSS Anchor Positioning. */
  readonly cssAnchor: true;
}

/**
 * Uses CSS Anchor Positioning to let the browser handle repositioning natively.
 * No JavaScript positioning loop — the browser manages placement via `position-try-fallbacks`.
 *
 * Requires both elements to be `HTMLElement`. Falls back to `float()` for complex cases
 * (e.g. middleware pipelines, custom apply callbacks).
 *
 * @experimental CSS Anchor Positioning support varies by browser. Check `isCssAnchorSupported()`
 * before using in production.
 *
 * @example
 * ```ts
 * import { floatWithAnchor } from '@vielzeug/orbit';
 *
 * const handle = floatWithAnchor(trigger, tooltip, { placement: 'top' });
 * // on hide:
 * handle.dispose();
 * ```
 */
export function floatWithAnchor(
  reference: HTMLElement,
  floating: HTMLElement,
  {
    fallbacks = 'flip-block, flip-inline, flip-block flip-inline',
    placement = 'bottom',
  }: { fallbacks?: string; placement?: Placement } = {},
): CssAnchorHandle {
  const cleanupFn = setupCssAnchorPositioning(reference, floating, placement, fallbacks);
  const base = makeHandle(
    () => cleanupFn(),
    () => null,
    () => {},
  );

  return Object.assign(base, { cssAnchor: true as const });
}

/**
 * Returns `true` when the browser supports CSS Anchor Positioning.
 * Use to guard `floatWithAnchor()` calls in production.
 */
export { isCssAnchorPositioningSupported as isCssAnchorSupported };

// ── float() ───────────────────────────────────────────────────────────────────

/**
 * Options for `float()`. Extends `ComputePositionOptions` so all positioning
 * options (`placement`, `middleware`, `boundary`, `padding`, `containingBlock`)
 * are inherited directly.
 */
export interface FloatOptions extends ComputePositionOptions {
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
}

function applyDefault(result: ComputePositionResult, floating: HTMLElement): void {
  floating.style.left = `${result.x}px`;
  floating.style.top = `${result.y}px`;
}

/**
 * High-level API: positions the floating element and continuously keeps it updated.
 *
 * For CSS Anchor Positioning (browser-native, no JS loop), use {@link floatWithAnchor} instead.
 *
 * Returns a {@link FloatHandle} with `dispose()`, `update()`, and `getPosition()`.
 * Always call `dispose()` on teardown to remove listeners.
 *
 * @example
 * ```ts
 * const handle = float(trigger, tooltip, {
 *   placement: 'top',
 *   middleware: [offset(8), flip(), shift({ padding: 6 })],
 * });
 * // on hide:
 * handle.dispose();
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
  }: FloatOptions = {},
): FloatHandle {
  let lastPosition: ComputePositionResult | null = null;
  const applyFn = apply ?? ((result) => applyDefault(result, floating));

  function update(): void {
    const result = computePosition(reference, floating, { boundary, containingBlock, middleware, padding, placement });

    lastPosition = result;
    applyFn(result);
  }

  if (autoUpdateOptions === false) {
    update();

    return makeHandle(
      () => {},
      () => lastPosition,
      update,
    );
  }

  const cleanupFn = autoUpdate(reference, floating, update, autoUpdateOptions);

  return makeHandle(
    () => cleanupFn(),
    () => lastPosition,
    update,
  );
}
