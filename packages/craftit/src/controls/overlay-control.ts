import { autoUpdate } from '@vielzeug/floatit';
import { onCleanup as onSignalCleanup, type ReadonlySignal } from '@vielzeug/stateit';

import { effect } from '../runtime-lifecycle';
import { createControlState, type ControlContextOptions } from './internal/control-state';

export type OverlayOpenReason = 'programmatic' | 'trigger';
export type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'trigger';
export type OverlayCloseDetail = { reason: OverlayCloseReason };
export type OverlayOpenDetail = { reason: OverlayOpenReason };

type OverlayPositioner = {
  floating: () => HTMLElement | null;
  reference: () => HTMLElement | null;
  update: () => void;
};

export type OverlayControlOptions = ControlContextOptions & {
  elements: {
    boundary: HTMLElement;
    panel?: HTMLElement | null;
    trigger?: HTMLElement | null;
  };
  isOpen: ReadonlySignal<boolean>;
  onClose?: (reason: OverlayCloseReason) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  positioner?: OverlayPositioner;
  restoreFocus?: boolean | (() => boolean);
  setOpen: (next: boolean, reason: OverlayOpenReason | OverlayCloseReason) => void;
};

export type OverlayControl = {
  bindOutsideClick(target?: Document | HTMLElement, capture?: boolean): () => void;
  close(reason?: OverlayCloseReason, restoreFocus?: boolean): void;
  open(reason?: OverlayOpenReason): void;
  toggle(): void;
};

export const createOverlayControl = (options: OverlayControlOptions): OverlayControl => {
  const controlState = createControlState(options);

  // Effect handles positioning lifecycle automatically
  effect(() => {
    if (!options.isOpen.value || !options.positioner) return;

    const reference = options.positioner.reference();
    const floating = options.positioner.floating();

    if (!reference || !floating) {
      options.positioner.update();

      return;
    }

    const cleanup = autoUpdate(reference, floating, () => options.positioner?.update());

    onSignalCleanup(cleanup); // Auto-cleanup on effect re-run/end
  });

  const shouldRestoreFocus = (): boolean => {
    if (typeof options.restoreFocus === 'function') return options.restoreFocus();

    return options.restoreFocus ?? true;
  };

  const open = (reason: OverlayOpenReason = 'programmatic'): void => {
    if (controlState.disabled.value || options.isOpen.value) return;

    options.setOpen(true, reason);
    requestAnimationFrame(() => options.positioner?.update());
    options.onOpen?.(reason);
  };

  const close = (reason: OverlayCloseReason = 'programmatic', restoreFocus?: boolean): void => {
    if (!options.isOpen.value) return;

    options.setOpen(false, reason);

    const restore = restoreFocus ?? shouldRestoreFocus();

    if (restore) options.elements.trigger?.focus();

    options.onClose?.(reason);
  };

  const toggle = (): void => {
    if (options.isOpen.value) {
      close('trigger');

      return;
    }

    open('trigger');
  };

  const isInside = (element: HTMLElement | null | undefined, target: Node): boolean => {
    return element ? element.contains(target) : false;
  };

  const bindOutsideClick = (target: Document | HTMLElement = document, capture = true): (() => void) => {
    const handler = (event: Event) => {
      if (!options.isOpen.value) return;

      const el = event.composedPath()[0] as Node | null;

      if (!el) return;

      const inside = isInside(options.elements.boundary, el) || isInside(options.elements.panel, el);

      if (!inside) close('outside-click');
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
