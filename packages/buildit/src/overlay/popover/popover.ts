import type { OverlayCloseDetail, OverlayOpenDetail } from '@vielzeug/craftit/controls';

import { define, computed, createCleanupSignal, createId, html, onMount, signal, watch } from '@vielzeug/craftit';
import { createOverlayControl } from '@vielzeug/craftit/controls';
import { flip, offset, positionFloat, shift, type Placement } from '@vielzeug/floatit';

import { disablableBundle, type PropBundle } from '../../inputs/shared/bundles';
import { reducedMotionMixin } from '../../styles';
import { syncAria } from '../../utils/aria';
import styles from './popover.css?inline';

export type PopoverTrigger = 'click' | 'hover' | 'focus';

const PANEL_OFFSET = 8;
const VALID_TRIGGERS = new Set<PopoverTrigger>(['click', 'hover', 'focus']);

function normalizeTriggers(value: unknown): PopoverTrigger[] {
  const parsed = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is PopoverTrigger => VALID_TRIGGERS.has(item as PopoverTrigger));

  // Keep behavior predictable for invalid input.
  return parsed.length > 0 ? parsed : ['click'];
}

export type BitPopoverEvents = {
  /** Emitted when the popover closes */
  close: OverlayCloseDetail;
  /** Emitted when the popover opens */
  open: OverlayOpenDetail;
};

/** Popover component properties */
export type BitPopoverProps = {
  /** Disable the popover */
  disabled?: boolean;
  /** Accessible label for the panel */
  label?: string;
  /** Gap between trigger and panel in px */
  offset?: number;
  /** Controlled open state */
  open?: boolean;
  /** Preferred placement relative to the trigger */
  placement?: Placement;
  /** Which trigger(s) open/close the popover — comma-separated */
  trigger?: string;
};

const popoverProps: PropBundle<BitPopoverProps> = {
  ...disablableBundle,
  label: undefined,
  offset: PANEL_OFFSET,
  open: undefined,
  placement: 'bottom',
  trigger: 'click',
};

/**
 * A floating informational or interactive panel anchored to a trigger element.
 * Unlike tooltips, popovers support arbitrary interactive content via slots.
 *
 * @element bit-popover
 *
 * @attr {string} placement - Preferred placement (default: 'bottom')
 * @attr {string} trigger - 'click' | 'hover' | 'focus' or comma-separated (default: 'click')
 * @attr {boolean} open - Controlled open state
 * @attr {number} offset - Gap in px between trigger and panel (default: 8)
 * @attr {boolean} disabled - Disables the popover
 * @attr {string} label - aria-label on the panel
 *
 * @slot - The trigger element
 * @slot content - Panel content
 *
 * @fires open - When the panel opens with detail: { reason }
 * @fires close - When the panel closes with detail: { reason }
 *
 * @cssprop --popover-min-width - Min width of the panel
 * @cssprop --popover-max-width - Max width of the panel
 * @cssprop --popover-max-height - Max height of the panel
 *
 * @example
 * ```html
 * <bit-popover>
 *   <button>Open</button>
 *   <div slot="content">Panel content here</div>
 * </bit-popover>
 * ```
 */
export const POPOVER_TAG = define<BitPopoverProps, BitPopoverEvents>('bit-popover', {
  props: popoverProps,
  setup({ emit, host, props, slots }) {
    const visible = signal(false);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const ariaDisabled = computed(() => String(isDisabled.value));
    const isControlled = computed(() => props.open.value !== undefined);
    const runIfUncontrolled = (action: () => void) => {
      if (isControlled.value) return;

      action();
    };
    const panelId = createId('popover');
    let panelEl: HTMLElement | null = null;
    let currentTrigger: HTMLElement | null = null;
    const triggers = computed<PopoverTrigger[]>(() => normalizeTriggers(props.trigger.value));
    const overlay = createOverlayControl({
      disabled: isDisabled,
      elements: {
        boundary: host.el,
        panel: panelEl,
        trigger: currentTrigger,
      },
      isOpen: visible,
      onClose: (reason) => emit('close', { reason }),
      onOpen: (reason) => emit('open', { reason }),
      positioner: {
        floating: () => panelEl,
        reference: () => currentTrigger,
        update: updatePosition,
      },
      restoreFocus: false,
      setOpen: (next) => {
        if (isControlled.value) return;

        if (next) {
          showFloat();

          return;
        }

        hideFloat();
      },
    });

    function updatePosition() {
      if (!panelEl || !currentTrigger) return;

      const resolvedPlacement = positionFloat(currentTrigger, panelEl, {
        middleware: [offset(props.offset.value ?? PANEL_OFFSET), flip(), shift({ padding: 8 })],
        placement: props.placement.value,
      });

      if (panelEl) panelEl.dataset.placement = resolvedPlacement;
    }
    /** Show the panel and start auto-updating its position. */
    function showFloat() {
      visible.value = true;

      if (panelEl && !panelEl.matches(':popover-open')) panelEl.showPopover();

      updatePosition();
    }
    /** Hide the panel and stop auto-updating its position. */
    function hideFloat() {
      visible.value = false;

      if (panelEl?.matches(':popover-open')) panelEl.hidePopover();
    }
    function open(reason: OverlayOpenDetail['reason'] = 'trigger') {
      runIfUncontrolled(() => overlay.open(reason));
    }
    function close(reason: OverlayCloseDetail['reason'] = 'trigger') {
      runIfUncontrolled(() => overlay.close(reason, false));
    }
    function toggle() {
      runIfUncontrolled(() => overlay.toggle());
    }
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') close('escape');
    }
    function isPathInside(path: EventTarget[]): boolean {
      return (
        path.includes(host.el) ||
        !!(panelEl && path.includes(panelEl)) ||
        !!(currentTrigger && path.includes(currentTrigger))
      );
    }
    function handleClickOutside(e: MouseEvent) {
      if (!visible.value) return;

      const path = e.composedPath();

      if (isPathInside(path)) return;

      close('outside-click');
    }
    // Don't close when focus moves from the trigger into the panel content.
    function handleFocusOut(e: FocusEvent) {
      const next = e.relatedTarget as Element | null;

      if (next && panelEl?.contains(next)) return;

      if (next && currentTrigger?.contains(next)) return;

      close('trigger');
    }
    onMount(() => {
      const triggerSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
      const triggerBinding = createCleanupSignal();

      if (!triggerSlot) return;

      const bindEvents = () => {
        triggerBinding.clear();

        const el = triggerSlot.assignedElements({ flatten: true })[0] as HTMLElement | undefined;

        if (!el) {
          currentTrigger = null;

          return;
        }

        currentTrigger = el;

        const removeAria = syncAria(el, {
          controls: () => panelId,
          disabled: () => ariaDisabled.value,
          expanded: () => String(visible.value),
          haspopup: 'dialog',
        });

        const cleanups: Array<() => void> = [];
        const add = (
          target: EventTarget,
          event: string,
          listener: EventListener,
          options?: AddEventListenerOptions,
        ) => {
          target.addEventListener(event, listener, options);
          cleanups.push(() => target.removeEventListener(event, listener, options));
        };

        const t = triggers.value;
        const hasTrigger = (trigger: PopoverTrigger) => t.includes(trigger);

        if (hasTrigger('click')) {
          add(el, 'click', toggle as EventListener);
          add(document, 'click', handleClickOutside as EventListener, { capture: true });
        }

        if (hasTrigger('hover')) {
          add(el, 'pointerenter', () => open('trigger'));
          add(el, 'pointerleave', () => close('trigger'));

          if (panelEl) {
            add(panelEl, 'pointerenter', () => open('trigger'));
            add(panelEl, 'pointerleave', () => close('trigger'));
          }
        }

        if (hasTrigger('focus')) {
          add(el, 'focusin', () => open('trigger'));
          add(el, 'focusout', handleFocusOut as EventListener);

          if (panelEl) add(panelEl, 'focusout', handleFocusOut as EventListener);
        }

        add(document, 'keydown', handleKeydown as EventListener);

        triggerBinding.set(() => {
          removeAria();

          for (const cleanup of cleanups) cleanup();

          currentTrigger = null;
        });
      };

      watch(slots.elements(), bindEvents, { immediate: true });
      // Controlled mode
      watch(props.open, (openVal) => {
        if (openVal === undefined || openVal === null) return;

        if (openVal) {
          showFloat();
          emit('open', { reason: 'programmatic' });
        } else {
          hideFloat();
          emit('close', { reason: 'programmatic' });
        }
      });
      watch(props.trigger, bindEvents);
      watch(props.disabled, (isDisabled) => {
        if (isDisabled) close('programmatic');
      });

      return () => {
        triggerBinding.clear();

        if (panelEl?.matches(':popover-open')) panelEl.hidePopover();
      };
    });

    return html`
      <slot></slot>
      <div
        class="panel"
        part="panel"
        id="${panelId}"
        role="dialog"
        aria-modal="false"
        popover="manual"
        :aria-label="${() => props.label.value ?? null}"
        :aria-hidden="${() => String(!visible.value)}"
        ref=${(el: HTMLElement) => {
          panelEl = el;
        }}>
        <slot name="content"></slot>
      </div>
    `;
  },
  styles: [reducedMotionMixin, styles],
});
