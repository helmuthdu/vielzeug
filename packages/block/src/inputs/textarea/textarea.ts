import { define, defineField, effect, html, inject, live, onCleanup, onElement, prop, ref } from '@vielzeug/craft';

import type { TextFieldProps } from '../../shared/config';
import type { VisualVariant } from '../../types';

import {
  TEXTAREA_SIZE_PRESET,
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
import componentStyles from './textarea.css?inline';

/** Textarea component properties */

export type BitTextareaEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type BitTextareaProps = TextFieldProps<Exclude<VisualVariant, 'glass' | 'frost' | 'text'>> & {
  /** Allow auto-grow with content */
  'auto-resize'?: boolean;
  /** Maximum character count; shows a counter when set */
  maxlength?: number;
  /** Disable a manual resize handle */
  'no-resize'?: boolean;
  /** Resize direction override */
  resize?: 'none' | 'horizontal' | 'both' | 'vertical';
  /** Number of visible text rows */
  rows?: number;
};

/**
 * A multi-line text input with label, helper text, character counter, and auto-resize.
 *
 * @element bit-textarea
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
 * @attr {string} color - Theme color
 * @attr {string} variant - Visual variant
 * @attr {string} size - Component size
 * @attr {string} rounded - Border radius
 *
 * @fires input - Fired on every keystroke with current value
 * @fires change - Fired on blur with changed value
 *
 * @slot helper - Complex helper content
 *
 * @cssprop --border - Border token.
 * @cssprop --color-canvas - Base surface background color.
 * @cssprop --color-contrast-100 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-300 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-400 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-50 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-500 - Contrast color token for text and surfaces.
 * @cssprop --color-error - Error state color token.
 * @cssprop --color-error-focus-shadow - Focus ring shadow color.
 * @cssprop --color-primary-focus-shadow - Focus ring shadow color.
 * @cssprop --color-warning - Warning state color token.
 * @cssprop --font-medium - Font-weight token.
 * @example
 * ```html
 * <bit-textarea></bit-textarea>
 * ```
 */
export const TEXTAREA_TAG = define<BitTextareaProps, BitTextareaEvents>('bit-textarea', {
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
    required: prop.bool(false),
    resize: prop.string<'none' | 'both' | 'horizontal' | 'vertical'>(),
    rows: prop.json(undefined as number | undefined),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },
  setup(props, { bind, el: _el, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const textareaRef = ref<HTMLTextAreaElement>();

    const autoGrow = () => {
      if (!props['auto-resize'].value || !textareaRef.value) return;

      const textareaEl = textareaRef.value;

      textareaEl.style.height = 'auto';
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    };

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
        onRawInput: autoGrow,
        prefix: 'textarea',
        validateOn: formCtx?.validateOn,
        value: props.value,
      },
      defineField,
      onCleanup,
    );
    const { assistive, assistiveId, fieldId: textareaId } = tf;

    onElement(textareaRef, (textareaEl) => {
      const unwireEl = tf.wire(textareaEl);
      const syncLayout = effect(() => {
        textareaEl.style.resize =
          props['auto-resize'].value || props['no-resize'].value ? 'none' : props.resize.value || 'vertical';

        if (props['auto-resize'].value) {
          requestAnimationFrame(autoGrow);
        }
      });

      return () => {
        unwireEl();
        syncLayout();
      };
    });

    bind({
      attr: {
        error: () => (assistive.value.errorText ? assistive.value.errorText : undefined),
        size: fCtxProps.size,
        variant: fCtxProps.variant,
      },
    });

    const { aria, label } = tf;
    const counterClass = () =>
      assistive.value.counterAtLimit
        ? 'counter at-limit'
        : assistive.value.counterNearLimit
          ? 'counter near-limit'
          : 'counter';
    const counterHidden = () => !assistive.value.hasCounter;
    const counterText = () => assistive.value.counterText.replace(' / ', '/');
    const helperHidden = () => !assistive.value.errorText && !assistive.value.helperText;
    const helperText = () => assistive.value.errorText || assistive.value.helperText;

    return html`
      <div class="textarea-wrapper">
        <label
          class="label-outside"
          for="${textareaId}"
          id="${label.outside.id}"
          ?hidden="${() => !label.outside.show.value}"
          >${props.label}</label
        >
        <div class="field">
          <label
            class="label-inset"
            for="${textareaId}"
            id="${label.inset.id}"
            ?hidden="${() => !label.inset.show.value}"
            >${props.label}</label
          >
          <textarea
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
            :aria-describedby="${aria.describedBy}"
            :aria-errormessage="${aria.errorMessage}"
            :aria-invalid="${aria.invalid}"
            :aria-labelledby="${aria.labelledBy}"></textarea>
        </div>
        <span class="${counterClass}" aria-live="polite" ?hidden="${counterHidden}">${counterText}</span>
        <div id="${assistiveId}" class="helper-text" aria-live="polite" ?hidden="${helperHidden}">${helperText}</div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
    sizeVariantMixin(TEXTAREA_SIZE_PRESET),
    disabledLoadingMixin(),
    forcedColorsFocusMixin('textarea'),
    componentStyles,
  ],
});
