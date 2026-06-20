import type { Placement } from '@vielzeug/orbit';

import { computePosition, flip, offset, shift } from '@vielzeug/orbit';
import { type Readable, type Signal, signal, watch } from '@vielzeug/ripple';

import { lifecycleSignal, createOverlayControl, type DialogCloseReason, type OverlayOpenReason } from '../../headless';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FloatingTriggerType = 'click' | 'focus' | 'hover';

export type AriaBindFn = (triggerEl: HTMLElement) => () => void;

export type FloatingTriggerOptions = {
  /** ARIA binding factory: called with the trigger element, returns a cleanup. */
  bindTriggerAria: AriaBindFn;
  /** If true, disable all trigger interactions and close if open. */
  disabled: Readable<boolean>;
  /** Returns the panel element, if mounted. */
  getPanel: () => HTMLElement | null;
  /** Gap from reference to floating panel in px. Default: 8. Accepts a signal for runtime reactivity. */
  offset?: Readable<number | undefined> | number;
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
  /** Slot element or a factory to lazily find it. Resolved each time bindEvents runs. */
  slot: HTMLSlotElement | null | (() => HTMLSlotElement | null);
  /** Slot elements signal — used to rebind when slotted elements change. */
  slotElements: Readable<Element[]>;
  /** Which triggers are active. Set to empty array or omit if handling events manually. */
  triggers: Readable<FloatingTriggerType[]>;
};

export type FloatingTriggerHandle = {
  /** Closes the panel. No-op if controlled. */
  close: (reason?: DialogCloseReason) => void;
  /**
   * Call inside `onMounted`. Sets up slot + trigger event watchers
   * and returns a cleanup function to pass back to the framework.
   */
  mount: () => () => void;
  /** Opens the panel. No-op if controlled. */
  open: (reason?: OverlayOpenReason) => void;
  /** Toggles the panel. No-op if controlled. */
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

  const resolveSlot = (): HTMLSlotElement | null => (typeof slot === 'function' ? slot() : slot);
  const getOffset = (): number => {
    const o = options.offset;

    if (o == null) return 8;

    const val = typeof o === 'object' ? (o as Readable<number | undefined>).value : o;

    return val ?? 8;
  };
  const abortSignal = lifecycleSignal(options.onCleanup);
  const visible = signal(false);
  const isControlled = () => openProp.value !== undefined;
  let currentTrigger: HTMLElement | null = null;
  let triggerBinding: (() => void) | null = null;

  const overlay = createOverlayControl({
    getBoundary: () => document.body,
    getPanel,
    getTrigger: () => currentTrigger,
    isDisabled: () => disabled.value,
    isOpen: () => visible.value,
    onClose,
    onOpen,
    positioner: {
      floating: getPanel,
      reference: () => currentTrigger,
      update: updatePosition,
    },
    restoreFocus: false,
    setOpen: (next) => {
      if (isControlled()) return;

      if (next) showFloat();
      else hideFloat();
    },
    signal: abortSignal,
  });

  function updatePosition(): void {
    const panel = getPanel();

    if (!panel || !currentTrigger) return;

    const result = computePosition(currentTrigger, panel, {
      middleware: [offset(getOffset()), flip(), shift({ padding: 8 })],
      placement: placement.value,
    });

    panel.style.left = `${result.x}px`;
    panel.style.top = `${result.y}px`;

    panel.dataset.placement = result.placement;

    onPlacementChange?.(result.placement as Placement);
  }

  function showFloat(): void {
    visible.value = true;

    const panel = getPanel();

    if (panel && !panel.matches(':popover-open')) panel.showPopover();

    updatePosition();
  }

  function hideFloat(): void {
    visible.value = false;

    const panel = getPanel();

    if (panel?.matches(':popover-open')) panel.hidePopover();
  }

  function open(reason: OverlayOpenReason = 'programmatic'): void {
    if (!isControlled()) overlay.open(reason);
  }

  function close(reason: DialogCloseReason = 'trigger'): void {
    if (!isControlled()) overlay.close(reason, false);
  }

  function toggle(): void {
    if (!isControlled()) overlay.toggle();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close('escape');
  }

  function handleClickOutside(e: MouseEvent): void {
    if (!visible.value) return;

    const path = e.composedPath();
    const panel = getPanel();

    if ((currentTrigger && path.includes(currentTrigger)) || (panel && path.includes(panel))) return;

    close('outsideClick');
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

    const triggerEl = resolveSlot()?.assignedElements({ flatten: true })[0] as HTMLElement | undefined;

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
      add(document, 'click', handleClickOutside as EventListener, { capture: true });
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

  const mount = (): (() => void) => {
    watch(slotElements, bindEvents, { immediate: true });

    watch(
      openProp,
      (openVal) => {
        if (openVal === undefined || openVal === null) return;

        if (openVal) {
          showFloat();
          onOpen?.('programmatic');
        } else if (visible.value) {
          hideFloat();
          onClose?.('programmatic');
        }
      },
      { immediate: true },
    );

    watch(disabled, (isNowDisabled) => {
      if (isNowDisabled) close('programmatic');
    });

    return () => {
      triggerBinding?.();
      triggerBinding = null;

      const panel = getPanel();

      if (panel?.matches(':popover-open')) panel.hidePopover();

      overlay.dispose();
    };
  };

  return { close, mount, open, toggle, updatePosition, visible };
};
