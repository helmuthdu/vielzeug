import { bind, define, getHost, html, inject, prop, useSlots } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { disablableBundle } from '../../shared';
import { CARD_PICKER_CTX } from './_card-picker-context';
import componentStyles from './card-picker-item.css?inline';

export { CHECKBOX_TAG } from '../../inputs/checkbox/checkbox';
export { CARD_TAG } from '../card/card';

export type OreCardPickerItemProps = {
  /** Disable selection without removing this card from browse order. */
  disabled?: boolean;
  /** Accessible card name. Defaults to `value`. */
  label?: string;
  /** Parent-written state. Do not set directly. */
  'picker-disabled'?: boolean;
  /** Parent-written state. Do not set directly. */
  'picker-managed'?: boolean;
  /** Parent-written selected state. Do not set directly. */
  selected?: boolean;
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
 * @part selection - Selection checkbox
 */
export const CARD_PICKER_ITEM_TAG = 'ore-card-picker-item' as const;

define<OreCardPickerItemProps>(CARD_PICKER_ITEM_TAG, {
  props: {
    ...disablableBundle,
    label: prop.string(),
    'picker-disabled': prop.bool(false),
    'picker-managed': prop.bool(false),
    selected: prop.bool(false),
    value: prop.string(),
  },

  setup(props) {
    const context = inject(CARD_PICKER_CTX);
    const el = getHost();
    const slots = useSlots();
    const selected = computed(() => {
      const value = props.value.value;

      return Boolean(value && (context?.selectedValues.value.includes(value) ?? props.selected.value));
    });
    const disabled = computed(() =>
      Boolean(
        props.disabled.value ||
          props['picker-disabled'].value ||
          context?.disabled.value ||
          !props.value.value ||
          (!context && !props['picker-managed'].value),
      ),
    );
    const selectionLabel = computed(() => (selected.value ? 'Selected' : 'Select'));

    bind({
      attr: {
        'aria-label': () => props.label.value ?? props.value.value ?? 'Card',
        'aria-roledescription': () => 'card',
        role: () => 'group',
        selected,
      },
    });

    const handleSelectionChange = (event: Event): void => {
      event.stopPropagation();
      const value = props.value.value;
      if (!value) return;

      if (context) {
        context.toggle(value, event);
        return;
      }

      el.dispatchEvent(
        new CustomEvent('card-picker-toggle', {
          bubbles: true,
          composed: true,
          detail: { originalEvent: event },
        }),
      );
    };

    return html`
      <ore-card class="card" part="card" padding="none" variant="flat">
        <div class="media" part="media" slot="media" ?hidden="${() => !slots.has('media').value}">
          <slot name="media"></slot>
        </div>
        <div class="header" slot="header" ?hidden="${() => !slots.has('header').value}">
          <slot name="header"></slot>
        </div>
        <div class="content" part="content"><slot></slot></div>
        <div class="actions" slot="actions">
          <ore-checkbox
            part="selection"
            size="sm"
            ?checked="${() => selected.value}"
            ?disabled="${() => disabled.value}"
            @change="${handleSelectionChange}">
            <span class="selection-label">${selectionLabel}<span class="sr-only"> ${() => props.label.value ?? props.value.value ?? 'card'}</span></span>
          </ore-checkbox>
          <slot name="actions"></slot>
        </div>
      </ore-card>
    `;
  },

  styles: [componentStyles],
});
