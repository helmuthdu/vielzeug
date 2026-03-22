import { type ReadonlySignal } from '@vielzeug/craftit';

import { awaitExit } from './animation';

export interface OverlayProps {
  'initial-focus': ReadonlySignal<string | undefined>;
  'return-focus': ReadonlySignal<boolean | undefined>;
}

/**
 * Shared overlay composable for dialog-based components.
 *
 * Encapsulates the `returnFocusEl` variable, `applyInitialFocus`, the guarded
 * `closeWithAnimation` (with `isClosing` flag to prevent double-close), and
 * the focus-restore helper so that `bit-dialog` and `bit-drawer` don't repeat
 * this logic.
 *
 * Call at **setup scope** (outside `onMount`) so that the returned
 * `closeWithAnimation` is available before mount (e.g. to expose as an
 * imperative API or use inside `requestClose`).
 */
export function useOverlay(
  host: HTMLElement,
  dialogRef: { value: HTMLDialogElement | null | undefined },
  getPanelEl: () => HTMLElement | null | undefined,
  props: OverlayProps,
) {
  let returnFocusEl: HTMLElement | null = null;
  let isClosing = false;

  const captureReturnFocus = () => {
    returnFocusEl = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (props['return-focus'].value !== false && returnFocusEl) {
      returnFocusEl.focus();
      returnFocusEl = null;
    }
  };

  const applyInitialFocus = () => {
    const selector = props['initial-focus'].value;

    if (selector) {
      const target = host.querySelector<HTMLElement>(selector);

      if (target) requestAnimationFrame(() => target.focus());
    }
  };

  const closeWithAnimation = () => {
    const dialog = dialogRef.value;

    if (!dialog?.open || isClosing) return;

    isClosing = true;
    dialog.classList.add('closing');

    const finish = () => {
      dialog.classList.remove('closing');
      isClosing = false;
      dialog.close();
    };

    const panel = getPanelEl();

    if (panel) {
      awaitExit(panel, finish, 'transition');
    } else {
      finish();
    }
  };

  return {
    applyInitialFocus,
    captureReturnFocus,
    closeWithAnimation,
    restoreFocus,
  };
}
