import { define, useField, html, inject, prop, ref } from '@vielzeug/ore';
import { live } from '@vielzeug/ore/directives';
import { watch as rippleWatch } from '@vielzeug/ripple';

import type { TextFieldProps } from '../../shared';
import type { VisualVariant } from '../../types';

import { lifecycleSignal, createTextField } from '../../headless';
import { disablableBundle, roundableBundle, sizableBundle, TEXTAREA_SIZE_PRESET, themableBundle } from '../../shared';
import { fieldMixins, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './textarea.css?inline';

/** Textarea component properties */

export type OreTextareaEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type OreTextareaProps = TextFieldProps<Exclude<VisualVariant, 'frost' | 'text'>> & {
  /** Allow auto-grow with content */
  'auto-resize'?: boolean;
  /** Maximum character count; shows a counter when set */
  maxlength?: number;
  /** Disable a manual resize handle */
  'no-resize'?: boolean;
  /**
   * JS-only callback fired with the inner `<textarea>` element when it mounts,
   * and with `null` when it unmounts. Intended for composed components that
   * need imperative access to the raw element.
   * Set as a JS property: `bitTextarea.ref = (el) => { ... }`.
   */
  ref?: ((el: HTMLTextAreaElement | null) => void) | null;
  /** Resize direction override */
  resize?: 'none' | 'horizontal' | 'both' | 'vertical';
  /** Number of visible text rows */
  rows?: number;
};

/**
 * A multi-line text input with label, helper text, character counter, and auto-resize.
 *
 * @element ore-textarea
 *
 * @attr {string} label - Label text
 * @attr {string} label-placement - 'inset' | 'outside'
 * @attr {string} value - Current value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} name - Form field name
 * @attr {number} rows - Visible row count
 * @attr {number} maxlength - Max character count (shows counter)
 * @attr {string} helper - Helper text below the textarea
 * @attr {string} error - Error message
 * @attr {boolean} disabled - Disable interaction
 * @attr {boolean} readonly - Read-only mode
 * @attr {boolean} required - Required field
 * @attr {boolean} no-resize - Disable manual resize
 * @attr {boolean} auto-resize - Grow with content
 * @attr {string} resize - Resize direction: 'none' | 'horizontal' | 'both' | 'vertical'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires input - Fired on every keystroke with current value. detail: { value: string; originalEvent: Event }
 * @fires change - Fired on blur with changed value. detail: { value: string; originalEvent: Event }
 *
 * @slot helper - Complex helper content
 *
 * @cssprop --textarea-bg - Background color
 * @cssprop --textarea-border-color - Border color
 * @cssprop --textarea-placeholder-color - Placeholder text color
 * @cssprop --textarea-radius - Border radius
 * @cssprop --textarea-padding - Inner padding (block inline)
 * @cssprop --textarea-gap - Gap between label and field
 * @cssprop --textarea-font-size - Font size
 * @cssprop --textarea-min-height - Minimum field height
 * @cssprop --textarea-max-height - Maximum field height (none = unlimited)
 * @cssprop --textarea-resize - CSS resize direction ('vertical' | 'horizontal' | 'both' | 'none')
 * @cssprop --textarea-hover-bg - Field background on hover (flat/ghost variants)
 * @cssprop --textarea-hover-border-color - Field border on hover (flat/bordered variants)
 * @cssprop --textarea-focus-bg - Field background when focused (flat variant)
 * @cssprop --textarea-focus-border-color - Field border when focused (flat variant)
 *
 * @part wrapper - Outer wrapper element.
 * @part label - Label element.
 * @part field - Field container.
 * @part textarea - The native `<textarea>` element.
 * @part helper - The helper text element.
 * @part error - The error text element (`role="alert"`).
 *
 * @example
 * ```html
 * <ore-textarea></ore-textarea>
 * ```
 */
export const TEXTAREA_TAG = 'ore-textarea' as const;
define<OreTextareaProps, OreTextareaEvents>(TEXTAREA_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...roundableBundle,
    'auto-resize': prop.bool(false),
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    maxlength: prop.json(undefined as number | undefined),
    name: prop.string(),
    'no-resize': prop.bool(false),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    ref: prop.json(undefined as ((el: HTMLTextAreaElement | null) => void) | null | undefined),
    required: prop.bool(false),
    resize: prop.string<'none' | 'both' | 'horizontal' | 'vertical'>(),
    rows: prop.json(undefined as number | undefined),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props, { bind, emit, onCleanup, onElement, watch }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const textareaRef = ref<HTMLTextAreaElement>();

    const autoGrow = () => {
      if (!props['auto-resize'].value || !textareaRef.value) return;

      const textareaEl = textareaRef.value;

      textareaEl.style.height = 'auto';
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    };

    const abortSignal = lifecycleSignal(onCleanup);
    let _formField: { reportValidity(): void } | null = null;
    const tf = createTextField({
      disabled: fCtxProps.disabled,
      error: props.error,
      getFormField: () => _formField,
      helper: props.helper,
      label: props.label,
      labelPlacement: props['label-placement'],
      maxLength: props.maxlength,
      onBeforeInput: autoGrow,
      onChange: (event: Event, value: string) => {
        emit('change', { originalEvent: event, value });
      },
      onInput: (event: Event, value: string) => {
        emit('input', { originalEvent: event, value });
      },
      prefix: 'textarea',
      signal: abortSignal,
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    _formField = useField<string>({ disabled: tf.disabled, toFormValue: (v) => v, value: tf.value });

    const {
      ariaDescribedBy,
      ariaErrorMessage,
      ariaInvalid,
      ariaLabelledBy,
      assistiveId,
      counter,
      errorId,
      errorText,
      fieldId: textareaId,
      helperText,
      labelId,
      labelVisible,
    } = tf;

    onElement(textareaRef, (textareaEl) => {
      const unwireEl = tf.wire(textareaEl);

      props.ref.value?.(textareaEl);

      const sub = rippleWatch(props.ref, (cb) => {
        cb?.(textareaEl);
      });

      const stopLayoutEffect = watch(() => {
        textareaEl.style.resize =
          props['auto-resize'].value || props['no-resize'].value ? 'none' : props.resize.value || 'vertical';

        if (props['auto-resize'].value) {
          requestAnimationFrame(autoGrow);
        }
      });

      return () => {
        sub.dispose();
        props.ref.value?.(null);
        unwireEl();
        stopLayoutEffect();
      };
    });

    bind({
      attr: {
        error: () => errorText.value || undefined,
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    const counterClass = () =>
      counter?.value.counterAtLimit
        ? 'counter at-limit'
        : counter?.value.counterNearLimit
          ? 'counter near-limit'
          : 'counter';
    const counterHidden = () => !counter;
    const counterText = () => counter?.value.counterText.replace(' / ', '/') ?? '';
    const helperHidden = () => !!errorText.value || !helperText.value;
    const errorHidden = () => !errorText.value;

    return html`
      <div class="textarea-wrapper" part="wrapper">
        <label class="label" part="label" for="${textareaId}" id="${labelId}" ?hidden="${() => !labelVisible.value}"
          >${props.label}</label
        >
        <div class="field" part="field">
          <textarea
            part="textarea"
            ref="${textareaRef}"
            id="${textareaId}"
            :name="${props.name}"
            :placeholder="${props.placeholder}"
            :rows="${props.rows}"
            :maxlength="${props.maxlength}"
            ?disabled="${props.disabled}"
            ?readonly="${props.readonly}"
            ?required="${props.required}"
            :value="${live(tf.value)}"
            :aria-describedby="${ariaDescribedBy}"
            :aria-errormessage="${ariaErrorMessage}"
            :aria-invalid="${ariaInvalid}"
            :aria-labelledby="${ariaLabelledBy}"></textarea>
        </div>
        <span class="${counterClass}" aria-live="polite" ?hidden="${counterHidden}">${counterText}</span>
        <div id="${assistiveId}" class="helper-text" aria-live="polite" part="helper" ?hidden="${helperHidden}">
          ${() => helperText.value}
        </div>
        <div id="${errorId}" class="helper-text" role="alert" part="error" ?hidden="${errorHidden}">
          ${() => errorText.value}
        </div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [...fieldMixins, sizeVariantMixin(TEXTAREA_SIZE_PRESET), forcedColorsFocusMixin('textarea'), componentStyles],
});
