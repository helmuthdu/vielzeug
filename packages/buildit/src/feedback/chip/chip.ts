import { computed, define, html, signal, type Signal, watch, defineProps, defineEmits } from '@vielzeug/craftit';

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

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
// Icons
// ============================================

// Small close icon for remove button (relative sizing for chip)
const CHIP_CLOSE_ICON = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    width="0.75em"
    height="0.75em"
    aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
`;

// ============================================
// Types
// ============================================

/** Chip component properties */
type ChipBaseProps = {
  /** Accessible label (required for icon-only chips) */
  'aria-label'?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Disable interactions */
  disabled?: boolean;
  /** Border radius override */
  rounded?: RoundedSize | '';
  /** Component size */
  size?: ComponentSize;
  /** Value associated with this chip — included in emitted event detail */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
};

/** Read-only presentation chip */
type StaticChipProps = {
  mode?: 'static';
};

/** Removable chip mode */
type RemovableChipProps = {
  mode: 'removable';
};

/** Selectable chip mode */
type SelectableChipProps = {
  /** Controlled checked state for `mode="selectable"` */
  checked?: boolean | undefined;
  /** Initial checked state for uncontrolled `mode="selectable"` */
  'default-checked'?: boolean;
  mode: 'selectable';
};

/** Action chip mode — behaves like a button, fires a click event without maintaining state */
type ActionChipProps = {
  mode: 'action';
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
 * @attr {string}  aria-label - Accessible label (required for icon-only chips)
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
 * <bit-chip color="error" mode="action" aria-label="Delete">
 *   <svg slot="icon" ...></svg>
 * </bit-chip>
 * ```
 */
export const CHIP_TAG = define(
  'bit-chip',
  ({ host }) => {
    const props = defineProps<BitChipProps>({
      'aria-label': { default: undefined },
      checked: { default: undefined },
      color: { default: undefined },
      'default-checked': { default: false, type: Boolean },
      disabled: { default: false, type: Boolean },
      mode: { default: 'static' },
      rounded: { default: undefined },
      size: { default: undefined },
      value: { default: undefined },
      variant: { default: undefined },
    });
    const emit = defineEmits<BitChipEvents>();

    // Typed accessor for checked — only present on SelectableChipProps, not in the full union keyof.
    const checkedProp = (props as Record<'checked', Signal<boolean | undefined>>)['checked'];
    // Typed accessor for aria-label — hyphenated key falls outside the union's keyof.
    const ariaLabelProp = (props as Record<'aria-label', Signal<string | undefined>>)['aria-label'];
    // ============================================
    // State Management
    // ============================================
    // Capture controlled mode at setup-time — once controlled, always controlled.
    // If the `checked` attribute is present in the initial HTML, the consumer drives state.
    const isControlled = host.hasAttribute('checked');
    // Internal tracking for uncontrolled selectable chips; seeded from default-checked.
    const checkedState = signal(!isControlled && host.hasAttribute('default-checked'));
    // Effective checked value — reactive to props.checked attribute changes in controlled mode.
    const isChecked = computed(() => {
      if (props.mode.value !== 'selectable') return false;

      if (isControlled) {
        void checkedProp.value; // subscribe so we re-evaluate when the attribute changes

        return host.hasAttribute('checked');
      }

      return checkedState.value;
    });

    // Sync the [checked] attribute for CSS selectors in uncontrolled mode.
    // Controlled chips have the attribute managed externally by the consumer.
    watch(
      [isChecked, props.mode],
      () => {
        if (!isControlled) {
          host.toggleAttribute('checked', props.mode.value === 'selectable' && isChecked.value);
        }
      },
      { immediate: true },
    );
    // ============================================
    // Event Handlers
    // ============================================
    function handleRemove(e: MouseEvent) {
      e.stopPropagation();

      if (props.disabled.value) return;

      // Button's disabled attribute prevents this from firing when disabled
      emit('remove', { originalEvent: e, value: props.value.value });
    }
    function handleSelectableActivate(e: MouseEvent) {
      e.stopPropagation();

      if (props.disabled.value) return;

      const nextChecked = !isChecked.value;

      if (!isControlled) {
        checkedState.value = nextChecked;
      }

      emit('change', { checked: nextChecked, originalEvent: e, value: props.value.value });
    }
    function handleActionClick(e: MouseEvent) {
      e.stopPropagation();

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
          const label = ariaLabelProp.value || props.value.value;

          return label ? `Remove ${label}` : 'Remove';
        }}"
        ?hidden="${() => props.mode.value !== 'removable'}"
        :disabled="${() => props.disabled.value}"
        @click="${handleRemove}">
        ${CHIP_CLOSE_ICON}
      </button>
    `;
    const renderSelectableChip = () => html`
      <button
        class="chip-btn"
        part="chip-btn"
        type="button"
        role="checkbox"
        :aria-checked="${() => String(isChecked.value)}"
        :aria-label="${() => ariaLabelProp.value}"
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
        :aria-label="${() => ariaLabelProp.value}"
        :disabled="${() => props.disabled.value}"
        @click="${handleActionClick}">
        <span class="chip" part="chip"> ${renderChipContent()} </span>
      </button>
    `;
    const renderStaticChip = () => html`
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

        return renderStaticChip();
      }}
    `;
  },
  {
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
  },
);
