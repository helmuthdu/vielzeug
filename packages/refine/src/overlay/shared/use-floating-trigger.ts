import type { Placement } from '@vielzeug/orbit';

import { type Readable, type Signal, signal, watch } from '@vielzeug/ripple';

import {
  createDropdownPositioner,
  createOutsidePointerDismissal,
  type DialogCloseReason,
  lifecycleSignal,
  type OverlayOpenReason,
} from '../../core';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FloatingTriggerType = 'click' | 'focus' | 'hover';

export type AriaBindFn = (triggerEl: HTMLElement) => () => void;

export type FloatingTriggerOptions = {
  /** ARIA binding factory: called with the trigger element, returns a cleanup. */
  bindTriggerAria: AriaBindFn;
  /** Initial uncontrolled visibility. Ignored when `openProp` is defined. */
  defaultOpen: Readable<boolean | undefined>;
  /** If true, disable all trigger interactions and close if open. */
  disabled: Readable<boolean>;
  /** Returns the host element (e.g. ore-popover) so slotted content clicks aren't treated as outside clicks. */
  getHost?: () => Element | null;
  /** Returns the panel element, if mounted. */
  getPanel: () => HTMLElement | null;
  /** Gap from reference to floating panel in px, read on every position update. Default: 8. */
  offset?: () => number | undefined;
  /** Cleanup registrar from the component setup ctx. Automatically called on disconnect. */
  onCleanup: (fn: () => void) => void;
  /** Called when the popover closes. */
  onClose?: (reason: DialogCloseReason) => void;
  /** Called when the popover opens. */
  onOpen?: (reason: OverlayOpenReason) => void;
  /** Callback when resolved placement changes (useful for CSS attribute). */
  onPlacementChange?: (placement: Placement) => void;
  /** Controlled open prop. When defined, disables uncontrolled logic. */
  openProp: Readable<boolean | undefined>;
  /** Preferred placement. Default: 'bottom'. */
  placement: Readable<Placement>;
  /** Resolves the trigger slot element. Called each time events are (re)bound. */
  slot: () => HTMLSlotElement | null;
  /** Slot elements signal — used to rebind when slotted elements change. */
  slotElements: Readable<Element[]>;
  /** Which triggers are active. Set to empty array or omit if handling events manually. */
  triggers: Readable<FloatingTriggerType[]>;
};

export type FloatingTriggerHandle = {
  /** Closes the panel or requests that a controlled consumer close it. */
  close: (reason?: DialogCloseReason) => void;
  /**
   * Call inside `onMounted`. Sets up slot + trigger event watchers
   * and returns a cleanup function to pass back to the framework.
   */
  mount: () => () => void;
  /** Opens the panel or requests that a controlled consumer open it. */
  open: (reason?: OverlayOpenReason) => void;
  /** Toggles the panel or requests the matching controlled-state change. */
  toggle: () => void;
  /** Manually trigger a position recalculation. */
  updatePosition: () => void;
  /** Whether the panel is currently visible. */
  visible: Signal<boolean>;
};

// ── Implementation ─────────────────────────────────────────────────────────────

/**
 * Shared logic for floating-panel triggers (tooltip, popover).
 *
 * Handles:
 * - Slot-based trigger element detection and rebinding
 * - Event binding per trigger type (hover / focus / click)
 * - Floating-element positioning via `@vielzeug/orbit`
 * - Controlled mode via `openProp` watcher
 * - Keyboard escape dismissal
 *
 * ARIA binding is intentionally delegated to the caller via `bindTriggerAria`
 * so that tooltip (`describedby`) and popover (`expanded`/`controls`/…) can diverge.
 */
export const useFloatingTrigger = (options: FloatingTriggerOptions): FloatingTriggerHandle => {
  const {
    bindTriggerAria,
    defaultOpen,
    disabled,
    getPanel,
    onClose,
    onOpen,
    onPlacementChange,
    openProp,
    placement,
    slot,
    slotElements,
    triggers,
  } = options;

  const getOffset = (): number => options.offset?.() ?? 8;
  const abortSignal = lifecycleSignal(options.onCleanup);
  const visible = signal(false);
  const isControlled = () => openProp.value !== undefined;
  let currentTrigger: HTMLElement | null = null;
  let triggerBinding: (() => void) | null = null;

  const resolveTrigger = (): HTMLElement | null =>
    currentTrigger ?? (slot()?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;

  // The same Orbit positioner the dropdown overlays use — RTL placement mirroring, the
  // containing-block self-correction, and flip/shift, so popover/tooltip no longer carry a second,
  // divergent copy of the positioning logic. Panels render in the Popover API top layer (no
  // clipping ancestor) and size themselves (no width matching), matching `ore-menu`'s config.
  const positioner = createDropdownPositioner({
    getFloating: getPanel,
    getOffsetPx: getOffset,
    getPlacement: () => placement.value,
    getReference: resolveTrigger,
    matchWidth: false,
    onPlacementChange: (resolved) => {
      const panel = getPanel();

      if (panel) panel.dataset.placement = resolved;

      onPlacementChange?.(resolved);
    },
    padding: 8,
    useClippingAncestor: false,
  });

  function updatePosition(): void {
    positioner.update();
  }

  function showFloat(): void {
    visible.value = true;

    const panel = getPanel();

    if (panel) {
      panel.dataset.open = '';

      if ('showPopover' in panel) {
        try {
          if (!panel.matches(':popover-open')) panel.showPopover();
        } catch {
          // Popover API restricted (e.g. sandboxed iframe); data-open CSS fallback handles visibility.
        }
      }
    }

    updatePosition();
  }

  function hideFloat(): void {
    visible.value = false;

    const panel = getPanel();

    if (panel) {
      delete panel.dataset.open;

      if ('hidePopover' in panel) {
        try {
          if (panel.matches(':popover-open')) panel.hidePopover();
        } catch {
          // Popover API restricted; data-open removal handles visibility.
        }
      }
    }
  }

  function open(reason: OverlayOpenReason = 'programmatic'): void {
    if (disabled.value || visible.value) return;
    if (isControlled()) {
      onOpen?.(reason);
      return;
    }

    showFloat();
    onOpen?.(reason);
  }

  function close(reason: DialogCloseReason = 'trigger'): void {
    if (!visible.value) return;
    if (isControlled()) {
      onClose?.(reason);
      return;
    }

    hideFloat();
    onClose?.(reason);
  }

  function toggle(): void {
    if (visible.value) close();
    else open('click');
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close('escape');
  }

  function handleFocusOut(e: FocusEvent): void {
    const next = e.relatedTarget as Element | null;
    const panel = getPanel();

    if (next && panel?.contains(next)) return;

    if (next && currentTrigger?.contains(next)) return;

    close('trigger');
  }

  const bindEvents = (): void => {
    triggerBinding?.();
    triggerBinding = null;

    const triggerEl = slot()?.assignedElements({ flatten: true })[0] as HTMLElement | undefined;

    if (!triggerEl) {
      currentTrigger = null;

      return;
    }

    currentTrigger = triggerEl;

    const removeAria = bindTriggerAria(triggerEl);
    const cleanups: Array<() => void> = [];

    const add = (
      target: EventTarget,
      event: string,
      listener: EventListener,
      eventOptions?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(event, listener, eventOptions);
      cleanups.push(() => target.removeEventListener(event, listener, eventOptions));
    };

    const t = triggers.value;

    if (t.includes('click')) {
      add(triggerEl, 'click', toggle as EventListener);
    }

    if (t.includes('hover')) {
      add(triggerEl, 'pointerenter', () => open('hover'));
      add(triggerEl, 'pointerleave', () => close('trigger'));

      const panelEl = getPanel();

      if (panelEl) {
        add(panelEl, 'pointerenter', () => open('hover'));
        add(panelEl, 'pointerleave', () => close('trigger'));
      }
    }

    if (t.includes('focus')) {
      add(triggerEl, 'focusin', () => open('focus'));
      add(triggerEl, 'focusout', handleFocusOut as EventListener);

      const panelEl = getPanel();

      if (panelEl) add(panelEl, 'focusout', handleFocusOut as EventListener);
    }

    add(document, 'keydown', handleKeydown as EventListener);

    triggerBinding = () => {
      removeAria();

      for (const cleanup of cleanups) cleanup();

      currentTrigger = null;
    };
  };

  const stopOutsidePointerDismissal = createOutsidePointerDismissal({
    getTargets: () => [currentTrigger, getPanel(), options.getHost?.()],
    isActive: () => visible.value && triggers.value.includes('click'),
    onDismiss: () => close('outsideClick'),
    signal: abortSignal,
  });

  const mount = (): (() => void) => {
    let initializedOpenProp = false;
    const triggerSlot = slot();
    const rebind = (): void => {
      queueMicrotask(() => {
        if (!abortSignal.aborted) bindEvents();
      });
    };

    triggerSlot?.addEventListener('slotchange', rebind);
    rebind();
    watch(slotElements, bindEvents, { immediate: true });

    watch(
      openProp,
      (openVal) => {
        if (openVal === undefined || openVal === null) {
          if (initializedOpenProp && visible.value) {
            hideFloat();
            onClose?.('programmatic');
          }

          initializedOpenProp = true;

          return;
        }

        initializedOpenProp = true;

        if (openVal) showFloat();
        else if (visible.value) hideFloat();
      },
      { immediate: true },
    );

    if (openProp.value === undefined && defaultOpen.value) {
      showFloat();
      onOpen?.('programmatic');
    }

    watch(disabled, (isNowDisabled) => {
      if (isNowDisabled) close('programmatic');
    });

    return () => {
      triggerSlot?.removeEventListener('slotchange', rebind);
      triggerBinding?.();
      triggerBinding = null;

      const panel = getPanel();

      if (panel) {
        delete panel.dataset.open;

        if ('hidePopover' in panel) {
          try {
            if (panel.matches(':popover-open')) panel.hidePopover();
          } catch {
            // Popover API restricted; data-open removal handles visibility.
          }
        }
      }

      stopOutsidePointerDismissal();
    };
  };

  return { close, mount, open, toggle, updatePosition, visible };
};
