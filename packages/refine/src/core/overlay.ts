/**
 * Why an overlay was opened.
 * - `'click'`       — user clicked the trigger element
 * - `'focus'`       — focus entered the trigger (tooltip, popover)
 * - `'hover'`       — pointer entered the trigger (tooltip)
 * - `'keyboard'`    — keyboard shortcut or Enter/Space on a trigger
 * - `'programmatic'` — opened via the JS API without a user gesture
 * - `'trigger'`     — opened via the Invoker Commands API (`command="show-modal"`)
 */
export type OverlayOpenReason = 'click' | 'focus' | 'hover' | 'keyboard' | 'programmatic' | 'trigger';

/** Close reasons valid for modal dialogs (includes 'swipe' for drawer). */
export type DialogCloseReason = 'escape' | 'outsideClick' | 'programmatic' | 'swipe' | 'trigger';
/** Close reasons valid for dropdown overlays (no swipe). */
export type DropdownCloseReason = Exclude<DialogCloseReason, 'swipe'> | 'select';

/** Detail shape for overlay open events emitted by components. */
export type OverlayOpenDetail = { reason: OverlayOpenReason };
/** Detail shape for overlay close events emitted by components. */
export type OverlayCloseDetail = { reason: DialogCloseReason };
/** Detail shape for state changes emitted by overlay components. */
export type OverlayOpenChangeDetail = {
  open: boolean;
  reason: DialogCloseReason | DropdownCloseReason | OverlayOpenReason;
};

export type OutsidePointerDismissalOptions = {
  getTargets: () => Array<Element | null | undefined>;
  isActive: () => boolean;
  onDismiss: () => void;
  signal: AbortSignal;
};

/**
 * Dismisses an active floating surface when a pointer begins outside all of its
 * supplied boundary elements. Components retain ownership of their open state.
 */
export const createOutsidePointerDismissal = (options: OutsidePointerDismissalOptions): (() => void) => {
  const onPointerDown = (event: PointerEvent): void => {
    if (!options.isActive()) return;

    const path = event.composedPath();
    const target = path[0] instanceof Node ? path[0] : event.target instanceof Node ? event.target : null;
    const inside = options.getTargets().some((element) => {
      return (
        element !== null &&
        element !== undefined &&
        (path.includes(element) || Boolean(target && element.contains(target)))
      );
    });

    if (!inside) options.onDismiss();
  };

  const dispose = (): void => {
    document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  };

  document.addEventListener('pointerdown', onPointerDown, { capture: true });
  options.signal.addEventListener('abort', dispose, { once: true });

  return dispose;
};

/**
 * Restores focus to a dropdown/floating-panel trigger when the owning overlay closes.
 *
 * Named distinctly from `FocusManager.restoreFocus()` (`./focus.ts`) — that method restores a
 * captured dialog-opener element from internal state; this function takes the trigger directly,
 * for dropdown-style overlays (menu) that never captured one.
 */
export const restoreTriggerFocus = (getTrigger: () => HTMLElement | null | undefined): void => {
  getTrigger()?.focus();
};
