import { autoUpdate } from '@vielzeug/floatit';

import { effect } from '../runtime';

export type OverlayOpenReason = 'programmatic' | 'trigger';
export type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'trigger';
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
  bindOutsideClick(target?: Document | HTMLElement, capture?: boolean): () => void;
  close(opts?: { reason?: OverlayCloseReason; restoreFocus?: boolean }): void;
  open(opts?: { reason?: OverlayOpenReason }): void;
  toggle(): void;
};

export const createOverlayControl = (options: OverlayControlOptions): OverlayControl => {
  // Effect handles positioning lifecycle automatically
  effect(() => {
    if (!options.isOpen() || !options.positioner) return;

    const reference = options.positioner.reference();
    const floating = options.positioner.floating();

    if (!reference || !floating) {
      options.positioner.update();

      return;
    }

    const cleanup = autoUpdate(reference, floating, () => options.positioner?.update());

    return cleanup;
  });

  const shouldRestoreFocus = (): boolean => {
    if (typeof options.restoreFocus === 'function') return options.restoreFocus();

    return options.restoreFocus ?? true;
  };

  const open = (opts: { reason?: OverlayOpenReason } = {}): void => {
    const reason = opts.reason ?? 'programmatic';

    if (options.isDisabled?.() || options.isOpen()) return;

    options.setOpen(true, { reason });
    requestAnimationFrame(() => options.positioner?.update());
    options.onOpen?.(reason);
  };

  const close = (opts: { reason?: OverlayCloseReason; restoreFocus?: boolean } = {}): void => {
    const reason = opts.reason ?? 'programmatic';

    if (!options.isOpen()) return;

    options.setOpen(false, { reason });

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

  const bindOutsideClick = (target: Document | HTMLElement = document, capture = true): (() => void) => {
    const handler = (event: Event) => {
      if (!options.isOpen()) return;

      const eventTarget = (event as Event & { composedPath?: () => EventTarget[] }).composedPath?.()[0] ?? event.target;
      const el = eventTarget instanceof Node ? eventTarget : null;

      if (!el) return;

      const inside =
        options.getBoundaryElement()?.contains(el) || (options.getPanelElement?.() ?? null)?.contains(el) || false;

      if (!inside) close({ reason: 'outside-click' });
    };

    target.addEventListener('click', handler, { capture });

    return () => target.removeEventListener('click', handler, { capture });
  };

  return {
    bindOutsideClick,
    close,
    open,
    toggle,
  };
};
