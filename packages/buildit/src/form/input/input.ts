import {
  aria,
  css,
  define,
  defineEmits,
  defineProps,
  effect,
  handle,
  html,
  onMount,
  ref,
  signal,
} from '@vielzeug/craftit';
import { disabledLoadingMixin, forcedColorsFocusMixin, formFieldMixins, sizeVariantMixin } from '../../styles';
import type {
  AddEventListeners,
  BitInputEvents,
  ComponentSize,
  FormValidityMethods,
  InputType,
  RoundedSize,
  ThemeColor,
  VisualVariant,
} from '../../types';
import { useTextField } from '../_common/use-text-field';

const componentStyles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_font-size: var(--input-font-size, var(--text-sm));
      --_gap: var(--input-gap, var(--size-2));
      --_field-height: var(--input-height, var(--size-10));
      --_padding: var(--input-padding, var(--size-1-5) var(--size-3));
      --_radius: var(--input-radius, var(--rounded-md));
      --_placeholder: var(--input-placeholder-color, var(--color-contrast-500));
      --_bg: var(--input-bg, var(--color-contrast-100));
      --_border-color: var(--input-border-color, var(--color-contrast-300));

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      width: 100%;
    }

    .field {
      align-items: stretch;
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border) solid var(--_border-color);
      box-shadow: var(--_shadow, var(--shadow-2xs));
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0;
      justify-content: center;
      height: var(--_field-height);
      min-height: var(--_field-height);
      padding: var(--_padding);
      transition: var(--_motion-transition,
        background var(--transition-fast),
        backdrop-filter var(--transition-slow),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast));
    }

    /* Expand height to fit inset label + input row */
    .field:has(.label-inset:not([hidden])) {
      height: auto;
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: var(--_gap);
      flex: 1;
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
      transition: var(--_motion-transition, color var(--transition-fast));
      user-select: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
       Helper Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
      overflow-wrap: anywhere;
    }

    /* ========================================
       Slotted Prefix/Suffix Icons
       ======================================== */

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      align-items: center;
      color: var(--color-contrast-500);
      display: inline-flex;
      font-size: var(--size-4);
      justify-content: center;
      opacity: 0.8;
      transition: var(--_motion-transition, color var(--transition-fast));
      user-select: none;
    }

    /* ========================================
       Input Element
       ======================================== */

    input {
      /* No all: unset needed - reset layer handles it */
      color: var(--_theme-content);
      flex: 1;
      font: inherit;
      font-size: var(--_font-size);
      line-height: var(--leading-normal);
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
    }

    input::placeholder {
      color: var(--_placeholder);
      transition: color var(--transition-fast);
    }

    input:focus-visible {
      outline: none;
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

    :host(:not([disabled])) .field:focus-within ::slotted([slot='prefix']),
    :host(:not([disabled])) .field:focus-within ::slotted([slot='suffix']) {
      color: var(--_theme-focus);
    }

    /* ========================================
       Clear button
       ======================================== */

    .clear-btn {
      align-items: center;
      background: transparent;
      border: none;
      border-radius: var(--rounded-sm);
      color: var(--color-contrast-500);
      cursor: pointer;
      display: none;
      flex-shrink: 0;
      height: var(--size-5);
      justify-content: center;
      padding: 0;
      transition: var(--_motion-transition, color var(--transition-fast));
      width: var(--size-5);
      min-height: var(--_touch-target);
      min-width: var(--_touch-target);
    }

    .clear-btn:hover {
      color: var(--color-contrast-900);
    }

    .clear-btn:focus-visible {
      outline: var(--border-2) solid var(--_theme-focus);
      outline-offset: var(--border);
    }

    :host([clearable]) .clear-btn {
      display: flex;
    }

    :host([clearable]:not([has-value])) .clear-btn {
      visibility: hidden;
      pointer-events: none;
    }

    /* ========================================
       Password visibility toggle
       ======================================== */

    .pwd-toggle-btn {
      align-items: center;
      background: transparent;
      border: none;
      border-radius: var(--rounded-sm);
      color: var(--color-contrast-500);
      cursor: pointer;
      display: none;
      flex-shrink: 0;
      height: var(--size-5);
      justify-content: center;
      padding: 0;
      transition: var(--_motion-transition, color var(--transition-fast));
      width: var(--size-5);
      min-height: var(--_touch-target);
      min-width: var(--_touch-target);
    }

    .pwd-toggle-btn:hover {
      color: var(--color-contrast-900);
    }

    .pwd-toggle-btn:focus-visible {
      outline: var(--border-2) solid var(--_theme-focus);
      outline-offset: var(--border);
    }

    :host([type='password']) .pwd-toggle-btn {
      display: flex;
    }

    /* ========================================
       Character counter
       ======================================== */

    .char-counter {
      color: var(--color-contrast-400);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
      text-align: end;
      white-space: nowrap;
    }

    .char-counter[data-near-limit] {
      color: var(--color-warning, #f59e0b);
    }

    .char-counter[data-at-limit] {
      color: var(--color-error);
    }

    /* ========================================
       Error State
       ======================================== */

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

    .helper-text[role='alert'] {
      color: var(--color-error);
    }
  }


  @layer buildit.variants {
    /* ========================================
       Visual Variants
       ======================================== */

    /* Solid (Default) - Standard input with background */
    :host(:not([variant])) .field,
    :host([variant='solid']) .field {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    /* Flat - Minimal with subtle color hint */
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

    /* Bordered - Filled with theme color */
    :host([variant='bordered']) .field {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) input {
      color: var(--_theme-content);
    }

    :host([variant='bordered']) input::placeholder {
      color: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    }

    :host([variant='bordered']) .field:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline - Transparent background */
    :host([variant='outline']) .field {
      background: transparent;
      box-shadow: none;
    }

    /* Ghost - Transparent until hover */
    :host([variant='ghost']) .field {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .field:hover {
      background: var(--color-contrast-100);
    }

    /* Text - Underline style */
    :host([variant='text']) .field {
      background: transparent;
      border: none;
      border-bottom: var(--border) solid var(--_border-color);
      border-radius: 0;
      box-shadow: none;
    }

    :host([variant='text']) .field:focus-within {
      border-bottom: var(--border-2) solid var(--_theme-focus);
      transform: none;
    }
  }

  @layer buildit.utilities {
    /* Full width */
    :host([fullwidth]) {
      width: 100%;
    }
  }
`;

/** Input component properties */
export type InputProps = {
  /** Label text */
  label?: string;
  /** Label placement */
  'label-placement'?: 'inset' | 'outside';
  /** Theme color */
  color?: ThemeColor;
  /** Show a clear (×) button when the field has a value */
  clearable?: boolean;
  /** Disable input interaction */
  disabled?: boolean;
  /** Helper text displayed below the input */
  helper?: string;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Maximum character length — shows a counter below the input */
  maxlength?: number;
  /** Form field name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Make the input read-only */
  readonly?: boolean;
  /** Mark the field as required */
  required?: boolean;
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Input size */
  size?: ComponentSize;
  /** HTML input type */
  type?: InputType;
  /** Current input value */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass' | 'frost'>;
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
  /** HTML pattern attribute for client-side validation */
  pattern?: string;
  /** Virtual keyboard hint for mobile devices */
  inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  /** Autocomplete hint */
  autocomplete?: string;
  /** Minimum character length */
  minlength?: number;
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

const validateInputType = (type: string | null): string => {
  return VALID_INPUT_TYPES.includes(type as (typeof VALID_INPUT_TYPES)[number]) ? type! : 'text';
};

/**
 * A customizable text input component with multiple variants, label placements, and form features.
 *
 * @element bit-input
 *
 * @attr {string} label - Label text
 * @attr {string} label-placement - Label placement: 'inset' | 'outside'
 * @attr {string} type - HTML input type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
 * @attr {string} value - Current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} name - Form field name
 * @attr {string} helper - Helper text displayed below the input
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {boolean} disabled - Disable input interaction
 * @attr {boolean} readonly - Make the input read-only
 * @attr {boolean} required - Mark the field as required
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires input - Emitted when input value changes (on every keystroke)
 * @fires change - Emitted when input loses focus with changed value
 *
 * @slot prefix - Content before the input (e.g., icons)
 * @slot suffix - Content after the input (e.g., clear button, validation icon)
 * @slot helper - Complex helper content below the input
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
 * @cssprop --input-focus - Focus border color
 * @cssprop --input-placeholder-color - Placeholder text color
 * @cssprop --input-radius - Border radius
 * @cssprop --input-padding - Inner padding (vertical horizontal)
 * @cssprop --input-gap - Gap between prefix/suffix and input
 * @cssprop --input-font-size - Font size
 *
 * @example
 * ```html
 * <bit-input type="email" label="Email" placeholder="you@example.com" />
 * <bit-input label="Name" variant="bordered" color="primary" />
 * ```
 */
export const TAG = define(
  'bit-input',
  ({ host }) => {
    const emit = defineEmits<{
      change: { originalEvent: Event; value: string };
      input: { originalEvent: Event; value: string };
    }>();
    const props = defineProps<InputProps>({
      autocomplete: { default: undefined },
      clearable: { default: false },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      fullwidth: { default: false },
      helper: { default: '' },
      inputmode: { default: undefined },
      label: { default: '' },
      'label-placement': { default: 'inset' },
      maxlength: { default: undefined },
      minlength: { default: undefined },
      name: { default: '' },
      pattern: { default: undefined },
      placeholder: { default: '' },
      readonly: { default: false },
      required: { default: false },
      rounded: { default: undefined },
      size: { default: undefined },
      type: { default: 'text' },
      value: { default: '' },
      variant: { default: undefined },
    });

    const showPassword = signal(false);

    // Shared text-field setup: value signal, form registration, IDs, label refs
    const tf = useTextField(props, 'input');
    const {
      valueSignal,
      fieldId: inputId,
      labelInsetId,
      labelOutsideId,
      helperId,
      errorId,
      labelInsetRef,
      labelOutsideRef,
    } = tf;

    function togglePasswordVisibility() {
      showPassword.value = !showPassword.value;
      inputRef.value?.focus();
    }

    // Input-specific refs
    const inputRef = ref<HTMLInputElement>();
    const helperRef = ref<HTMLDivElement>();
    const errorRef = ref<HTMLDivElement>();
    const clearBtnRef = ref<HTMLButtonElement>();
    const charCounterRef = ref<HTMLDivElement>();

    onMount(() => {
      const inp = inputRef.value;
      if (!inp) return;

      // Define event handlers
      const handleInput = (e: Event) => {
        if (e.target !== inp) return;
        valueSignal.value = inp.value;
        emit('input', { originalEvent: e, value: inp.value });
      };

      const handleChange = (e: Event) => {
        if (e.target !== inp) return;
        valueSignal.value = inp.value;
        emit('change', { originalEvent: e, value: inp.value });
        tf.triggerValidation('change');
      };

      const handleBlur = () => tf.triggerValidation('blur');

      // Attach event listeners
      handle(inp, 'input', handleInput);
      handle(inp, 'change', handleChange);
      handle(inp, 'blur', handleBlur);

      // Effect 1: label visibility (via shared composable)
      tf.mountLabelSync();

      // Effect 2: sync input element attributes to props
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Syncing many optional attributes requires branching
      effect(() => {
        inp.disabled = props.disabled.value;
        inp.name = props.name.value || '';
        inp.placeholder = props.placeholder.value;
        inp.readOnly = props.readonly.value;
        inp.required = props.required.value;
        inp.type = props.type.value === 'password' && showPassword.value ? 'text' : validateInputType(props.type.value);
        inp.value = valueSignal.value;

        const maxLen = props.maxlength.value != null ? Number(props.maxlength.value) : -1;
        if (maxLen > 0) inp.maxLength = maxLen;

        const minLen = props.minlength.value != null ? Number(props.minlength.value) : -1;
        if (minLen > 0) inp.minLength = minLen;

        if (props.pattern.value != null) inp.pattern = props.pattern.value;
        else inp.removeAttribute('pattern');
        if (props.inputmode.value != null) inp.inputMode = props.inputmode.value;
        else inp.removeAttribute('inputmode');
        if (props.autocomplete.value != null) inp.autocomplete = props.autocomplete.value as AutoFill;
        else inp.removeAttribute('autocomplete');
      });

      // Effect 3: sync helper and error text
      effect(() => {
        if (helperRef.value) {
          helperRef.value.textContent = props.helper.value;
          helperRef.value.hidden = !!props.error.value || !props.helper.value;
        }
        if (errorRef.value) {
          errorRef.value.textContent = props.error.value;
          errorRef.value.hidden = !props.error.value;
        }
      });

      // Effect 4: sync character counter
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Counter state has several threshold conditions
      effect(() => {
        if (!charCounterRef.value) return;
        const maxLen = props.maxlength.value != null ? Number(props.maxlength.value) : -1;
        if (maxLen > 0) {
          const len = valueSignal.value.length;
          charCounterRef.value.textContent = `${len} / ${maxLen}`;
          charCounterRef.value.hidden = false;
          charCounterRef.value.removeAttribute('data-near-limit');
          charCounterRef.value.removeAttribute('data-at-limit');
          if (len >= maxLen) charCounterRef.value.setAttribute('data-at-limit', '');
          else if (len >= maxLen * 0.9) charCounterRef.value.setAttribute('data-near-limit', '');
        } else {
          charCounterRef.value.hidden = true;
        }
      });

      // Effect 5: manage has-value attribute for clearable button visibility
      effect(() => {
        if (valueSignal.value) host.setAttribute('has-value', '');
        else host.removeAttribute('has-value');
      });

      // Effect 6: propagate form context size/variant/disabled to host when not explicitly set
      let ctxDisabledActive = false;
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Propagates form context and handles disabled state transitions
      effect(() => {
        const fCtx = tf.formCtx;
        if (!fCtx) return;
        const ctxDisabled = fCtx.disabled.value;
        if (ctxDisabled && !ctxDisabledActive) {
          host.setAttribute('disabled', '');
          ctxDisabledActive = true;
        } else if (!ctxDisabled && ctxDisabledActive) {
          host.removeAttribute('disabled');
          ctxDisabledActive = false;
        }
        if (!props.size.value && fCtx.size.value) host.setAttribute('size', fCtx.size.value);
        if (!props.variant.value && fCtx.variant.value) host.setAttribute('variant', fCtx.variant.value);
      });

      aria(inp, {
        describedby: () => (props.error.value ? errorId : helperId),
        errormessage: () => (props.error.value ? errorId : null),
        invalid: () => !!props.error.value,
      });

      // Clear button
      if (clearBtnRef.value) {
        clearBtnRef.value.addEventListener('click', (e: MouseEvent) => {
          e.preventDefault();
          valueSignal.value = '';
          emit('input', { originalEvent: e, value: '' });
          emit('change', { originalEvent: e, value: '' });
          tf.triggerValidation('change');
          inputRef.value?.focus();
        });
      }
    });

    return {
      styles: [
        sizeVariantMixin({
          lg: {
            '--_field-height': 'var(--size-12)',
            '--_padding': 'var(--size-2-5) var(--size-3-5)',
            fontSize: 'var(--text-base)',
            gap: 'var(--size-2-5)',
          },
          sm: {
            '--_field-height': 'var(--size-8)',
            '--_padding': 'var(--size-1) var(--size-2)',
            fontSize: 'var(--text-xs)',
            gap: 'var(--size-1-5)',
          },
        }),
        ...formFieldMixins,
        disabledLoadingMixin(),
        forcedColorsFocusMixin('input'),
        componentStyles,
      ],
      template: html` <div class="input-wrapper" part="wrapper">
        <label
          class="label-outside"
          for="${inputId}"
          id="${labelOutsideId}"
          part="label"
          ref=${labelOutsideRef}
          hidden></label>
        <div class="field" part="field">
          <label class="label-inset" for="${inputId}" id="${labelInsetId}" part="label" ref=${labelInsetRef} hidden></label>
          <div class="input-row" part="input-row">
            <slot name="prefix"></slot>
            <input
              part="input"
              id="${inputId}"
              :aria-labelledby="${() => (props['label-placement'].value === 'outside' ? labelOutsideId : labelInsetId)}"
              aria-describedby="${helperId}"
              ref=${inputRef} />
            <slot name="suffix"></slot>
            <button
              class="pwd-toggle-btn"
              part="pwd-toggle"
              type="button"
              :aria-label="${() => (showPassword.value ? 'Hide password' : 'Show password')}"
              :aria-pressed="${() => String(showPassword.value)}"
              tabindex="-1"
              @click="${togglePasswordVisibility}"
            >
              ${() =>
                showPassword.value
                  ? html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
                  : html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`}
            </button>
            <button
              class="clear-btn"
              part="clear"
              type="button"
              aria-label="Clear"
              tabindex="-1"
              ref=${clearBtnRef}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="helper-text" id="${helperId}" part="helper" ref=${helperRef} hidden></div>
        <div
          class="helper-text"
          id="${errorId}"
          role="alert"
          part="error"
          ref=${errorRef}
          hidden></div>
        <div class="char-counter" part="char-counter" ref=${charCounterRef} hidden></div>
      </div>`,
    };
  },
  { formAssociated: true, shadow: { delegatesFocus: true } },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-input': HTMLElement & InputProps & FormValidityMethods & AddEventListeners<BitInputEvents>;
  }
}
