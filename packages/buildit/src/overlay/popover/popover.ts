import type { Placement } from '@vielzeug/floatit';

import { computed, createId, defineComponent, html, onMount, onSlotChange, signal, watch } from '@vielzeug/craftit';
import { autoUpdate, flip, offset, positionFloat, shift } from '@vielzeug/floatit';

import { reducedMotionMixin } from '../../styles';

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

import styles from './popover.css?inline';

export type BitPopoverEvents = {
  /** Emitted when the popover closes */
  close: undefined;
  /** Emitted when the popover opens */
  open: undefined;
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
export const POPOVER_TAG = defineComponent<BitPopoverProps, BitPopoverEvents>({
  props: {
    disabled: { default: false },
    label: { default: undefined },
    offset: { default: PANEL_OFFSET },
    open: { default: undefined },
    placement: { default: 'bottom' },
    trigger: { default: 'click' },
  },
  setup({ emit, host, props }) {
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
          el.addEventListener('pointerenter', open);
          el.addEventListener('pointerleave', close);
          panelEl?.addEventListener('pointerenter', open);
          panelEl?.addEventListener('pointerleave', close);
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
        currentTrigger.removeEventListener('pointerenter', open);
        currentTrigger.removeEventListener('pointerleave', close);
        currentTrigger.removeEventListener('focusin', open);
        currentTrigger.removeEventListener('focusout', handleFocusOut);
        panelEl?.removeEventListener('pointerenter', open);
        panelEl?.removeEventListener('pointerleave', close);
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
  tag: 'bit-popover',
});
