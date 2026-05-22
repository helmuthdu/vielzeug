// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Why an overlay was opened.
 * - `'click'`       — user clicked the trigger element
 * - `'focus'`       — focus entered the trigger (tooltip, popover)
 * - `'hover'`       — pointer entered the trigger (tooltip)
 * - `'keyboard'`    — keyboard shortcut or Enter/Space on a trigger
 * - `'programmatic'` — opened via the JS API without a user gesture
 */
export type OverlayOpenReason = 'click' | 'focus' | 'hover' | 'keyboard' | 'programmatic';

/** Close reasons valid for modal dialogs (includes 'swipe' for drawer). */
export type DialogCloseReason = 'escape' | 'outsideClick' | 'programmatic' | 'swipe' | 'trigger';
/** Close reasons valid for dropdown overlays (no swipe). */
export type DropdownCloseReason = Exclude<DialogCloseReason, 'swipe'>;
/** Union of all possible close reasons. Use DialogCloseReason or DropdownCloseReason for tighter typing. */
export type OverlayCloseReason = DialogCloseReason;

/** Detail shape for overlay open events emitted by components. */
export type OverlayOpenDetail = { reason: OverlayOpenReason };
/** Detail shape for overlay close events emitted by components. */
export type OverlayCloseDetail = { reason: OverlayCloseReason };

export type OverlayPositioner = {
  floating: () => HTMLElement | null;
  reference: () => HTMLElement | null;
  /** Start continuous position auto-updates. Returns a stop function. */
  startAutoUpdate?: () => () => void;
  update: () => void;
};

export type OverlayControlOptions = {
  getBoundary: () => HTMLElement | null;
  getPanel?: () => HTMLElement | null;
  getTrigger?: () => HTMLElement | null;
  isDisabled?: () => boolean;
  isOpen: () => boolean;
  onClose?: (reason: OverlayCloseReason) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  positioner?: OverlayPositioner;
  restoreFocus?: boolean | (() => boolean);
  setOpen: ((next: true, reason: OverlayOpenReason) => void) & ((next: false, reason: OverlayCloseReason) => void);
  /**
   * Optional `AbortSignal`. When provided, `cleanup()` is called automatically
   * on abort (closes the overlay, removes all listeners).
   */
  signal?: AbortSignal;
};

export type OverlayControl = {
  cleanup(): void;
  /**
   * Closes the overlay.
   * @param reason — why it's closing (default `'programmatic'`)
   * @param restoreFocus — override per-call focus restoration (default: uses `restoreFocus` option)
   */
  close(reason?: OverlayCloseReason, restoreFocus?: boolean): void;
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
  toggle(openReason?: OverlayOpenReason, closeReason?: OverlayCloseReason): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────
export const createOverlayControl = (options: OverlayControlOptions): OverlayControl => {
  let positionerCleanup: (() => void) | null = null;
  let popoverListener: ((event: Event) => void) | null = null;

  const shouldRestoreFocus = (): boolean => {
    if (typeof options.restoreFocus === 'function') return options.restoreFocus();

    return options.restoreFocus ?? true;
  };

  // Per-instance outside-click listener registered directly on document.
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
      document.addEventListener('click', clickListener, { capture: true });
    } else {
      document.removeEventListener('click', clickListener, { capture: true });
    }
  };

  const open = (reason: OverlayOpenReason = 'programmatic'): void => {
    if (options.isDisabled?.() || options.isOpen()) return;

    options.setOpen(true, reason);

    // Popover API progressive enhancement — use native light-dismiss when
    // available instead of a capture-phase document click listener.
    const panel = options.getPanel?.();

    if (panel && 'showPopover' in panel) {
      const htmlPanel = panel as HTMLElement & { hidePopover(): void; showPopover(): void };

      if (!panel.hasAttribute('popover')) panel.setAttribute('popover', 'auto');

      const onToggle = (e: Event): void => {
        const te = e as Event & { newState?: string };

        if (te.newState === 'closed') {
          panel.removeEventListener('toggle', onToggle);
          popoverListener = null;

          if (options.isOpen()) close('outsideClick');
        }
      };

      popoverListener = onToggle;
      panel.addEventListener('toggle', onToggle);

      try {
        htmlPanel.showPopover();
      } catch {
        // showPopover() not available or blocked — fall back to document click.
        panel.removeEventListener('toggle', onToggle);
        popoverListener = null;
        registerClickListener(true);
      }
    } else {
      registerClickListener(true);
    }

    if (options.positioner) {
      options.positioner.update();
      positionerCleanup = options.positioner.startAutoUpdate?.() ?? null;
    }

    options.onOpen?.(reason);
  };

  const teardownPopover = (): void => {
    if (!popoverListener) return;

    const panel = options.getPanel?.();

    if (panel) {
      panel.removeEventListener('toggle', popoverListener);

      // hidePopover() may throw if the element is already hidden. Guard it.
      if ('hidePopover' in panel) {
        try {
          (panel as HTMLElement & { hidePopover(): void }).hidePopover();
        } catch {
          // Already hidden — no action needed.
        }
      }
    }

    popoverListener = null;
  };

  const close = (reason: OverlayCloseReason = 'programmatic', restoreFocus?: boolean): void => {
    if (!options.isOpen()) return;

    options.setOpen(false, reason);

    // Clean up Popover API listener if active. The listener may have already
    // been removed by native light-dismiss detection in the toggle listener.
    teardownPopover();

    registerClickListener(false);

    if (positionerCleanup) {
      positionerCleanup();
      positionerCleanup = null;
    }

    const restore = restoreFocus ?? shouldRestoreFocus();

    if (restore) options.getTrigger?.()?.focus();

    options.onClose?.(reason);
  };

  const toggle = (openReason: OverlayOpenReason = 'click', closeReason: OverlayCloseReason = 'trigger'): void => {
    if (options.isOpen()) {
      close(closeReason);
    } else {
      open(openReason);
    }
  };

  const cleanup = (): void => {
    // Close first so onClose fires and callers can react.
    if (options.isOpen()) close('programmatic', false);

    registerClickListener(false);

    teardownPopover();

    if (positionerCleanup) {
      positionerCleanup();
      positionerCleanup = null;
    }
  };

  options.signal?.addEventListener('abort', cleanup, { once: true });

  return { cleanup, close, open, toggle };
};
