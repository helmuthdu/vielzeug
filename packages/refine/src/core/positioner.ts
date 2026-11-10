import {
  autoUpdate,
  computePosition,
  flip,
  getBoundaryRect,
  getClippingAncestorRect,
  offset,
  type Placement,
  type Rect,
  type ReferenceElement,
  type SizeData,
  shift,
  size,
} from '@vielzeug/orbit';

import { elementDirection } from './direction';

// ── Overlay positioner contract ──────────────────────────────────────────────

export type OverlayPositioner = {
  floating: () => HTMLElement | null;
  reference: () => ReferenceElement | null;
  /** Start continuous position auto-updates. Returns a stop function. */
  startAutoUpdate?: () => () => void;
  update: () => void;
};

// ── Dropdown positioner ───────────────────────────────────────────────────────

export type DropdownPositionerOptions = {
  /**
   * Clipping boundary for flip/shift/size: the edges the dropdown must stay within.
   * Defaults to the nearest ancestor that actually clips content (`overflow:
   * hidden|auto|scroll|clip`, e.g. a dialog panel), auto-detected per update via
   * `getClippingAncestorRect()`, intersected with the viewport. Without this, flip/shift only
   * avoid the full page viewport: a dropdown can be "in view" by that measure while still
   * visibly overhanging a much smaller container it's actually nested in. Pass an explicit
   * boundary to override auto-detection.
   */
  boundary?: Element | Rect;
  /**
   * Returns the text direction used for placement mirroring. Defaults to the resolved
   * direction of the reference element (nearest `dir="ltr"|"rtl"` ancestor, falling back to
   * computed style): most callers never need to pass this explicitly.
   */
  getDir?: () => 'ltr' | 'rtl';
  /** Getter for the floating (dropdown panel) element. */
  getFloating: () => HTMLElement | null;
  /** Getter for the current placement. Defaults to 'bottom-start' (RTL-aware: flips to 'bottom-end'). */
  getPlacement?: () => Placement;
  /**
   * Getter for the reference (trigger) element. May return a virtual reference
   * (an object exposing `getBoundingClientRect()`) instead of a real element,
   * which is how context menus anchor the panel to the pointer position.
   */
  getReference: () => ReferenceElement | null;
  /**
   * Whether to size the floating element from the reference: at least as wide as the reference,
   * growing to fit its own content, capped by the boundary. Default: true
   */
  matchWidth?: boolean;
  /**
   * Whether to cap the floating element's height to what the chosen side can actually show:
   * the panel grows to its content (or the smaller of its CSS `max-height` and the room on the
   * resolved side) and only scrolls when the content does not fit. A flip therefore gets the
   * height flip needs to compare, and a panel with room to spare never shows a scrollbar for a
   * cap it did not need. Default: false.
   */
  fitAvailableHeight?: boolean;
  /**
   * Returns the offset in pixels between reference and floating element, read on every update so a
   * reactive offset prop is honored. Default: 0.
   */
  getOffsetPx?: () => number;
  /**
   * Called after each update with the resolved placement (after RTL mirroring and flip). The
   * positioner also writes it to the floating element's `data-placement` attribute itself, so this
   * is only needed to react to placement changes (e.g. tooltip's per-side closed transform).
   */
  onPlacementChange?: (placement: Placement) => void;
  /** Padding (px) used by flip, shift, and size middleware. Default: 6 */
  padding?: number;
  /** Keep the panel in bounds when neither preferred nor flipped side fits. Default: false. */
  shiftMainAxis?: boolean;
  /**
   * Whether to constrain placement to a clipping ancestor when `boundary` is unset. Default:
   * true. Disable for native Popover API panels, which render in the top layer.
   */
  useClippingAncestor?: boolean;
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
  getOffsetPx = () => 0,
  getPlacement,
  getReference,
  fitAvailableHeight = false,
  matchWidth = true,
  onPlacementChange,
  padding = 6,
  shiftMainAxis = false,
  useClippingAncestor = true,
}: DropdownPositionerOptions): OverlayPositioner {
  function resolvedPlacement(): Placement {
    const base = getPlacement?.() ?? 'bottom-start';
    // A virtual reference (context-menu point) has no DOM ancestry to resolve a
    // direction from, so direction falls back to the document's.
    const ref = getReference();
    const dir = getDir?.() ?? elementDirection(ref instanceof Element ? ref : null);

    return dir === 'rtl' ? rtlPlacement(base) : base;
  }

  function updatePosition(): void {
    const ref = getReference();
    const floating = getFloating();

    if (!ref || !floating) return;

    const placement = resolvedPlacement();
    // Defaults to `undefined` (meaning "auto-detect"), not the detected value itself :
    // re-running the detection on every update (rather than once, at positioner-creation time)
    // matters because the dialog/scroll-container an instance is rendered into can change
    // across opens (e.g. the same `<ore-select>` reused in different dialogs), and the detected
    // ancestor's own rect can change between opens even when it's the same element (a resized
    // dialog).
    const resolvedBoundary = getBoundaryRect(
      boundary ?? (useClippingAncestor ? getClippingAncestorRect(floating) : undefined),
    );

    const refWidth = ref.getBoundingClientRect().width;
    let naturalWidth = 0;

    if (matchWidth) {
      // Measure the panel at its natural content width, floored at the reference width, so
      // `computePosition()` places (and `shift` keeps inside the boundary) the box that will
      // actually render. `left: 0` frees the measurement from the shrink-to-fit clamp a previous
      // `left` would impose on a `position: fixed` element near the right edge.
      floating.style.left = '0px';
      floating.style.width = 'auto';
      floating.style.minWidth = `${refWidth}px`;
      naturalWidth = floating.getBoundingClientRect().width;
      // Clamp to the width the `size` middleware will report *before* positioning, so `flip`
      // and `shift` compensate for the box that actually renders. Without this, a panel whose
      // natural width exceeds the boundary is shifted fully inside for a width it is then
      // clamped out of: landing further inside the boundary than needed, misaligned with its
      // trigger. Horizontal placements derive their available width from the post-shift x and
      // cannot be pre-clamped; they keep the post-positioning clamp below.
      if (placement.startsWith('top') || placement.startsWith('bottom')) {
        const availableWidth = Math.max(0, resolvedBoundary.width - padding * 2);
        floating.style.width = `${Math.min(Math.max(naturalWidth, refWidth), availableWidth)}px`;
      }
    }

    const offsetPx = getOffsetPx();

    const middleware = [
      ...(offsetPx ? [offset(offsetPx)] : []),
      flip({ padding }),
      shift({ mainAxis: shiftMainAxis, padding }),
      ...(matchWidth ? [size({ padding })] : []),
    ];

    // Height fit: the panel shows everything the resolved side has room for. The desired
    // height (content, or the CSS max-height the consumer authored) is what flip must
    // compare against each side, so the first pass caps only at that desire; once the
    // side is known, the panel shrinks to that side's room, and a panel that shrank or
    // moved needs one more positioning pass because `top` depends on the height.
    const fitHeight = (desiredOnly: boolean, side: string): number => {
      // Clear the inline write from a previous update first: its computed value must come
      // from the consumer's CSS (token or none), never from the panel's own last cap, or a
      // shrink could never grow back when space returned.
      floating.style.maxHeight = 'none';

      const natural = floating.getBoundingClientRect().height;

      floating.style.maxHeight = '';

      if (natural === 0) return 0;

      const cssMax = Number.parseFloat(getComputedStyle(floating).maxHeight);
      const desired = Number.isFinite(cssMax) && cssMax > 0 ? Math.min(natural, cssMax) : natural;

      if (desiredOnly) return desired;

      // Rect (floating-ui's virtual-element shape) only guarantees x/y/width/height.
      const refRect = ref.getBoundingClientRect();
      const refTop = refRect.y;
      const refBottom = refRect.y + refRect.height;
      const room = side.startsWith('top')
        ? refTop - resolvedBoundary.y - offsetPx - padding
        : resolvedBoundary.y + resolvedBoundary.height - refBottom - offsetPx - padding;

      return Math.max(0, Math.min(desired, room));
    };

    let result = computePosition(ref, floating, {
      boundary: resolvedBoundary,
      middleware,
      placement,
    });

    if (fitAvailableHeight) {
      const desired = fitHeight(true, result.placement);

      if (desired > 0) {
        const capped = fitHeight(false, result.placement);

        floating.style.maxHeight = `${capped}px`;

        if (capped < desired) {
          result = computePosition(ref, floating, { boundary: resolvedBoundary, middleware, placement });
        }
      }
    }

    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;

    // `computePosition()` assumes `left`/`top` resolve relative to the viewport (correct for
    // `position: fixed`): true almost always, but not when some ancestor establishes a
    // containing block for fixed descendants (a non-`none` `transform`, even a visually-identity
    // one left over from an entrance transition that never resets to `none` at rest is a real,
    // easy-to-hit case: a modal dialog's panel, say). Analytically detecting *that* ancestor via
    // `getContainingBlock()` and pre-subtracting its rect turned out to be unreliable in
    // practice: browsers don't apply the "ancestor transform traps fixed descendants" rule
    // uniformly across every element nested under it in every case we tested: some floating
    // elements in the exact same subtree needed the correction and some didn't, for reasons we
    // couldn't fully pin down. Measuring what actually happened after writing `left`/`top`
    // and correcting only the observed gap sidesteps that: it's a no-op when the browser already
    // put the element where asked, and it fixes the same class of bug the moment there's a real
    // mismatch, regardless of which specific ancestor (if any) turns out to be responsible.
    //
    // The measurement itself must not be fooled by the floating element's *own* transform,
    // though: dropdowns/popovers here all use a `transform: translateY(...)` entrance transition
    // driven by a `[data-open]` attribute + `@starting-style`: right at open, before the
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
      const available =
        (result.middlewareData.size as SizeData | undefined)?.availableWidth ?? Number.POSITIVE_INFINITY;
      // A panel measured while not yet rendered reports 0: fall back to the reference width.
      floating.style.width = `${Math.min(Math.max(naturalWidth, refWidth), available)}px`;
    }

    // Reported last, after every `left`/`top`/`width` write has settled, so a consumer reacting to
    // the placement (e.g. tooltip's per-side closed transform) sees the final geometry.
    onPlacementChange?.(result.placement);
  }

  function startAutoUpdate(): () => void {
    const ref = getReference();
    const floating = getFloating();

    if (!ref || !floating) return () => {};

    return autoUpdate(ref, floating, updatePosition);
  }

  return { floating: getFloating, reference: getReference, startAutoUpdate, update: updatePosition };
}
