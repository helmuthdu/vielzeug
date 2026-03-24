import { flip, positionFloat, shift, size } from '@vielzeug/floatit';

export function createDropdownPositioner(
  getReferenceEl: () => HTMLElement | null,
  getFloatingEl: () => HTMLElement | null,
  { padding = 6 }: { padding?: number } = {},
) {
  function updatePosition(): void {
    const ref = getReferenceEl();
    const floating = getFloatingEl();

    if (!ref || !floating) return;

    const referenceWidth = ref.getBoundingClientRect().width;

    positionFloat(ref, floating, {
      middleware: [
        flip({ padding }),
        shift({ padding }),
        size({
          apply({ elements }) {
            elements.floating.style.width = `${referenceWidth}px`;
          },
          padding,
        }),
      ],
      placement: 'bottom-start',
    });
  }

  return {
    destroy(): void {
      // no-op: auto-update lifecycle is owned by createOverlayControl()
    },
    updatePosition,
  };
}
