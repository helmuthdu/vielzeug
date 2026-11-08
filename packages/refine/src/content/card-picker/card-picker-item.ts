import { bind, createId, define, getHost, html, inject, onMounted, prop, ref, useSlots } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { disablableBundle } from '../../shared';
import { CARD_PICKER_CTX, type CardPickerContext } from './_card-picker-context';
import componentStyles from './card-picker-item.css?inline';

export { BUTTON_TAG } from '../../inputs/button/button';
export { CHECKBOX_TAG } from '../../inputs/checkbox/checkbox';
export { DRAWER_TAG } from '../../overlay/drawer/drawer';
export { CARD_TAG } from '../card/card';
export { ICON_TAG } from '../icon/icon';

export type OreCardPickerItemProps = {
  /** Text for the secondary reading action. */
  'details-label'?: string;
  /** Disable selection without removing this card from browse order. */
  disabled?: boolean;
  /** Accessible card name. Defaults to `value`. */
  label?: string;
  /** Stable value used in the parent's selected values. */
  value?: string;
};

/**
 * A rich card candidate inside `ore-card-picker`.
 *
 * @element ore-card-picker-item
 * @attr {string} details-label - Reading action label (default: Details)
 * @attr {boolean} disabled - Disable selection but keep the card browsable
 * @attr {string} label - Accessible card name
 * @attr {string} value - Stable selected value
 * @attr {boolean} selected - Read-only state derived from the parent picker
 *
 * @slot media - Card image or other media
 * @slot header - Card title or short identity
 * @slot - Supporting card content
 * @slot details - Longer information shown in a mobile sheet or desktop reading pane
 * @slot actions - Optional consumer-owned actions
 *
 * @part card - The `ore-card` visual shell
 * @part media - Media wrapper
 * @part content - Supporting content wrapper
 * @part actions - Row holding the selection control, the reading action and consumer actions
 * @part selection - Selection checkbox
 * @part details-trigger - Reading action
 * @part details - Desktop reading region
 * @part details-sheet - Mobile reading drawer
 */
export const CARD_PICKER_ITEM_TAG = 'ore-card-picker-item' as const;

define<OreCardPickerItemProps>(CARD_PICKER_ITEM_TAG, {
  props: {
    ...disablableBundle,
    'details-label': prop.string('Details'),
    label: prop.string(),
    value: prop.string(),
  },

  setup(props) {
    const el = getHost();
    const slots = useSlots();
    const context = signal<CardPickerContext | undefined>(undefined);
    const inlineReading = signal(false);
    const orientation = computed(() => {
      const layout = context.value?.orientation.value ?? 'vertical';
      return layout === 'auto' ? (inlineReading.value ? 'horizontal' : 'vertical') : layout;
    });
    const detailsOpen = signal(false);
    const name = computed(() => props.label.value?.trim() || props.value.value?.trim() || 'Card');
    const selected = computed(() => {
      const value = props.value.value;

      return Boolean(value && context.value?.selectedValues.value.includes(value));
    });
    const disabled = computed(() =>
      Boolean(props.disabled.value || context.value?.disabled.value || !props.value.value || !context.value),
    );
    const selectionLabel = computed(() => (selected.value ? 'Selected' : 'Select'));
    const hasDetails = slots.has('details');
    const paneId = createId('card-reading');
    const titleId = createId('card-reading-title');
    const sheetTitleId = createId('card-sheet-title');
    const triggerRef = ref<HTMLElement>();
    const paneRef = ref<HTMLElement>();
    const contentRef = ref<HTMLElement>();
    const sheetRef = ref<HTMLElement>();
    const detailsSlotRef = ref<HTMLSlotElement>();
    watch(
      computed(() => context.value?.activeValue.value),
      (value) => {
        if (value !== props.value.value) detailsOpen.value = false;
      },
    );

    bind({
      attr: {
        'aria-label': name,
        'aria-roledescription': () => 'card',
        'data-details-open': () => (detailsOpen.value ? '' : null),
        'data-orientation': orientation,
        role: () => 'group',
        selected,
      },
    });

    const handleSelectionChange = (event: Event): void => {
      event.stopPropagation();
      const value = props.value.value;
      if (value) context.value?.toggle(value, event);
    };

    const closeDetails = (): void => {
      detailsOpen.value = false;
      triggerRef.value?.focus();
    };
    const openDetails = (): void => {
      detailsOpen.value = true;
      if (inlineReading.value) queueMicrotask(() => paneRef.value?.focus());
    };
    const selectionControl = () => html`
      <ore-checkbox part="selection" ?checked="${() => selected.value}" ?disabled="${() => disabled.value}" @change="${handleSelectionChange}">
        ${selectionLabel}<span class="sr-only"> ${name}</span>
      </ore-checkbox>
    `;

    onMounted(() => {
      context.value = inject(CARD_PICKER_CTX);
      const picker = el.closest('ore-card-picker');
      const updateLayout = (): void => {
        inlineReading.value = getComputedStyle(el).getPropertyValue('--_reading-inline').trim() === '1';
      };
      updateLayout();
      watch(
        inlineReading,
        (inline) => {
          const target = inline ? contentRef.value : sheetRef.value;
          if (target && detailsSlotRef.value) target.append(detailsSlotRef.value);
        },
        { immediate: true },
      );
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateLayout) : undefined;
      if (picker) observer?.observe(picker);
      return () => observer?.disconnect();
    });

    return html`
      <div class="layout">
        <ore-card class="card" part="card" padding="none" variant="flat" orientation="${() => (orientation.value === 'horizontal' ? 'horizontal' : null)}">
          <div class="media" part="media" slot="media" ?hidden="${() => !slots.has('media').value}"><slot name="media"></slot></div>
          <div class="identity" slot="header"><slot name="header">${name}</slot></div>
          <div class="content" part="content"><slot></slot></div>
          <div class="actions" part="actions" slot="actions">
            ${selectionControl()}
            <ore-button part="details-trigger" variant="ghost" ref=${triggerRef}
              ?hidden="${() => !hasDetails.value}"
              aria-expanded="${() => String(detailsOpen.value)}" aria-controls="${paneId}"
              aria-haspopup="${() => (inlineReading.value ? null : 'dialog')}"
              @click="${() => (detailsOpen.value ? closeDetails() : openDetails())}">
              <ore-icon slot="prefix" name="info" aria-hidden="true"></ore-icon>${props['details-label']}
            </ore-button>
            <slot name="actions"></slot>
          </div>
        </ore-card>
        <section class="reading-pane" part="details" id="${() => (inlineReading.value ? paneId : null)}" role="region" tabindex="-1" ref=${paneRef}
          aria-labelledby="${titleId}" ?hidden="${() => !inlineReading.value || !detailsOpen.value || !hasDetails.value}"
          @keydown="${(event: KeyboardEvent) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closeDetails();
            }
          }}">
          <div class="reading-header">
            <h2 id="${titleId}">${name}</h2>
            <ore-button icon-only variant="ghost" label="Close details" @click="${closeDetails}"><ore-icon name="x" aria-hidden="true"></ore-icon></ore-button>
          </div>
          <div class="reading-content" tabindex="0" ref=${contentRef}></div>
          <div class="reading-footer">${selectionControl()}</div>
        </section>
      </div>
      <ore-drawer class="reading-sheet" part="details-sheet" ref=${sheetRef} id="${() => (inlineReading.value ? null : paneId)}" placement="bottom" size="content" drag-handle-placement="inset"
        initial-focus="${`#${sheetTitleId}`}" title="${name}"
        open="${() => String(detailsOpen.value && !inlineReading.value && hasDetails.value)}"
        @open-change="${(event: CustomEvent<{ open: boolean }>) => {
          event.stopPropagation();
          if (!event.detail.open && !inlineReading.value) detailsOpen.value = false;
        }}">
        <span slot="header" id="${sheetTitleId}" class="sheet-title" role="heading" aria-level="2" tabindex="-1">${name}</span>
        <slot name="details" ref=${detailsSlotRef}></slot>
        <div slot="footer">${selectionControl()}</div>
      </ore-drawer>
    `;
  },

  styles: [componentStyles],
});
