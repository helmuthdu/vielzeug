import { autoUpdate } from '@vielzeug/floatit';

export type OverlayPositioner = {
  floating: () => HTMLElement | null;
  reference: () => HTMLElement | null;
  update: () => void;
};

export type OverlayOpenReason = 'programmatic' | 'toggle' | 'trigger';

export type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'toggle';

export type OverlayChangeContext = {
  reason: OverlayCloseReason | OverlayOpenReason;
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
  setOpen: (next: boolean, context: OverlayChangeContext) => void;
};

export type OverlayControl = {
  bindOutsideClick: (target?: Document | HTMLElement, capture?: boolean) => () => void;
  close: (opts?: { reason?: OverlayCloseReason; restoreFocus?: boolean }) => void;
  open: (opts?: { reason?: OverlayOpenReason }) => void;
  toggle: () => void;
};

export const createOverlayControl = (options: OverlayControlOptions): OverlayControl => {
  let cleanupPositioning: (() => void) | null = null;

  const shouldRestoreFocus = (): boolean => {
    if (typeof options.restoreFocus === 'function') return options.restoreFocus();

    return options.restoreFocus ?? true;
  };

  const startPositioning = (): void => {
    const positioner = options.positioner;

    cleanupPositioning?.();
    cleanupPositioning = null;

    if (!positioner) return;

    const reference = positioner.reference();
    const floating = positioner.floating();

    if (!reference || !floating) {
      positioner.update();

      return;
    }

    cleanupPositioning = autoUpdate(reference, floating, positioner.update);
  };

  const stopPositioning = (): void => {
    cleanupPositioning?.();
    cleanupPositioning = null;
  };

  const open = (opts?: { reason?: OverlayOpenReason }): void => {
    if (options.isDisabled?.()) return;

    if (options.isOpen()) return;

    const reason = opts?.reason ?? 'programmatic';

    options.setOpen(true, { reason });
    startPositioning();
    requestAnimationFrame(() => options.positioner?.update());
    options.onOpen?.(reason);
  };

  const close = (opts?: { reason?: OverlayCloseReason; restoreFocus?: boolean }): void => {
    if (!options.isOpen()) return;

    const reason = opts?.reason ?? 'programmatic';

    options.setOpen(false, { reason });
    stopPositioning();

    const restore = opts?.restoreFocus ?? shouldRestoreFocus();

    if (restore) options.getTriggerElement?.()?.focus();

    options.onClose?.(reason);
  };

  const toggle = (): void => {
    if (options.isOpen()) {
      close({ reason: 'toggle' });

      return;
    }

    open({ reason: 'toggle' });
  };

  const bindOutsideClick = (target: Document | HTMLElement = document, capture = true): (() => void) => {
    const handler = (event: Event) => {
      if (!options.isOpen()) return;

      const boundary = options.getBoundaryElement();
      const panel = options.getPanelElement?.();
      const eventTarget = event.target as Node | null;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];

      if (!eventTarget) return;

      if (boundary && (boundary.contains(eventTarget) || path.includes(boundary))) return;

      if (panel && (panel.contains(eventTarget) || path.includes(panel))) return;

      close({ reason: 'outside-click' });
    };

    target.addEventListener('click', handler, capture);

    return () => {
      target.removeEventListener('click', handler, capture);
    };
  };

  return { bindOutsideClick, close, open, toggle };
};
