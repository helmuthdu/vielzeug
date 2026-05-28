import type { Placement } from '@vielzeug/floatit';

import { computed, define, html, prop, signal, syncAria, watch, onMounted } from '@vielzeug/craftit';
import { computePosition, flip, offset, shift } from '@vielzeug/floatit';

import type { ComponentSize } from '../../types';

import { createOverlayControl, createStableId, parseStringTriggers } from '../../headless';
import { disablableBundle, sizableBundle } from '../../shared/config';
import { forcedColorsMixin } from '../../styles';
import styles from './tooltip.css?inline';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'focus' | 'click';

const TOOLTIP_OFFSET = 8; // gap from trigger to tooltip edge
const LEFT_GAP_COMPENSATION = 4; // left placement looks visually tighter in practice
const DEFAULT_TOOLTIP_TRIGGERS: TooltipTrigger[] = ['hover', 'focus'];
const VALID_TOOLTIP_TRIGGERS = new Set<TooltipTrigger>(['hover', 'focus', 'click']);

const parseDelayMs = (value: string | null): number => {
  if (value == null || value.trim() === '') return 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseOptionalBool = (value: string | null): boolean | undefined =>
  value == null ? undefined : value === '' || value === 'true';

const normalizeTriggers = (value: string | null | undefined): TooltipTrigger[] =>
  parseStringTriggers(value, VALID_TOOLTIP_TRIGGERS, DEFAULT_TOOLTIP_TRIGGERS);

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
 * @part tooltip - Tooltip container.
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
export const TOOLTIP_TAG = define<BitTooltipProps>('bit-tooltip', {
  props: {
    ...sizableBundle,
    ...disablableBundle,
    'close-delay': { default: 0, parse: parseDelayMs },
    content: prop.string(),
    delay: { default: 0, parse: parseDelayMs },
    open: { default: undefined as boolean | undefined, parse: parseOptionalBool },
    placement: prop.oneOf(['top', 'bottom', 'left', 'right'] as const, 'top'),
    trigger: { default: 'hover,focus', parse: (value: string | null) => normalizeTriggers(value).join(',') },
    variant: prop.string<'dark' | 'light'>(),
  },
  setup(props, { el, bind: _bind, slots }) {
    const shadowRoot = el.shadowRoot;
    const visible = signal(false);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isControlled = computed(() => props.open.value !== undefined);
    const activePlacement = signal<TooltipPlacement>('top');
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let tooltipEl: HTMLElement | null = null;
    const tooltipId = createStableId('tooltip');
    const triggers = computed<TooltipTrigger[]>(() => normalizeTriggers(props.trigger.value));
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

    function getTriggerEl(): HTMLElement | null {
      // First slotted element is the trigger
      const slot = shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
      const assigned = slot?.assignedElements({ flatten: true });

      const first = assigned?.[0];

      return first instanceof HTMLElement ? first : null;
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
      getBoundary: () => document.body,
      getPanel: () => tooltipEl,
      getTrigger: getTriggerEl,
      isDisabled: () => isDisabled.value,
      isOpen: () => visible.value,
      positioner: {
        floating: () => tooltipEl,
        reference: getTriggerEl,
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

    function show(reason: 'hover' | 'focus' | 'click' = 'hover') {
      if (isControlled.value) return;

      if (isDisabled.value || (!props.content.value && !slots.has('content').value)) return;

      clearHideTimer();
      clearShowTimer();

      showTimer = setTimeout(
        () => {
          overlay.open(reason);
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
      else show('click');
    }
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') overlay.close('escape', false);
    }

    onMounted(() => {
      const slot = shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
      let triggerBinding: (() => void) | null = null;

      if (!slot) return;

      const bindTriggerEvents = () => {
        triggerBinding?.();
        triggerBinding = null;

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
          add(triggerEl, 'pointerenter', () => show('hover'));
          add(triggerEl, 'pointerleave', hide as EventListener);
        }

        if (t.includes('focus')) {
          add(triggerEl, 'focusin', () => show('focus'));
          add(triggerEl, 'focusout', hide as EventListener);
        }

        if (t.includes('click')) {
          add(triggerEl, 'click', toggleClick as EventListener);
        }

        // Keyboard escape to dismiss
        add(document, 'keydown', handleKeydown as EventListener);

        triggerBinding = () => {
          removeAria();

          for (const cleanup of cleanups) cleanup();
        };
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
        triggerBinding?.();
        triggerBinding = null;

        clearShowTimer();
        clearHideTimer();
        overlay.cleanup();
      };
    });

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
        <slot name="content"><span class="tooltip-text">${props.content}</span></slot>
      </div>
    `;
  },
  styles: [forcedColorsMixin, styles],
});
