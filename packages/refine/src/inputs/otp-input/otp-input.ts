import {
  bind,
  createId,
  define,
  getHost,
  html,
  onCleanup,
  onMounted,
  prop,
  useEmit,
  useField,
  useSlots,
} from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { createListControl, lifecycleSignal } from '../../core';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, fieldVariantMixin, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';
import { FIELD_VARIANTS, type FieldVariant } from '../../types';
import { defineFieldValue, dispatchNativeFieldEvent, setFieldValue } from '../shared/native-field-event';
import componentStyles from './otp-input.css?inline';

export type OreOtpInputEvents = {
  change: Event;
  complete: { originalEvent?: Event; value: string };
  input: Event;
};

/** Localizable chrome strings for `ore-otp-input` (see the `labels` property). */
export type OtpLabels = {
  /** Accessible name of the cell group when no visible label is set */
  group: string;
  /** Accessible name of each cell (1-based position) */
  digit: (index: number, total: number) => string;
};

export const DEFAULT_OTP_LABELS: OtpLabels = {
  digit: (index, total) => `Digit ${index} of ${total}`,
  group: 'One-time password',
};

/** OTP Input props */
export type OreOtpInputProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Make inputs disabled */
  disabled?: boolean;
  /** Error message; overrides the helper text and invalidates the cells */
  error?: string;
  /** Helper text shown below the cells */
  helper?: string;
  /** Visible label above the cells (also the group's accessible name) */
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
  variant?: FieldVariant;
  /** Overrides for built-in chrome strings (group/digit) */
  labels?: Partial<OtpLabels>;
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
 * @attr {string} label - Visible label above the cells (accessible name when set)
 * @attr {string} helper - Helper text below the cells
 * @attr {string} error - Error message; overrides helper and invalidates the cells
 * @attr {string} separator - Optional separator character shown in the middle
 *
 * @prop {Partial<OtpLabels>} labels - Chrome string overrides: group/digit(index,total)
 *
 * @fires input - Emitted whenever a cell changes.
 * @fires change - Emitted whenever a cell changes.
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
 * @cssprop --otp-cell-focus-bg - Cell background when focused (flat/bordered variants)
 * @cssprop --otp-cell-focus-border-color - Cell border when focused (flat variant)
 *
 * @part group - Group container.
 * @part wrapper - Root wrapper (label + group + messages).
 * @part label - Visible label element.
 * @part helper - Helper-text element.
 * @part error - Error-message element.
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
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(),
    labels: prop.data<Partial<OtpLabels>>({}),
    length: prop.number(6),
    masked: prop.bool(false),
    name: prop.string(),
    separator: prop.string(),
    type: prop.oneOf(['numeric', 'alphanumeric'] as const, 'numeric'),
    value: prop.string(),
    variant: prop.oneOf(FIELD_VARIANTS),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreOtpInputEvents>();
    const slots = useSlots();

    const labels = computed<OtpLabels>(() => ({ ...DEFAULT_OTP_LABELS, ...props.labels.value }));

    // ── Field chrome (label / helper / error) ────────────────────────────────
    const labelId = createId('otp-label');
    const assistiveId = createId('otp-helper');
    const errorId = createId('otp-error');

    const errorText = computed(() => props.error.value ?? '');
    const helperText = computed(() => props.helper.value ?? '');

    const labelVisible = computed(() => Boolean(props.label.value) || slots.has('label').value);
    const labelHidden = () => !labelVisible.value;
    const helperHidden = () => Boolean(errorText.value) || (!helperText.value && !slots.has('helper').value);
    const errorHidden = () => !errorText.value && !slots.has('error').value;

    const groupLabelledBy = () => (labelVisible.value ? labelId : null);
    const groupAriaLabel = () => (labelVisible.value ? null : labels.value.group);
    const ariaDescribedBy = () => (errorText.value || helperText.value ? assistiveId : null);
    const ariaInvalid = computed<'true' | null>(() => (errorText.value ? 'true' : null));

    const lengthValue = computed(() => Number(props.length.value) || 6);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const cells = computed(() => Array.from({ length: lengthValue.value }, (_, i) => i));
    const otpValue = signal(String(props.value.value || ''));
    const normalizedPropValue = () => String(props.value.value || '');

    // Form association: the joined cell value is the single form value for `name`,
    // since individual per-cell <input> elements inside the shadow root cannot
    // participate in an ancestor <form>'s submission on their own.
    useField<string>({ disabled: isDisabled, toFormValue: (v) => v, value: otpValue });

    bind({
      attr: {
        size: props.size,
        value: () => otpValue.value || null,
        variant: props.variant,
      },
    });

    function getInputs(): HTMLInputElement[] {
      return [...(el.shadowRoot?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];
    }

    const listControl = createListControl({
      getItems: () => getInputs(),
      keys: { next: ['ArrowRight'], prev: ['ArrowLeft'] },
      loop: false,
      onNavigate: ({ item }) => {
        item.focus();
      },
      signal: lifecycleSignal(onCleanup),
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
    defineFieldValue(
      el,
      () => otpValue.value,
      (value) => {
        // Fires for our own otpValue writes too; re-syncing those would left-align
        // a mid-group paste (cells ['', '', '9', …] ← join '9876'). A value that
        // already matches the cells needs no rewrite from either source.
        if (value === getValue()) return;
        syncInputsFromValue(value);
      },
    );
    function emitOtpState(originalEvent?: Event, forceComplete?: boolean): void {
      const allInputs = getInputs();
      const full = getValue();
      const complete = forceComplete ?? (full.length === allInputs.length && full.split('').every(Boolean));

      otpValue.value = full;
      setFieldValue(el, full);
      dispatchNativeFieldEvent(el, 'input');
      dispatchNativeFieldEvent(el, 'change');

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
    function handlePaste(e: ClipboardEvent, startIndex = 0): void {
      e.preventDefault();

      const pasted = e.clipboardData?.getData('text') ?? '';
      const chars = pasted
        .split('')
        .filter((c) => isAllowed(c))
        // Paste fills from the focused cell onward (after autofill or a partial
        // retype, focus sits mid-group; position-dependent paste was a dead end).
        .slice(0, lengthValue.value - startIndex);
      const allInputs = getInputs();

      chars.forEach((char, i) => {
        if (allInputs[startIndex + i]) allInputs[startIndex + i].value = char;
      });

      emitOtpState(e);

      // Focus the cell after the last pasted char
      const focusIdx = Math.min(startIndex + chars.length, allInputs.length - 1);

      allInputs[focusIdx]?.focus();
    }

    watch(props.value, (value) => {
      const next = String(value || '');
      // The attr bind below re-publishes every typed/pasted join as the `value`
      // attribute, which feeds this watcher back; a naive re-sync would drag a
      // mid-group paste (cells ['', '', '9', …]) left to ['', '9', …]. Only
      // external sets that differ from what the cells already hold must re-sync.
      if (next === getValue()) return;
      syncInputsFromValue(next);
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
      <div class="otp-wrapper" part="wrapper">
        <span class="label" id="${labelId}" part="label" ?hidden="${labelHidden}">
          <slot name="label">${props.label}</slot>
        </span>
        <div
          class="otp-group"
          part="group"
          role="group"
          aria-label="${groupAriaLabel}"
          aria-labelledby="${groupLabelledBy}"
          aria-describedby="${ariaDescribedBy}"
          aria-errormessage="${() => (errorText.value ? errorId : null)}"
          aria-invalid="${ariaInvalid}">
          ${() =>
            cells.value.map(
              (i) => html`
                ${() =>
                  separatorIdx.value > 0 && i === separatorIdx.value
                    ? html`
                        <span class="separator" aria-hidden="true">${() => props.separator.value || '-'}</span>
                      `
                    : ''}
                <input
                  class="cell"
                  part="cell"
                  type="${() => (props.masked.value ? 'password' : 'text')}"
                  inputmode="${() => (props.type.value === 'numeric' ? 'numeric' : 'text')}"
                  maxlength="1"
                  autocomplete="${() => (i === 0 ? 'one-time-code' : 'off')}"
                  aria-label="${() => labels.value.digit(i + 1, lengthValue.value)}"
                  disabled="${() => (isDisabled.value ? true : null)}"
                  @input="${(e: Event) => handleInput(e, i)}"
                  @keydown="${(e: KeyboardEvent) => handleKeydown(e, i)}"
                  @paste="${(e: ClipboardEvent) => handlePaste(e, i)}"
                  @focus="${(e: FocusEvent) => (e.target as HTMLInputElement).select()}" />
              `,
            )}
        </div>
        <div class="helper-text" aria-live="polite" id="${assistiveId}" part="helper" ?hidden="${helperHidden}">
          <slot name="helper">${() => helperText.value}</slot>
        </div>
        <div class="helper-text" id="${errorId}" role="alert" part="error" ?hidden="${errorHidden}">
          <slot name="error">${() => errorText.value}</slot>
        </div>
      </div>
    `;
  },
  styles: [
    colorThemeMixin,
    sizeVariantMixin({}),
    forcedColorsFocusMixin('.cell'),
    componentStyles,
    // Must come after `componentStyles`: see `ore-input`'s identical ordering note for why.
    fieldVariantMixin({ accentVar: '--_cell-focus-border', container: '.cell', tokenPrefix: 'otp-cell' }),
  ],
});
