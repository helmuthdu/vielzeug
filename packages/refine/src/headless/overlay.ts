import type { OverlayPositioner } from './positioner';

// ── Types ─────────────────────────────────────────────────────────────────────

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
export type DropdownCloseReason = Exclude<DialogCloseReason, 'swipe'>;

/** Detail shape for overlay open events emitted by components. */
export type OverlayOpenDetail = { reason: OverlayOpenReason };
/** Detail shape for overlay close events emitted by components. */
export type OverlayCloseDetail = { reason: DialogCloseReason };

export type { OverlayPositioner };

export type OverlayControlOptions = {
  getBoundary: () => HTMLElement | null;
  getPanel?: () => HTMLElement | null;
  getTrigger?: () => HTMLElement | null;
  isDisabled?: () => boolean;
  isOpen: () => boolean;
  onClose?: (reason: DialogCloseReason) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  positioner?: OverlayPositioner;
  restoreFocus?: boolean | (() => boolean);
  setOpen: (next: boolean, reason: OverlayOpenReason | DialogCloseReason) => void;
  /** `AbortSignal` from the component lifecycle. `dispose()` is called automatically on abort. */
  signal: AbortSignal;
};

export type OverlayControl = {
  [Symbol.dispose](): void;
  /**
   * Closes the overlay.
   * @param reason — why it's closing (default `'programmatic'`)
   * @param restoreFocus — override per-call focus restoration (default: uses `restoreFocus` option)
   */
  close(reason?: DialogCloseReason, restoreFocus?: boolean): void;
  /** Tears down the overlay: closes silently and removes all event listeners. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /**
   * Opens the overlay.
   * @param reason — why it's opening (default `'programmatic'`)
   */
  open(reason?: OverlayOpenReason): void;
  /**
   * Toggles open state.
   * - Opens with `openReason` (default `'click'`).
   * - Closes with `closeReason` (default `'trigger'`).
   */
  toggle(openReason?: OverlayOpenReason, closeReason?: DialogCloseReason): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────
export const createOverlayControl = (options: OverlayControlOptions): OverlayControl => {
  let positionerCleanup: (() => void) | null = null;

  const shouldRestoreFocus = (): boolean => {
    if (typeof options.restoreFocus === 'function') return options.restoreFocus();

    return options.restoreFocus ?? true;
  };

  // Per-instance outside-pointer listener registered directly on document.
  // Uses 'pointerdown' instead of 'click' so that tapping empty/non-interactive
  // areas on iOS Safari (which does not synthesize 'click' for those targets)
  // still dismisses the overlay.
  // No shared multiplexer needed — max ~3 overlays can be open concurrently.
  const clickListener = (event: Event): void => {
    if (!options.isOpen()) return;

    const path = (event as Event & { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    const boundary = options.getBoundary();
    const panel = options.getPanel?.() ?? null;
    const target = (path[0] ?? event.target) as EventTarget | null;
    const nodeTarget = target instanceof Node ? target : null;
    const insideByPath = path.some((entry) => entry === boundary || entry === panel);
    const insideByContainment = nodeTarget
      ? (boundary?.contains(nodeTarget) ?? false) || (panel?.contains(nodeTarget) ?? false)
      : false;

    if (!insideByPath && !insideByContainment) close('outsideClick');
  };

  const registerClickListener = (active: boolean): void => {
    if (active) {
      document.addEventListener('pointerdown', clickListener, { capture: true });
    } else {
      document.removeEventListener('pointerdown', clickListener, { capture: true });
    }
  };

  const open = (reason: OverlayOpenReason = 'programmatic'): void => {
    if (options.isDisabled?.() || options.isOpen()) return;

    options.setOpen(true, reason);
    registerClickListener(true);

    if (options.positioner) {
      options.positioner.update();
      positionerCleanup = options.positioner.startAutoUpdate?.() ?? null;
    }

    options.onOpen?.(reason);
  };

  const close = (reason: DialogCloseReason = 'programmatic', restoreFocus?: boolean, silent = false): void => {
    if (!options.isOpen()) return;

    options.setOpen(false, reason);
    registerClickListener(false);

    if (positionerCleanup) {
      positionerCleanup();
      positionerCleanup = null;
    }

    const restore = restoreFocus ?? shouldRestoreFocus();

    if (restore) options.getTrigger?.()?.focus();

    if (!silent) options.onClose?.(reason);
  };

  const toggle = (openReason: OverlayOpenReason = 'click', closeReason: DialogCloseReason = 'trigger'): void => {
    if (options.isOpen()) {
      close(closeReason);
    } else {
      open(openReason);
    }
  };

  let disposed = false;

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;

    // Close silently — teardown should not fire onClose callbacks.
    if (options.isOpen()) close('programmatic', false, true);

    registerClickListener(false);

    if (positionerCleanup) {
      positionerCleanup();
      positionerCleanup = null;
    }
  };

  options.signal.addEventListener('abort', dispose, { once: true });

  return {
    close,
    dispose,
    get disposed() {
      return disposed;
    },
    open,
    [Symbol.dispose]: dispose,
    toggle,
  };
};
