import { computed, define, html, onMounted, prop, syncAria } from '@vielzeug/craft';
import { type Placement } from '@vielzeug/orbit';

import { createStableId, parseStringTriggers, type DialogCloseReason, type OverlayOpenReason } from '../../headless';
import { disablableBundle } from '../../shared/config';
import { reducedMotionMixin } from '../../styles';
import { useFloatingTrigger } from '../shared/use-floating-trigger';
import styles from './popover.css?inline';

export type PopoverTrigger = 'click' | 'focus' | 'hover';

const PANEL_OFFSET = 8;
const VALID_TRIGGERS = new Set<PopoverTrigger>(['click', 'focus', 'hover']);
const DEFAULT_POPOVER_TRIGGERS: PopoverTrigger[] = ['click'];

const normalizeTriggers = (value: unknown): PopoverTrigger[] =>
  parseStringTriggers(String(value ?? ''), VALID_TRIGGERS, DEFAULT_POPOVER_TRIGGERS);

export type BitPopoverEvents = {
  /** Emitted when the popover closes */
  close: { reason: DialogCloseReason };
  /** Emitted when the popover opens */
  open: { reason: OverlayOpenReason };
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
  /** Which trigger(s) open/close the popover */
  trigger?: string;
};

/**
 * A floating panel anchored to a trigger element.
 *
 * @element bit-popover
 * @attr {string} placement - Preferred placement (default: 'bottom')
 * @attr {string} trigger - 'click' | 'hover' | 'focus' (default: 'click')
 * @attr {boolean} open - Controlled open state
 * @attr {number} offset - Gap in px (default: 8)
 * @attr {boolean} disabled - Disables the popover
 * @attr {string} label - aria-label on the panel
 * @fires open - When the panel opens
 * @fires close - When the panel closes
 * @slot - The trigger element
 * @slot content - Panel content
 * @part panel - Panel container.
 */
export const POPOVER_TAG = 'bit-popover' as const;
define<BitPopoverProps, BitPopoverEvents>(POPOVER_TAG, {
  props: {
    ...disablableBundle,
    label: prop.string(),
    offset: prop.number(PANEL_OFFSET),
    open: prop.json(undefined as boolean | undefined),
    placement: prop.oneOf(
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start',
      ] as const,
      'bottom',
    ),
    trigger: prop.string('click'),
  },
  setup(props, { el, emit, slots }) {
    const shadowRoot = el.shadowRoot;
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const panelId = createStableId('popover');
    const triggers = computed<PopoverTrigger[]>(() => normalizeTriggers(props.trigger.value));
    let panelEl: HTMLElement | null = null;

    const floating = useFloatingTrigger({
      bindTriggerAria: (triggerEl) =>
        syncAria(
          triggerEl,
          {
            controls: () => panelId,
            disabled: () => String(isDisabled.value),
            expanded: () => String(floating.visible.value),
            haspopup: 'dialog',
          },
          { autoCleanup: false },
        ),
      disabled: isDisabled,
      getPanel: () => panelEl,
      offset: props.offset,
      onClose: (reason) => emit('close', { reason }),
      onOpen: (reason) => emit('open', { reason }),
      openProp: props.open as typeof props.open & { value: boolean | undefined },
      placement: computed(() => props.placement.value as Placement),
      slot: () => shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])') ?? null,
      slotElements: slots.elements(),
      triggers,
    });

    onMounted(() => floating.mount());

    return html`
      <slot></slot>
      <div
        class="panel"
        part="panel"
        id="${panelId}"
        role="dialog"
        aria-modal="false"
        popover="manual"
        :aria-label="${props.label}"
        :aria-hidden="${() => String(!floating.visible.value)}"
        ref=${(ref: HTMLElement) => {
          panelEl = ref;
        }}>
        <slot name="content"></slot>
      </div>
    `;
  },
  styles: [reducedMotionMixin, styles],
});
