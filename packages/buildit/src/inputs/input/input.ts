import { define, defineField, html, inject, live, onCleanup, onElement, prop, ref, signal } from '@vielzeug/craftit';

import type { TextFieldProps } from '../../shared/config';
import type { InputType, VisualVariant } from '../../types';

import '../../content/icon/icon';
import {
  FIELD_SIZE_PRESET,
  disablableBundle,
  roundableBundle,
  sizableBundle,
  themableBundle,
} from '../../shared/config';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledLoadingMixin,
  forcedColorsFocusMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { useTextField } from '../shared/use-field';
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
export const INPUT_TAG = define<BitInputProps, BitInputEvents>('bit-input', {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...roundableBundle,
    autocomplete: prop.string(),
    clearable: prop.bool(false),
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    inputmode: prop.string<'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'>(),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    maxlength: prop.json(undefined as number | undefined),
    minlength: prop.json(undefined as number | undefined),
    name: prop.string(),
    pattern: prop.string(),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    required: prop.bool(false),
    type: prop.oneOf(VALID_INPUT_TYPES, 'text'),
    value: prop.string(),
    variant: prop.string<'flat' | 'text' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props, { emit, host }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(host, props, formCtx);
    const showPassword = signal(false);
    const inputRef = ref<HTMLInputElement>();

    const tf = useTextField(
      {
        disabled: fCtxProps.disabled,
        error: props.error,
        helper: props.helper,
        label: props.label,
        labelPlacement: props['label-placement'],
        maxLength: props.maxlength,
        onChange: (event, value) => {
          emit('change', { originalEvent: event, value });
        },
        onInput: (event, value) => {
          emit('input', { originalEvent: event, value });
        },
        prefix: 'input',
        validateOn: formCtx?.validateOn,
        value: props.value,
      },
      defineField,
      onCleanup,
    );
    const {
      assistive,
      assistiveId,
      clear: clearValue,
      errorId,
      fieldId: inputId,
      signal: abortSignal,
      value: fieldValue,
      wire,
    } = tf;

    onElement(inputRef, (el) => {
      wire(el, abortSignal);
    });

    const clear = (event?: Event): void => {
      clearValue(event);
      inputRef.value?.focus();
    };

    const resolvedInputType = (): string =>
      props.type.value === 'password' && showPassword.value ? 'text' : validateInputType(props.type.value);

    host.bind({
      attr: {
        error: () => (assistive.value.errorText ? assistive.value.errorText : undefined),
        'has-value': () => (fieldValue.value ? true : undefined),
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    const { aria, label } = tf;
    const passwordToggleLabel = () => (showPassword.value ? 'Hide password' : 'Show password');
    const passwordTogglePressed = () => String(showPassword.value);
    const passwordToggleIcon = () =>
      showPassword.value
        ? html`<bit-icon name="eye-off" size="14" stroke-width="2" aria-hidden="true"></bit-icon>`
        : html`<bit-icon name="eye" size="14" stroke-width="2" aria-hidden="true"></bit-icon>`;
    const helperHidden = () => !!assistive.value.errorText || !assistive.value.helperText;
    const helperText = () => assistive.value.helperText;
    const errorHidden = () => !assistive.value.errorText;
    const errorText = () => assistive.value.errorText;
    const counterNearLimit = () => (assistive.value.counterNearLimit && !assistive.value.counterAtLimit ? '' : null);
    const counterAtLimit = () => (assistive.value.counterAtLimit ? '' : null);
    const counterHidden = () => !assistive.value.hasCounter;
    const counterText = () => assistive.value.counterText;

    const togglePassword = () => {
      showPassword.value = !showPassword.value;
      inputRef.value?.focus();
    };

    return html`
      <div class="input-wrapper" part="wrapper">
        <label
          class="label-outside"
          for="${inputId}"
          id="${label.outside.id}"
          part="label"
          ?hidden="${() => !label.outside.show.value}"
          >${props.label}</label
        >
        <div class="field" part="field">
          <label
            class="label-inset"
            for="${inputId}"
            id="${label.inset.id}"
            part="label"
            ?hidden="${() => !label.inset.show.value}"
            >${props.label}</label
          >
          <div class="input-row" part="input-row">
            <slot name="prefix"></slot>
            <input
              part="input"
              id="${inputId}"
              :type="${resolvedInputType}"
              :name="${props.name}"
              :placeholder="${props.placeholder}"
              :autocomplete="${props.autocomplete}"
              :inputmode="${props.inputmode}"
              :maxlength="${props.maxlength}"
              :minlength="${props.minlength}"
              :pattern="${props.pattern}"
              ?disabled="${props.disabled}"
              ?readonly="${props.readonly}"
              ?required="${props.required}"
              :value="${live(fieldValue)}"
              :aria-labelledby="${aria.labelledBy}"
              :aria-describedby="${aria.describedBy}"
              :aria-errormessage="${aria.errorMessage}"
              :aria-invalid="${aria.invalid}"
              ref="${inputRef}" />
            <slot name="suffix"></slot>
            <button
              class="pwd-toggle-btn"
              part="pwd-toggle"
              type="button"
              :aria-label="${passwordToggleLabel}"
              :aria-pressed="${passwordTogglePressed}"
              tabindex="-1"
              @click="${togglePassword}">
              ${passwordToggleIcon}
            </button>
            <button aria-label="Clear" class="clear-btn" part="clear" tabindex="-1" type="button" @click="${clear}">
              <bit-icon aria-hidden="true" name="x" size="12" stroke-width="2.5"></bit-icon>
            </button>
          </div>
        </div>
        <div class="helper-text" id="${assistiveId}" part="helper" ?hidden="${helperHidden}">${helperText}</div>
        <div class="helper-text" id="${errorId}" role="alert" part="error" ?hidden="${errorHidden}">${errorText}</div>
        <div
          class="char-counter"
          part="char-counter"
          :data-near-limit="${counterNearLimit}"
          :data-at-limit="${counterAtLimit}"
          ?hidden="${counterHidden}">
          ${counterText}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    sizeVariantMixin(FIELD_SIZE_PRESET),
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
    disabledLoadingMixin(),
    forcedColorsFocusMixin('input'),
    componentStyles,
  ],
});
