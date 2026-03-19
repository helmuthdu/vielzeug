import type { Signal } from '@vielzeug/craftit/core';

import { autoUpdate, flip, positionFloat, shift, size } from '@vielzeug/floatit';

export function createDropdownPositioner(
  getReferenceEl: () => HTMLElement | null,
  getFloatingEl: () => HTMLElement | null,
  { padding = 6 }: { padding?: number } = {},
) {
  let cleanup: (() => void) | null = null;

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

  function startAutoUpdate(): void {
    const ref = getReferenceEl();
    const floating = getFloatingEl();

    cleanup?.();

    if (ref && floating) {
      cleanup = autoUpdate(ref, floating, updatePosition, { observeFloating: false });
    } else {
      updatePosition();
    }
  }

  function stopAutoUpdate(): void {
    cleanup?.();
    cleanup = null;
  }

  function destroy(): void {
    stopAutoUpdate();
  }

  return { destroy, startAutoUpdate, stopAutoUpdate, updatePosition };
}

export function createOutsideClickHandler(
  host: HTMLElement,
  getDropdownEl: () => HTMLElement | null,
  isOpen: Signal<boolean>,
  onClose: () => void,
): () => void {
  const handler = (event: MouseEvent) => {
    if (!isOpen.value) return;

    if (!host.contains(event.target as Node) && !getDropdownEl()?.contains(event.target as Node)) {
      onClose();
    }
  };

  document.addEventListener('click', handler, true);

  return () => document.removeEventListener('click', handler, true);
}
