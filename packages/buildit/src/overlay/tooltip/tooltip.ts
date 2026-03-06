import { computed, css, define, defineProps, effect, html, onMount, signal } from '@vielzeug/craftit';
import type { ComponentSize } from '../../types';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipTrigger = 'hover' | 'focus' | 'click';

const ARROW_OFFSET = 8; // distance from tooltip edge to target

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: inline-block;
      position: relative;
    }

    .tooltip {
      position: fixed;
      z-index: var(--z-tooltip, 9000);
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
      /* Start hidden */
      opacity: 0;
      visibility: hidden;
      transition:
        opacity var(--transition-fast),
        visibility var(--transition-fast);
    }

    .tooltip[data-visible] {
      opacity: 1;
      visibility: visible;
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
  /** Tooltip size */
  size?: ComponentSize;
  /** Visual variant: 'dark' (default) or 'light' */
  variant?: 'dark' | 'light';
  /** Disable the tooltip */
  disabled?: boolean;
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
define('bit-tooltip', ({ host }) => {
  const props = defineProps({
    content: { default: '' },
    delay: { default: 0 },
    disabled: { default: false },
    placement: { default: 'top' as TooltipPlacement },
    size: { default: undefined as ComponentSize | undefined },
    trigger: { default: 'hover,focus' },
    variant: { default: undefined as 'dark' | 'light' | undefined },
  });

  const visible = signal(false);
  const position = signal({ left: 0, top: 0 });
  const activePlacement = signal<TooltipPlacement>('top');

  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let tooltipEl: HTMLElement | null = null;

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

  function computePosition(tooltipRect: DOMRect, triggerRect: DOMRect, pref: TooltipPlacement) {
    const OFFSET = ARROW_OFFSET;
    const vp = { h: window.innerHeight, w: window.innerWidth };

    const placements: Record<TooltipPlacement, { top: number; left: number }> = {
      bottom: {
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
        top: triggerRect.bottom + OFFSET,
      },
      left: {
        left: triggerRect.left - tooltipRect.width - OFFSET,
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      },
      right: {
        left: triggerRect.right + OFFSET,
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      },
      top: {
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
        top: triggerRect.top - tooltipRect.height - OFFSET,
      },
    };

    // Try preferred, then fallback to opposite/perpendicular
    const fallbackOrder: TooltipPlacement[] = [pref, 'top', 'bottom', 'left', 'right'];
    for (const p of fallbackOrder) {
      const pos = placements[p];
      const fits =
        pos.top >= 0 && pos.top + tooltipRect.height <= vp.h && pos.left >= 0 && pos.left + tooltipRect.width <= vp.w;
      if (fits) return { placement: p, pos };
    }

    // Last resort — clamp to viewport
    const pos = placements[pref];
    return {
      placement: pref,
      pos: {
        left: Math.max(4, Math.min(pos.left, vp.w - tooltipRect.width - 4)),
        top: Math.max(4, Math.min(pos.top, vp.h - tooltipRect.height - 4)),
      },
    };
  }

  function updatePosition() {
    if (!tooltipEl) return;
    const triggerEl = getTriggerEl();
    if (!triggerEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const { pos, placement } = computePosition(tooltipRect, triggerRect, props.placement.value as TooltipPlacement);
    position.value = pos;
    activePlacement.value = placement;
  }

  function show() {
    if (props.disabled.value || !props.content.value) return;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      visible.value = true;
      // updatePosition after a micro-tick so the tooltip is visible in DOM
      requestAnimationFrame(() => updatePosition());
    }, Number(props.delay.value) || 0);
  }

  function hide() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    visible.value = false;
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
      triggerEl.removeEventListener('mouseenter', show);
      triggerEl.removeEventListener('mouseleave', hide);
      triggerEl.removeEventListener('focusin', show);
      triggerEl.removeEventListener('focusout', hide);
      triggerEl.removeEventListener('click', toggleClick);
      document.removeEventListener('keydown', handleKeydown);
    };

    slot.addEventListener('slotchange', bindTriggerEvents);
    bindTriggerEvents();

    return () => {
      unbindTriggerEvents();
      slot.removeEventListener('slotchange', bindTriggerEvents);
      if (showTimer) clearTimeout(showTimer);
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') hide();
  }

  // Reposition on scroll/resize while visible
  effect(() => {
    if (!visible.value) return;

    const scrollHandler = () => updatePosition();
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', scrollHandler);

    return () => {
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', scrollHandler);
    };
  });

  return {
    styles: [styles],
    template: html`
      <slot></slot>
      <div
        class="tooltip"
        part="tooltip"
        role="tooltip"
        ref=${(el: HTMLElement) => {
          tooltipEl = el;
        }}
        :data-visible="${() => visible.value || null}"
        :data-placement="${activePlacement}"
        :style="${() => `top:${position.value.top}px;left:${position.value.left}px`}"
        :aria-hidden="${() => String(!visible.value)}"
      >
        <slot name="content">${() => props.content.value}</slot>
        <span class="arrow" part="arrow" aria-hidden="true"></span>
      </div>
    `,
  };
});

export default {};
