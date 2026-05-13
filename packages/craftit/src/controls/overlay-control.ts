import { autoUpdate } from '@vielzeug/floatit';

export type OverlayOpenReason = 'programmatic' | 'trigger';
export type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'swipe' | 'trigger';
export type OverlayCloseDetail = { reason: OverlayCloseReason };
export type OverlayOpenDetail = { reason: OverlayOpenReason };

type OverlayPositioner = {
  floating: () => HTMLElement | null;
  reference: () => HTMLElement | null;
  update: () => void;
};

export type OverlayControlOptions = {
  getBoundaryElement: () => HTMLElement | null;
  getPanelElement?: () => HTMLElement | null;
  getTriggerElement?: () => HTMLElement | null;
  isDisabled?: () => boolean;
  isOpen: () => boolean;
  onClose?: (reason: OverlayCloseReason) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  positioner?: OverlayPositioner;
  restoreFocus?: boolean | (() => boolean);
  setOpen: (next: boolean, context: { reason: OverlayOpenReason | OverlayCloseReason }) => void;
};

export type OverlayControl = {
  close(opts?: { reason?: OverlayCloseReason; restoreFocus?: boolean }): void;
  open(opts?: { reason?: OverlayOpenReason }): void;
  toggle(): void;
};

// Module-level document click listener management for outside-click dismissal
const activeOverlayListeners = new Set<(event: Event) => void>();
let documentClickUnsubscribe: (() => void) | null = null;

const isDisposedComputedSignalError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('[stateit] Cannot read disposed computed signal');

const ensureDocumentClickListener = (): void => {
  if (documentClickUnsubscribe) return; // Already attached

  const handler = (event: Event) => {
    for (const listener of [...activeOverlayListeners]) {
      try {
        listener(event);
      } catch (error) {
        if (isDisposedComputedSignalError(error)) {
          activeOverlayListeners.delete(listener);

          continue;
        }

        throw error;
      }
    }

    removeDocumentClickListener();
  };

  document.addEventListener('click', handler, { capture: true });
  documentClickUnsubscribe = () => {
    document.removeEventListener('click', handler, { capture: true });
    documentClickUnsubscribe = null;
  };
};

const removeDocumentClickListener = (): void => {
  if (activeOverlayListeners.size === 0 && documentClickUnsubscribe) {
    documentClickUnsubscribe();
  }
};

export const createOverlayControl = (options: OverlayControlOptions): OverlayControl => {
  let positionerCleanup: (() => void) | null = null;
  let clickListener: ((event: Event) => void) | null = null;

  const shouldRestoreFocus = (): boolean => {
    if (typeof options.restoreFocus === 'function') return options.restoreFocus();

    return options.restoreFocus ?? true;
  };

  // Local wrapper — handles click-listener registration without mutating options.
  const commitOpen = (next: boolean, context: { reason: OverlayOpenReason | OverlayCloseReason }): void => {
    try {
      options.setOpen(next, context);
    } catch (error) {
      if (isDisposedComputedSignalError(error) && clickListener) {
        activeOverlayListeners.delete(clickListener);
        removeDocumentClickListener();

        return;
      }

      throw error;
    }

    if (next && clickListener) {
      activeOverlayListeners.add(clickListener);
      ensureDocumentClickListener();
    } else if (!next && clickListener) {
      activeOverlayListeners.delete(clickListener);
      removeDocumentClickListener();
    }
  };

  const open = (opts: { reason?: OverlayOpenReason } = {}): void => {
    const reason = opts.reason ?? 'programmatic';

    if (options.isDisabled?.() || options.isOpen()) return;

    commitOpen(true, { reason });

    if (options.positioner) {
      const reference = options.positioner.reference();
      const floating = options.positioner.floating();

      if (reference && floating) {
        positionerCleanup = autoUpdate(reference, floating, () => options.positioner?.update());
      }

      options.positioner.update();
    }

    options.onOpen?.(reason);
  };

  const close = (opts: { reason?: OverlayCloseReason; restoreFocus?: boolean } = {}): void => {
    const reason = opts.reason ?? 'programmatic';

    if (!options.isOpen()) return;

    commitOpen(false, { reason });

    if (positionerCleanup) {
      positionerCleanup();
      positionerCleanup = null;
    }

    const restore = opts.restoreFocus ?? shouldRestoreFocus();

    if (restore) options.getTriggerElement?.()?.focus();

    options.onClose?.(reason);
  };

  const toggle = (): void => {
    if (options.isOpen()) {
      close({ reason: 'trigger' });

      return;
    }

    open({ reason: 'trigger' });
  };

  clickListener = (event: Event) => {
    if (!options.isOpen()) return;

    const path = (event as Event & { composedPath?: () => EventTarget[] }).composedPath?.() ?? [];
    const boundary = options.getBoundaryElement();
    const panel = options.getPanelElement?.() ?? null;
    const target = (path[0] ?? event.target) as EventTarget | null;
    const nodeTarget = target instanceof Node ? target : null;

    const insideByPath = path.some((entry) => entry === boundary || entry === panel);
    const insideByContainment = nodeTarget
      ? (boundary?.contains(nodeTarget) ?? false) || (panel?.contains(nodeTarget) ?? false)
      : false;
    const inside = insideByPath || insideByContainment;

    if (!inside) close({ reason: 'outside-click' });
  };

  return {
    close,
    open,
    toggle,
  };
};
