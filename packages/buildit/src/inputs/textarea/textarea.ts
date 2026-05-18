import { define, effect, html, inject, live, onElement, prop, ref } from '@vielzeug/craftit';
import { createTextField } from '@vielzeug/craftit/controls';

import type { VisualVariant } from '../../types';
import type { TextFieldProps } from '../shared/base-props';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../shared/bundles';
import { TEXTAREA_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
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
  /** Disable manual resize handle */
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
    'auto-resize': false,
    error: { default: '' as string, reflect: false },
    fullwidth: false,
    helper: '',
    label: { default: '' },
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    maxlength: undefined,
    name: '',
    'no-resize': false,
    placeholder: { default: '' },
    readonly: false,
    required: false,
    resize: undefined,
    rows: undefined,
    value: '',
    variant: undefined,
  },
  setup(props, { emit, host }) {
    const formCtx = inject(FORM_CTX);

    mountFormContextSync(host.el, formCtx, props);

    const textareaRef = ref<HTMLTextAreaElement>();

    const autoGrow = () => {
      if (!props['auto-resize'].value || !textareaRef.value) return;

      const textareaEl = textareaRef.value;

      textareaEl.style.height = 'auto';
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    };

    const tf = createTextField({
      context: formCtx,
      disabled: props.disabled,
      elementRef: textareaRef,
      error: props.error,
      helper: props.helper,
      maxLength: props.maxlength,
      name: props.name,
      onChange: (event, value) => {
        emit('change', { originalEvent: event, value });
      },
      onInput: (event, value) => {
        emit('input', { originalEvent: event, value });
      },
      onInputExtra: autoGrow,
      prefix: 'textarea',
      value: props.value,
    });
    const { assistive, errorId, fieldId: textareaId, helperId, labelInsetId, labelOutsideId, value: fieldValue } = tf;

    onElement(textareaRef, (textareaEl) => {
      const syncLayout = effect(() => {
        textareaEl.style.resize =
          props['auto-resize'].value || props['no-resize'].value ? 'none' : props.resize.value || 'vertical';

        if (props['auto-resize'].value) {
          requestAnimationFrame(autoGrow);
        }
      });

      return syncLayout;
    });

    host.bind({
      attr: {
        error: () => (assistive.value.errorText ? assistive.value.errorText : undefined),
      },
    });

    const ariaDescribedBy = () => (assistive.value.errorText || assistive.value.helperText ? helperId : null);
    const ariaErrorMessage = () => (assistive.value.errorText ? errorId : null);
    const ariaInvalid = () => (assistive.value.errorText ? 'true' : null);
    const ariaLabelledBy = () => (props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId);
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
    const outsideLabelHidden = () => !props.label.value || props['label-placement'].value !== 'outside';
    const insetLabelHidden = () => !props.label.value || props['label-placement'].value !== 'inset';

    return () => html`
      <div class="textarea-wrapper">
        <label class="label-outside" for="${textareaId}" id="${labelOutsideId}" ?hidden="${outsideLabelHidden}"
          >${props.label}</label
        >
        <div class="field">
          <label class="label-inset" for="${textareaId}" id="${labelInsetId}" ?hidden="${insetLabelHidden}"
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
            :value="${live(fieldValue)}"
            :aria-describedby="${ariaDescribedBy}"
            :aria-errormessage="${ariaErrorMessage}"
            :aria-invalid="${ariaInvalid}"
            :aria-labelledby="${ariaLabelledBy}"></textarea>
        </div>
        <span class="${counterClass}" aria-live="polite" ?hidden="${counterHidden}">${counterText}</span>
        <div id="${helperId}" class="helper-text" aria-live="polite" ?hidden="${helperHidden}">${helperText}</div>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [
    ...formFieldMixins,
    sizeVariantMixin(TEXTAREA_SIZE_PRESET),
    disabledLoadingMixin(),
    forcedColorsFocusMixin('textarea'),
    componentStyles,
  ],
});
