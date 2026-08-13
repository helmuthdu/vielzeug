import { type Readable, type Signal, signal } from '@vielzeug/ripple';
import { watch } from '@vielzeug/ripple/watch';

import { createFocusManager, type DialogCloseReason, lifecycleSignal, type OverlayOpenReason } from '../../core';
import { awaitExit } from './await-exit';
import { createBackgroundLock } from './background-lock';

// Invoker Commands API — not yet in lib.dom.d.ts
interface CommandEvent extends Event {
  command: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type UseDialogOptions = {
  /** Called after showModal() but before isOpen = true. Use to clear drag styles etc. */
  beforeOpen?: (dialog: HTMLDialogElement) => void;
  /** Extra properties merged into the `close-request` custom event detail. */
  closeRequestDetail?: (reason: Exclude<DialogCloseReason, 'programmatic'>) => Record<string, unknown>;
  /** Initial uncontrolled open state. Ignored when `openProp` is defined. */
  defaultOpen: Readable<boolean | undefined>;
  dialogRef: { value: HTMLDialogElement | null | undefined };
  getPanelEl: () => HTMLElement | null | undefined;
  host: HTMLElement;
  initialFocus: Readable<string | undefined>;
  isPersistent: () => boolean;
  /** Cleanup registrar from the component setup ctx. Automatically called on disconnect. */
  onCleanup: (fn: () => void) => void;
  /**
   * Scoped event listener registrar from the component setup ctx.
   * Automatically removed on component disconnect.
   */
  onEvent: <K extends keyof HTMLElementEventMap>(
    target: EventTarget | null | undefined,
    event: K,
    listener: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) => void;
  /**
   * Called after the native `close` event fires — after background unlock,
   * isOpen reset, and focus restore. Use to emit component events.
   */
  onNativeClose?: (reason: DialogCloseReason) => void;
  /** Called by the overlay on open. Use to emit events. */
  onOpen?: (reason: OverlayOpenReason) => void;
  /** Open prop from the component — drives programmatic open/close via watch. */
  openProp: Readable<boolean | undefined>;
  /**
   * Called by the overlay when closing. Orchestrates the close animation.
   * Default: `dialog.close()`. Override in dialog.ts to add the CSS exit animation.
   */
  performClose?: (dialog: HTMLDialogElement, reason: DialogCloseReason) => void;
  returnFocus: Readable<boolean | undefined>;
};

export type UseDialogHandle = {
  closeWithAnimation: () => void;
  /**
   * Dispatch a cancelable `close-request` event on the host. Returns true when
   * the close is allowed (event not prevented), false when it was cancelled.
   */
  dispatchCloseRequest: (reason: Exclude<DialogCloseReason, 'programmatic'>) => boolean;
  handleBackdropClick: (e: MouseEvent) => void;
  handleCancel: (e: Event) => void;
  isOpen: Signal<boolean>;
  /** The modal dialog controller — open/close/toggle/dispose. */
  overlay: ModalDialogController;
  /**
   * Dispatch `close-request`; if allowed, call `overlay.close()`.
   */
  requestClose: (reason: Exclude<DialogCloseReason, 'programmatic'>) => void;
  /**
   * Registers the open-prop watcher AND standard click/cancel event listeners on
   * the dialog element (backdrop click-to-close, Escape via the native `cancel`
   * event). Use for components that need standard dialog behavior.
   * Call inside `onMounted()`.
   */
  setupNativeListeners: () => void;
  /**
   * Registers only the open-prop watcher (without adding click/cancel listeners).
   * Use for components like drawer that register their own event handlers.
   * Call inside `onMounted()`.
   */
  watchOpenProp: () => void;
};

type ModalDialogController = {
  [Symbol.dispose](): void;
  close(reason?: DialogCloseReason): void;
  dispose(): void;
  open(reason?: OverlayOpenReason): void;
  toggle(openReason?: OverlayOpenReason, closeReason?: DialogCloseReason): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Shared dialog-control composable for `ore-dialog` and `ore-drawer`.
 *
 * Owns: `isOpen`, close-reason tracking, focus management, `overlay`,
 * `requestClose`, background lock/unlock, and the `close` event handler.
 * Components supply only their unique behavior via callbacks and `onNativeClose`.
 */
export function useDialogControl(options: UseDialogOptions): UseDialogHandle {
  const abortSignal = lifecycleSignal(options.onCleanup);
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
    signal: abortSignal,
  });
  // ─────────────────────────────────────────────────────────────────────────

  const closeWithAnimation = (): void => {
    const dialog = options.dialogRef.value;

    if (!dialog?.open || isClosing) return;

    isClosing = true;
    dialog.classList.add('closing');

    const finish = () => {
      dialog.close();
      // Do NOT remove 'closing' here — removing it while the native ::backdrop is
      // still held in the top layer by the 'overlay allow-discrete' transition
      // would revert its opacity to 1 and cause a visible flash. The class is
      // cleaned up at the start of the next open cycle (see setOpen below).
      isClosing = false;
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

  const overlay: ModalDialogController = {
    close(reason: DialogCloseReason = 'programmatic'): void {
      if (!isOpen.value) return;

      const dialog = options.dialogRef.value;

      if (dialog?.open) {
        pendingCloseReason = reason;
        (options.performClose ?? ((element, _reason) => element.close()))(dialog, reason);
      } else {
        isOpen.value = false;
      }
    },
    dispose(): void {
      overlay.close('programmatic');
    },
    open(reason: OverlayOpenReason = 'programmatic'): void {
      if (isOpen.value) return;

      const dialog = options.dialogRef.value;

      if (!dialog || dialog.open) return;

      // Clean up any leftover 'closing' class from the previous close animation
      // before opening so the entry @starting-style and transition work correctly.
      dialog.classList.remove('closing');
      focus.captureReturnFocus();
      options.beforeOpen?.(dialog);
      dialog.showModal();
      bgLock.lock(options.host);
      focus.applyInitialFocus();
      isOpen.value = true;
      options.onOpen?.(reason);
    },
    [Symbol.dispose](): void {
      overlay.dispose();
    },
    toggle(openReason: OverlayOpenReason = 'click', closeReason: DialogCloseReason = 'trigger'): void {
      if (isOpen.value) overlay.close(closeReason);
      else overlay.open(openReason);
    },
  };

  abortSignal.addEventListener('abort', overlay.dispose, { once: true });

  const requestClose = (reason: Exclude<DialogCloseReason, 'programmatic'>): void => {
    const allowed = dispatchCloseRequest(reason);

    if (!allowed) return;

    overlay.close(reason);
  };

  // Invoker Commands API — allows declarative open/close from outside the component:
  //   <button commandfor="ore-dialog-id" command="show-modal">Open</button>
  //   <button commandfor="ore-dialog-id" command="close">Close</button>
  options.host.addEventListener(
    'command',
    (e: Event) => {
      const cmd = (e as CommandEvent).command;

      if (cmd === 'show-modal') overlay.open('trigger');
      else if (cmd === 'close' || cmd === 'request-close') requestClose('trigger');
    },
    { signal: abortSignal },
  );

  // The native `<dialog>` element auto-closes on Escape via its own close-watcher, which
  // dispatches a cancelable `cancel` event before `close`. Suppressing/redirecting that is the
  // spec-correct hook — relying on `keydown`'s `preventDefault()` to stop the close-watcher is
  // implementation-specific, not guaranteed across browsers.
  const handleCancel = (e: Event): void => {
    // See `handleNativeClose`'s comment: guard against a same-named bubbling event from a
    // descendant field being misread as this dialog's own native event.
    if (e.target !== options.dialogRef.value) return;

    e.preventDefault();

    if (options.isPersistent()) return;

    requestClose('escape');
  };

  const handleBackdropClick = (e: MouseEvent): void => {
    if (options.isPersistent()) return;

    if (e.target === options.dialogRef.value) requestClose('outsideClick');
  };

  // ── Internal native close handler ─────────────────────────────────────────
  // `e.target` must be checked against the native `<dialog>` itself, the same way
  // `handleBackdropClick` already does: a bubbling `close`-named event fired by *any* descendant
  // component reaches this listener too — regardless of that event's own `composed` flag, since
  // slot-assignment-based event-path computation (a slotted descendant's "parent" is the `<slot>`
  // projecting it) isn't gated by `composed` the way crossing back out of a shadow root is. Some
  // fields nested here (`ore-select`, `ore-combobox`, …) emit their own public `close` event when
  // *their* dropdown closes — without this check, selecting an option in one of those closes this
  // dialog too, misreading the field's own event as this dialog's native close.
  const handleNativeClose = (e?: Event): void => {
    if (e && e.target !== options.dialogRef.value) return;

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

    if (dialog) options.onEvent(dialog, 'close', handleNativeClose);

    let initialized = false;

    watch(
      options.openProp,
      (open) => {
        if (open === undefined) {
          if (!initialized) {
            if (options.defaultOpen.value) overlay.open('programmatic');

            initialized = true;

            return;
          }

          overlay.close('programmatic');

          return;
        }

        initialized = true;

        if (open) {
          overlay.open('programmatic');
        } else {
          overlay.close('programmatic');
        }
      },
      { immediate: true },
    );
  };

  const setupNativeListeners = (): void => {
    const dialog = options.dialogRef.value;

    if (!dialog) return;

    watchOpenProp();
    options.onEvent(dialog, 'click', handleBackdropClick);
    options.onEvent(dialog, 'cancel', handleCancel);
  };

  return {
    closeWithAnimation,
    dispatchCloseRequest,
    handleBackdropClick,
    handleCancel,
    isOpen,
    overlay,
    requestClose,
    setupNativeListeners,
    watchOpenProp,
  };
}
