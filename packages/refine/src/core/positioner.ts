import {
  autoUpdate,
  computePosition,
  flip,
  getClippingAncestorRect,
  offset,
  type Placement,
  type Rect,
  shift,
  size,
} from '@vielzeug/orbit';

import { elementDirection } from './direction';

// ── Overlay positioner contract ──────────────────────────────────────────────

export type OverlayPositioner = {
  floating: () => HTMLElement | null;
  reference: () => HTMLElement | null;
  /** Start continuous position auto-updates. Returns a stop function. */
  startAutoUpdate?: () => () => void;
  update: () => void;
};

// ── Dropdown positioner ───────────────────────────────────────────────────────

export type DropdownPositionerOptions = {
  /**
   * Clipping boundary for flip/shift/size — the edges the dropdown must stay within.
   * Defaults to the nearest ancestor that actually clips content (`overflow:
   * hidden|auto|scroll|clip`, e.g. a dialog panel), auto-detected per update via
   * `getClippingAncestorRect()`, intersected with the viewport. Without this, flip/shift only
   * avoid the full page viewport — a dropdown can be "in view" by that measure while still
   * visibly overhanging a much smaller container it's actually nested in. Pass an explicit
   * boundary to override auto-detection.
   */
  boundary?: Element | Rect;
  /**
   * Returns the text direction used for placement mirroring. Defaults to the resolved
   * direction of the reference element (nearest `dir="ltr"|"rtl"` ancestor, falling back to
   * computed style) — most callers never need to pass this explicitly.
   */
  getDir?: () => 'ltr' | 'rtl';
  /** Getter for the floating (dropdown panel) element. */
  getFloating: () => HTMLElement | null;
  /** Getter for the current placement. Defaults to 'bottom-start' (RTL-aware: flips to 'bottom-end'). */
  getPlacement?: () => Placement;
  /** Getter for the reference (trigger) element. */
  getReference: () => HTMLElement | null;
  /** Whether to match the floating element width to the reference. Default: true */
  matchWidth?: boolean;
  /** Additional offset in pixels between reference and floating element. Default: 0 */
  offsetPx?: number;
  /** Padding (px) used by flip, shift, and size middleware. Default: 6 */
  padding?: number;
};

/** Mirrors a start/end placement for RTL layouts. */
const rtlPlacement = (p: Placement): Placement => {
  if (p.endsWith('-start')) return p.replace('-start', '-end') as Placement;

  if (p.endsWith('-end')) return p.replace('-end', '-start') as Placement;

  return p;
};

/**
 * Creates an Orbit-powered positioner for dropdown overlays (select, combobox, menu).
 *
 * Uses flip + shift + optional width-matching middleware. Supports continuous
 * auto-update for repositioning on scroll or resize.
 *
 * RTL-aware: start/end placements are automatically mirrored so dropdowns open on the
 * correct side, based on `getDir` (or the reference element's resolved direction when
 * `getDir` is omitted).
 */
export function createDropdownPositioner({
  boundary,
  getDir,
  getFloating,
  getPlacement,
  getReference,
  matchWidth = true,
  offsetPx = 0,
  padding = 6,
}: DropdownPositionerOptions): OverlayPositioner {
  function resolvedPlacement(): Placement {
    const base = getPlacement?.() ?? 'bottom-start';
    const dir = getDir?.() ?? elementDirection(getReference());

    return dir === 'rtl' ? rtlPlacement(base) : base;
  }

  function updatePosition(): void {
    const ref = getReference();
    const floating = getFloating();

    if (!ref || !floating) return;

    const placement = resolvedPlacement();
    // Defaults to `undefined` (meaning "auto-detect"), not the detected value itself —
    // re-running the detection on every update (rather than once, at positioner-creation time)
    // matters because the dialog/scroll-container an instance is rendered into can change
    // across opens (e.g. the same `<ore-select>` reused in different dialogs), and the detected
    // ancestor's own rect can change between opens even when it's the same element (a resized
    // dialog).
    const resolvedBoundary = boundary ?? getClippingAncestorRect(floating);

    const result = computePosition(ref, floating, {
      boundary: resolvedBoundary,
      middleware: [
        ...(offsetPx ? [offset(offsetPx)] : []),
        flip({ padding }),
        shift({ padding }),
        ...(matchWidth ? [size({ padding })] : []),
      ],
      placement,
    });

    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;

    // `computePosition()` assumes `left`/`top` resolve relative to the viewport (correct for
    // `position: fixed`) — true almost always, but not when some ancestor establishes a
    // containing block for fixed descendants (a non-`none` `transform`, even a visually-identity
    // one left over from an entrance transition that never resets to `none` at rest is a real,
    // easy-to-hit case — a modal dialog's panel, say). Analytically detecting *that* ancestor via
    // `getContainingBlock()` and pre-subtracting its rect turned out to be unreliable in
    // practice: browsers don't apply the "ancestor transform traps fixed descendants" rule
    // uniformly across every element nested under it in every case we tested — some floating
    // elements in the exact same subtree needed the correction and some didn't, for reasons we
    // couldn't fully pin down. Measuring what actually happened after writing `left`/`top`
    // and correcting only the observed gap sidesteps that: it's a no-op when the browser already
    // put the element where asked, and it fixes the same class of bug the moment there's a real
    // mismatch, regardless of which specific ancestor (if any) turns out to be responsible.
    //
    // The measurement itself must not be fooled by the floating element's *own* transform,
    // though: dropdowns/popovers here all use a `transform: translateY(...)` entrance transition
    // driven by a `[data-open]` attribute + `@starting-style` — right at open, before the
    // transition has visibly progressed, `getBoundingClientRect()` can still reflect that
    // starting offset (a handful of px, matching `--overlay-enter-translate-y`), which this
    // correction would otherwise misread as a permanent ancestor-driven mismatch and bake in
    // forever. Temporarily neutralizing the floating element's own transform for the measurement
    // (and restoring it before anything paints, so there's no visible flash) isolates the
    // correction to ancestor-driven offsets only, which is the only thing it's meant to fix.
    const prevTransition = floating.style.transition;
    const prevTransform = floating.style.transform;

    floating.style.transition = 'none';
    floating.style.transform = 'none';

    const actual = floating.getBoundingClientRect();
    const deltaX = result.x - actual.left;
    const deltaY = result.y - actual.top;

    floating.style.transition = prevTransition;
    floating.style.transform = prevTransform;

    if (deltaX !== 0 || deltaY !== 0) {
      floating.style.left = `${result.x + deltaX}px`;
      floating.style.top = `${result.y + deltaY}px`;
    }

    if (matchWidth) {
      floating.style.width = `${ref.getBoundingClientRect().width}px`;
    }
  }

  function startAutoUpdate(): () => void {
    const ref = getReference();
    const floating = getFloating();

    if (!ref || !floating) return () => {};

    return autoUpdate(ref, floating, updatePosition);
  }

  return { floating: getFloating, reference: getReference, startAutoUpdate, update: updatePosition };
}
