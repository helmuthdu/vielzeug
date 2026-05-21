import { autoUpdate, computePosition, flip, offset, shift, size, type Placement } from '@vielzeug/floatit';

export type DropdownPositionerOptions = {
  /** Additional offset in pixels between reference and floating element. Default: 0 */
  offsetPx?: number;
  /** Whether to match the floating element width to the reference. Default: true */
  matchWidth?: boolean;
  /** Padding (px) used by flip, shift, and size middleware. Default: 6 */
  padding?: number;
  /** Getter for the current placement. Defaults to 'bottom-start'. */
  getPlacement?: () => Placement;
};

export function createDropdownPositioner(
  getReferenceEl: () => HTMLElement | null,
  getFloatingEl: () => HTMLElement | null,
  { offsetPx = 0, matchWidth = true, padding = 6, getPlacement }: DropdownPositionerOptions = {},
) {
  function updatePosition(): void {
    const ref = getReferenceEl();
    const floating = getFloatingEl();

    if (!ref || !floating) return;

    const referenceWidth = ref.getBoundingClientRect().width;
    const placement = getPlacement?.() ?? 'bottom-start';

    const result = computePosition(ref, floating, {
      middleware: [
        ...(offsetPx ? [offset(offsetPx)] : []),
        flip({ padding }),
        shift({ padding }),
        ...(matchWidth
          ? [
              size({
                apply({ elements }) {
                  elements.floating.style.width = `${referenceWidth}px`;
                },
                padding,
              }),
            ]
          : []),
      ],
      placement,
    });

    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;
  }

  /** Start auto-updating position on scroll/resize. Returns a stop function. */
  function startAutoUpdate(): () => void {
    const ref = getReferenceEl();
    const floating = getFloatingEl();

    if (!ref || !floating) return () => {};

    return autoUpdate(ref, floating, updatePosition);
  }

  return { startAutoUpdate, updatePosition };
}
