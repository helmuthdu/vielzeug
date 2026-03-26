import { define, effect, html, inject, onElement, ref } from '@vielzeug/craftit';
import { createTextFieldControl } from '@vielzeug/craftit/controls';

import type { VisualVariant } from '../../types';
import type { TextFieldProps } from '../shared/base-props';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle, type PropBundle } from '../shared/bundles';
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

const textareaProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  ...roundableBundle,
  'auto-resize': false,
  error: { default: '' as string, omit: true },
  fullwidth: false,
  helper: '',
  label: '',
  'label-placement': 'inset',
  maxlength: undefined,
  name: '',
  'no-resize': false,
  placeholder: '',
  readonly: false,
  required: false,
  resize: undefined,
  rows: undefined,
  value: '',
  variant: undefined,
} satisfies PropBundle<BitTextareaProps>;

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
 */
export const TEXTAREA_TAG = define<BitTextareaProps, BitTextareaEvents>('bit-textarea', {
  formAssociated: true,
  props: textareaProps,
  setup({ emit, host, props }) {
    const formCtx = inject(FORM_CTX, undefined);

    mountFormContextSync(host.el, formCtx, props);

    const textareaRef = ref<HTMLTextAreaElement>();

    const autoGrow = () => {
      if (!props['auto-resize'].value || !textareaRef.value) return;

      const textareaEl = textareaRef.value;

      textareaEl.style.height = 'auto';
      textareaEl.style.height = `${textareaEl.scrollHeight}px`;
    };

    const tf = createTextFieldControl({
      context: formCtx,
      disabled: props.disabled,
      elementRef: textareaRef,
      error: props.error,
      helper: props.helper,
      label: props.label,
      labelPlacement: props['label-placement'],
      maxLength: props.maxlength,
      name: props.name,
      onChange: (event, value) => {
        emit('change', { originalEvent: event, value });
      },
      onInput: (event, value) => {
        emit('input', { originalEvent: event, value });
      },
      onInputExtra: autoGrow,
      placeholder: props.placeholder,
      prefix: 'textarea',
      readOnly: props.readonly,
      required: props.required,
      rows: props.rows,
      value: props.value,
    });
    const {
      assistive,
      attrs: textareaAttrs,
      errorId,
      fieldId: textareaId,
      helperId,
      labelInsetId,
      labelInsetRef,
      labelOutsideId,
      labelOutsideRef,
    } = tf;

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

    return html`
      <div class="textarea-wrapper">
        <label class="label-outside" for="${textareaId}" id="${labelOutsideId}" ref=${labelOutsideRef} hidden></label>
        <div class="field">
          <label class="label-inset" for="${textareaId}" id="${labelInsetId}" ref=${labelInsetRef} hidden></label>
          <textarea
            ref=${textareaRef}
            id="${textareaId}"
            ${textareaAttrs}
            :aria-describedby="${() => (assistive.value.hasError ? errorId : helperId)}"
            :aria-errormessage="${() => (assistive.value.hasError ? errorId : null)}"
            :aria-invalid="${() => String(assistive.value.hasError)}"
            :aria-labelledby="${() =>
              props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId}"></textarea>
        </div>
        <span
          class="${() =>
            assistive.value.counterAtLimit
              ? 'counter at-limit'
              : assistive.value.counterNearLimit
                ? 'counter near-limit'
                : 'counter'}"
          aria-live="polite"
          ?hidden=${() => !assistive.value.hasCounter}
          >${() => assistive.value.counterText.replace(' / ', '/')}</span
        >
        <div
          id="${helperId}"
          class="helper-text"
          aria-live="polite"
          ?hidden=${() => !(assistive.value.hasError || assistive.value.showHelper)}>
          ${() => (assistive.value.hasError ? assistive.value.errorText : assistive.value.helperText)}
        </div>
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
