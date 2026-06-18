import { createFocusManager } from './focus';
import { createFocusTrap } from './focus-trap';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DialogFocusControlOptions = {
  /** Returns the container element (dialog or shadow root) for focus trapping. */
  getContainer: () => HTMLElement | ShadowRoot | null;
  /** Returns the CSS selector for the element to focus on open (e.g. `'[autofocus]'`). */
  getInitialFocusSelector: () => string | undefined;
  /** Returns whether focus should be restored to the trigger on close. */
  getReturnFocus: () => boolean | undefined;
  /** Host element used to resolve `getInitialFocusSelector`. */
  host: HTMLElement;
  /** When provided, the trap only intercepts Tab when this returns `true`. */
  trapEnabled?: () => boolean;
};

export type DialogFocusControl = {
  /** Capture return focus, activate the trap, and apply initial focus. */
  activate(): void;
  /** Deactivate the trap and restore focus. */
  deactivate(): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Combines {@link createFocusTrap} and {@link createFocusManager} into a single
 * `activate / deactivate` API suited for modal dialogs and drawers.
 *
 * @example
 * ```ts
 * const focusCtrl = createDialogFocusControl({
 *   getContainer: () => dialog,
 *   getInitialFocusSelector: () => props['initial-focus'].value,
 *   getReturnFocus: () => props['return-focus'].value !== false,
 *   host: el,
 * });
 *
 * // On open:
 * focusCtrl.activate();
 *
 * // On close:
 * focusCtrl.deactivate();
 * ```
 */
export const createDialogFocusControl = (options: DialogFocusControlOptions): DialogFocusControl => {
  const trap = createFocusTrap(options.getContainer, { enabled: options.trapEnabled });

  const manager = createFocusManager({
    getInitialFocusSelector: options.getInitialFocusSelector,
    getReturnFocus: options.getReturnFocus,
    host: options.host,
  });

  return {
    activate() {
      manager.captureReturnFocus();
      trap.activate();
      manager.applyInitialFocus();
    },

    deactivate() {
      manager.cancelInitialFocus();
      trap.deactivate();
      manager.restoreFocus();
    },
  };
};
