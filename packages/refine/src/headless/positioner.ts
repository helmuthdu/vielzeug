import { autoUpdate, computePosition, flip, offset, type Placement, shift, size } from '@vielzeug/orbit';

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

    const result = computePosition(ref, floating, {
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
