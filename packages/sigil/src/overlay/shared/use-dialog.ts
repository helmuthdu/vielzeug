import { type ReadonlySignal, onEvent, watch } from '@vielzeug/craft';
import { type Signal, signal } from '@vielzeug/ripple';

import type { DialogCloseReason, OverlayControl, OverlayOpenReason } from '../../headless';

import { createOverlayControl } from '../../headless';
import { createFocusManager } from '../../headless';
import { awaitExit } from './await-exit';
import { createBackgroundLock } from './background-lock';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UseDialogOptions = {
  /** Called after showModal() but before isOpen = true. Use to clear drag styles etc. */
  beforeOpen?: (dialog: HTMLDialogElement) => void;
  /** Extra properties merged into the `close-request` custom event detail. */
  closeRequestDetail?: (reason: Exclude<DialogCloseReason, 'programmatic'>) => Record<string, unknown>;
  dialogRef: { value: HTMLDialogElement | null | undefined };
  getPanelEl: () => HTMLElement | null | undefined;
  host: HTMLElement;
  initialFocus: ReadonlySignal<string | undefined>;
  isPersistent: () => boolean;
  /**
   * Called after the native `close` event fires — after background unlock,
   * isOpen reset, and focus restore. Use to emit component events.
   */
  onNativeClose?: (reason: DialogCloseReason) => void;
  /** Called by the overlay on open. Use to emit events. */
  onOpen?: (reason: OverlayOpenReason) => void;
  /** Open prop from the component — drives programmatic open/close via watch. */
  openProp: ReadonlySignal<boolean | undefined>;
  /**
   * Called by the overlay when closing. Orchestrates the close animation.
   * Default: `dialog.close()`. Override in dialog.ts to add the CSS exit animation.
   */
  performClose?: (dialog: HTMLDialogElement, reason: DialogCloseReason) => void;
  returnFocus: ReadonlySignal<boolean | undefined>;
};

export type UseDialogHandle = {
  closeWithAnimation: () => void;
  /**
   * Dispatch a cancelable `close-request` event on the host. Returns true when
   * the close is allowed (event not prevented), false when it was cancelled.
   */
  dispatchCloseRequest: (reason: Exclude<DialogCloseReason, 'programmatic'>) => boolean;
  handleBackdropClick: (e: MouseEvent) => void;
  handleKeydown: (e: KeyboardEvent) => void;
  isOpen: Signal<boolean>;
  /** The overlay control — open/close/toggle/cleanup. */
  overlay: OverlayControl;
  /**
   * Dispatch `close-request`; if allowed, call `overlay.close()`.
   */
  requestClose: (reason: Exclude<DialogCloseReason, 'programmatic'>) => void;
  /**
   * Registers the open-prop watcher AND standard click/keydown event listeners on
   * the dialog element. Use for components that need standard dialog behavior.
   * Call inside `onMounted()`.
   */
  setupNativeListeners: () => void;
  /**
   * Registers only the open-prop watcher (without adding click/keydown listeners).
   * Use for components like drawer that register their own event handlers.
   * Call inside `onMounted()`.
   */
  watchOpenProp: () => void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Shared dialog-control composable for `bit-dialog` and `bit-drawer`.
 *
 * Owns: `isOpen`, close-reason tracking, focus management, `overlay`,
 * `requestClose`, background lock/unlock, and the `close` event handler.
 * Components supply only their unique behavior via callbacks and `onNativeClose`.
 */
export function useDialogControl(options: UseDialogOptions): UseDialogHandle {
  const isOpen = signal(false);
  // Internal close-reason: set atomically before dialog.close() fires.
  let pendingCloseReason: DialogCloseReason = 'programmatic';
  const bgLock = createBackgroundLock();
  let isClosing = false;

  // ── Focus management ──────────────────────────────────────────────────────
  const focus = createFocusManager({
    getInitialFocusSelector: () => options.initialFocus.value,
    getReturnFocus: () => options.returnFocus.value,
    host: options.host,
  });
  // ─────────────────────────────────────────────────────────────────────────

  const closeWithAnimation = (): void => {
    const dialog = options.dialogRef.value;

    if (!dialog?.open || isClosing) return;

    isClosing = true;
    dialog.classList.add('closing');

    const finish = () => {
      dialog.classList.remove('closing');
      isClosing = false;
      dialog.close();
    };

    const panel = options.getPanelEl();

    if (panel) {
      awaitExit(panel, finish, 'transition');
    } else {
      finish();
    }
  };

  const dispatchCloseRequest = (reason: Exclude<DialogCloseReason, 'programmatic'>): boolean => {
    return options.host.dispatchEvent(
      new CustomEvent('close-request', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { reason, ...options.closeRequestDetail?.(reason) },
      }),
    );
  };

  const overlay = createOverlayControl({
    getBoundary: () => options.host,
    getPanel: () => {
      const panel = options.getPanelEl();

      return panel instanceof HTMLElement ? panel : null;
    },
    isOpen: () => isOpen.value,
    onOpen: options.onOpen,
    setOpen: (next, reason) => {
      const dialog = options.dialogRef.value;

      if (!dialog) return;

      if (next) {
        if (dialog.open) return;

        focus.captureReturnFocus();
        options.beforeOpen?.(dialog);
        dialog.showModal();
        bgLock.lock(options.host);
        focus.applyInitialFocus();
        isOpen.value = true;

        return;
      }

      if (dialog.open) {
        // Capture reason before calling performClose so handleNativeClose can read it.
        pendingCloseReason = reason as DialogCloseReason;

        const performClose = options.performClose ?? ((d) => d.close());

        performClose(dialog, reason as DialogCloseReason);

        return;
      }

      isOpen.value = false;
    },
  });

  const requestClose = (reason: Exclude<DialogCloseReason, 'programmatic'>): void => {
    const allowed = dispatchCloseRequest(reason);

    if (!allowed) return;

    overlay.close(reason, false);
  };

  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !options.isPersistent()) {
      e.preventDefault();
      requestClose('escape');
    }
  };

  const handleBackdropClick = (e: MouseEvent): void => {
    if (options.isPersistent()) return;

    if (e.target === options.dialogRef.value) requestClose('outsideClick');
  };

  // ── Internal native close handler ─────────────────────────────────────────
  const handleNativeClose = (): void => {
    bgLock.unlock();
    options.host.removeAttribute('open');
    isOpen.value = false;
    focus.restoreFocus();

    const reason = pendingCloseReason;

    pendingCloseReason = 'programmatic';
    options.onNativeClose?.(reason);
  };

  const watchOpenProp = (): void => {
    const dialog = options.dialogRef.value;

    if (dialog) onEvent(dialog, 'close', handleNativeClose);

    watch(
      options.openProp,
      (open) => {
        if (open) {
          overlay.open('programmatic');
        } else {
          overlay.close('programmatic', false);
        }
      },
      { immediate: true },
    );
  };

  const setupNativeListeners = (): void => {
    const dialog = options.dialogRef.value;

    if (!dialog) return;

    watchOpenProp();
    onEvent(dialog, 'click', handleBackdropClick);
    onEvent(dialog, 'keydown', handleKeydown);
  };

  return {
    closeWithAnimation,
    dispatchCloseRequest,
    handleBackdropClick,
    handleKeydown,
    isOpen,
    overlay,
    requestClose,
    setupNativeListeners,
    watchOpenProp,
  };
}
