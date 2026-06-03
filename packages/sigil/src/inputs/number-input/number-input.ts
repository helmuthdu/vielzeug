import { clamp } from '@vielzeug/arsenal';
import { computed, define, effect, html, inject, onElement, prop, ref, signal } from '@vielzeug/craft';
import { watch } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { createSpinnerControl } from '../../headless';
import '../../content/icon/icon';
import '../input/input';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { disabledStateMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import styles from './number-input.css?inline';

export type BitNumberInputEvents = {
  change: { originalEvent?: Event; value: number | null };
  input: { originalEvent?: Event; value: number | null };
};

/** Number Input props */
export type BitNumberInputProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Stretch to full width of container */
  fullwidth?: boolean;
  /** Helper text */
  helper?: string;
  /** Visible label */
  label?: string;
  /** Label placement: 'inset' renders the label inside the control box, 'outside' renders it above */
  'label-placement'?: 'inset' | 'outside';
  /** Large step (for Page Up/Down, default: 10 × step) */
  'large-step'?: number;
  /** Maximum allowed value */
  max?: number;
  /** Minimum allowed value */
  min?: number;
  /** Form field name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Make the input read-only */
  readonly?: boolean;
  /**
   * JS-only callback fired with the inner `<input>` element when it mounts,
   * and with `null` when it unmounts.
   * Set as a JS property: `bitNumberInput.ref = (el) => { ... }`.
   */
  ref?: ((el: HTMLInputElement | null) => void) | null;
  /** Border radius */
  rounded?: string;
  /** Component size */
  size?: ComponentSize;
  /** Step size for increment/decrement */
  step?: number;
  /** Current numeric value */
  value?: number;
  /** Visual variant */
  variant?: VisualVariant;
};

/**
 * A numeric spin-button input with +/− controls, min/max clamping, and full keyboard support.
 *
 * @element bit-number-input
 *
 * @attr {number} value - Current value
 * @attr {number} min - Minimum value
 * @attr {number} max - Maximum value
 * @attr {number} step - Increment/decrement step (default: 1)
 * @attr {number} large-step - Step for Page Up/Down (default: 10)
 * @attr {boolean} disabled - Disables the control
 * @attr {boolean} readonly - Read-only mode
 * @attr {string} label - Visible label
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} placeholder - Input placeholder
 *
 * @fires change - On committed value change. detail: { value: number | null, originalEvent?: Event }
 * @fires input - On every keystroke. detail: { value: number | null, originalEvent?: Event }
 *
 * @cssprop --number-input-height - Control height
 * @cssprop --number-input-border-color - Border color
 * @cssprop --number-input-radius - Border radius
 * @cssprop --number-input-bg - Background
 * @cssprop --number-input-btn-bg - Spin button background
 *
 * @part control - Control container.
 * @part decrement-btn - Decrement stepper button.
 * @part input - Input element.
 * @part increment-btn - Increment stepper button.
 * @example
 * ```html
 * <bit-number-input label="Quantity" value="1" min="1" max="99" step="1"></bit-number-input>
 * ```
 */
export const NUMBER_INPUT_TAG = 'bit-number-input' as const;
define<BitNumberInputProps, BitNumberInputEvents>(NUMBER_INPUT_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...roundableBundle,
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    'large-step': prop.json(undefined as number | undefined),
    max: prop.json(undefined as number | undefined),
    min: prop.json(undefined as number | undefined),
    name: prop.string(),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    ref: prop.json(undefined as ((el: HTMLInputElement | null) => void) | null | undefined),
    step: prop.number(1),
    value: prop.json(undefined as number | undefined),
    variant: prop.string<VisualVariant>(),
  },
  setup(props, { bind, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const isDisabled = fCtxProps.disabled;
    const isReadonly = computed(() => Boolean(props.readonly.value));

    // Internal numeric value signal (string representation for the input)
    const fieldValue = signal(props.value.value != null ? String(props.value.value) : '');

    // Keep fieldValue in sync when props.value changes externally
    watch(props.value, (v) => {
      const next = v != null ? String(v) : '';

      if (fieldValue.value !== next) fieldValue.value = next;
    });

    function parseValue(): number | null {
      const v = fieldValue.value.trim();

      if (!v) return null;

      const n = Number.parseFloat(v);

      return Number.isNaN(n) ? null : n;
    }

    function commit(val: number | null, originalEvent?: Event) {
      const min = props.min.value != null ? Number(props.min.value) : undefined;
      const max = props.max.value != null ? Number(props.max.value) : undefined;
      const clamped = val != null ? clamp(val, min, max) : null;
      const nextValue = clamped != null ? String(clamped) : '';

      if (fieldValue.value !== nextValue) fieldValue.value = nextValue;

      emit('change', { originalEvent, value: clamped });
    }

    const spinner = createSpinnerControl({
      commit,
      disabled: isDisabled,
      largeStep: props['large-step'],
      max: props.max,
      min: props.min,
      parse: parseValue,
      readonly: isReadonly,
      step: props.step,
    });

    // Ref to the bit-input host element
    const bitInputRef = ref<HTMLElement>();
    // Raw inner <input> extracted from bit-input's shadow root
    let inputEl: HTMLInputElement | null = null;

    onElement(bitInputRef, (bitInputEl) => {
      const rawInput = bitInputEl.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null;

      if (!rawInput) return;

      inputEl = rawInput;

      // Set inputmode and text-align imperatively
      rawInput.setAttribute('inputmode', 'decimal');

      // Wire change/input events
      const handleChange = (e: Event) => {
        const val = (e.target as HTMLInputElement).value;
        const n = val !== '' ? Number.parseFloat(val) : null;

        commit(Number.isNaN(n ?? NaN) ? null : n, e);
      };

      const handleInput = (e: Event) => {
        const val = (e.target as HTMLInputElement).value;
        const n = val !== '' ? Number.parseFloat(val) : null;

        fieldValue.value = val;
        emit('input', { originalEvent: e, value: Number.isNaN(n ?? NaN) ? null : n });
      };

      rawInput.addEventListener('change', handleChange);
      rawInput.addEventListener('input', handleInput);

      // Fire user ref callback
      props.ref.value?.(rawInput);

      const sub = watch(props.ref, (cb) => {
        cb?.(rawInput);
      });

      return () => {
        sub.dispose();
        props.ref.value?.(null);
        rawInput.removeEventListener('change', handleChange);
        rawInput.removeEventListener('input', handleInput);
        inputEl = null;
      };
    });

    // Keep the raw input's displayed value in sync with fieldValue signal
    effect(() => {
      if (!bitInputRef.value) return;

      const el = inputEl;

      if (el && el.value !== fieldValue.value) el.value = fieldValue.value;
    });

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => fieldValue.value || null,
        variant: fCtxProps.variant,
      },
    });

    const isNonInteractive = computed(() => isDisabled.value || isReadonly.value);

    return html`
      <div
        class="wrapper"
        role="spinbutton"
        part="control"
        :aria-valuenow="${() => parseValue() ?? null}"
        :aria-valuemin="${() => props.min.value}"
        :aria-valuemax="${() => props.max.value}"
        :aria-label="${() => props.label.value}"
        :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
        :aria-readonly="${() => (isReadonly.value ? 'true' : null)}"
        @keydown="${(e: KeyboardEvent) => spinner.handleKeydown(e)}">
        <button
          type="button"
          part="decrement-btn"
          aria-label="Decrease"
          ?disabled="${() => isNonInteractive.value || spinner.atMin()}"
          @click="${(e: Event) => spinner.incrementBy(-(Number(props.step.value) || 1), e)}">
          <bit-icon name="minus" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon>
        </button>
        <bit-input
          class="field"
          part="field"
          ref="${bitInputRef}"
          :label="${() => props.label.value ?? ''}"
          :label-placement="${() => props['label-placement'].value ?? 'inset'}"
          :placeholder="${() => props.placeholder.value ?? ''}"
          :name="${() => props.name.value ?? ''}"
          :helper="${() => props.helper.value ?? ''}"
          :error="${() => props.error.value ?? ''}"
          :size="${fCtxProps.size}"
          :color="${() => props.color.value ?? ''}"
          :variant="${() => props.variant.value ?? ''}"
          ?rounded="${() => props.rounded.value}"
          ?disabled="${isDisabled}"
          ?readonly="${isReadonly}"
          ?fullwidth="${() => false}">
        </bit-input>
        <button
          type="button"
          part="increment-btn"
          aria-label="Increase"
          ?disabled="${() => isNonInteractive.value || spinner.atMax()}"
          @click="${(e: Event) => spinner.incrementBy(Number(props.step.value) || 1, e)}">
          <bit-icon name="plus" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon>
        </button>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [disabledStateMixin(), styles],
});
