import { css, define, defineEmits, defineProps, html, signal, watch } from '@vielzeug/craftit';
import {
  colorThemeMixin,
  disabledStateMixin,
  forcedColorsMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';
import type { AddEventListeners, BitChipEvents, ChipChangeDetail, ChipRemoveDetail } from '../../types/events';

export type { BitChipEvents } from '../../types/events';

// ============================================
// Styles
// ============================================

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--chip-bg, var(--color-contrast-150, var(--color-contrast-100)));
      --_color: var(--chip-color, var(--color-contrast-800));
      --_border-color: var(--chip-border-color, transparent);
      --_radius: var(--chip-radius, var(--rounded-full));
      --_font-size: var(--chip-font-size, var(--text-sm));
      --_font-weight: var(--chip-font-weight, var(--font-medium));
      --_padding-x: var(--chip-padding-x, var(--size-2-5));
      --_padding-y: var(--chip-padding-y, var(--size-0-5));
      --_gap: var(--chip-gap, var(--size-1));

      display: inline-flex;
      align-items: center;
      max-width: 100%;
      vertical-align: middle;
    }

    .chip {
      align-items: center;
      background: var(--_bg);
      border: var(--border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-sizing: border-box;
      color: var(--_color);
      display: inline-flex;
      font-size: var(--_font-size);
      font-weight: var(--_font-weight);
      gap: var(--_gap);
      line-height: 1.2;
      max-width: 100%;
      padding: var(--_padding-y) var(--_padding-x);
      position: relative;
      transition:
        background var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);
      white-space: nowrap;
    }

    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ========================================
       Remove Button
       ======================================== */

    .remove-btn {
      align-items: center;
      background: color-mix(in srgb, currentColor 12%, transparent);
      border: none;
      border-radius: var(--_radius);
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      flex-shrink: 0;
      height: 1.35em;
      justify-content: center;
      margin-inline-end: calc(var(--size-2) * -1);
      margin-inline-start: var(--size-0-5);
      opacity: 0.7;
      padding: 0;
      transition:
        background var(--transition-fast),
        opacity var(--transition-fast);
      width: 1.35em;
    }

    .remove-btn:hover {
      background: color-mix(in srgb, currentColor 28%, transparent);
      opacity: 1;
    }

    .remove-btn:focus-visible {
      opacity: 1;
      outline: 2px solid currentColor;
      outline-offset: 1px;
    }

    /* ========================================
       Icon slot
       ======================================== */

    ::slotted([slot='icon']) {
      align-items: center;
      display: inline-flex;
      flex-shrink: 0;
      height: 1em;
      justify-content: center;
      width: 1em;
    }
    .chip-btn {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      margin: 0;
      padding: 0;
      text-align: inherit;
      width: 100%;
    }

    .chip-btn:disabled {
      cursor: not-allowed;
    }

    :host([mode='selectable'][checked]) .chip {
      outline: var(--border-2) solid var(--_theme-base, currentColor);
      outline-offset: -2px;
    }

    :host([mode='selectable']:not([disabled])) .chip {
      cursor: pointer;
    }

    .chip-btn:focus-visible .chip {
      outline: 2px solid var(--_theme-base, currentColor);
      outline-offset: 2px;
    }
  }

  @layer buildit.variants {
    /* Solid (Default) — full theme color fill */
    :host(:not([variant])) .chip,
    :host([variant='solid']) .chip {
      background: var(--_theme-base, var(--color-contrast-700));
      border-color: transparent;
      color: var(--_theme-contrast, var(--color-contrast-50));
    }

    /* Flat — subtle tint */
    :host([variant='flat']) .chip {
      background: color-mix(in srgb, var(--_theme-backdrop, var(--color-contrast-200)) 55%, transparent);
      border-color: transparent;
      color: var(--_theme-base, var(--color-contrast-800));
    }

    /* Bordered — backdrop fill with themed border */
    :host([variant='bordered']) .chip {
      background: var(--_theme-backdrop, var(--color-contrast-50));
      border-color: var(--_theme-border, var(--color-contrast-300));
      color: var(--_theme-base, var(--color-contrast-900));
    }

    :host([variant='bordered']) .remove-btn {
      background: var(--_theme-focus, var(--color-contrast-700));
      border: var(--border) solid var(--_theme-focus, var(--color-contrast-700));
      color: var(--_theme-backdrop, var(--color-contrast-50));
    }

    :host([variant='bordered']) .remove-btn:hover {
      background: color-mix(in srgb, var(--_theme-focus, var(--color-contrast-700)) 80%, black);
      opacity: 1;
    }

    /* Outline — transparent with colored border */
    :host([variant='outline']) .chip {
      background: transparent;
      border-color: var(--_theme-base, var(--color-contrast-400));
      color: var(--_theme-base, var(--color-contrast-900));
    }

    :host([variant='outline']) .remove-btn {
      background: var(--_theme-focus, var(--color-contrast-700));
      border: var(--border) solid var(--_theme-focus, var(--color-contrast-700));
      color: var(--_theme-backdrop, var(--color-contrast-50));
    }

    :host([variant='outline']) .remove-btn:hover {
      background: color-mix(in srgb, var(--_theme-focus, var(--color-contrast-700)) 80%, black);
      opacity: 1;
    }

    /* Ghost — transparent, no border */
    :host([variant='ghost']) .chip {
      background: transparent;
      border-color: transparent;
      color: var(--_theme-base, var(--color-contrast-900));
    }

    :host([variant='ghost']) .remove-btn {
      border: var(--border) solid var(--_theme-focus, var(--color-contrast-400));
    }

    :host([variant='ghost']) .remove-btn:hover {
      background: color-mix(in srgb, currentColor 15%, transparent);
    }
  }
`;

// ============================================
// Types
// ============================================

/** Chip component properties */
interface ChipBaseProps {
  /** Theme color */
  color?: ThemeColor;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
  /** Component size */
  size?: ComponentSize;
  /** Border radius override */
  rounded?: RoundedSize | '';
  /** Disable interactions */
  disabled?: boolean;
  /** Value associated with this chip — included in emitted event detail */
  value?: string;
}

/** Read-only presentation chip */
interface StaticChipProps {
  mode?: 'static';
}

/** Removable chip mode */
interface RemovableChipProps {
  mode: 'removable';
}

/** Selectable chip mode */
interface SelectableChipProps {
  mode: 'selectable';
  /** Controlled checked state for `mode="selectable"` */
  checked?: boolean | undefined;
  /** Initial checked state for uncontrolled `mode="selectable"` */
  'default-checked'?: boolean;
}

export type ChipProps = ChipBaseProps & (StaticChipProps | RemovableChipProps | SelectableChipProps);

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
export const TAG = define('bit-chip', ({ host }) => {
  const props = defineProps<ChipProps>({
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

  const emit = defineEmits<{
    remove: ChipRemoveDetail;
    change: ChipChangeDetail;
  }>();

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
                @click="${handleSelectableActivate}"
              >
                <span
                  class="chip"
                  part="chip"
                >
                  <slot name="icon"></slot>
                  <span class="label"><slot></slot></span>
                </span>
              </button>
            `
          : html`
              <span
                class="chip"
                part="chip"
              >
                <slot name="icon"></slot>
                <span class="label"><slot></slot></span>
                <button
                  class="remove-btn"
                  part="remove-btn"
                  type="button"
                  aria-label="Remove"
                  ?hidden="${() => props.mode.value !== 'removable'}"
                  :disabled="${() => props.disabled.value}"
                  @click="${handleRemove}"
                >
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
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            `}
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-chip': HTMLElement & ChipProps & AddEventListeners<BitChipEvents>;
  }
}
