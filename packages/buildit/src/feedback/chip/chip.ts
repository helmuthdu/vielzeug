import { define, computed, html, signal, watch } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import '../../content/icon/icon';
import {
  colorThemeMixin,
  disabledStateMixin,
  forcedColorsMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
// ============================================
// Styles
// ============================================
import componentStyles from './chip.css?inline';

// ============================================
// Types
// ============================================

/** Chip component properties */
type ChipBaseProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interactions */
  disabled?: boolean;
  /** Accessible label (required for icon-only chips) */
  label?: string;
  /** Border radius override */
  rounded?: RoundedSize | '';
  /** Component size */
  size?: ComponentSize;
  /** Value associated with this chip — included in emitted event detail */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
};

type BitChipMode = 'static' | 'removable' | 'selectable' | 'action';

/** Read-only presentation chip */
type StaticChipProps = {
  mode?: Extract<BitChipMode, 'static'>;
};

/** Removable chip mode */
type RemovableChipProps = {
  mode: Extract<BitChipMode, 'removable'>;
};

/** Selectable chip mode */
type SelectableChipProps = {
  /** Controlled checked state for `mode="selectable"` */
  checked?: boolean | undefined;
  /** Initial checked state for uncontrolled `mode="selectable"` */
  'default-checked'?: boolean;
  mode: Extract<BitChipMode, 'selectable'>;
};

/** Action chip mode — behaves like a button, fires a click event without maintaining state */
type ActionChipProps = {
  mode: Extract<BitChipMode, 'action'>;
};

type BitChipComponentProps = ChipBaseProps & {
  checked?: boolean | undefined;
  'default-checked'?: boolean;
  mode?: BitChipMode;
};

export type BitChipEvents = {
  change: { checked: boolean; originalEvent: Event; value: string | undefined };
  click: { originalEvent: MouseEvent; value: string | undefined };
  remove: { originalEvent: MouseEvent; value: string | undefined };
};

export type BitChipProps = ChipBaseProps &
  (StaticChipProps | RemovableChipProps | SelectableChipProps | ActionChipProps);

/**
 * A compact, styled label element. Supports icons, a remove button, colors, sizes, and variants.
 * Commonly used to represent tags, filters, or selected options in a multiselect field.
 *
 * @element bit-chip
 *
 * @attr {string}  label     - Accessible label (required for icon-only chips)
 * @attr {string}  color     - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string}  variant   - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string}  size      - Component size: 'sm' | 'md' | 'lg'
 * @attr {string}  rounded   - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string}  mode      - Interaction mode: 'static' | 'removable' | 'selectable' | 'action'
 * @attr {boolean} disabled  - Disable the chip
 * @attr {string}  value     - Value included in emitted event detail
 * @attr {boolean} checked   - Controlled checked state for selectable chips
 * @attr {boolean} default-checked - Initial checked state for uncontrolled selectable chips
 *
 * @slot         - Chip label text
 * @slot icon    - Leading icon or decoration
 *
 * @event remove - Fired when the remove button is clicked, with `detail.value` and `detail.originalEvent`
 * @event change - Fired when a selectable chip toggles, with `detail.checked`, `detail.value`, and `detail.originalEvent`
 * @event click  - Fired when an action chip is clicked, with `detail.value` and `detail.originalEvent`
 *
 * @cssprop --chip-bg           - Background color
 * @cssprop --chip-color        - Text color
 * @cssprop --chip-border-color - Border color
 * @cssprop --chip-radius       - Border radius
 * @cssprop --chip-font-size    - Font size
 * @cssprop --chip-font-weight  - Font weight
 * @cssprop --chip-padding-x    - Horizontal padding
 * @cssprop --chip-padding-y    - Vertical padding
 * @cssprop --chip-gap          - Gap between icon, label and remove button
 *
 * @example
 * ```html
 * <!-- Static chip (read-only) -->
 * <bit-chip color="primary">Design</bit-chip>
 *
 * <!-- Removable chip -->
 * <bit-chip color="success" variant="flat" mode="removable" value="ts">
 *   TypeScript
 * </bit-chip>
 *
 * <!-- Selectable chip (controlled) -->
 * <bit-chip color="info" variant="flat" mode="selectable" checked value="ui">
 *   UI
 * </bit-chip>
 *
 * <!-- Selectable chip (uncontrolled) -->
 * <bit-chip color="info" variant="flat" mode="selectable" default-checked value="ui">
 *   UI
 * </bit-chip>
 *
 * <!-- Action chip (acts like a button) -->
 * <bit-chip color="warning" mode="action" value="add">
 *   <svg slot="icon" ...></svg>
 *   Add Item
 * </bit-chip>
 *
 * <!-- Icon-only chip -->
 * <bit-chip color="error" mode="action" label="Delete">
 *   <svg slot="icon" ...></svg>
 * </bit-chip>
 * ```
 */
export const CHIP_TAG = define<BitChipComponentProps, BitChipEvents>('bit-chip', {
  props: {
    checked: {
      default: undefined as BitChipComponentProps['checked'],
      parse: (value: string | null) => (value == null ? undefined : value !== 'false'),
    },
    color: undefined,
    'default-checked': false,
    disabled: false,
    label: undefined,
    mode: 'static',
    rounded: undefined,
    size: undefined,
    value: undefined,
    variant: undefined,
  },
  setup({ emit, host, props }) {
    const checkedProp = props.checked;
    const labelProp = props.label;
    // ============================================
    // State Management
    // ============================================
    // Once a checked prop is provided, treat the chip as controlled for the rest of its lifecycle.
    const isControlled = signal(checkedProp.value !== undefined);
    // Internal tracking for uncontrolled selectable chips; seeded from default-checked.
    const checkedState = signal(!isControlled.value && props['default-checked'].value);

    watch(checkedProp, (value) => {
      if (value !== undefined) {
        isControlled.value = true;
      }
    });

    // Effective checked value — reactive to checked prop changes in controlled mode.
    const isChecked = computed(() => {
      if (props.mode.value !== 'selectable') return false;

      if (isControlled.value) {
        return checkedProp.value ?? false;
      }

      return checkedState.value;
    });

    host.bind('attr', {
      checked: () => (props.mode.value === 'selectable' && isChecked.value ? true : undefined),
    });
    // ============================================
    // Event Handlers
    // ============================================
    function handleRemove(e: MouseEvent) {
      if (props.disabled.value) return;

      emit('remove', { originalEvent: e, value: props.value.value });
    }

    function handleSelectableActivate(e: MouseEvent) {
      e.stopPropagation();

      if (props.disabled.value) return;

      const nextChecked = !isChecked.value;

      if (!isControlled.value) {
        checkedState.value = nextChecked;
      }

      emit('change', { checked: nextChecked, originalEvent: e, value: props.value.value });
    }

    function handleActionClick(e: MouseEvent) {
      if (props.disabled.value) return;

      emit('click', { originalEvent: e, value: props.value.value });
    }

    // ============================================
    // Template Helpers
    // ============================================
    const renderChipContent = () => html`
      <slot name="icon"></slot>
      <span class="label"><slot></slot></span>
    `;
    const renderRemoveButton = () => html`
      <button
        class="remove-btn"
        part="remove-btn"
        type="button"
        :aria-label="${() => {
          const label = labelProp.value || props.value.value;

          return label ? `Remove ${label}` : 'Remove';
        }}"
        ?hidden="${() => props.mode.value !== 'removable'}"
        :disabled="${() => props.disabled.value}"
        @click="${handleRemove}">
        <bit-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></bit-icon>
      </button>
    `;
    const renderSelectableChip = () => html`
      <button
        class="chip-btn"
        part="chip-btn"
        type="button"
        role="checkbox"
        :aria-checked="${() => String(isChecked.value)}"
        :aria-label="${() => labelProp.value}"
        :disabled="${() => props.disabled.value}"
        @click="${handleSelectableActivate}">
        <span class="chip" part="chip"> ${renderChipContent()} </span>
      </button>
    `;
    const renderActionChip = () => html`
      <button
        class="chip-btn"
        part="chip-btn"
        type="button"
        :aria-label="${() => labelProp.value}"
        :disabled="${() => props.disabled.value}"
        @click="${handleActionClick}">
        <span class="chip" part="chip"> ${renderChipContent()} </span>
      </button>
    `;
    const renderStaticChip = () => html` <span class="chip" part="chip"> ${renderChipContent()} </span> `;
    const renderRemovableChip = () => html`
      <span class="chip" part="chip"> ${renderChipContent()} ${renderRemoveButton()} </span>
    `;

    // ============================================
    // Render
    // ============================================
    return html`
      ${() => {
        const mode = props.mode.value;

        if (mode === 'selectable') return renderSelectableChip();

        if (mode === 'action') return renderActionChip();

        if (mode === 'removable') return renderRemovableChip();

        return renderStaticChip();
      }}
    `;
  },
  styles: [
    colorThemeMixin,
    disabledStateMixin(),
    roundedVariantMixin,
    sizeVariantMixin({
      lg: {
        '--_font-size': 'var(--text-sm)',
        '--_gap': 'var(--size-1-5)',
        '--_padding-x': 'var(--size-3)',
        '--_padding-y': 'var(--size-1)',
      },
      sm: {
        '--_font-size': 'var(--text-xs)',
        '--_gap': 'var(--size-0-5)',
        '--_padding-x': 'var(--size-2-5)',
        '--_padding-y': 'var(--size-px)',
      },
    }),
    forcedColorsMixin,
    componentStyles,
  ],
});
