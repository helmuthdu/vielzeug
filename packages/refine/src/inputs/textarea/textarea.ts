import { define, html, inject, prop, ref, bind, onCleanup, onElement, useEmit, watchEffect } from '@vielzeug/ore';
import { live } from '@vielzeug/ore/directives';
import { useField } from '@vielzeug/ore/forms';
import { computed } from '@vielzeug/ripple';

import type { TextFieldProps } from '../../shared';
import type { VisualVariant } from '../../types';

import { bindRefCallback, createAutoResize, lifecycleSignal, createTextField } from '../../headless';
import '../../content/icon/icon';
import { disablableBundle, roundableBundle, sizableBundle, TEXTAREA_SIZE_PRESET, themableBundle } from '../../shared';
import { fieldMixins, fieldVariantMixin, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import { errorAttr } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderFieldStatusRegion, renderStatusIcon } from '../shared/templates';
import componentStyles from './textarea.css?inline';

/** Textarea component properties */

export type OreTextareaEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type OreTextareaProps = TextFieldProps<Exclude<VisualVariant, 'frost' | 'text'>> & {
  /** Allow auto-grow with content */
  'auto-resize'?: boolean;
  /**
   * Shows an inline spinner inside the field and forces the inner `<textarea>` into
   * `disabled` for the duration — use while an async validation/submission request
   * is in flight to prevent double-submits.
   */
  loading?: boolean;
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
 * @attr {boolean} loading - Show an inline spinner and force the field disabled
 * @attr {boolean} success - Show an inline success check icon (suppressed while `error` is set)
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
 * @part status-icon - The inline error/success icon shown inside the field
 * @part spinner - The inline loading spinner shown inside the field while `loading`
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
 * <ore-textarea label="Bio" success></ore-textarea>
 * <ore-textarea label="Bio" loading></ore-textarea>
 * ```
 */
export const TEXTAREA_TAG = 'ore-textarea' as const;
define<OreTextareaProps>(TEXTAREA_TAG, {
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
    loading: prop.bool(false),
    maxlength: prop.json(undefined as number | undefined),
    name: prop.string(),
    'no-resize': prop.bool(false),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    ref: prop.data<((el: HTMLTextAreaElement | null) => void) | null>(),
    required: prop.bool(false),
    resize: prop.string<'none' | 'both' | 'horizontal' | 'vertical'>(),
    rows: prop.json(undefined as number | undefined),
    success: prop.bool(false),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props) {
    const emit = useEmit<OreTextareaEvents>();
    const watch = watchEffect;

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);

    const textareaRef = ref<HTMLTextAreaElement>();
    const autoResize = createAutoResize({ enabled: props['auto-resize'] });
    // `loading` behaves like a temporary `disabled` — see ore-input's identical computation.
    const isDisabled = computed(() => fCtxProps.disabled.value || props.loading.value);

    const abortSignal = lifecycleSignal(onCleanup);
    const tf = createTextField({
      disabled: isDisabled,
      error: props.error,
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
      prefix: 'textarea',
      readonly: props.readonly,
      required: props.required,
      signal: abortSignal,
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    tf.attachFormField(
      useField<string>({
        disabled: tf.disabled,
        onReset: () => {
          tf.reset();
          requestAnimationFrame(() => autoResize.recompute());
        },
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
      const unwireAutoResize = autoResize.wire(textareaEl);
      const unwireRef = bindRefCallback(props.ref, textareaEl);

      const stopLayoutEffect = watch(() => {
        textareaEl.style.resize =
          props['auto-resize'].value || props['no-resize'].value ? 'none' : props.resize.value || 'vertical';

        // Deferred a frame: on mount (or right after `auto-resize` flips true) the browser
        // hasn't necessarily finished laying out the textarea yet, so `scrollHeight` read
        // synchronously here could be stale.
        requestAnimationFrame(() => autoResize.recompute());
      });

      return () => {
        unwireRef();
        unwireEl();
        unwireAutoResize();
        stopLayoutEffect();
      };
    });

    bind({
      attr: {
        error: errorAttr(errorText),
        size: fCtxProps.size,
        // Reflects `success` only once `error` is confirmed empty — keeps the two host
        // attributes mutually exclusive even if a consumer sets both props at once.
        success: () => (props.success.value && !errorText.value ? true : undefined),
        variant: fCtxProps.variant,
      },
    });

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
            ?disabled="${isDisabled}"
            ?readonly="${props.readonly}"
            ?required="${props.required}"
            :value="${live(tf.value)}"
            :aria-describedby="${ariaDescribedBy}"
            :aria-errormessage="${ariaErrorMessage}"
            :aria-invalid="${ariaInvalid}"
            :aria-labelledby="${ariaLabelledBy}"
            :aria-busy="${() => (props.loading.value ? 'true' : null)}"></textarea>
          ${renderStatusIcon(errorText)}
          <span class="field-spinner" part="spinner" role="status" aria-label="Loading"></span>
        </div>
        ${renderFieldStatusRegion({ assistiveId, counter, errorId, errorText, helperText })}
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    ...fieldMixins,
    sizeVariantMixin(TEXTAREA_SIZE_PRESET),
    forcedColorsFocusMixin('textarea'),
    componentStyles,
    // Must come after `componentStyles` — see `ore-input`'s identical ordering note for why
    // (`@layer` precedence is fixed by which layer name is *first* referenced across this whole
    // array; `componentStyles` establishes `refine.base`, which this mixin's `refine.variants`
    // rules need to win over).
    fieldVariantMixin({ container: '.field', text: 'textarea', tokenPrefix: 'textarea' }),
  ],
});
