import { computed, defineComponent, effect, html, onMount, ref } from '@vielzeug/craftit/core';
import { attr } from '@vielzeug/craftit/directives';

import type { VisualVariant } from '../../types';
import type { TextFieldProps } from '../shared/base-props';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import { useTextField } from '../shared/composables';
import { TEXTAREA_SIZE_PRESET } from '../shared/design-presets';
import { setupFieldEvents, syncCounter, syncMergedAssistive } from '../shared/dom-sync';
import { parsePositiveNumber } from '../shared/utils';
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
 */
export const TEXTAREA_TAG = defineComponent<BitTextareaProps, BitTextareaEvents>({
  formAssociated: true,
  props: {
    'auto-resize': { default: false },
    color: { default: undefined },
    disabled: { default: false },
    error: { default: '', omit: true },
    fullwidth: { default: false },
    helper: { default: '' },
    label: { default: '' },
    'label-placement': { default: 'inset' },
    maxlength: { default: undefined },
    name: { default: '' },
    'no-resize': { default: false },
    placeholder: { default: '' },
    readonly: { default: false },
    required: { default: false },
    resize: { default: undefined },
    rounded: { default: undefined },
    rows: { default: undefined },
    size: { default: undefined },
    value: { default: '' },
    variant: { default: undefined },
  },
  setup({ emit, props }) {
    const tf = useTextField(props, 'textarea');
    const {
      fieldId: textareaId,
      helperId,
      labelInsetId,
      labelInsetRef,
      labelOutsideId,
      labelOutsideRef,
      valueSignal,
    } = tf;
    const maxLen = computed<number | undefined>(() => props.maxlength.value);

    const textareaRef = ref<HTMLTextAreaElement>();
    const helperRef = ref<HTMLDivElement>();
    const counterRef = ref<HTMLSpanElement>();

    onMount(() => {
      const ta = textareaRef.value;

      if (!ta) return;

      const autoGrow = () => {
        if (!props['auto-resize'].value || !ta) return;

        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
      };

      tf.mountLabelSync();

      effect(() => {
        const rows = parsePositiveNumber(props.rows.value);

        if (rows != null) ta.rows = rows;
        else ta.removeAttribute('rows');

        const max = parsePositiveNumber(maxLen.value);

        if (max != null) ta.maxLength = max;
        else ta.removeAttribute('maxlength');

        ta.style.resize =
          props['auto-resize'].value || props['no-resize'].value ? 'none' : props.resize.value || 'vertical';
      });

      syncMergedAssistive({
        error: () => props.error.value,
        helper: () => props.helper.value,
        ref: helperRef,
      });

      syncCounter({
        count: computed(() => valueSignal.value.length),
        format: 'merged',
        maxLength: maxLen,
        ref: counterRef,
      });

      // TODO: migrate aria() on inner elements to a future useA11yField() composable
      import('@vielzeug/craftit').then(({ aria }) => {
        aria(ta, {
          describedby: () => (props.error.value ? tf.errorId : helperId),
          invalid: () => !!props.error.value,
          labelledby: () => (props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId),
        });
      });

      setupFieldEvents(ta, {
        onBlur: () => tf.triggerValidation('blur'),
        onChange: (e, value) => {
          emit('change', { originalEvent: e, value });
          tf.triggerValidation('change');
        },
        onInput: (e, value) => {
          autoGrow();
          emit('input', { originalEvent: e, value });
        },
      });

      if (props['auto-resize'].value) requestAnimationFrame(autoGrow);
    });

    return html`
      <div class="textarea-wrapper">
        <label class="label-outside" for="${textareaId}" id="${labelOutsideId}" ref=${labelOutsideRef} hidden></label>
        <div class="field">
          <label class="label-inset" for="${textareaId}" id="${labelInsetId}" ref=${labelInsetRef} hidden></label>
          <textarea
            ref=${textareaRef}
            id="${textareaId}"
            ${attr({
              disabled: props.disabled,
              name: props.name,
              placeholder: props.placeholder,
              readOnly: props.readonly,
              required: props.required,
              value: valueSignal,
            })}
            aria-describedby="${helperId}"></textarea>
        </div>
        <span class="counter" aria-live="polite" ref=${counterRef} hidden></span>
        <div id="${helperId}" class="helper-text" aria-live="polite" ref=${helperRef} hidden></div>
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
  tag: 'bit-textarea',
});
