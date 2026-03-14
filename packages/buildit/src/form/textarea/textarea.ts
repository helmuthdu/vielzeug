import {
  aria,
  computed,
  css,
  define,
  defineEmits,
  defineProps,
  effect,
  handle,
  html,
  onMount,
  ref,
  syncDOMProps,
} from '@vielzeug/craftit';

import type {
  AddEventListeners,
  BitTextareaEvents,
  DisablableProps,
  FormValidityMethods,
  RoundedSize,
  SizableProps,
  ThemableProps,
  VisualVariant,
} from '../../types';

import { mountFormContextSync, useTextField } from '../_common/use-text-field';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_font-size: var(--textarea-font-size, var(--text-sm));
      --_gap: var(--textarea-gap, var(--size-2));
      --_padding: var(--textarea-padding, var(--size-2) var(--size-3));
      --_radius: var(--textarea-radius, var(--rounded-md));
      --_placeholder: var(--textarea-placeholder-color, var(--color-contrast-500));
      --_bg: var(--textarea-bg, var(--color-contrast-100));
      --_border-color: var(--textarea-border-color, var(--color-contrast-300));
      --_min-height: var(--textarea-min-height, var(--size-24));
      --_max-height: var(--textarea-max-height, none);
      --_resize: var(--textarea-resize, vertical);

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
      min-width: 12rem;
    }

    .textarea-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      min-width: 0; /* Allow shrinking below content size */
    }

    .field {
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border) solid var(--_border-color);
      box-shadow: var(--shadow-2xs);
      box-sizing: border-box;
      display: grid; /* Grid automatically sizes to content */
      min-width: 0; /* Allow shrinking */
      padding: var(--_padding);
      transition:
        background var(--transition-fast),
        backdrop-filter var(--transition-slow),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }

    /* ========================================
       Label Styles
       ======================================== */

    .label-inset,
    .label-outside,
    label.label-inset,
    label.label-outside {
      color: var(--color-contrast-500);
      cursor: pointer;
      font-weight: var(--font-medium);
      transition: color var(--transition-fast);
      user-select: none;
    }

    .label-inset,
    label.label-inset {
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      margin-bottom: 2px;
    }

    .label-outside,
    label.label-outside {
      font-size: var(--text-sm);
      line-height: var(--leading-none);
    }

    /* ========================================
       Helper / Error Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
    }

    /* ========================================
       Textarea Element
       ======================================== */

    textarea {
      background: transparent;
      border: none;
      box-sizing: border-box;
      color: var(--_theme-content);
      font: inherit;
      font-size: var(--_font-size);
      line-height: var(--leading-relaxed);
      min-height: var(--_min-height);
      max-height: var(--_max-height);
      min-width: 12rem; /* Match :host min-width to prevent resize below minimum */
      outline: none;
      padding: 0;
      resize: vertical; /* Default resize, can be overridden by inline style */
    }

    textarea::placeholder {
      color: var(--_placeholder);
      transition: color var(--transition-fast);
    }

    textarea:focus-visible {
      outline: none;
    }

    /* ========================================
       Character Counter
       ======================================== */

    .counter {
      align-self: flex-end;
      color: var(--color-contrast-400);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      margin-top: var(--size-1);
      padding-inline: 2px;
      transition: color var(--transition-fast);
    }

    .counter.near-limit {
      color: var(--color-warning);
    }

    .counter.at-limit {
      color: var(--color-error);
    }

    /* ========================================
       Hover & Focus States
       ======================================== */

    :host(:not([disabled]):not([variant='bordered']):not([variant='flat'])) .field:hover {
      border-color: var(--color-contrast-400);
    }

    :host(:not([disabled]):not([variant='text']):not([variant='flat'])) .field:focus-within {
      background: var(--color-canvas);
      border-color: var(--_theme-focus);
      box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
      transform: translateY(-1px);
    }

    :host(:not([disabled])) .field:focus-within .label-inset,
    :host(:not([disabled])) .field:focus-within .label-outside {
      color: var(--_theme-focus);
    }

    /* Error State */
    :host([error]) .field {
      border-color: var(--color-error);
    }

    :host([error]) .field:focus-within {
      border-color: var(--color-error);
      box-shadow: var(--color-error-focus-shadow);
    }

    :host([error]) .label-inset,
    :host([error]) .label-outside {
      color: var(--color-error);
    }
  }

  @layer buildit.variants {
    /* Solid (Default) */
    :host(:not([variant])) .field,
    :host([variant='solid']) .field {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    :host(:not([variant]):not([disabled])) .field:focus-within,
    :host([variant='solid']:not([disabled])) .field:focus-within {
      box-shadow: var(--_theme-shadow);
    }

    /* Flat */
    :host([variant='flat']) .field {
      border-color: var(--_theme-border);
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) .field:hover {
      background: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
      border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
    }

    :host([variant='flat']) .field:focus-within {
      background: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
      border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered */
    :host([variant='bordered']) .field {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) textarea {
      color: var(--_theme-content);
    }

    :host([variant='bordered']) textarea::placeholder {
      color: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    }

    :host([variant='bordered']) .field:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline */
    :host([variant='outline']) .field {
      background: transparent;
      box-shadow: none;
    }

    :host([variant='outline']:not([disabled])) .field:focus-within {
      box-shadow: var(--_theme-shadow);
    }

    /* Ghost */
    :host([variant='ghost']) .field {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .field:hover {
      background: var(--color-contrast-100);
    }

    :host([variant='ghost']:not([disabled])) .field:focus-within {
      box-shadow: var(--_theme-shadow);
    }
  }

  @layer buildit.utilities {
    /* Auto-resize hides overflow */
    :host([auto-resize]) textarea {
      overflow: hidden;
    }

    /* Full width */
    :host([fullwidth]) {
      width: 100%;
    }
  }
`;

/** Textarea component properties */
export interface TextareaProps extends ThemableProps, SizableProps, DisablableProps {
  /** Label text */
  label?: string;
  /** Label placement */
  'label-placement'?: 'inset' | 'outside';
  /** Helper text displayed below the textarea */
  helper?: string;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Form field name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Make the textarea read-only */
  readonly?: boolean;
  /** Mark the field as required */
  required?: boolean;
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Current value */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'frost' | 'text'>;
  /** Maximum character count; shows a counter when set */
  maxlength?: number;
  /** Number of visible text rows */
  rows?: number;
  /** Disable manual resize handle */
  'no-resize'?: boolean;
  /** Allow auto-grow with content */
  'auto-resize'?: boolean;
  /** Resize direction override */
  resize?: 'none' | 'horizontal' | 'both' | 'vertical';
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
}

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
export const TAG = define(
  'bit-textarea',
  ({ host }) => {
    const emit = defineEmits<{
      change: { originalEvent: Event; value: string };
      input: { originalEvent: Event; value: string };
    }>();

    const props = defineProps<TextareaProps>({
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

      // Effect 2: sync textarea element properties
      syncDOMProps(ta, {
        disabled: props.disabled,
        name: () => props.name.value || '',
        placeholder: props.placeholder,
        readOnly: props.readonly,
        required: props.required,
        value: valueSignal,
      });
      // Sync conditional/style props that require branching
      effect(() => {
        if (props.rows.value) ta.rows = props.rows.value;

        if (maxLen.value) ta.maxLength = Number(maxLen.value);

        ta.style.resize =
          props['auto-resize'].value || props['no-resize'].value ? 'none' : props.resize.value || 'vertical';
      });

      // Effect 3: sync helper / error text (textarea uses single div for both)
      effect(() => {
        if (helperRef.value) {
          helperRef.value.textContent = props.error.value || props.helper.value || '';
          helperRef.value.hidden = !props.error.value && !props.helper.value;
        }
      });

      // Effect 4: sync character counter
      effect(() => {
        if (!counterRef.value) return;

        const max = maxLen.value;

        if (max !== undefined && max !== null) {
          const count = charCount.value;
          const ratio = count / Number(max);

          counterRef.value.textContent = `${count}/${max}`;
          counterRef.value.className =
            ratio >= 1 ? 'counter at-limit' : ratio >= 0.9 ? 'counter near-limit' : 'counter';
          counterRef.value.hidden = false;
        } else {
          counterRef.value.hidden = true;
        }
      });

      aria(ta, {
        describedby: () => (props.error.value ? errorId : helperId),
        invalid: () => !!props.error.value,
      });

      const handleInput = (e: Event) => {
        if (e.target !== ta) return;

        valueSignal.value = ta.value;
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

      // Set initial value from props
      if (valueSignal.value) {
        ta.value = valueSignal.value;
      }

      // Initial auto-grow
      if (props['auto-resize'].value) {
        requestAnimationFrame(autoGrow);
      }

      // Effect 5: propagate form context size/variant/disabled to host
      mountFormContextSync(host, tf.formCtx, props);
    });

    return {
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
      template: html`
        <div class="textarea-wrapper">
          <label class="label-outside" for="${textareaId}" id="${labelOutsideId}" ref=${labelOutsideRef} hidden></label>
          <div class="field">
            <label class="label-inset" for="${textareaId}" id="${labelInsetId}" ref=${labelInsetRef} hidden></label>
            <textarea
              ref=${textareaRef}
              id="${textareaId}"
              :aria-labelledby="${() => (props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId)}"
              aria-describedby="${helperId}"></textarea>
          </div>
          <span class="counter" aria-live="polite" ref=${counterRef} hidden></span>
          <div id="${helperId}" class="helper-text" aria-live="polite" ref=${helperRef} hidden></div>
        </div>
      `,
    };
  },
  { formAssociated: true, shadow: { delegatesFocus: true } },
);
declare global {
  interface HTMLElementTagNameMap {
    'bit-textarea': HTMLElement & TextareaProps & FormValidityMethods & AddEventListeners<BitTextareaEvents>;
  }
}
