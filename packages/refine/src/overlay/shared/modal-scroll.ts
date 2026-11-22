import { canScrollInDirection, swipePath } from '../../shared/swipe';
import type { UseDialogOptions } from './use-dialog';

export function containModalScroll(dialog: HTMLDialogElement, onEvent: UseDialogOptions['onEvent']): void {
  let touchStart: { x: number; y: number } | undefined;

  onEvent(dialog, 'touchstart', (event) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;

    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
  });

  onEvent(
    dialog,
    'touchmove',
    (event) => {
      if (!dialog.matches(':modal') || !touchStart || event.touches.length !== 1 || !event.cancelable) return;

      const touch = event.touches[0];
      const x = touch.clientX - touchStart.x;
      const y = touch.clientY - touchStart.y;

      if (y === 0) return;

      const path = swipePath(event, dialog);

      if (
        path.some((element) =>
          element.matches(
            'input[type="range"], select, [contenteditable]:not([contenteditable="false"]), [role="slider"]',
          ),
        )
      )
        return;
      if (Math.abs(x) > Math.abs(y) && canScrollInDirection(path, { axis: 'x', direction: x })) return;
      if (!canScrollInDirection(path, { axis: 'y', direction: y })) event.preventDefault();
    },
    { passive: false },
  );

  onEvent(
    dialog,
    'wheel',
    (event) => {
      if (
        !dialog.matches(':modal') ||
        !event.cancelable ||
        event.ctrlKey ||
        event.metaKey ||
        (event.deltaX === 0 && event.deltaY === 0)
      )
        return;

      const path = swipePath(event, dialog);
      const axis = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 'x' : 'y';
      const delta = axis === 'x' ? event.deltaX || event.deltaY : event.deltaY;

      if (path.some((element) => element.matches('input[type="number"]:focus, select:focus'))) return;
      if (!canScrollInDirection(path, { axis, direction: -delta })) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}
