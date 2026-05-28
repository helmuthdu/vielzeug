import { computed, define, defineField, html, inject, prop, signal, watch } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { createSpinnerControl } from '../../headless';
import '../../content/icon/icon';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared/config';
import { disabledStateMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
// Ensure child components are registered
import '../button/button';
import '../input/input';
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
  /** Stretch to full width of container */
  fullwidth?: boolean;
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
  name?: string;
  /** Allow null/empty value */
  nullable?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Form field name */

  /** Make the input read-only */
  readonly?: boolean;
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
export const NUMBER_INPUT_TAG = define<BitNumberInputProps, BitNumberInputEvents>('bit-number-input', {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    fullwidth: prop.bool(false),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    'large-step': prop.json(undefined as number | undefined),
    max: prop.json(undefined as number | undefined),
    min: prop.json(undefined as number | undefined),
    name: prop.string(),
    nullable: prop.bool(false),
    placeholder: prop.string(),
    readonly: prop.bool(false),
    step: prop.number(1),
    value: prop.json(undefined as number | undefined),
    variant: prop.string<VisualVariant>(),
  },
  setup(props, { bind, el: _el, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const normalizeValue = (value: number | string | undefined | null): string => (value != null ? String(value) : '');
    const isDisabled = fCtxProps.disabled;
    const isReadonly = computed(() => Boolean(props.readonly.value));
    const inputValue = signal<string>(normalizeValue(props.value.value));
    const committedValue = signal<string>(normalizeValue(props.value.value));
    const syncValueState = (nextValue: string) => {
      if (inputValue.value !== nextValue) inputValue.value = nextValue;

      if (committedValue.value !== nextValue) committedValue.value = nextValue;
    };

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => committedValue.value || null,
        variant: fCtxProps.variant,
      },
    });

    defineField({
      disabled: isDisabled,
      value: computed(() => (inputValue.value !== '' ? inputValue.value : null)),
    });

    watch(
      props.value,
      (v) => {
        syncValueState(normalizeValue(v));
      },
      { immediate: true },
    );
    function clamp(n: number): number {
      const min = props.min.value;
      const max = props.max.value;

      if (min != null && n < Number(min)) return Number(min);

      if (max != null && n > Number(max)) return Number(max);

      return n;
    }
    function parseValue(): number | null {
      const v = inputValue.value.trim();

      if (!v) return null;

      const n = Number.parseFloat(v);

      return Number.isNaN(n) ? null : n;
    }
    function commit(val: number | null, originalEvent?: Event) {
      const clamped = val != null ? clamp(val) : null;
      const nextValue = clamped != null ? String(clamped) : '';

      syncValueState(nextValue);

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

    function handleKeydown(e: KeyboardEvent) {
      spinner.handleKeydown(e);
    }

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
        @keydown="${handleKeydown}">
        <button
          type="button"
          part="decrement-btn"
          aria-label="Decrease"
          ?disabled="${() => isNonInteractive.value || spinner.atMin()}"
          @click="${(e: Event) => spinner.incrementBy(-(Number(props.step.value) || 1), e)}">
          <bit-icon name="minus" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon>
        </button>
        <bit-input
          part="input"
          type="text"
          inputmode="decimal"
          aria-hidden="true"
          :value="${inputValue}"
          :label="${() => props.label.value}"
          :label-placement="${() => props['label-placement'].value}"
          :placeholder="${() => props.placeholder.value}"
          :color="${() => props.color.value}"
          :size="${() => props.size.value}"
          :variant="${() => props.variant.value}"
          ?disabled="${isDisabled}"
          ?readonly="${isReadonly}"
          @input="${(e: Event) => {
            const v = (
              e as CustomEvent<{
                value?: string;
              }>
            ).detail?.value;

            if (typeof v !== 'string') return;

            inputValue.value = v;

            const originalEvent = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent ?? e;

            emit('input', { originalEvent, value: parseValue() });
          }}"
          @change="${(e: Event) => {
            const v = (
              e as CustomEvent<{
                value?: string;
              }>
            ).detail?.value;

            if (typeof v !== 'string') return;

            inputValue.value = v;

            const originalEvent = (e as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent ?? e;

            commit(parseValue(), originalEvent);
          }}"></bit-input>
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
