import {
  aria,
  computed,
  define,
  effect,
  handle,
  html,
  onMount,
  ref,
  defineProps,
  defineEmits,
} from '@vielzeug/craftit';
import { attr } from '@vielzeug/craftit/directives';

import type { DisablableProps, RoundedSize, SizableProps, ThemableProps, VisualVariant } from '../../types';

import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import {
  mountFormContextSync,
  parsePositiveNumber,
  resolveCounterState,
  resolveMergedAssistiveText,
  useTextField,
} from '../../utils/use-text-field';
import componentStyles from './textarea.css?inline';

/** Textarea component properties */

export type BitTextareaEvents = {
  change: { originalEvent: Event; value: string };
  input: { originalEvent: Event; value: string };
};

export type BitTextareaProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Allow auto-grow with content */
    'auto-resize'?: boolean;
    /** Error message (marks field as invalid) */
    error?: string;
    /** Full width mode (100% of container) */
    fullwidth?: boolean;
    /** Helper text displayed below the textarea */
    helper?: string;
    /** Label text */
    label?: string;
    /** Label placement */
    'label-placement'?: 'inset' | 'outside';
    /** Maximum character count; shows a counter when set */
    maxlength?: number;
    /** Form field name */
    name?: string;
    /** Disable manual resize handle */
    'no-resize'?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Make the textarea read-only */
    readonly?: boolean;
    /** Mark the field as required */
    required?: boolean;
    /** Resize direction override */
    resize?: 'none' | 'horizontal' | 'both' | 'vertical';
    /** Border radius size */
    rounded?: RoundedSize | '';
    /** Number of visible text rows */
    rows?: number;
    /** Current value */
    value?: string;
    /** Visual style variant */
    variant?: Exclude<VisualVariant, 'glass' | 'frost' | 'text'>;
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
 * @cssprop --textarea-bg - Background color
 * @cssprop --textarea-border-color - Border color
 * @cssprop --textarea-radius - Border radius
 * @cssprop --textarea-padding - Padding
 * @cssprop --textarea-font-size - Font size
 * @cssprop --textarea-placeholder-color - Placeholder color
 * @cssprop --textarea-min-height - Minimum height
 * @cssprop --textarea-max-height - Maximum height
 * @cssprop --textarea-resize - CSS resize property
 *
 * @example
 * ```html
 * <bit-textarea label="Message" placeholder="Write something..." />
 * <bit-textarea label="Bio" maxlength="160" auto-resize />
 * <bit-textarea label="Notes" variant="flat" color="primary" rows="6" />
 * ```
 */
export const TEXTAREA_TAG = define(
  'bit-textarea',
  ({ host }) => {
    const props = defineProps<BitTextareaProps>({
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
    });
    const emit = defineEmits<BitTextareaEvents>();

    // Shared text-field setup: value signal, form registration, IDs, label refs
    const tf = useTextField(props, 'textarea');
    const {
      errorId,
      fieldId: textareaId,
      helperId,
      labelInsetId,
      labelInsetRef,
      labelOutsideId,
      labelOutsideRef,
      valueSignal,
    } = tf;
    // Textarea-specific refs
    const textareaRef = ref<HTMLTextAreaElement>();
    const helperRef = ref<HTMLDivElement>();
    const counterRef = ref<HTMLSpanElement>();
    const charCount = computed(() => valueSignal.value.length);
    const maxLen = computed(() => props.maxlength.value);

    onMount(() => {
      const ta = textareaRef.value;

      if (!ta) return;

      // Define autoGrow first so it can be used in the effect
      const autoGrow = () => {
        if (!props['auto-resize'].value || !ta) return;

        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
      };

      // Effect 1: label visibility (via shared composable)
      tf.mountLabelSync();
      // Sync conditional/style props that require branching
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
      // Effect 3: sync helper / error text (textarea uses single div for both)
      effect(() => {
        if (helperRef.value) {
          const assistive = resolveMergedAssistiveText(props.error.value, props.helper.value);

          helperRef.value.textContent = assistive.text;
          helperRef.value.hidden = assistive.hidden;
        }
      });
      // Effect 4: sync character counter
      effect(() => {
        if (!counterRef.value) return;

        const state = resolveCounterState(charCount.value, parsePositiveNumber(maxLen.value));

        counterRef.value.hidden = state.hidden;
        counterRef.value.textContent = state.text.replace(' / ', '/');
        counterRef.value.className = state.atLimit
          ? 'counter at-limit'
          : state.nearLimit
            ? 'counter near-limit'
            : 'counter';
      });
      aria(ta, {
        describedby: () => (props.error.value ? errorId : helperId),
        invalid: () => !!props.error.value,
        labelledby: () => (props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId),
      });

      const handleInput = (e: Event) => {
        if (e.target !== ta) return;

        autoGrow(); // Call autoGrow on input
        emit('input', { originalEvent: e, value: ta.value });
      };
      const handleChange = (e: Event) => {
        if (e.target !== ta) return;

        emit('change', { originalEvent: e, value: ta.value });
        tf.triggerValidation('change');
      };
      const handleBlur = () => tf.triggerValidation('blur');

      handle(ta, 'input', handleInput);
      handle(ta, 'change', handleChange);
      handle(ta, 'blur', handleBlur);

      // Initial auto-grow
      if (props['auto-resize'].value) {
        requestAnimationFrame(autoGrow);
      }

      // Effect 5: propagate form context size/variant/disabled to host
      mountFormContextSync(host, tf.formCtx, props);
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
  {
    formAssociated: true,
    shadow: { delegatesFocus: true },
    styles: [
      ...formFieldMixins,
      sizeVariantMixin({
        lg: { '--_padding': 'var(--size-2-5) var(--size-3-5)', fontSize: 'var(--text-base)', gap: 'var(--size-2-5)' },
        sm: { '--_padding': 'var(--size-1) var(--size-2)', fontSize: 'var(--text-xs)', gap: 'var(--size-1-5)' },
      }),
      disabledLoadingMixin(),
      forcedColorsFocusMixin('textarea'),
      componentStyles,
    ],
  },
);
