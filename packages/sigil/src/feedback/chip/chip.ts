import { computed, define, html, prop, signal, watch } from '@vielzeug/craft';

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

type SgChipMode = 'static' | 'removable' | 'selectable' | 'action';

/** Read-only presentation chip */
type StaticChipProps = {
  mode?: Extract<SgChipMode, 'static'>;
};

/** Removable chip mode */
type RemovableChipProps = {
  mode: Extract<SgChipMode, 'removable'>;
};

/** Selectable chip mode */
type SelectableChipProps = {
  /** Controlled checked state for `mode="selectable"` */
  checked?: boolean | undefined;
  /** Initial checked state for uncontrolled `mode="selectable"` */
  'default-checked'?: boolean;
  mode: Extract<SgChipMode, 'selectable'>;
};

/** Action chip mode — behaves like a button, fires a click event without maintaining state */
type ActionChipProps = {
  mode: Extract<SgChipMode, 'action'>;
};

type SgChipComponentProps = ChipBaseProps & {
  checked?: boolean | undefined;
  'default-checked'?: boolean;
  mode?: SgChipMode;
};

export type SgChipEvents = {
  change: { checked: boolean; originalEvent: Event; value: string | undefined };
  click: { originalEvent: MouseEvent; value: string | undefined };
  remove: { originalEvent: MouseEvent; value: string | undefined };
};

export type SgChipProps = ChipBaseProps &
  (StaticChipProps | RemovableChipProps | SelectableChipProps | ActionChipProps);

/**
 * A compact, styled label element. Supports icons, a remove button, colors, sizes, and variants.
 * Commonly used to represent tags, filters, or selected options in a multiselect field.
 *
 * @element sg-chip
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
 * @fires remove - Fired when the remove button is clicked. detail: { value: string, originalEvent: MouseEvent }
 * @fires change - Fired when a selectable chip toggles. detail: { checked: boolean, value: string, originalEvent: Event }
 * @fires click  - Fired when an action chip is clicked. detail: { value: string, originalEvent: MouseEvent }
 *
 * @slot         - Chip label text
 * @slot icon    - Leading icon or decoration
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
 * @part remove-btn - Remove action button.
 * @part chip-btn - Shadow part for the `chip-btn` element.
 * @part chip - Shadow part for the `chip` element.
 * @example
 * ```html
 * <!-- Static chip (read-only) -->
 * <sg-chip color="primary">Design</sg-chip>
 *
 * <!-- Removable chip -->
 * <sg-chip color="success" variant="flat" mode="removable" value="ts">
 *   TypeScript
 * </sg-chip>
 *
 * <!-- Selectable chip (controlled) -->
 * <sg-chip color="info" variant="flat" mode="selectable" checked value="ui">
 *   UI
 * </sg-chip>
 *
 * <!-- Selectable chip (uncontrolled) -->
 * <sg-chip color="info" variant="flat" mode="selectable" default-checked value="ui">
 *   UI
 * </sg-chip>
 *
 * <!-- Action chip (acts like a button) -->
 * <sg-chip color="warning" mode="action" value="add">
 *   <svg slot="icon" ...></svg>
 *   Add Item
 * </sg-chip>
 *
 * <!-- Icon-only chip -->
 * <sg-chip color="error" mode="action" label="Delete">
 *   <svg slot="icon" ...></svg>
 * </sg-chip>
 * ```
 */
export const CHIP_TAG = 'sg-chip' as const;
define<SgChipComponentProps, SgChipEvents>(CHIP_TAG, {
  props: {
    checked: {
      default: undefined as SgChipComponentProps['checked'],
      parse: (value: string | null) => (value == null ? undefined : value !== 'false'),
      reflect: false,
    },
    color: prop.string<ThemeColor>(),
    'default-checked': prop.bool(false),
    disabled: prop.bool(false),
    label: prop.string(),
    mode: prop.oneOf(['static', 'removable', 'selectable', 'action'] as const, 'static'),
    rounded: prop.string<RoundedSize | ''>(),
    size: prop.string<ComponentSize>(),
    value: prop.string(),
    variant: prop.string<Exclude<VisualVariant, 'glass' | 'text' | 'frost'>>(),
  },

  setup(props, { bind, el: _el, emit }) {
    // ============================================
    // State Management
    // ============================================
    // Once a checked prop is provided, treat the chip as controlled for the rest of its lifecycle.
    const isControlled = signal(props.checked.value !== undefined);
    // Internal tracking for uncontrolled selectable chips; seeded from default-checked.
    const checkedState = signal(!isControlled.value && props['default-checked'].value);

    watch(props.checked, (value) => {
      if (value !== undefined) {
        isControlled.value = true;
      }
    });

    // Effective checked value — reactive to checked prop changes in controlled mode.
    const isChecked = computed(() => {
      if (props.mode.value !== 'selectable') return false;

      if (isControlled.value) {
        return props.checked.value ?? false;
      }

      return checkedState.value;
    });

    bind({
      attr: {
        checked: () => (props.mode.value === 'selectable' && isChecked.value ? true : undefined),
      },
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

    const removeBtnLabel = () => {
      const label = props.label.value || props.value.value;

      return label ? `Remove ${label}` : 'Remove';
    };

    const renderRemoveButton = () => html`
      <button
        class="remove-btn"
        part="remove-btn"
        type="button"
        :aria-label="${removeBtnLabel}"
        ?hidden="${() => props.mode.value !== 'removable'}"
        :disabled="${props.disabled}"
        @click="${handleRemove}">
        <sg-icon name="x" size="12" stroke-width="2.5" aria-hidden="true"></sg-icon>
      </button>
    `;

    const renderSelectableChip = () => html`
      <button
        class="chip-btn"
        part="chip-btn"
        type="button"
        role="checkbox"
        :aria-checked="${() => String(isChecked.value)}"
        :aria-label="${props.label}"
        :disabled="${props.disabled}"
        @click="${handleSelectableActivate}">
        <span class="chip" part="chip"> ${renderChipContent()} </span>
      </button>
    `;

    const renderActionChip = () => html`
      <button
        class="chip-btn"
        part="chip-btn"
        type="button"
        :aria-label="${props.label}"
        :disabled="${props.disabled}"
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
    disabledStateMixin,
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
