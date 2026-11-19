/**
 * Why an overlay was opened.
 * - `'click'`: user clicked the trigger element
 * - `'contextmenu'`: user right-clicked (or long-pressed) the trigger — a
 *   context menu opens at the pointer rather than anchored to the element
 * - `'focus'`: focus entered the trigger (tooltip, popover)
 * - `'hover'`: pointer entered the trigger (tooltip)
 * - `'keyboard'`: keyboard shortcut or Enter/Space on a trigger
 * - `'programmatic'`: opened via the JS API without a user gesture
 * - `'trigger'`: opened via the Invoker Commands API (`command="show-modal"`)
 */
export type OverlayOpenReason = 'click' | 'contextmenu' | 'focus' | 'hover' | 'keyboard' | 'programmatic' | 'trigger';

/** Close reasons valid for modal dialogs (includes 'swipe' for drawer). */
export type DialogCloseReason = 'escape' | 'outsideClick' | 'programmatic' | 'swipe' | 'trigger';
/** Close reasons valid for dropdown overlays (no swipe). */
export type DropdownCloseReason = Exclude<DialogCloseReason, 'swipe'> | 'focusout' | 'select';

/** Detail shape for overlay open events emitted by components. */
export type OverlayOpenDetail = { reason: OverlayOpenReason };
/** Detail shape for overlay close events emitted by components. */
export type OverlayCloseDetail = { reason: DialogCloseReason };
/** Detail shape for state changes emitted by overlay components. */
export type OverlayOpenChangeDetail = {
  open: boolean;
  reason: DialogCloseReason | DropdownCloseReason | OverlayOpenReason;
};
