import type { Placement } from '@vielzeug/orbit';

import { computed, createStableId, define, html, onMounted, prop, signal, syncAria } from '@vielzeug/craft';

import type { ComponentSize } from '../../types';

import { parseStringTriggers } from '../../headless';
import { disablableBundle, sizableBundle } from '../../shared';
import { forcedColorsMixin } from '../../styles';
import { useFloatingTrigger } from '../shared/use-floating-trigger';
import styles from './tooltip.css?inline';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'click' | 'focus' | 'hover';

const LEFT_GAP_COMPENSATION = 4;
const DEFAULT_TOOLTIP_TRIGGERS: TooltipTrigger[] = ['hover', 'focus'];
const VALID_TOOLTIP_TRIGGERS = new Set<TooltipTrigger>(['click', 'focus', 'hover']);

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
export type SgTooltipProps = {
  /** Hide delay in ms */
  'close-delay'?: number;
  /** Tooltip text content */
  content?: string;
  /** Show delay in ms */
  delay?: number;
  /** Disable the tooltip */
  disabled?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Preferred placement relative to trigger */
  placement?: TooltipPlacement;
  /** Tooltip size */
  size?: ComponentSize;
  /** Which trigger(s) show/hide the tooltip */
  trigger?: string;
  /** Visual variant */
  variant?: 'dark' | 'light';
};

/**
 * A lightweight tooltip shown on hover/focus/click relative to the slotted trigger.
 *
 * @element sg-tooltip
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
 * <!-- Simple text tooltip -->
 * <sg-tooltip content="Copy to clipboard">
 *   <button>Copy</button>
 * </sg-tooltip>
 *
 * <!-- Placement and delay -->
 * <sg-tooltip content="Save your work" placement="right" delay="300">
 *   <sg-icon name="save"></sg-icon>
 * </sg-tooltip>
 *
 * <!-- Hover + focus trigger -->
 * <sg-tooltip content="Required field" trigger="hover,focus" placement="top">
 *   <sg-input label="Email" type="email"></sg-input>
 * </sg-tooltip>
 *
 * <!-- Rich content slot -->
 * <sg-tooltip>
 *   <sg-button>Help</sg-button>
 *   <div slot="content">
 *     <strong>Keyboard shortcuts</strong>
 *     <p>Press Ctrl+S to save.</p>
 *   </div>
 * </sg-tooltip>
 * ```
 */
export const TOOLTIP_TAG = 'sg-tooltip' as const;
define<SgTooltipProps>(TOOLTIP_TAG, {
  props: {
    ...sizableBundle,
    ...disablableBundle,
    'close-delay': { default: 0, parse: parseDelayMs },
    content: prop.string(),
    delay: { default: 0, parse: parseDelayMs },
    open: { default: undefined as boolean | undefined, parse: parseOptionalBool },
    placement: prop.oneOf(['top', 'bottom', 'left', 'right'] as const, 'top'),
    trigger: prop.string('hover,focus'),
    variant: prop.string<'dark' | 'light'>(),
  },
  setup(props, { el, slots }) {
    const shadowRoot = el.shadowRoot;
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isControlled = computed(() => props.open.value !== undefined);
    const activePlacement = signal<TooltipPlacement>('top');
    const tooltipId = createStableId('tooltip');
    const triggers = computed<TooltipTrigger[]>(() => normalizeTriggers(props.trigger.value));
    let tooltipEl: HTMLElement | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearShowTimer = (): void => {
      if (!showTimer) return;

      clearTimeout(showTimer);
      showTimer = null;
    };
    const clearHideTimer = (): void => {
      if (!hideTimer) return;

      clearTimeout(hideTimer);
      hideTimer = null;
    };

    const floating = useFloatingTrigger({
      bindTriggerAria: (triggerEl) => syncAria(triggerEl, { describedby: () => tooltipId }, { autoCleanup: false }),
      disabled: isDisabled,
      getPanel: () => tooltipEl,
      offset: 8,
      onPlacementChange: (p) => {
        const side = p.split('-')[0] as TooltipPlacement;

        activePlacement.value = side;

        if (side === 'left' && tooltipEl) {
          tooltipEl.style.left = `${parseFloat(tooltipEl.style.left) - LEFT_GAP_COMPENSATION}px`;
        }
      },
      openProp: props.open as typeof props.open & { value: boolean | undefined },
      placement: computed(() => props.placement.value as Placement),
      slot: () => shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])') ?? null,
      slotElements: slots.elements(),
      triggers: computed(() => [] as TooltipTrigger[]),
    });

    function show(): void {
      if (isControlled.value) return;

      if (isDisabled.value || (!props.content.value && !slots.has('content').value)) return;

      clearHideTimer();
      clearShowTimer();

      const delay = Number(props.delay.value) || 0;

      if (delay > 0) {
        showTimer = setTimeout(() => {
          showTimer = null;
          floating.open('hover');
          floating.updatePosition();
        }, delay);
      } else {
        floating.open('hover');
        floating.updatePosition();
      }
    }

    function hide(): void {
      if (isControlled.value) return;

      clearShowTimer();

      const closeDelay = Number(props['close-delay'].value) || 0;

      if (closeDelay > 0) {
        clearHideTimer();
        hideTimer = setTimeout(() => {
          hideTimer = null;
          floating.close('trigger');
        }, closeDelay);
      } else {
        floating.close('trigger');
      }
    }

    onMounted(() => {
      // Manually bind trigger events so we can wrap show/hide with delay timers.
      // useFloatingTrigger handles ARIA, positioning, controlled mode, and keyboard dismiss.
      const triggerSlot = shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
      let eventCleanups: Array<() => void> = [];

      const addEvent = (target: EventTarget, event: string, handler: EventListener): void => {
        target.addEventListener(event, handler);
        eventCleanups.push(() => target.removeEventListener(event, handler));
      };

      const bindTriggerEvents = (): void => {
        for (const cleanup of eventCleanups) cleanup();
        eventCleanups = [];

        const triggerEl = triggerSlot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined;

        if (!triggerEl) return;

        const t = triggers.value;

        if (t.includes('hover')) {
          addEvent(triggerEl, 'pointerenter', show);
          addEvent(triggerEl, 'pointerleave', hide);
        }

        if (t.includes('focus')) {
          addEvent(triggerEl, 'focusin', show);
          addEvent(triggerEl, 'focusout', hide);
        }

        if (t.includes('click')) {
          addEvent(triggerEl, 'click', () => (floating.visible.value ? hide() : show()));
        }
      };

      triggerSlot?.addEventListener('slotchange', bindTriggerEvents);
      bindTriggerEvents();

      const destroyFloating = floating.mount();

      return () => {
        triggerSlot?.removeEventListener('slotchange', bindTriggerEvents);
        for (const cleanup of eventCleanups) cleanup();
        clearShowTimer();
        clearHideTimer();
        destroyFloating();
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
        ref=${(ref: HTMLElement) => {
          tooltipEl = ref;
        }}
        :data-placement="${activePlacement}"
        :aria-hidden="${() => String(!floating.visible.value)}">
        <slot name="content"><span class="tooltip-text">${props.content}</span></slot>
      </div>
    `;
  },
  styles: [forcedColorsMixin, styles],
});
