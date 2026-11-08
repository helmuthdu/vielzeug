import { bind, define, getHost, html, inject, onMounted, prop, useSlots } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { disablableBundle } from '../../shared';
import { CARD_PICKER_CTX, type CardPickerContext } from './_card-picker-context';
import componentStyles from './card-picker-item.css?inline';

export { CHECKBOX_TAG } from '../../inputs/checkbox/checkbox';
export { CARD_TAG } from '../card/card';

export type OreCardPickerItemProps = {
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
 * @attr {boolean} disabled - Disable selection but keep the card browsable
 * @attr {string} label - Accessible card name
 * @attr {string} value - Stable selected value
 * @attr {boolean} selected - Read-only state derived from the parent picker
 *
 * @slot media - Card image or other media
 * @slot header - Card title or short identity
 * @slot - Supporting card content
 * @slot actions - Optional consumer-owned actions
 *
 * @part card - The `ore-card` visual shell
 * @part media - Media wrapper
 * @part content - Supporting content wrapper
 * @part actions - Row holding the selection control and consumer actions
 * @part selection - Selection checkbox
 */
export const CARD_PICKER_ITEM_TAG = 'ore-card-picker-item' as const;

define<OreCardPickerItemProps>(CARD_PICKER_ITEM_TAG, {
  props: {
    ...disablableBundle,
    label: prop.string(),
    value: prop.string(),
  },

  setup(props) {
    const el = getHost();
    const slots = useSlots();
    const context = signal<CardPickerContext | undefined>(undefined);
    const wide = signal(false);
    const orientation = computed(() => {
      const layout = context.value?.orientation.value ?? 'vertical';
      return layout === 'auto' ? (wide.value ? 'horizontal' : 'vertical') : layout;
    });
    const name = computed(() => props.label.value?.trim() || props.value.value?.trim() || 'Card');
    const selected = computed(() => {
      const value = props.value.value;

      return Boolean(value && context.value?.selectedValues.value.includes(value));
    });
    const disabled = computed(() =>
      Boolean(props.disabled.value || context.value?.disabled.value || !props.value.value || !context.value),
    );
    const selectionLabel = computed(() => (selected.value ? 'Selected' : 'Select'));

    bind({
      attr: {
        'aria-label': name,
        'aria-roledescription': () => 'card',
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

    const selectionControl = () => html`
      <ore-checkbox part="selection" ?checked="${() => selected.value}" ?disabled="${() => disabled.value}" @change="${handleSelectionChange}">
        ${selectionLabel}<span class="sr-only"> ${name}</span>
      </ore-checkbox>
    `;

    onMounted(() => {
      context.value = inject(CARD_PICKER_CTX);
      const picker = el.closest('ore-card-picker');
      const updateLayout = (): void => {
        wide.value = getComputedStyle(el).getPropertyValue('--_layout-wide').trim() === '1';
      };
      updateLayout();
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateLayout) : undefined;
      if (picker) observer?.observe(picker);
      return () => observer?.disconnect();
    });

    return html`
      <ore-card class="card" part="card" padding="none" variant="flat" orientation="${() => (orientation.value === 'horizontal' ? 'horizontal' : null)}">
          <div class="media" part="media" slot="media" ?hidden="${() => !slots.has('media').value}"><slot name="media"></slot></div>
          <div class="identity" slot="header"><slot name="header">${name}</slot></div>
          <div class="content" part="content"><slot></slot></div>
          <div class="actions" part="actions" slot="actions">
            ${selectionControl()}
            <slot name="actions"></slot>
          </div>
        </ore-card>
    `;
  },

  styles: [componentStyles],
});
