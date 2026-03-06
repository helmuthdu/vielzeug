import {
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  effect,
  field,
  handle,
  html,
  onFormReset,
  onMount,
  ref,
  signal,
} from '@vielzeug/craftit';
import {
  colorThemeMixin,
  disabledLoadingMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ComponentSize, InputType, RoundedSize, ThemeColor, VisualVariant } from '../../types';

const componentStyles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_font-size: var(--input-font-size, var(--text-sm));
      --_gap: var(--input-gap, var(--size-2));
      --_padding: var(--input-padding, var(--size-1-5) var(--size-3));
      --_radius: var(--input-radius, var(--rounded-md));
      --_placeholder: var(--input-placeholder-color, var(--color-contrast-500));
      --_bg: var(--input-bg, var(--color-contrast-100));
      --_border-color: var(--input-border-color, var(--color-contrast-300));

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      width: 100%;
    }

    .field {
      align-items: stretch;
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border) solid var(--_border-color);
      box-shadow: var(--_shadown, var(--shadow-2xs));
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0;
      justify-content: center;
      min-height: var(--size-10);
      padding: var(--_padding);
      transition:
        background var(--transition-fast),
        backdrop-filter var(--transition-slow),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: var(--_gap);
      flex: 1;
    }

    /* ========================================
       Label Styles
       ======================================== */

    .label-inset,
    .label-outside,
    label.label-inset,
    label.label-outside {
      color: var(--color-contrast-500);
      cursor: pointer;
      font-weight: var(--font-medium);
      transition: color var(--transition-fast);
      user-select: none;
    }

    .label-inset,
    label.label-inset {
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      margin-bottom: 2px;
    }

    .label-outside,
    label.label-outside {
      font-size: var(--text-sm);
      line-height: var(--leading-none);
    }

    /* ========================================
       Helper Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
    }

    /* ========================================
       Slotted Prefix/Suffix Icons
       ======================================== */

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      align-items: center;
      color: var(--color-contrast-500);
      display: inline-flex;
      font-size: var(--size-4);
      justify-content: center;
      opacity: 0.8;
      transition: color var(--transition-fast);
      user-select: none;
    }

    /* ========================================
       Input Element
       ======================================== */

    input {
      /* No all: unset needed - reset layer handles it */
      color: var(--_theme-content);
      flex: 1;
      font: inherit;
      font-size: var(--_font-size);
      line-height: var(--leading-normal);
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
    }

    input::placeholder {
      color: var(--_placeholder);
      transition: color var(--transition-fast);
    }

    input:focus-visible {
      outline: none;
    }

    /* ========================================
       Hover & Focus States
       ======================================== */

    :host(:not([disabled]):not([variant='bordered']):not([variant='flat'])) .field:hover {
      border-color: var(--color-contrast-400);
    }

    :host(:not([disabled]):not([variant='text']):not([variant='flat'])) .field:focus-within {
      background: var(--color-canvas);
      border-color: var(--_theme-focus);
      box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
      transform: translateY(-1px);
    }

    :host(:not([disabled])) .field:focus-within .label-inset,
    :host(:not([disabled])) .field:focus-within .label-outside {
      color: var(--_theme-focus);
    }

    :host(:not([disabled])) .field:focus-within ::slotted([slot='prefix']),
    :host(:not([disabled])) .field:focus-within ::slotted([slot='suffix']) {
      color: var(--_theme-focus);
    }

    /* ========================================
       Error State
       ======================================== */

    :host([error]) .field {
      border-color: var(--color-error);
    }

    :host([error]) .field:focus-within {
      border-color: var(--color-error);
      box-shadow: var(--color-error-focus-shadow);
    }

    :host([error]) .label-inset,
    :host([error]) .label-outside {
      color: var(--color-error);
    }
  }


  @layer buildit.variants {
    /* ========================================
       Visual Variants
       ======================================== */

    /* Solid (Default) - Standard input with background */
    :host(:not([variant])) .field,
    :host([variant='solid']) .field {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    /* Flat - Minimal with subtle color hint */
    :host([variant='flat']) .field {
      border-color: var(--_theme-border);
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) .field:hover {
      background: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
      border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
    }

    :host([variant='flat']) .field:focus-within {
      background: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
      border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered - Filled with theme color */
    :host([variant='bordered']) .field {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) input {
      color: var(--_theme-content);
    }

    :host([variant='bordered']) input::placeholder {
      color: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    }

    :host([variant='bordered']) .field:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline - Transparent background */
    :host([variant='outline']) .field {
      background: transparent;
      box-shadow: none;
    }

    /* Ghost - Transparent until hover */
    :host([variant='ghost']) .field {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .field:hover {
      background: var(--color-contrast-100);
    }

    /* Text - Underline style */
    :host([variant='text']) .field {
      background: transparent;
      border: none;
      border-bottom: var(--border) solid var(--_border-color);
      border-radius: 0;
      box-shadow: none;
    }

    :host([variant='text']) .field:focus-within {
      border-bottom: var(--border-2) solid var(--_theme-focus);
      transform: none;
    }
  }

  @layer buildit.utilities {
    /* Full width */
    :host([fullwidth]) {
      width: 100%;
    }
  }
`;

/** Input component properties */
export type InputProps = {
  /** Label text */
  label?: string;
  /** Label placement */
  'label-placement'?: 'inset' | 'outside';
  /** Theme color */
  color?: ThemeColor;
  /** Disable input interaction */
  disabled?: boolean;
  /** Helper text displayed below the input */
  helper?: string;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Form field name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Make the input read-only */
  readonly?: boolean;
  /** Mark the field as required */
  required?: boolean;
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Input size */
  size?: ComponentSize;
  /** HTML input type */
  type?: InputType;
  /** Current input value */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'frost'>;
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
};

const VALID_INPUT_TYPES = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'] as const;

const validateInputType = (type: string | null): string => {
  return VALID_INPUT_TYPES.includes(type as (typeof VALID_INPUT_TYPES)[number]) ? type! : 'text';
};

/**
 * A customizable text input component with multiple variants, label placements, and form features.
 *
 * @element bit-input
 *
 * @attr {string} label - Label text
 * @attr {string} label-placement - Label placement: 'inset' | 'outside'
 * @attr {string} type - HTML input type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
 * @attr {string} value - Current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} name - Form field name
 * @attr {string} helper - Helper text displayed below the input
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {boolean} disabled - Disable input interaction
 * @attr {boolean} readonly - Make the input read-only
 * @attr {boolean} required - Mark the field as required
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires input - Emitted when input value changes (on every keystroke)
 * @fires change - Emitted when input loses focus with changed value
 *
 * @slot prefix - Content before the input (e.g., icons)
 * @slot suffix - Content after the input (e.g., clear button, validation icon)
 * @slot helper - Complex helper content below the input
 *
 * @part wrapper - The input wrapper element
 * @part label - The label element (inset or outside)
 * @part field - The field container element
 * @part input-row - The input row container element
 * @part input - The input element
 * @part helper - The helper text element
 *
 * @cssprop --input-bg - Background color
 * @cssprop --input-color - Text color
 * @cssprop --input-border-color - Border color
 * @cssprop --input-focus - Focus border color
 * @cssprop --input-placeholder-color - Placeholder text color
 * @cssprop --input-radius - Border radius
 * @cssprop --input-padding - Inner padding (vertical horizontal)
 * @cssprop --input-gap - Gap between prefix/suffix and input
 * @cssprop --input-font-size - Font size
 *
 * @example
 * ```html
 * <bit-input type="email" label="Email" placeholder="you@example.com" />
 * <bit-input label="Name" variant="bordered" color="primary" />
 * ```
 */
define(
  'bit-input',
  () => {
    const emit = defineEmits<{
      change: { originalEvent: Event; value: string };
      input: { originalEvent: Event; value: string };
    }>();
    const props = defineProps({
      color: { default: undefined as ThemeColor | undefined },
      disabled: { default: false },
      error: { default: '' },
      fullwidth: { default: false },
      helper: { default: '' },
      label: { default: '' },
      'label-placement': { default: 'inset' },
      name: { default: '' },
      placeholder: { default: '' },
      readonly: { default: false },
      required: { default: false },
      rounded: { default: undefined as RoundedSize | undefined },
      size: { default: undefined as ComponentSize | undefined },
      type: { default: 'text' as InputType },
      value: { default: '' },
      variant: { default: undefined as Exclude<VisualVariant, 'glass' | 'frost'> | undefined },
    });

    const valueSignal = signal('');

    field({
      disabled: computed(() => props.disabled.value),
      value: valueSignal,
    });

    onFormReset(() => {
      valueSignal.value = '';
    });

    // Stable accessibility IDs (generated once)
    const inputId = props.name.value ? `input-${props.name.value}` : createId('input');
    const labelId = `label-${inputId}`;
    const helperId = `helper-${inputId}`;
    const errorId = `error-${inputId}`;

    // Refs
    const inputRef = ref<HTMLInputElement>();
    const labelInsetRef = ref<HTMLLabelElement>();
    const labelOutsideRef = ref<HTMLLabelElement>();
    const helperRef = ref<HTMLDivElement>();
    const errorRef = ref<HTMLDivElement>();

    onMount(() => {
      valueSignal.value = props.value.value;

      const stopEffects = effect(() => {
        const inp = inputRef.value;
        if (!inp) return;

        inp.type = validateInputType(props.type.value);
        inp.value = props.value.value;
        inp.name = props.name.value;
        inp.placeholder = props.placeholder.value;
        inp.disabled = props.disabled.value;
        inp.readOnly = props.readonly.value;
        inp.required = props.required.value;
        inp.setAttribute('aria-invalid', props.error.value ? 'true' : 'false');
        inp.setAttribute('aria-describedby', props.error.value ? errorId : helperId);
        if (props.error.value) {
          inp.setAttribute('aria-errormessage', errorId);
        } else {
          inp.removeAttribute('aria-errormessage');
        }

        // Label visibility
        const placement = props['label-placement'].value;
        const labelText = props.label.value;
        if (labelInsetRef.value) {
          labelInsetRef.value.textContent = labelText;
          labelInsetRef.value.hidden = !labelText || placement !== 'inset';
        }
        if (labelOutsideRef.value) {
          labelOutsideRef.value.textContent = labelText;
          labelOutsideRef.value.hidden = !labelText || placement !== 'outside';
        }

        // Helper / error
        if (helperRef.value) {
          helperRef.value.textContent = props.helper.value;
          helperRef.value.hidden = !!props.error.value || !props.helper.value;
        }
        if (errorRef.value) {
          errorRef.value.textContent = props.error.value;
          errorRef.value.hidden = !props.error.value;
        }
      });

      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        valueSignal.value = target.value;
        emit('input', { originalEvent: e, value: target.value });
      };

      const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        valueSignal.value = target.value;
        emit('change', { originalEvent: e, value: target.value });
      };

      if (inputRef.value) {
        handle(inputRef.value, 'input', handleInput);
        handle(inputRef.value, 'change', handleChange);
      }

      return () => stopEffects();
    });

    return {
      styles: [
        sizeVariantMixin({
          lg: { '--_padding': 'var(--size-2-5) var(--size-3-5)', fontSize: 'var(--text-base)', gap: 'var(--size-2-5)' },
          sm: { '--_padding': 'var(--size-1) var(--size-2)', fontSize: 'var(--text-xs)', gap: 'var(--size-1-5)' },
        }),
        roundedVariantMixin,
        colorThemeMixin,
        disabledLoadingMixin(),
        componentStyles,
      ],
      template: html` <div class="input-wrapper" part="wrapper">
        <label
          class="label-outside"
          for="${inputId}"
          id="${labelId}"
          part="label"
          ref=${labelOutsideRef}
          hidden></label>
        <div class="field" part="field">
          <label class="label-inset" for="${inputId}" id="${labelId}" part="label" ref=${labelInsetRef} hidden></label>
          <div class="input-row" part="input-row">
            <slot name="prefix"></slot>
            <input
              part="input"
              id="${inputId}"
              aria-labelledby="${labelId}"
              aria-describedby="${helperId}"
              ref=${inputRef} />
            <slot name="suffix"></slot>
          </div>
        </div>
        <div class="helper-text" id="${helperId}" part="helper" ref=${helperRef} hidden></div>
        <div
          class="helper-text"
          id="${errorId}"
          role="alert"
          style="color: var(--color-error);"
          part="error"
          ref=${errorRef}
          hidden></div>
      </div>`,
    };
  },
  { formAssociated: true },
);

export default {};
