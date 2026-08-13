import { bind, define, getHost, html, live, onCleanup, onElement, prop, ref, useField, useSlots } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { bindRefCallback, createTextField, lifecycleSignal } from '../../core';
import type { TextFieldProps } from '../../shared';
import { disablableBundle, FIELD_SIZE_PRESET, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import type { InputType, VisualVariant } from '../../types';
import '../../content/icon/icon';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledLoadingMixin,
  fieldVariantMixin,
  forcedColorsFocusMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import { errorAttr } from '../shared/field-binding';
import { defineFieldValue, dispatchNativeFieldEvent, setFieldValue } from '../shared/native-field-event';
import { renderStatusIcon } from '../shared/templates';
import componentStyles from './input.css?inline';

/** Input component properties */

export type OreInputEvents = {
  change: Event;
  input: InputEvent;
};

export type OreInputProps = TextFieldProps<Exclude<VisualVariant, 'frost'>> & {
  /** Autocomplete hint */
  autocomplete?: string;
  /** Show a clear (×) button when the field has a value */
  clearable?: boolean;
  /** Virtual keyboard hint for mobile devices */
  inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /**
   * Shows an inline spinner inside the field and forces the inner `<input>` into
   * `disabled` for the duration — use while an async validation/submission request
   * is in flight (e.g. checking username availability) to prevent double-submits.
   */
  loading?: boolean;
  /** Maximum character length — shows a counter below the input */
  maxlength?: number;
  /** Minimum character length */
  minlength?: number;
  /** HTML pattern attribute for client-side validation */
  pattern?: string;
  /**
   * JS-only callback fired with the inner `<input>` element when it mounts,
   * and with `null` when it unmounts. Intended for composed components that
   * need imperative access to the raw input element.
   * Set as a JS property: `bitInput.ref = (el) => { ... }`.
   */
  ref?: ((el: HTMLInputElement | null) => void) | null;
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

/**
 * A customizable text input component with multiple variants, label placements, and form features.
 *
 * @element ore-input
 *
 * @attr {string} label - Label text
 * @attr {string} label-placement - Label placement: 'inset' | 'outside'
 * @attr {string} type - HTML input type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
 * @attr {string} value - Current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} name - Form field name
 * @attr {string} helper - Helper text displayed below the input (fallback when the `helper` slot is empty)
 * @attr {string} error - Error message — marks the field as invalid (fallback when the `error` slot is empty)
 * @attr {boolean} disabled - Disable input interaction
 * @attr {boolean} readonly - Make the input read-only
 * @attr {boolean} required - Mark the field as required
 * @attr {boolean} loading - Show an inline spinner and force the field disabled
 * @attr {boolean} success - Show an inline success check icon (suppressed while `error` is set)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires input - Emitted when input value changes (on every keystroke).
 * @fires change - Emitted when input loses focus with changed value.
 *
 * @slot prefix - Content before the input (e.g., icons)
 * @slot suffix - Content after the input (e.g., clear button, validation icon)
 * @slot label - Replaces the label text — slotted content takes precedence over the `label` prop
 * @slot helper - Replaces the helper text — slotted content takes precedence over the `helper` prop
 * @slot error - Replaces the error text — slotted content takes precedence over the `error` prop
 *
 * @part wrapper - The input wrapper element
 * @part label - The label element (inset or outside)
 * @part field - The field container element
 * @part input-row - The input row container element
 * @part input - The input element
 * @part status-icon - The inline error/success icon shown inside the field
 * @part spinner - The inline loading spinner shown inside the field while `loading`
 * @part helper - The helper text element
 *
 * @cssprop --input-bg - Background color
 * @cssprop --input-color - Text color
 * @cssprop --input-border-color - Border color
 * @cssprop --input-placeholder-color - Placeholder text color
 * @cssprop --input-radius - Border radius
 * @cssprop --input-padding - Inner padding (block inline)
 * @cssprop --input-gap - Gap between prefix/suffix icons and input text
 * @cssprop --input-font-size - Font size
 * @cssprop --input-height - Field height
 * @cssprop --input-hover-bg - Field background on hover (flat/ghost variants)
 * @cssprop --input-hover-border-color - Field border on hover (flat/bordered variants)
 * @cssprop --input-focus-bg - Field background when focused (flat variant)
 * @cssprop --input-focus-border-color - Field border when focused (flat/text variants)
 *
 * @example
 * ```html
 * <ore-input type="email" label="Email" placeholder="you@example.com" />
 * <ore-input label="Name" variant="bordered" color="primary" />
 * <ore-input label="Username" error="That username is taken" />
 * <ore-input label="Username" success />
 * <ore-input label="Username" loading />
 * ```
 */
export const INPUT_TAG = 'ore-input' as const;
define<OreInputProps>(INPUT_TAG, {
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
    loading: prop.bool(false),
    maxlength: prop.json(undefined as number | undefined),
    minlength: prop.json(undefined as number | undefined),
    name: prop.string(),
    pattern: prop.string(),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    ref: prop.data<((el: HTMLInputElement | null) => void) | null>(),
    required: prop.bool(false),
    success: prop.bool(false),
    type: prop.oneOf(VALID_INPUT_TYPES, 'text'),
    value: prop.string(),
    variant: prop.string<'flat' | 'text' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots();

    const showPassword = signal(false);
    const inputRef = ref<HTMLInputElement>();

    const hasLabel = computed(() => !!props.label.value || slots.has('label').value);
    // `loading` behaves like a temporary `disabled` — forces the inner <input> out of
    // constraint validation and interaction for the duration, layered on top of any real
    // `loading` is layered on top of the consumer's explicit `disabled` prop.
    const isDisabled = computed(() => props.disabled.value || props.loading.value);

    const abortSignal = lifecycleSignal(onCleanup);
    const tf = createTextField({
      disabled: isDisabled,
      error: props.error,
      hasLabel,
      helper: props.helper,
      label: props.label,
      labelPlacement: props['label-placement'],
      maxLength: props.maxlength,
      onChange: (_event: Event, value: string) => {
        setFieldValue(el, value);
        dispatchNativeFieldEvent(el, 'change');
      },
      onInput: (_event: Event, value: string) => {
        setFieldValue(el, value);
        dispatchNativeFieldEvent(el, 'input');
      },
      prefix: 'input',
      readonly: props.readonly,
      required: props.required,
      signal: abortSignal,
      value: props.value,
    });

    defineFieldValue(
      el,
      () => tf.value.value,
      (value) => {
        tf.value.value = value;
      },
    );

    tf.attachFormField(
      useField<string>({
        disabled: tf.disabled,
        onReset: tf.reset,
        toFormValue: (v) => v,
        validationMessage: tf.validationMessage,
        validity: tf.validity,
        value: tf.value,
      }),
    );

    const {
      ariaDescribedBy,
      ariaErrorMessage,
      ariaInvalid,
      ariaLabelledBy,
      assistiveId,
      clear: clearValue,
      counter,
      errorId,
      errorText,
      fieldId: inputId,
      helperText,
      labelId,
      labelVisible,
      value: fieldValue,
      wire,
    } = tf;

    onElement(inputRef, (el) => {
      wire(el, abortSignal);

      const unwireRef = bindRefCallback(props.ref, el);

      return () => {
        unwireRef();
      };
    });

    const clear = (event?: Event): void => {
      clearValue(event);
      inputRef.value?.focus();
    };

    const resolvedInputType = (): string =>
      props.type.value === 'password' && showPassword.value ? 'text' : (props.type.value ?? 'text');

    bind({
      attr: {
        error: errorAttr(errorText),
        'has-value': () => (fieldValue.value ? true : undefined),
        size: props.size,
        // Reflects `success` only once `error` is confirmed empty — keeps the two host
        // attributes mutually exclusive even if a consumer sets both props at once.
        success: () => (props.success.value && !errorText.value ? true : undefined),
        variant: props.variant,
      },
    });

    const labelHidden = () => !labelVisible.value;
    const passwordToggleLabel = () => (showPassword.value ? 'Hide password' : 'Show password');
    const passwordTogglePressed = () => String(showPassword.value);
    const passwordToggleIcon = () =>
      showPassword.value
        ? html`
            <ore-icon name="eye-off" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
          `
        : html`
            <ore-icon name="eye" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
          `;
    const helperHidden = () => !!errorText.value || !helperText.value;
    const errorHidden = () => !errorText.value;
    const counterNearLimit = () => (counter?.value.counterNearLimit && !counter?.value.counterAtLimit ? '' : null);
    const counterAtLimit = () => (counter?.value.counterAtLimit ? '' : null);
    const counterHidden = () => !counter;
    const counterText = () => counter?.value.counterText ?? '';

    const clearTabIndex = () => (fieldValue.value ? '0' : '-1');
    const pwdToggleTabIndex = () => (props.type.value === 'password' ? '0' : '-1');

    const togglePassword = () => {
      showPassword.value = !showPassword.value;
      inputRef.value?.focus();
    };

    return html`
      <div class="input-wrapper" part="wrapper">
        <label class="label" for="${inputId}" id="${labelId}" part="label" ?hidden="${labelHidden}">
          <slot name="label">${props.label}</slot>
        </label>
        <div class="field" part="field">
          <div class="input-row" part="input-row">
            <slot name="prefix"></slot>
            <input
              part="input"
              id="${inputId}"
              type="${resolvedInputType}"
              name="${props.name}"
              placeholder="${props.placeholder}"
              autocomplete="${props.autocomplete}"
              inputmode="${props.inputmode}"
              maxlength="${props.maxlength}"
              minlength="${props.minlength}"
              pattern="${props.pattern}"
              ?disabled="${isDisabled}"
              ?readonly="${props.readonly}"
              ?required="${props.required}"
              value="${live(fieldValue)}"
              aria-labelledby="${ariaLabelledBy}"
              aria-describedby="${ariaDescribedBy}"
              aria-errormessage="${ariaErrorMessage}"
              aria-invalid="${ariaInvalid}"
              aria-busy="${() => (props.loading.value ? 'true' : null)}"
              ref="${inputRef}" />
            <slot name="suffix"></slot>
            ${renderStatusIcon(errorText)}
            <span class="field-spinner" part="spinner" role="status" aria-label="Loading"></span>
            <button
              class="pwd-toggle-btn"
              part="pwd-toggle"
              type="button"
              aria-label="${passwordToggleLabel}"
              aria-pressed="${passwordTogglePressed}"
              tabindex="${pwdToggleTabIndex}"
              @click="${togglePassword}">
              ${passwordToggleIcon}
            </button>
            <button
              aria-label="Clear"
              class="clear-btn"
              part="clear"
              type="button"
              tabindex="${clearTabIndex}"
              @click="${clear}">
              <ore-icon aria-hidden="true" name="x" size="12" stroke-width="2.5"></ore-icon>
            </button>
          </div>
        </div>
        <div class="helper-text" aria-live="polite" id="${assistiveId}" part="helper" ?hidden="${helperHidden}">
          <slot name="helper">${() => helperText.value}</slot>
        </div>
        <div class="helper-text" id="${errorId}" role="alert" part="error" ?hidden="${errorHidden}">
          <slot name="error">${() => errorText.value}</slot>
        </div>
        <div
          class="char-counter"
          part="char-counter"
          data-near-limit="${counterNearLimit}"
          data-at-limit="${counterAtLimit}"
          ?hidden="${counterHidden}">
          ${counterText}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
    disabledLoadingMixin,
    sizeVariantMixin(FIELD_SIZE_PRESET),
    forcedColorsFocusMixin('input'),
    componentStyles,
    // Must come after `componentStyles` — `@layer` precedence is fixed by which layer name is
    // *first* referenced across this whole array, and `componentStyles` is what establishes
    // `refine.base` (the unconditional `--_bg`/`--_border-color` defaults this mixin's
    // `refine.variants` rules need to win over). Placed earlier, `refine.variants` would end up
    // registered as the *lower*-priority layer, and every variant would silently render as the
    // base default — exactly the bug this ordering fixes.
    fieldVariantMixin({ container: '.field', text: 'input', tokenPrefix: 'input' }),
  ],
});
