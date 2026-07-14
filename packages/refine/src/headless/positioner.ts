import {
  autoUpdate,
  computePosition,
  flip,
  getClippingAncestorRect,
  getContainingBlock,
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
   * Containing-block element used to correct the coordinates written to `style.left`/`style.top`.
   * Defaults to the nearest ancestor establishing a containing block for `position: fixed`
   * (`transform`/`filter`/`perspective`/`backdrop-filter`/`will-change`/`contain` — even a
   * visually-identity value, e.g. `transform: scale(1)` left over from an entrance transition
   * that never resets to `none` at rest), auto-detected per update via `getContainingBlock()`.
   * Without this, a dropdown nested inside such an ancestor (a modal dialog's panel is the
   * classic case) silently mispositions, because its `left`/`top` resolve against that
   * ancestor's box instead of the viewport `computePosition`'s own math assumes. Pass `null` to
   * force skipping the adjustment (assume true viewport-relative coordinates).
   */
  containingBlock?: Element | null;
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
  containingBlock,
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
    // `boundary`/`containingBlock` default to `undefined` (meaning "auto-detect"), not the
    // detected value itself — re-running the detection on every update (rather than once, at
    // positioner-creation time) matters because the dialog/scroll-container an instance is
    // rendered into can change across opens (e.g. the same `<ore-select>` reused in different
    // dialogs), and the detected ancestor's own rect can change between opens even when it's the
    // same element (a resized dialog).
    const resolvedBoundary = boundary ?? getClippingAncestorRect(floating);
    const resolvedContainingBlock = containingBlock !== undefined ? containingBlock : getContainingBlock(floating);

    const result = computePosition(ref, floating, {
      boundary: resolvedBoundary,
      containingBlock: resolvedContainingBlock,
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
