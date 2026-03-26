import type { Placement } from '@vielzeug/floatit';

import { define, createCleanupSignal, computed, createId, html, onMount, signal, watch } from '@vielzeug/craftit';
import { createOverlayControl } from '@vielzeug/craftit/controls';
import { computePosition, flip, offset, shift } from '@vielzeug/floatit';

import type { ComponentSize } from '../../types';

import { disablableBundle, sizableBundle, type PropBundle } from '../../inputs/shared/bundles';
import { forcedColorsMixin } from '../../styles';
import { syncAria } from '../../utils/aria';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'focus' | 'click';

const TOOLTIP_OFFSET = 8; // gap from trigger to tooltip edge
const LEFT_GAP_COMPENSATION = 4; // left placement looks visually tighter in practice

import styles from './tooltip.css?inline';

/** Tooltip component properties */
export type BitTooltipProps = {
  /** Hide delay in ms (useful to keep tooltip open when moving focus between trigger and tooltip) */
  'close-delay'?: number;
  /** Tooltip text content */
  content?: string;
  /** Show delay in ms */
  delay?: number;
  /** Disable the tooltip */
  disabled?: boolean;
  /** Controlled open state. When provided, the tooltip acts as a controlled component and ignores trigger events for open/close. */
  open?: boolean;
  /** Preferred placement relative to trigger */
  placement?: TooltipPlacement;
  /** Tooltip size */
  size?: ComponentSize;
  /** Which trigger(s) show/hide the tooltip — comma-separated if multiple, e.g. "hover,focus" */
  trigger?: string;
  /** Visual variant: 'dark' (default) or 'light' */
  variant?: 'dark' | 'light';
};

const tooltipProps = {
  ...sizableBundle,
  ...disablableBundle,
  'close-delay': 0,
  content: '',
  delay: 0,
  open: undefined,
  placement: 'top',
  trigger: 'hover,focus',
  variant: undefined,
} satisfies PropBundle<BitTooltipProps>;

/**
 * A lightweight tooltip shown on hover/focus/click relative to the slotted trigger.
 *
 * @element bit-tooltip
 *
 * @attr {string} content - Tooltip text content
 * @attr {string} placement - 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @attr {string} trigger - 'hover' | 'focus' | 'click' or comma-separated combination
 * @attr {number} delay - Show delay in milliseconds (default: 0)
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - 'dark' (default) | 'light'
 * @attr {boolean} disabled - Disable the tooltip
 *
 * @slot - Trigger element that the tooltip is anchored to
 * @slot content - Complex tooltip content (overrides the `content` attribute)
 *
 * @cssprop --tooltip-max-width - Max width of the tooltip bubble
 *
 * @example
 * ```html
 * <bit-tooltip content="Copy to clipboard">
 *   <button>Copy</button>
 * </bit-tooltip>
 *
 * <bit-tooltip placement="right" trigger="focus,hover" content="Required field">
 *   <input type="text" />
 * </bit-tooltip>
 * ```
 */
export const TOOLTIP_TAG = define('bit-tooltip', {
  props: tooltipProps,
  setup({ props, shadowRoot, slots }) {
    const visible = signal(false);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isControlled = computed(() => props.open.value !== undefined);
    const activePlacement = signal<TooltipPlacement>('top');
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let tooltipEl: HTMLElement | null = null;
    const tooltipId = createId('tooltip');
    const triggers = computed<TooltipTrigger[]>(() =>
      String(props.trigger.value)
        .split(',')
        .map((t: string) => t.trim() as TooltipTrigger)
        .filter(Boolean),
    );
    const clearShowTimer = () => {
      if (!showTimer) return;

      clearTimeout(showTimer);
      showTimer = null;
    };
    const clearHideTimer = () => {
      if (!hideTimer) return;

      clearTimeout(hideTimer);
      hideTimer = null;
    };

    function getTriggerEl(): Element | null {
      // First slotted element is the trigger
      const slot = shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
      const assigned = slot?.assignedElements({ flatten: true });

      return assigned?.[0] ?? null;
    }
    function updatePosition() {
      if (!tooltipEl) return;

      const triggerEl = getTriggerEl();

      if (!triggerEl) return;

      const { placement, x, y } = computePosition(triggerEl, tooltipEl, {
        middleware: [offset(TOOLTIP_OFFSET), flip(), shift({ padding: 6 })],
        placement: props.placement.value as Placement,
      });

      const side = placement.split('-')[0] as TooltipPlacement;
      const adjustedX = side === 'left' ? x - LEFT_GAP_COMPENSATION : x;

      tooltipEl.style.left = `${adjustedX}px`;
      tooltipEl.style.top = `${y}px`;

      activePlacement.value = side;
    }

    const overlay = createOverlayControl({
      disabled: isDisabled,
      elements: {
        boundary: document.body,
        panel: tooltipEl,
        trigger: getTriggerEl() as HTMLElement | null,
      },
      isOpen: visible,
      positioner: {
        floating: () => tooltipEl,
        reference: () => getTriggerEl() as HTMLElement | null,
        update: updatePosition,
      },
      restoreFocus: false,
      setOpen: (next) => {
        if (next) {
          visible.value = true;

          if (tooltipEl && !tooltipEl.matches(':popover-open')) {
            tooltipEl.showPopover();
          }

          return;
        }

        visible.value = false;

        if (tooltipEl?.matches(':popover-open')) {
          tooltipEl.hidePopover();
        }
      },
    });

    function show() {
      if (isControlled.value) return;

      if (isDisabled.value || (!props.content.value && !slots.has('content').value)) return;

      clearHideTimer();
      clearShowTimer();

      showTimer = setTimeout(
        () => {
          overlay.open('trigger');
        },
        Number(props.delay.value) || 0,
      );
    }
    function hide() {
      if (isControlled.value) return;

      clearShowTimer();

      const closeDelay = Number(props['close-delay'].value) || 0;

      if (closeDelay > 0) {
        clearHideTimer();

        hideTimer = setTimeout(() => {
          hideTimer = null;
          closeNow();
        }, closeDelay);
      } else {
        closeNow();
      }
    }
    function closeNow() {
      overlay.close('trigger', false);
    }
    function toggleClick() {
      if (visible.value) hide();
      else show();
    }
    onMount(() => {
      const slot = shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
      const triggerBinding = createCleanupSignal();

      if (!slot) return;

      const bindTriggerEvents = () => {
        triggerBinding.clear();

        const triggerEl = slot.assignedElements({ flatten: true })[0] as HTMLElement | undefined;

        if (!triggerEl) return;

        const removeAria = syncAria(triggerEl, {
          describedby: () => tooltipId,
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

        if (t.includes('hover')) {
          add(triggerEl, 'pointerenter', show as EventListener);
          add(triggerEl, 'pointerleave', hide as EventListener);
        }

        if (t.includes('focus')) {
          add(triggerEl, 'focusin', show as EventListener);
          add(triggerEl, 'focusout', hide as EventListener);
        }

        if (t.includes('click')) {
          add(triggerEl, 'click', toggleClick as EventListener);
        }

        // Keyboard escape to dismiss
        add(document, 'keydown', handleKeydown as EventListener);

        triggerBinding.set(() => {
          removeAria();

          for (const cleanup of cleanups) cleanup();
        });
      };

      watch(slots.elements(), bindTriggerEvents, { immediate: true });
      // Controlled mode: watch the `open` prop and show/hide accordingly
      watch(props.open, (openVal) => {
        if (openVal === undefined || openVal === null) return;

        if (openVal) {
          overlay.open('programmatic');
        } else {
          overlay.close('programmatic', false);
        }
      });

      return () => {
        triggerBinding.clear();

        clearShowTimer();
        clearHideTimer();
      };
    });
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') overlay.close('escape', false);
    }

    return html`
      <slot></slot>
      <div
        class="tooltip"
        part="tooltip"
        id="${tooltipId}"
        role="tooltip"
        popover="manual"
        ref=${(el: HTMLElement) => {
          tooltipEl = el;
        }}
        :data-placement="${activePlacement}"
        :aria-hidden="${() => String(!visible.value)}">
        <slot name="content">${() => props.content.value}</slot>
      </div>
    `;
  },
  styles: [forcedColorsMixin, styles],
});
