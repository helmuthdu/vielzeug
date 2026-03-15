import {
  aria,
  define,
  defineEmits,
  defineProps,
  effect,
  handle,
  html,
  onMount,
  ref,
  signal,
  syncDOMProps,
} from '@vielzeug/craftit';

import type { DisablableProps, InputType, RoundedSize, SizableProps, ThemableProps, VisualVariant } from '../../types';

import { clearIcon, eyeIcon, eyeOffIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { mountFormContextSync, useTextField } from '../../utils/use-text-field';
import componentStyles from './input.css?inline';

/** Input component properties */

export type BitInputEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type BitInputProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Autocomplete hint */
    autocomplete?: string;
    /** Show a clear (×) button when the field has a value */
    clearable?: boolean;
    /** Error message (marks field as invalid) */
    error?: string;
    /** Full width mode (100% of container) */
    fullwidth?: boolean;
    /** Helper text displayed below the input */
    helper?: string;
    /** Virtual keyboard hint for mobile devices */
    inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
    /** Label text */
    label?: string;
    /** Label placement */
    'label-placement'?: 'inset' | 'outside';
    /** Maximum character length — shows a counter below the input */
    maxlength?: number;
    /** Minimum character length */
    minlength?: number;
    /** Form field name */
    name?: string;
    /** HTML pattern attribute for client-side validation */
    pattern?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Make the input read-only */
    readonly?: boolean;
    /** Mark the field as required */
    required?: boolean;
    /** Border radius size */
    rounded?: RoundedSize | '';
    /** HTML input type */
    type?: InputType;
    /** Current input value */
    value?: string;
    /** Visual style variant */
    variant?: Exclude<VisualVariant, 'glass' | 'frost'>;
  };

const VALID_INPUT_TYPES = [
  'text',
  'email',
  'password',
  'search',
  'url',
  'tel',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
] as const;

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
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
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
export const INPUT_TAG = define(
  'bit-input',
  ({ host }) => {
    const emit = defineEmits<BitInputEvents>();
    const props = defineProps<BitInputProps>({
      autocomplete: { default: undefined },
      clearable: { default: false },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      fullwidth: { default: false },
      helper: { default: '' },
      inputmode: { default: undefined },
      label: { default: '' },
      'label-placement': { default: 'inset' },
      maxlength: { default: undefined },
      minlength: { default: undefined },
      name: { default: '' },
      pattern: { default: undefined },
      placeholder: { default: '' },
      readonly: { default: false },
      required: { default: false },
      rounded: { default: undefined },
      size: { default: undefined },
      type: { default: 'text' },
      value: { default: '' },
      variant: { default: undefined },
    });

    const showPassword = signal(false);

    // Shared text-field setup: value signal, form registration, IDs, label refs
    const tf = useTextField(props, 'input');
    const {
      errorId,
      fieldId: inputId,
      helperId,
      labelInsetId,
      labelInsetRef,
      labelOutsideId,
      labelOutsideRef,
      valueSignal,
    } = tf;

    function togglePasswordVisibility() {
      showPassword.value = !showPassword.value;
      inputRef.value?.focus();
    }

    // Input-specific refs
    const inputRef = ref<HTMLInputElement>();
    const helperRef = ref<HTMLDivElement>();
    const errorRef = ref<HTMLDivElement>();
    const clearBtnRef = ref<HTMLButtonElement>();
    const charCounterRef = ref<HTMLDivElement>();

    onMount(() => {
      const inp = inputRef.value;

      if (!inp) return;

      // Define event handlers
      const handleInput = (e: Event) => {
        if (e.target !== inp) return;

        valueSignal.value = inp.value;
        emit('input', { originalEvent: e, value: inp.value });
      };

      const handleChange = (e: Event) => {
        if (e.target !== inp) return;

        valueSignal.value = inp.value;
        emit('change', { originalEvent: e, value: inp.value });
        tf.triggerValidation('change');
      };

      const handleBlur = () => tf.triggerValidation('blur');

      // Attach event listeners
      handle(inp, 'input', handleInput);
      handle(inp, 'change', handleChange);
      handle(inp, 'blur', handleBlur);

      // Effect 1: label visibility (via shared composable)
      tf.mountLabelSync();

      // Effect 2: sync input element properties
      syncDOMProps(inp, {
        disabled: props.disabled,
        name: () => props.name.value || '',
        placeholder: props.placeholder,
        readOnly: props.readonly,
        required: props.required,
        type: () =>
          props.type.value === 'password' && showPassword.value ? 'text' : validateInputType(props.type.value),
        value: valueSignal,
      });
      // Sync optional input attributes that require conditional attribute removal
      effect(() => {
        const maxLen = props.maxlength.value != null ? Number(props.maxlength.value) : -1;

        if (maxLen > 0) inp.maxLength = maxLen;

        const minLen = props.minlength.value != null ? Number(props.minlength.value) : -1;

        if (minLen > 0) inp.minLength = minLen;

        if (props.pattern.value != null) inp.pattern = props.pattern.value;
        else inp.removeAttribute('pattern');

        if (props.inputmode.value != null) inp.inputMode = props.inputmode.value;
        else inp.removeAttribute('inputmode');

        if (props.autocomplete.value != null) inp.autocomplete = props.autocomplete.value as AutoFill;
        else inp.removeAttribute('autocomplete');
      });

      // Effect 3: sync helper and error text
      effect(() => {
        if (helperRef.value) {
          helperRef.value.textContent = props.helper.value;
          helperRef.value.hidden = !!props.error.value || !props.helper.value;
        }

        if (errorRef.value) {
          errorRef.value.textContent = props.error.value;
          errorRef.value.hidden = !props.error.value;
        }
      });

      // Effect 4: sync character counter
      effect(() => {
        if (!charCounterRef.value) return;

        const maxLen = props.maxlength.value != null ? Number(props.maxlength.value) : -1;

        if (maxLen > 0) {
          const len = valueSignal.value.length;

          charCounterRef.value.textContent = `${len} / ${maxLen}`;
          charCounterRef.value.hidden = false;
          charCounterRef.value.removeAttribute('data-near-limit');
          charCounterRef.value.removeAttribute('data-at-limit');

          if (len >= maxLen) charCounterRef.value.setAttribute('data-at-limit', '');
          else if (len >= maxLen * 0.9) charCounterRef.value.setAttribute('data-near-limit', '');
        } else {
          charCounterRef.value.hidden = true;
        }
      });

      // Effect 5: manage has-value attribute for clearable button visibility
      effect(() => {
        if (valueSignal.value) host.setAttribute('has-value', '');
        else host.removeAttribute('has-value');
      });

      // Effect 6: propagate form context size/variant/disabled to host
      mountFormContextSync(host, tf.formCtx, props);

      aria(inp, {
        describedby: () => (props.error.value ? errorId : helperId),
        errormessage: () => (props.error.value ? errorId : null),
        invalid: () => !!props.error.value,
      });

      // Clear button
      if (clearBtnRef.value) {
        clearBtnRef.value.addEventListener('click', (e: MouseEvent) => {
          e.preventDefault();
          valueSignal.value = '';
          emit('input', { originalEvent: e, value: '' });
          emit('change', { originalEvent: e, value: '' });
          tf.triggerValidation('change');
          inputRef.value?.focus();
        });
      }
    });

    return {
      styles: [
        sizeVariantMixin({
          lg: {
            '--_field-height': 'var(--size-12)',
            '--_padding': 'var(--size-2-5) var(--size-3-5)',
            fontSize: 'var(--text-base)',
            gap: 'var(--size-2-5)',
          },
          sm: {
            '--_field-height': 'var(--size-8)',
            '--_padding': 'var(--size-1) var(--size-2)',
            fontSize: 'var(--text-xs)',
            gap: 'var(--size-1-5)',
          },
        }),
        ...formFieldMixins,
        disabledLoadingMixin(),
        forcedColorsFocusMixin('input'),
        componentStyles,
      ],
      template: html` <div class="input-wrapper" part="wrapper">
        <label
          class="label-outside"
          for="${inputId}"
          id="${labelOutsideId}"
          part="label"
          ref=${labelOutsideRef}
          hidden></label>
        <div class="field" part="field">
          <label
            class="label-inset"
            for="${inputId}"
            id="${labelInsetId}"
            part="label"
            ref=${labelInsetRef}
            hidden></label>
          <div class="input-row" part="input-row">
            <slot name="prefix"></slot>
            <input
              part="input"
              id="${inputId}"
              :aria-labelledby="${() => (props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId)}"
              aria-describedby="${helperId}"
              ref=${inputRef} />
            <slot name="suffix"></slot>
            <button
              class="pwd-toggle-btn"
              part="pwd-toggle"
              type="button"
              :aria-label="${() => (showPassword.value ? 'Hide password' : 'Show password')}"
              :aria-pressed="${() => String(showPassword.value)}"
              tabindex="-1"
              @click="${togglePasswordVisibility}">
              ${() => (showPassword.value ? eyeOffIcon : eyeIcon)}
            </button>
            <button class="clear-btn" part="clear" type="button" aria-label="Clear" tabindex="-1" ref=${clearBtnRef}>
              ${clearIcon}
            </button>
          </div>
        </div>
        <div class="helper-text" id="${helperId}" part="helper" ref=${helperRef} hidden></div>
        <div class="helper-text" id="${errorId}" role="alert" part="error" ref=${errorRef} hidden></div>
        <div class="char-counter" part="char-counter" ref=${charCounterRef} hidden></div>
      </div>`,
    };
  },
  { formAssociated: true, shadow: { delegatesFocus: true } },
);
