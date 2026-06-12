import { define, defineField, html, inject, live, onCleanup, onElement, prop, ref, signal } from '@vielzeug/craft';
import { computed, watch } from '@vielzeug/ripple';

import type { TextFieldProps } from '../../shared';
import type { InputType, VisualVariant } from '../../types';

import { lifecycleSignal, createTextField } from '../../headless';
import { disablableBundle, FIELD_SIZE_PRESET, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import '../../content/icon/icon';
import { fieldMixins, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './input.css?inline';

/** Input component properties */

export type SgInputEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type SgInputProps = TextFieldProps<Exclude<VisualVariant, 'frost'>> & {
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
 * @element sg-input
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
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires input - Emitted when input value changes (on every keystroke). detail: { value: string; originalEvent: Event }
 * @fires change - Emitted when input loses focus with changed value. detail: { value: string; originalEvent: Event }
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
 * <sg-input type="email" label="Email" placeholder="you@example.com" />
 * <sg-input label="Name" variant="bordered" color="primary" />
 * ```
 */
export const INPUT_TAG = 'sg-input' as const;
define<SgInputProps, SgInputEvents>(INPUT_TAG, {
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
    ref: prop.json(undefined as ((el: HTMLInputElement | null) => void) | null | undefined),
    required: prop.bool(false),
    type: prop.oneOf(VALID_INPUT_TYPES, 'text'),
    value: prop.string(),
    variant: prop.string<'flat' | 'text' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props, { bind, el: _el, emit, slots }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const showPassword = signal(false);
    const inputRef = ref<HTMLInputElement>();

    const hasLabel = computed(() => !!props.label.value || slots.has('label').value);

    const abortSignal = lifecycleSignal(onCleanup);
    const tf = createTextField({
      disabled: fCtxProps.disabled,
      error: props.error,
      hasLabel,
      helper: props.helper,
      label: props.label,
      labelPlacement: props['label-placement'],
      maxLength: props.maxlength,
      onChange: (event: Event, value: string) => {
        emit('change', { originalEvent: event, value });
      },
      onInput: (event: Event, value: string) => {
        emit('input', { originalEvent: event, value });
      },
      prefix: 'input',
      signal: abortSignal,
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    tf.bindFormField(defineField<string>({ disabled: tf.disabled, toFormValue: (v) => v, value: tf.value }));

    const {
      ariaDescribedBy,
      ariaErrorMessage,
      ariaInvalid,
      ariaLabelledBy,
      assistive,
      assistiveId,
      clear: clearValue,
      counter,
      errorId,
      fieldId: inputId,
      labelId,
      labelVisible,
      value: fieldValue,
      wire,
    } = tf;

    onElement(inputRef, (el) => {
      wire(el, abortSignal);

      // Immediate fire for when the prop is already set on mount.
      props.ref.value?.(el);

      // Reactive watcher so that if props.ref is set *after* the inner
      // <input> mounts (e.g. parent sets it via a ref callback after render),
      // the new callback still receives the live element.
      const sub = watch(props.ref, (cb) => {
        cb?.(el);
      });

      return () => {
        sub.dispose();
        props.ref.value?.(null);
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
        error: () => (assistive.value.errorText ? assistive.value.errorText : undefined),
        'has-value': () => (fieldValue.value ? true : undefined),
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    const labelHidden = () => !labelVisible.value;
    const passwordToggleLabel = () => (showPassword.value ? 'Hide password' : 'Show password');
    const passwordTogglePressed = () => String(showPassword.value);
    const passwordToggleIcon = () =>
      showPassword.value
        ? html`<sg-icon name="eye-off" size="14" stroke-width="2" aria-hidden="true"></sg-icon>`
        : html`<sg-icon name="eye" size="14" stroke-width="2" aria-hidden="true"></sg-icon>`;
    const helperHidden = () => !!assistive.value.errorText || !assistive.value.helperText;
    const helperText = () => assistive.value.helperText;
    const errorHidden = () => !assistive.value.errorText;
    const errorText = () => assistive.value.errorText;
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
        <label class="label" for="${inputId}" id="${labelId}" part="label" ?hidden="${labelHidden}"
          ><slot name="label">${props.label}</slot></label
        >
        <div class="field" part="field">
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
              :aria-labelledby="${ariaLabelledBy}"
              :aria-describedby="${ariaDescribedBy}"
              :aria-errormessage="${ariaErrorMessage}"
              :aria-invalid="${ariaInvalid}"
              ref="${inputRef}" />
            <slot name="suffix"></slot>
            <button
              class="pwd-toggle-btn"
              part="pwd-toggle"
              type="button"
              :aria-label="${passwordToggleLabel}"
              :aria-pressed="${passwordTogglePressed}"
              :tabindex="${pwdToggleTabIndex}"
              @click="${togglePassword}">
              ${passwordToggleIcon}
            </button>
            <button
              aria-label="Clear"
              class="clear-btn"
              part="clear"
              type="button"
              :tabindex="${clearTabIndex}"
              @click="${clear}">
              <sg-icon aria-hidden="true" name="x" size="12" stroke-width="2.5"></sg-icon>
            </button>
          </div>
        </div>
        <div class="helper-text" aria-live="polite" id="${assistiveId}" part="helper" ?hidden="${helperHidden}">
          <slot name="helper">${helperText}</slot>
        </div>
        <div class="helper-text" id="${errorId}" role="alert" part="error" ?hidden="${errorHidden}">
          <slot name="error">${errorText}</slot>
        </div>
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
  styles: [...fieldMixins, sizeVariantMixin(FIELD_SIZE_PRESET), forcedColorsFocusMixin('input'), componentStyles],
});
