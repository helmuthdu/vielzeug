import { computed, define, defineEmits, defineProps, html, onMount } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { colorThemeMixin, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import styles from './otp-input.css?inline';

export type BitOtpInputEvents = {
  change: { complete: boolean; value: string };
  complete: { value: string };
};

/** OTP Input props */
export type BitOtpInputProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Make inputs disabled */
  disabled?: boolean;
  /** Accessible label */
  label?: string;
  /** Number of input cells */
  length?: number;
  /** Mask input (show dots instead of characters) */
  masked?: boolean;
  /** Form field name */
  name?: string;
  /** Show a separator in the middle (e.g. "–") */
  separator?: string;
  /** Component size */
  size?: ComponentSize;
  /** Input type: 'numeric' (digits only) or 'alphanumeric' */
  type?: 'numeric' | 'alphanumeric';
  /** Current value */
  value?: string;
  /** Visual variant */
  variant?: Exclude<VisualVariant, 'text' | 'frost' | 'glass'>;
};

/**
 * A segmented OTP (One-Time Password) input with N individual cells.
 * Auto-advances focus on input, auto-backs on Backspace, handles paste.
 *
 * @element bit-otp-input
 *
 * @attr {number} length - Number of cells (default: 6)
 * @attr {string} type - 'numeric' (default) | 'alphanumeric'
 * @attr {string} value - Current code value
 * @attr {boolean} disabled - Disable all cells
 * @attr {boolean} masked - Show as password
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} color - Theme color
 * @attr {string} name - Form field name
 * @attr {string} label - Group aria-label
 * @attr {string} separator - Optional separator character shown in the middle
 *
 * @fires change - Emitted whenever a cell changes, with { value, complete }
 * @fires complete - Emitted when all cells are filled
 *
 * @cssprop --otp-cell-size - Width and height of each cell
 * @cssprop --otp-cell-gap - Gap between cells
 * @cssprop --otp-cell-font-size - Font size inside cells
 * @cssprop --otp-cell-radius - Border radius of cells
 * @cssprop --otp-cell-border-color - Default border color
 * @cssprop --otp-cell-focus-border - Focused border color
 *
 * @example
 * ```html
 * <bit-otp-input length="6" color="primary"></bit-otp-input>
 * ```
 */
export const OTP_INPUT_TAG = define('bit-otp-input', ({ host }) => {
  const props = defineProps<BitOtpInputProps>({
    color: { default: undefined },
    disabled: { default: false },
    label: { default: 'One-time password' },
    length: { default: 6 },
    masked: { default: false },
    name: { default: undefined },
    separator: { default: undefined },
    size: { default: undefined },
    type: { default: 'numeric' },
    value: { default: '' },
    variant: { default: undefined },
  });

  const emit = defineEmits<BitOtpInputEvents>();

  const cells = computed(() => Array.from({ length: Number(props.length.value) || 6 }, (_, i) => i));

  function getInputs(): HTMLInputElement[] {
    return [...(host.shadowRoot?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];
  }

  function getValue(): string {
    return getInputs()
      .map((i) => i.value)
      .join('');
  }

  function isAllowed(char: string): boolean {
    if (props.type.value === 'numeric') return /^\d$/.test(char);

    return /^[a-z\d]$/i.test(char);
  }

  function handleInput(e: Event, index: number) {
    const input = e.target as HTMLInputElement;
    let val = input.value;

    // Keep only last character if multiple were typed somehow
    if (val.length > 1) val = val.slice(-1);

    // Validate character
    if (val && !isAllowed(val)) {
      input.value = '';

      return;
    }

    input.value = val;

    const allInputs = getInputs();
    const full = getValue();
    const complete = full.length === allInputs.length && full.split('').every(Boolean);

    host.setAttribute('value', full);
    emit('change', { complete, value: full });

    if (complete) emit('complete', { value: full });

    // Auto-advance
    if (val && index < allInputs.length - 1) {
      allInputs[index + 1].focus();
      allInputs[index + 1].select();
    }
  }

  function handleKeydown(e: KeyboardEvent, index: number) {
    const input = e.target as HTMLInputElement;
    const allInputs = getInputs();

    if (e.key === 'Backspace') {
      if (input.value) {
        input.value = '';
      } else if (index > 0) {
        allInputs[index - 1].focus();
        allInputs[index - 1].select();
        allInputs[index - 1].value = '';
      }

      const full = getValue();

      host.setAttribute('value', full);
      emit('change', { complete: false, value: full });
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      allInputs[index - 1].focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < allInputs.length - 1) {
      allInputs[index + 1].focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      allInputs[0].focus();
      e.preventDefault();
    } else if (e.key === 'End') {
      allInputs[allInputs.length - 1].focus();
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();

    const pasted = e.clipboardData?.getData('text') ?? '';
    const chars = pasted
      .split('')
      .filter((c) => isAllowed(c))
      .slice(0, Number(props.length.value) || 6);

    const allInputs = getInputs();

    chars.forEach((char, i) => {
      if (allInputs[i]) allInputs[i].value = char;
    });

    const full = getValue();
    const complete = full.length === allInputs.length && full.split('').every(Boolean);

    host.setAttribute('value', full);
    emit('change', { complete, value: full });

    if (complete) emit('complete', { value: full });

    // Focus the cell after last pasted char
    const focusIdx = Math.min(chars.length, allInputs.length - 1);

    allInputs[focusIdx]?.focus();
  }

  onMount(() => {
    // Populate cells from value prop on mount
    const initialVal = String(props.value.value || '');
    const allInputs = getInputs();

    initialVal.split('').forEach((c, i) => {
      if (allInputs[i]) allInputs[i].value = c;
    });
  });

  const separatorIdx = computed(() => {
    const len = Number(props.length.value) || 6;

    return props.separator.value != null ? Math.floor(len / 2) : -1;
  });

  return {
    styles: [colorThemeMixin, sizeVariantMixin({}), forcedColorsFocusMixin('.cell'), styles],
    template: html`
      <div class="otp-group" part="group" role="group" :aria-label="${() => props.label.value}">
        ${() =>
          cells.value.map(
            (i) => html`
              ${() =>
                separatorIdx.value > 0 && i === separatorIdx.value
                  ? html`<span class="separator" aria-hidden="true">${() => props.separator.value || '-'}</span>`
                  : ''}
              <input
                class="cell"
                part="cell"
                :type="${() => (props.masked.value ? 'password' : 'text')}"
                :inputmode="${() => (props.type.value === 'numeric' ? 'numeric' : 'text')}"
                maxlength="1"
                :autocomplete="${() => (i === 0 ? 'one-time-code' : 'off')}"
                :aria-label="${() => `Digit ${i + 1} of ${props.length.value}`}"
                :disabled="${() => props.disabled.value || null}"
                :name="${() => (props.name.value ? `${props.name.value}[${i}]` : null)}"
                @input="${(e: Event) => handleInput(e, i)}"
                @keydown="${(e: KeyboardEvent) => handleKeydown(e, i)}"
                @paste="${(e: ClipboardEvent) => (i === 0 ? handlePaste(e) : e.preventDefault())}"
                @focus="${(e: FocusEvent) => (e.target as HTMLInputElement).select()}" />
            `,
          )}
      </div>
    `,
  };
});
