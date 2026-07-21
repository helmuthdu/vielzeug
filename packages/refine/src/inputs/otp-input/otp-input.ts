import { define, html, inject, prop, bind, getHost, onMounted, useEmit } from '@vielzeug/ore';
import { useField } from '@vielzeug/ore/forms';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { createListControl } from '../../headless';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './otp-input.css?inline';

export type OreOtpInputEvents = {
  change: { complete: boolean; originalEvent?: Event; value: string };
  complete: { originalEvent?: Event; value: string };
};

/** OTP Input props */
export type OreOtpInputProps = {
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
  variant?: Exclude<VisualVariant, 'text' | 'frost'>;
};

/**
 * A segmented OTP (One-Time Password) input with N individual cells.
 * Auto-advances focus on input, auto-backs on Backspace, handles paste.
 *
 * @element ore-otp-input
 *
 * @attr {number} length - Number of cells (default: 6)
 * @attr {string} type - 'numeric' (default) | 'alphanumeric'
 * @attr {string} value - Current code value
 * @attr {boolean} disabled - Disable all cells
 * @attr {boolean} masked - Show as password
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} name - Form field name
 * @attr {string} label - Group aria-label
 * @attr {string} separator - Optional separator character shown in the middle
 *
 * @fires change - Emitted whenever a cell changes. detail: { value: string, complete: boolean, originalEvent?: Event }
 * @fires complete - Emitted when all cells are filled. detail: { value: string, originalEvent?: Event }
 *
 * @slot label - Custom label above the OTP input
 * @slot helper - Custom helper text below the OTP input
 * @slot error - Custom error content below the OTP input
 *
 * @cssprop --otp-cell-size - Width and height of each cell
 * @cssprop --otp-cell-gap - Gap between cells
 * @cssprop --otp-cell-font-size - Font size inside cells
 * @cssprop --otp-cell-radius - Border radius of cells
 * @cssprop --otp-cell-bg - Cell background color
 * @cssprop --otp-cell-border-color - Default border color
 * @cssprop --otp-cell-focus-border - Focused border/caret color
 * @cssprop --otp-cell-hover-bg - Cell background on hover (flat/ghost variants)
 * @cssprop --otp-cell-hover-border-color - Cell border on hover (flat/bordered variants)
 * @cssprop --otp-cell-focus-bg - Cell background when focused (flat variant)
 * @cssprop --otp-cell-focus-border-color - Cell border when focused (flat variant)
 *
 * @part group - Group container.
 * @part cell - Shadow part for the `cell` element.
 * @example
 * ```html
 * <ore-otp-input length="6" color="primary"></ore-otp-input>
 * ```
 */
export const OTP_INPUT_TAG = 'ore-otp-input' as const;
define<OreOtpInputProps>(OTP_INPUT_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    label: prop.string('One-time password'),
    length: prop.number(6),
    masked: prop.bool(false),
    name: prop.string(),
    separator: prop.string(),
    type: prop.oneOf(['numeric', 'alphanumeric'] as const, 'numeric'),
    value: prop.string(),
    variant: prop.string<Exclude<VisualVariant, 'text' | 'frost'>>(),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreOtpInputEvents>();

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);
    const lengthValue = computed(() => Number(props.length.value) || 6);
    const isDisabled = fCtxProps.disabled;
    const cells = computed(() => Array.from({ length: lengthValue.value }, (_, i) => i));
    const otpValue = signal(String(props.value.value || ''));
    const normalizedPropValue = () => String(props.value.value || '');

    // Form association: the joined cell value is the single form value for `name`,
    // since individual per-cell <input> elements inside the shadow root cannot
    // participate in an ancestor <form>'s submission on their own.
    useField<string>({ disabled: isDisabled, toFormValue: (v) => v, value: otpValue });

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => otpValue.value || null,
        variant: fCtxProps.variant,
      },
    });

    function getInputs(): HTMLInputElement[] {
      return [...(el.shadowRoot?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];
    }

    const listControl = createListControl({
      getItems: () => getInputs(),
      keys: { next: ['ArrowRight'], prev: ['ArrowLeft'] },
      loop: false,
      onNavigate: (_action, index) => {
        const inputs = getInputs();

        inputs[index]?.focus();
      },
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

      listControl.set(index);

      if (e.key === 'Backspace') {
        if (input.value) {
          input.value = '';
        } else if (index > 0) {
          const prevIndex = listControl.navigate('prev');
          const prevInput = allInputs[prevIndex];

          if (prevInput) {
            prevInput.select();
            prevInput.value = '';
          }
        }

        emitOtpState(e, false);
        e.preventDefault();
      } else {
        listControl.handleKeydown(e);
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

    onMounted(() => {
      // Populate cells from value prop on mount
      syncInputsFromValue(normalizedPropValue());
    });

    return html`
      <div class="otp-group" part="group" role="group" :aria-label="${props.label}">
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
                @input="${(e: Event) => handleInput(e, i)}"
                @keydown="${(e: KeyboardEvent) => handleKeydown(e, i)}"
                @paste="${(e: ClipboardEvent) => (i === 0 ? handlePaste(e) : e.preventDefault())}"
                @focus="${(e: FocusEvent) => (e.target as HTMLInputElement).select()}" />
            `,
          )}
      </div>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin({}), forcedColorsFocusMixin('.cell'), componentStyles],
});
