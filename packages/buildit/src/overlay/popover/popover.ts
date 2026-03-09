import {
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  html,
  onMount,
  onSlotChange,
  signal,
  watch,
} from '@vielzeug/craftit';
import type { Placement } from '@vielzeug/floatit';
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';
import { reducedMotionMixin } from '../../styles';
import type { AddEventListeners } from '../../types';

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

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: inline-block;
      position: relative;
    }

    .panel {
      /* Popover UA resets */
      inset: unset;
      margin: 0;
      padding: 0;
      border: var(--border) solid var(--color-contrast-200);
      position: fixed;
      background: var(--color-canvas);
      border-radius: var(--rounded-lg);
      box-shadow: var(--shadow-lg);
      min-width: var(--popover-min-width, 12rem);
      max-width: var(--popover-max-width, 24rem);
      max-height: var(--popover-max-height, min(70vh, 32rem));
      overflow: auto;
      overflow-wrap: anywhere;
      word-break: break-word;
      box-sizing: border-box;
      /* Hidden by default */
      opacity: 0;
      transition: var(--_motion-transition,
        opacity var(--transition-fast),
        display var(--transition-fast) allow-discrete,
        overlay var(--transition-fast) allow-discrete);
    }

    .panel:popover-open {
      opacity: 1;

      @starting-style {
        opacity: 0;
      }
    }

  }
`;

/** Popover component events */
export interface BitPopoverEvents {
  /** Emitted when the popover opens */
  open: CustomEvent<void>;
  /** Emitted when the popover closes */
  close: CustomEvent<void>;
}

/** Popover component properties */
export interface PopoverProps {
  /** Preferred placement relative to the trigger */
  placement?: Placement;
  /** Which trigger(s) open/close the popover — comma-separated */
  trigger?: string;
  /** Controlled open state */
  open?: boolean;
  /** Gap between trigger and panel in px */
  offset?: number;
  /** Disable the popover */
  disabled?: boolean;
  /** Accessible label for the panel */
  label?: string;
}

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
 * @fires open - When the panel opens
 * @fires close - When the panel closes
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
export const TAG = define('bit-popover', ({ host }) => {
  const props = defineProps<PopoverProps>({
    disabled: { default: false },
    label: { default: undefined },
    offset: { default: PANEL_OFFSET },
    open: { default: undefined },
    placement: { default: 'bottom' },
    trigger: { default: 'click' },
  });

  const emit = defineEmits<{
    open: undefined;
    close: undefined;
  }>();

  const visible = signal(false);
  const panelId = createId('popover');
  let panelEl: HTMLElement | null = null;
  let currentTrigger: HTMLElement | null = null;
  let autoUpdateCleanup: (() => void) | null = null;

  const triggers = computed<PopoverTrigger[]>(() => normalizeTriggers(props.trigger.value));

  function updatePosition() {
    if (!panelEl || !currentTrigger) return;
    positionFloat(currentTrigger, panelEl, {
      middleware: [offset(props.offset.value ?? PANEL_OFFSET), flip(), shift({ padding: 8 })],
      placement: props.placement.value,
    }).then((resolvedPlacement) => {
      if (panelEl) panelEl.dataset.placement = resolvedPlacement;
    });
  }

  /** Show the panel and start auto-updating its position. */
  function showFloat() {
    visible.value = true;
    currentTrigger?.setAttribute('aria-expanded', 'true');
    if (panelEl && !panelEl.matches(':popover-open')) panelEl.showPopover();
    if (currentTrigger && panelEl) {
      autoUpdateCleanup?.();
      autoUpdateCleanup = autoUpdate(currentTrigger, panelEl, updatePosition);
    }
    updatePosition();
  }

  /** Hide the panel and stop auto-updating its position. */
  function hideFloat() {
    autoUpdateCleanup?.();
    autoUpdateCleanup = null;
    currentTrigger?.setAttribute('aria-expanded', 'false');
    visible.value = false;
    if (panelEl?.matches(':popover-open')) panelEl.hidePopover();
  }

  function open() {
    if (props.open.value !== undefined) return;
    if (props.disabled.value) return;
    if (visible.value) return;
    showFloat();
    emit('open');
  }

  function close() {
    if (props.open.value !== undefined) return;
    if (!visible.value) return;
    hideFloat();
    emit('close');
  }

  function toggle() {
    if (visible.value) close();
    else open();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  function handleClickOutside(e: MouseEvent) {
    if (!visible.value) return;
    const path = e.composedPath();
    if (path.includes(host)) return;
    if (panelEl && path.includes(panelEl)) return;
    if (currentTrigger && path.includes(currentTrigger)) return;
    close();
  }

  // Don't close when focus moves from the trigger into the panel content.
  function handleFocusOut(e: FocusEvent) {
    const next = e.relatedTarget as Element | null;
    if (next && panelEl?.contains(next)) return;
    if (next && currentTrigger?.contains(next)) return;
    close();
  }

  onMount(() => {
    const triggerSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    if (!triggerSlot) return;

    const bindEvents = () => {
      unbindEvents();
      const el = triggerSlot.assignedElements({ flatten: true })[0] as HTMLElement | undefined;
      if (!el) return;
      currentTrigger = el;
      el.setAttribute('aria-controls', panelId);
      el.setAttribute('aria-haspopup', 'dialog');
      el.setAttribute('aria-expanded', String(visible.value));
      el.setAttribute('aria-disabled', String(Boolean(props.disabled.value)));

      const t = triggers.value;
      if (t.includes('click')) {
        el.addEventListener('click', toggle);
        document.addEventListener('click', handleClickOutside, { capture: true });
      }
      if (t.includes('hover')) {
        el.addEventListener('mouseenter', open);
        el.addEventListener('mouseleave', close);
        panelEl?.addEventListener('mouseenter', open);
        panelEl?.addEventListener('mouseleave', close);
      }
      if (t.includes('focus')) {
        el.addEventListener('focusin', open);
        el.addEventListener('focusout', handleFocusOut);
        panelEl?.addEventListener('focusout', handleFocusOut);
      }
      document.addEventListener('keydown', handleKeydown);
    };

    const unbindEvents = () => {
      if (!currentTrigger) return;
      currentTrigger.removeAttribute('aria-controls');
      currentTrigger.removeAttribute('aria-haspopup');
      currentTrigger.removeAttribute('aria-expanded');
      currentTrigger.removeAttribute('aria-disabled');
      currentTrigger.removeEventListener('click', toggle);
      currentTrigger.removeEventListener('mouseenter', open);
      currentTrigger.removeEventListener('mouseleave', close);
      currentTrigger.removeEventListener('focusin', open);
      currentTrigger.removeEventListener('focusout', handleFocusOut);
      panelEl?.removeEventListener('mouseenter', open);
      panelEl?.removeEventListener('mouseleave', close);
      panelEl?.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('click', handleClickOutside, { capture: true });
      document.removeEventListener('keydown', handleKeydown);
      currentTrigger = null;
    };

    onSlotChange('default', bindEvents);

    // Controlled mode
    watch(props.open, (openVal) => {
      if (openVal === undefined || openVal === null) return;
      if (openVal) {
        showFloat();
        emit('open');
      } else {
        hideFloat();
        emit('close');
      }
    });

    watch(props.trigger, bindEvents);
    watch(props.disabled, (isDisabled) => {
      currentTrigger?.setAttribute('aria-disabled', String(Boolean(isDisabled)));
      if (isDisabled) {
        close();
      }
    });

    return () => {
      unbindEvents();
      autoUpdateCleanup?.();
      autoUpdateCleanup = null;
      if (panelEl?.matches(':popover-open')) panelEl.hidePopover();
    };
  });

  return {
    styles: [reducedMotionMixin, styles],
    template: html`
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
        }}
      >
        <slot name="content"></slot>
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-popover': HTMLElement & PopoverProps & AddEventListeners<BitPopoverEvents>;
  }
}
