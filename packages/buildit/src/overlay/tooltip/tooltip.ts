import {
  computed,
  createId,
  css,
  define,
  defineProps,
  html,
  onMount,
  onSlotChange,
  signal,
  watch,
} from '@vielzeug/craftit';
import type { Placement } from '@vielzeug/floatit';
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';
import { forcedColorsMixin } from '../../styles';
import type { ComponentSize } from '../../types';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'focus' | 'click';

const ARROW_OFFSET = 8; // offset from trigger to tooltip edge

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: inline-block;
      position: relative;
    }

    .tooltip {
      /* Popover UA resets */
      inset: unset;
      margin: 0;
      border: 0;
      /* Positioning — JS sets top/left inline */
      position: fixed;
      background: var(--color-contrast-900);
      color: var(--color-contrast-50);
      border-radius: var(--rounded-sm);
      font-size: var(--text-sm);
      font-weight: var(--font-normal);
      line-height: var(--leading-none);
      max-width: var(--tooltip-max-width, 18rem);
      padding: var(--size-0) var(--size-3);
      pointer-events: none;
      white-space: pre-line;
      word-break: break-word;
      box-shadow: var(--shadow-md);
      /* Hidden by default (also serves as exit state) */
      opacity: 0;
      transition:
        opacity var(--transition-fast),
        display var(--transition-fast) allow-discrete,
        overlay var(--transition-fast) allow-discrete;
    }

    /* Entry animation via @starting-style */
    .tooltip:popover-open {
      opacity: 1;

      @starting-style {
        opacity: 0;
      }
    }

    /* ========================================
       Arrow
       ======================================== */

    .arrow {
      position: absolute;
      width: 0;
      height: 0;
    }

    /* Arrow placement depends on tooltip position */
    .tooltip[data-placement='top'] .arrow {
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid var(--color-contrast-900);
    }

    .tooltip[data-placement='bottom'] .arrow {
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 5px solid var(--color-contrast-900);
    }

    .tooltip[data-placement='left'] .arrow {
      right: -4px;
      top: 50%;
      transform: translateY(-50%);
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 5px solid var(--color-contrast-900);
    }

    .tooltip[data-placement='right'] .arrow {
      left: -4px;
      top: 50%;
      transform: translateY(-50%);
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-right: 5px solid var(--color-contrast-900);
    }
  }

  @layer buildit.variants {
    /* Light tooltip */
    :host([variant='light']) .tooltip {
      background: var(--color-canvas);
      color: var(--color-contrast-900);
      border: var(--border) solid var(--color-contrast-200);
      box-shadow: var(--shadow-md);
    }

    :host([variant='light']) .tooltip[data-placement='top'] .arrow {
      border-top-color: var(--color-canvas);
    }

    :host([variant='light']) .tooltip[data-placement='bottom'] .arrow {
      border-bottom-color: var(--color-canvas);
    }

    :host([variant='light']) .tooltip[data-placement='left'] .arrow {
      border-left-color: var(--color-canvas);
    }

    :host([variant='light']) .tooltip[data-placement='right'] .arrow {
      border-right-color: var(--color-canvas);
    }
  }

  @layer buildit.utilities {
    :host([size='sm']) .tooltip {
      font-size: var(--text-xs);
    }

    :host([size='lg']) .tooltip {
      font-size: var(--text-base);
    }
  }
`;

/** Tooltip component properties */
export interface TooltipProps {
  /** Tooltip text content */
  content?: string;
  /** Preferred placement relative to trigger */
  placement?: TooltipPlacement;
  /** Which trigger(s) show/hide the tooltip — comma-separated if multiple, e.g. "hover,focus" */
  trigger?: string;
  /** Show delay in ms */
  delay?: number;
  /** Hide delay in ms (useful to keep tooltip open when moving focus between trigger and tooltip) */
  'close-delay'?: number;
  /** Tooltip size */
  size?: ComponentSize;
  /** Visual variant: 'dark' (default) or 'light' */
  variant?: 'dark' | 'light';
  /** Disable the tooltip */
  disabled?: boolean;
  /** Controlled open state. When provided, the tooltip acts as a controlled component and ignores trigger events for open/close. */
  open?: boolean;
}

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
export const TAG = define('bit-tooltip', ({ host }) => {
  const props = defineProps<TooltipProps>({
    'close-delay': { default: 0 },
    content: { default: '' },
    delay: { default: 0 },
    disabled: { default: false },
    open: { default: undefined },
    placement: { default: 'top' },
    size: { default: undefined },
    trigger: { default: 'hover,focus' },
    variant: { default: undefined },
  });

  const visible = signal(false);
  const activePlacement = signal<TooltipPlacement>('top');

  let autoUpdateCleanup: (() => void) | null = null;

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

  function getTriggerEl(): Element | null {
    // First slotted element is the trigger
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    const assigned = slot?.assignedElements({ flatten: true });
    return assigned?.[0] ?? null;
  }

  function updatePosition() {
    if (!tooltipEl) return;
    const triggerEl = getTriggerEl();
    if (!triggerEl) return;

    positionFloat(triggerEl, tooltipEl, {
      middleware: [offset(ARROW_OFFSET), flip(), shift({ padding: 6 })],
      placement: props.placement.value as Placement,
    }).then((placement) => {
      if (!tooltipEl) return;
      activePlacement.value = placement.split('-')[0] as TooltipPlacement;
    });
  }

  function show() {
    if (props.open.value !== undefined) return; // controlled mode
    if (props.disabled.value || !props.content.value) return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      visible.value = true;
      if (tooltipEl && !tooltipEl.matches(':popover-open')) {
        tooltipEl.showPopover();
      }
      // Start autoUpdate: repositions on scroll, resize, and reference size change
      const triggerEl = getTriggerEl();
      if (triggerEl && tooltipEl) {
        autoUpdateCleanup?.();
        autoUpdateCleanup = autoUpdate(triggerEl, tooltipEl, updatePosition);
      } else {
        requestAnimationFrame(() => updatePosition());
      }
    }, Number(props.delay.value) || 0);
  }

  function hide() {
    if (props.open.value !== undefined) return; // controlled mode
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    const closeDelay = Number(props['close-delay'].value) || 0;
    if (closeDelay > 0) {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        hideTimer = null;
        _doHide();
      }, closeDelay);
    } else {
      _doHide();
    }
  }

  function _doHide() {
    autoUpdateCleanup?.();
    autoUpdateCleanup = null;
    visible.value = false;
    if (tooltipEl?.matches(':popover-open')) {
      tooltipEl.hidePopover();
    }
  }

  function toggleClick() {
    if (visible.value) hide();
    else show();
  }

  onMount(() => {
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    if (!slot) return;

    const bindTriggerEvents = () => {
      unbindTriggerEvents(); // clean up previous bindings
      const triggerEl = slot.assignedElements({ flatten: true })[0] as HTMLElement | undefined;
      if (!triggerEl) return;

      triggerEl.setAttribute('aria-describedby', tooltipId);

      const t = triggers.value;

      if (t.includes('hover')) {
        triggerEl.addEventListener('mouseenter', show);
        triggerEl.addEventListener('mouseleave', hide);
      }
      if (t.includes('focus')) {
        triggerEl.addEventListener('focusin', show);
        triggerEl.addEventListener('focusout', hide);
      }
      if (t.includes('click')) {
        triggerEl.addEventListener('click', toggleClick);
      }

      // Keyboard escape to dismiss
      document.addEventListener('keydown', handleKeydown);
    };

    const unbindTriggerEvents = () => {
      const triggerEl = slot.assignedElements({ flatten: true })[0] as HTMLElement | undefined;
      if (!triggerEl) return;
      triggerEl.removeAttribute('aria-describedby');
      triggerEl.removeEventListener('mouseenter', show);
      triggerEl.removeEventListener('mouseleave', hide);
      triggerEl.removeEventListener('focusin', show);
      triggerEl.removeEventListener('focusout', hide);
      triggerEl.removeEventListener('click', toggleClick);
      document.removeEventListener('keydown', handleKeydown);
    };

    onSlotChange('default', bindTriggerEvents);

    // Controlled mode: watch the `open` prop and show/hide accordingly
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Controlled open/close must coordinate positioning, visibility, popover state, and auto-update lifecycle
    watch(props.open, (openVal) => {
      if (openVal === undefined || openVal === null) return;
      if (openVal) {
        visible.value = true;
        if (tooltipEl && !tooltipEl.matches(':popover-open')) tooltipEl.showPopover();
        const triggerEl = getTriggerEl();
        if (triggerEl && tooltipEl) {
          autoUpdateCleanup?.();
          autoUpdateCleanup = autoUpdate(triggerEl, tooltipEl, updatePosition);
        } else {
          requestAnimationFrame(() => updatePosition());
        }
      } else {
        _doHide();
      }
    });

    return () => {
      unbindTriggerEvents();
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      autoUpdateCleanup?.();
      autoUpdateCleanup = null;
      if (tooltipEl?.matches(':popover-open')) {
        tooltipEl.hidePopover();
      }
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') hide();
  }

  return {
    styles: [forcedColorsMixin, styles],
    template: html`
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
        :aria-hidden="${() => String(!visible.value)}"
      >
        <slot name="content">${() => props.content.value}</slot>
        <span class="arrow" part="arrow" aria-hidden="true"></span>
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-tooltip': HTMLElement & TooltipProps;
  }
}
