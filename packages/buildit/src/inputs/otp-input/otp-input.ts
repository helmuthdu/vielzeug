import { define, computed, html, onMount, signal, watch } from '@vielzeug/craftit';
import { createListControl, createListKeyControl } from '@vielzeug/craftit/controls';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { colorThemeMixin, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import { disablableBundle, sizableBundle, themableBundle, type PropBundle } from '../shared/bundles';
import styles from './otp-input.css?inline';

export type BitOtpInputEvents = {
  change: { complete: boolean; originalEvent?: Event; value: string };
  complete: { originalEvent?: Event; value: string };
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

const otpInputProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  label: 'One-time password',
  length: 6,
  masked: false,
  name: undefined,
  separator: undefined,
  type: 'numeric',
  value: '',
  variant: undefined,
} satisfies PropBundle<BitOtpInputProps>;

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
 * @fires change - Emitted whenever a cell changes. detail: { value: string, complete: boolean, originalEvent?: Event }
 * @fires complete - Emitted when all cells are filled. detail: { value: string, originalEvent?: Event }
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
export const OTP_INPUT_TAG = define<BitOtpInputProps, BitOtpInputEvents>('bit-otp-input', {
  props: otpInputProps,
  setup({ emit, host, props }) {
    const lengthValue = computed(() => Number(props.length.value) || 6);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const cells = computed(() => Array.from({ length: lengthValue.value }, (_, i) => i));
    const focusedIndex = signal(0);
    const otpValue = signal(String(props.value.value || ''));
    const normalizedPropValue = () => String(props.value.value || '');

    host.bind('attr', {
      value: () => otpValue.value || null,
    });

    function getInputs(): HTMLInputElement[] {
      return [...(host.shadowRoot?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];
    }

    const listControl = createListControl({
      getIndex: () => focusedIndex.value,
      getItems: () => getInputs(),
      loop: false,
      setIndex: (index) => {
        focusedIndex.value = index;

        const inputs = getInputs();

        inputs[index]?.focus();
      },
    });

    const otpListKeys = createListKeyControl({
      control: listControl,
      keys: { next: ['ArrowRight'], prev: ['ArrowLeft'] },
    });

    function getValue(): string {
      return getInputs()
        .map((i) => i.value)
        .join('');
    }
    function syncInputsFromValue(raw: string) {
      const allInputs = getInputs();
      const normalized = String(raw || '').slice(0, allInputs.length);

      for (const input of allInputs) input.value = '';

      normalized.split('').forEach((c, i) => {
        if (allInputs[i]) allInputs[i].value = c;
      });

      otpValue.value = getValue();
    }
    function emitOtpState(originalEvent?: Event, forceComplete?: boolean): void {
      const allInputs = getInputs();
      const full = getValue();
      const complete = forceComplete ?? (full.length === allInputs.length && full.split('').every(Boolean));

      otpValue.value = full;
      emit('change', { complete, originalEvent, value: full });

      if (complete) emit('complete', { originalEvent, value: full });
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

      emitOtpState(e);

      // Auto-advance
      if (val && index < allInputs.length - 1) {
        allInputs[index + 1].focus();
        allInputs[index + 1].select();
      }
    }
    function handleKeydown(e: KeyboardEvent, index: number) {
      const input = e.target as HTMLInputElement;
      const allInputs = getInputs();

      focusedIndex.value = index;

      if (e.key === 'Backspace') {
        if (input.value) {
          input.value = '';
        } else if (index > 0) {
          const prevIndex = listControl.prev().index;
          const prevInput = allInputs[prevIndex];

          if (prevInput) {
            prevInput.select();
            prevInput.value = '';
          }
        }

        emitOtpState(e, false);
        e.preventDefault();
      } else {
        otpListKeys.handleKeydown(e);
      }
    }
    function handlePaste(e: ClipboardEvent) {
      e.preventDefault();

      const pasted = e.clipboardData?.getData('text') ?? '';
      const chars = pasted
        .split('')
        .filter((c) => isAllowed(c))
        .slice(0, lengthValue.value);
      const allInputs = getInputs();

      chars.forEach((char, i) => {
        if (allInputs[i]) allInputs[i].value = char;
      });

      emitOtpState(e);

      // Focus the cell after last pasted char
      const focusIdx = Math.min(chars.length, allInputs.length - 1);

      allInputs[focusIdx]?.focus();
    }
    onMount(() => {
      // Populate cells from value prop on mount
      syncInputsFromValue(normalizedPropValue());
    });

    watch(props.value, (value) => {
      syncInputsFromValue(String(value || ''));
    });

    watch(props.length, () => {
      // Cells re-render when length changes; sync after DOM updates.
      requestAnimationFrame(() => syncInputsFromValue(normalizedPropValue()));
    });

    const separatorIdx = computed(() => {
      const len = Number(props.length.value) || 6;

      return props.separator.value != null ? Math.floor(len / 2) : -1;
    });

    return html`
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
                :aria-label="${() => `Digit ${i + 1} of ${lengthValue.value}`}"
                :disabled="${() => (isDisabled.value ? true : null)}"
                :name="${() => (props.name.value ? `${props.name.value}[${i}]` : null)}"
                @input="${(e: Event) => handleInput(e, i)}"
                @keydown="${(e: KeyboardEvent) => handleKeydown(e, i)}"
                @paste="${(e: ClipboardEvent) => (i === 0 ? handlePaste(e) : e.preventDefault())}"
                @focus="${(e: FocusEvent) => (e.target as HTMLInputElement).select()}" />
            `,
          )}
      </div>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin({}), forcedColorsFocusMixin('.cell'), styles],
});
