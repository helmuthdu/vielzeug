import { define, defineEmits, defineProps, html, signal, watch } from '@vielzeug/craftit';

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
// Types
// ============================================

/** Chip component properties */
type ChipBaseProps = {
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

export type BitChipEvents = {
  change: { checked: boolean; originalEvent: Event; value: string | undefined };
  remove: { originalEvent: MouseEvent; value: string | undefined };
};

export type BitChipProps = ChipBaseProps & (StaticChipProps | RemovableChipProps | SelectableChipProps);

/**
 * A compact, styled label element. Supports icons, a remove button, colors, sizes, and variants.
 * Commonly used to represent tags, filters, or selected options in a multiselect field.
 *
 * @element bit-chip
 *
 * @attr {string}  color     - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string}  variant   - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string}  size      - Component size: 'sm' | 'md' | 'lg'
 * @attr {string}  rounded   - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string}  mode      - Interaction mode: 'static' | 'removable' | 'selectable'
 * @attr {boolean} disabled  - Disable the chip
 * @attr {string}  value     - Value included in emitted event detail
 * @attr {boolean} checked   - Controlled checked state for selectable chips
 * @attr {boolean} default-checked - Initial checked state for uncontrolled selectable chips
 *
 * @slot         - Chip label text
 * @slot icon    - Leading icon or decoration
 *
 * @fires remove - Fired when the remove button is clicked, with `detail.value` and `detail.originalEvent`
 * @fires change - Fired when a selectable chip toggles, with `detail.checked`, `detail.value`, and `detail.originalEvent`
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
 * <bit-chip color="primary">Design</bit-chip>
 * <bit-chip color="success" variant="flat" mode="removable" value="ts">TypeScript</bit-chip>
 * <bit-chip color="info" variant="flat" mode="selectable" default-checked value="ui">UI</bit-chip>
 * <bit-chip color="warning" variant="bordered">
 *   <svg slot="icon" ...></svg>
 *   Beta
 * </bit-chip>
 * ```
 */
export const CHIP_TAG = define('bit-chip', ({ host }) => {
  const props = defineProps<BitChipProps>({
    checked: { default: undefined },
    color: { default: undefined },
    'default-checked': { default: false },
    disabled: { default: false },
    mode: { default: 'static' },
    rounded: { default: undefined },
    size: { default: undefined },
    value: { default: undefined },
    variant: { default: undefined },
  });

  const emit = defineEmits<BitChipEvents>();

  const isSelectableMode = () => props.mode.value === 'selectable';
  const internalChecked = signal(false);
  const controlled = signal(false);

  const isControlled = () => controlled.value;

  const currentChecked = () => {
    if (!isSelectableMode()) return false;

    return isControlled() ? host.hasAttribute('checked') : internalChecked.value;
  };

  watch(
    [props.mode],
    () => {
      if (!isSelectableMode()) return;

      controlled.value = host.hasAttribute('checked');

      if (!controlled.value) {
        internalChecked.value = host.hasAttribute('default-checked');
      }
    },
    { immediate: true },
  );

  const syncCheckedAttr = () => {
    const mode = props.mode.value;

    if (mode !== 'selectable') {
      if (host.hasAttribute('checked')) host.removeAttribute('checked');

      return;
    }

    const effectiveChecked = currentChecked();
    const hasCheckedAttr = host.hasAttribute('checked');

    // Controlled selectable chips are source-of-truth via host checked attribute.
    if (isControlled()) return;

    if (effectiveChecked && !hasCheckedAttr) {
      host.setAttribute('checked', '');
    } else if (!effectiveChecked && hasCheckedAttr) {
      host.removeAttribute('checked');
    }
  };

  watch([props.mode, internalChecked], syncCheckedAttr, { immediate: true });

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();

    if (props.mode.value !== 'removable' || props.disabled.value) return;

    emit('remove', { originalEvent: e, value: props.value.value });
  }

  function handleSelectableActivate(e: MouseEvent) {
    if (props.mode.value !== 'selectable' || props.disabled.value) return;

    const nextChecked = !currentChecked();

    if (!isControlled()) {
      internalChecked.value = nextChecked;
    }

    emit('change', { checked: nextChecked, originalEvent: e, value: props.value.value });
  }

  return {
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
    template: html`
      ${() =>
        props.mode.value === 'selectable'
          ? html`
              <button
                class="chip-btn"
                part="chip-btn"
                type="button"
                role="checkbox"
                :aria-checked="${() => String(currentChecked())}"
                :disabled="${() => props.disabled.value}"
                @click="${handleSelectableActivate}">
                <span class="chip" part="chip">
                  <slot name="icon"></slot>
                  <span class="label"><slot></slot></span>
                </span>
              </button>
            `
          : html`
              <span class="chip" part="chip">
                <slot name="icon"></slot>
                <span class="label"><slot></slot></span>
                <button
                  class="remove-btn"
                  part="remove-btn"
                  type="button"
                  aria-label="Remove"
                  ?hidden="${() => props.mode.value !== 'removable'}"
                  :disabled="${() => props.disabled.value}"
                  @click="${handleRemove}">
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
                </button>
              </span>
            `}
    `,
  };
});
