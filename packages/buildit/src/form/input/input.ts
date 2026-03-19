import { defineComponent, effect, handle, html, onMount, ref, signal } from '@vielzeug/craftit/core';
import { attr } from '@vielzeug/craftit/directives';

import type { InputType, VisualVariant } from '../../types';
import type { TextFieldProps } from '../shared/base-props';

import { clearIcon, eyeIcon, eyeOffIcon } from '../../icons';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { useTextField } from '../shared/composables';
import { FIELD_SIZE_PRESET } from '../shared/design-presets';
import { setupFieldEvents, syncCounter, syncSplitAssistive } from '../shared/dom-sync';
import { parsePositiveNumber } from '../shared/utils';
import componentStyles from './input.css?inline';

/** Input component properties */

export type BitInputEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type BitInputProps = TextFieldProps<Exclude<VisualVariant, 'glass' | 'frost'>> & {
  /** Autocomplete hint */
  autocomplete?: string;
  /** Show a clear (×) button when the field has a value */
  clearable?: boolean;
  /** Virtual keyboard hint for mobile devices */
  inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /** Maximum character length — shows a counter below the input */
  maxlength?: number;
  /** Minimum character length */
  minlength?: number;
  /** HTML pattern attribute for client-side validation */
  pattern?: string;
  /** HTML input type */
  type?: InputType;
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

const validateInputType = (type: string | null | undefined): string => {
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
export const INPUT_TAG = defineComponent<BitInputProps, BitInputEvents>({
  formAssociated: true,
  props: {
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
  },
  setup({ emit, host, props }) {
    const showPassword = signal(false);

    const resolvedInputType = (): string =>
      props.type.value === 'password' && showPassword.value ? 'text' : validateInputType(props.type.value);

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

    const inputRef = ref<HTMLInputElement>();
    const helperRef = ref<HTMLDivElement>();
    const errorRef = ref<HTMLDivElement>();
    const clearBtnRef = ref<HTMLButtonElement>();
    const charCounterRef = ref<HTMLDivElement>();

    const syncOptionalAttr = (
      inp: HTMLInputElement,
      name: 'autocomplete' | 'inputmode' | 'pattern',
      value: string | null | undefined,
    ) => {
      if (value == null || value === '') inp.removeAttribute(name);
      else inp.setAttribute(name, value);
    };

    onMount(() => {
      const inp = inputRef.value;

      if (!inp) return;

      setupFieldEvents(inp, {
        onBlur: () => tf.triggerValidation('blur'),
        onChange: (e, value) => {
          emit('change', { originalEvent: e, value });
          tf.triggerValidation('change');
        },
        onInput: (e, value) => emit('input', { originalEvent: e, value }),
      });

      tf.mountLabelSync();

      effect(() => {
        const maxLen = parsePositiveNumber(props.maxlength.value);

        if (maxLen != null) inp.maxLength = maxLen;
        else inp.removeAttribute('maxlength');

        const minLen = parsePositiveNumber(props.minlength.value);

        if (minLen != null) inp.minLength = minLen;
        else inp.removeAttribute('minlength');

        syncOptionalAttr(inp, 'pattern', props.pattern.value ?? null);
        syncOptionalAttr(inp, 'inputmode', props.inputmode.value ?? null);

        const autocomplete = props.autocomplete.value;

        if (autocomplete == null || autocomplete === '') inp.removeAttribute('autocomplete');
        else inp.autocomplete = autocomplete as AutoFill;
      });

      syncSplitAssistive({
        error: () => props.error.value,
        errorRef,
        helper: () => props.helper.value,
        helperRef,
      });

      syncCounter({
        count: () => valueSignal.value.length,
        format: 'split',
        maxLength: () => props.maxlength.value,
        ref: charCounterRef,
      });

      effect(() => {
        if (valueSignal.value) host.setAttribute('has-value', '');
        else host.removeAttribute('has-value');
      });

      // TODO: migrate aria() on inner elements to a future useA11yField() composable
      // For now, keep the imperative aria() call inside onMount as-is
      import('@vielzeug/craftit').then(({ aria }) => {
        aria(inp, {
          describedby: () => (props.error.value ? errorId : helperId),
          errormessage: () => (props.error.value ? errorId : null),
          invalid: () => !!props.error.value,
        });
      });

      if (clearBtnRef.value) {
        handle(clearBtnRef.value, 'click', (e: MouseEvent) => {
          e.preventDefault();
          valueSignal.value = '';
          emit('input', { originalEvent: e, value: '' });
          emit('change', { originalEvent: e, value: '' });
          tf.triggerValidation('change');
          inputRef.value?.focus();
        });
      }
    });

    return html`
      <div class="input-wrapper" part="wrapper">
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
              ${attr({
                disabled: props.disabled,
                name: props.name,
                placeholder: props.placeholder,
                readOnly: props.readonly,
                required: props.required,
                type: resolvedInputType,
                value: valueSignal,
              })}
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
              @click="${() => {
                showPassword.value = !showPassword.value;
                inputRef.value?.focus();
              }}">
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
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    sizeVariantMixin(FIELD_SIZE_PRESET),
    ...formFieldMixins,
    disabledLoadingMixin(),
    forcedColorsFocusMixin('input'),
    componentStyles,
  ],
  tag: 'bit-input',
});
