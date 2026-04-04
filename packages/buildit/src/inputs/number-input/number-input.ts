import { define, computed, defineField, html, signal, watch } from '@vielzeug/craftit';
import { createSpinnerControl } from '@vielzeug/craftit/controls';

import type { DisablableProps, SizableProps, ThemableProps, VisualVariant } from '../../types';

import '../../content/icon/icon';
import { disabledStateMixin } from '../../styles';
import { disablableBundle, sizableBundle, themableBundle, type PropBundle } from '../shared/bundles';
// Ensure child components are registered
import '../button/button';
import '../input/input';
import styles from './number-input.css?inline';

export type BitNumberInputEvents = {
  change: { originalEvent?: Event; value: number | null };
  input: { originalEvent?: Event; value: number | null };
};

/** Number Input props */
export type BitNumberInputProps = ThemableProps &
  SizableProps &
  DisablableProps & {
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
    /** Form field name */

    /** Placeholder text */
    placeholder?: string;
    /** Make the input read-only */
    readonly?: boolean;
    /** Step size for increment/decrement */
    step?: number;
    /** Current numeric value */
    value?: number;
    /** Visual variant */
    variant?: VisualVariant;
  };

const numberInputProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  fullwidth: false,
  label: undefined,
  'label-placement': 'inset',
  'large-step': undefined,
  max: undefined,
  min: undefined,
  name: undefined,
  nullable: false,
  placeholder: undefined,
  readonly: false,
  step: 1,
  value: undefined,
  variant: undefined,
} satisfies PropBundle<BitNumberInputProps>;

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
 * @example
 * ```html
 * <bit-number-input label="Quantity" value="1" min="1" max="99" step="1"></bit-number-input>
 * ```
 */
export const NUMBER_INPUT_TAG = define<BitNumberInputProps, BitNumberInputEvents>('bit-number-input', {
  formAssociated: true,
  props: numberInputProps,
  setup({ emit, host, props }) {
    const normalizeValue = (value: number | string | undefined | null): string => (value != null ? String(value) : '');
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isReadonly = computed(() => Boolean(props.readonly.value));
    const inputValue = signal<string>(normalizeValue(props.value.value));
    const committedValue = signal<string>(normalizeValue(props.value.value));
    const syncValueState = (nextValue: string) => {
      if (inputValue.value !== nextValue) inputValue.value = nextValue;

      if (committedValue.value !== nextValue) committedValue.value = nextValue;
    };

    host.bind('attr', {
      value: () => committedValue.value || null,
    });

    defineField(
      {
        disabled: isDisabled,
        value: computed(() => (inputValue.value !== '' ? inputValue.value : null)),
      },
      {
        onReset: () => {
          syncValueState(normalizeValue(props.value.value));
        },
      },
    );
    watch(props.value, (v) => {
      syncValueState(normalizeValue(v));
    });
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
      disabled: () => isDisabled.value,
      largeStep: () => props['large-step'].value,
      max: () => props.max.value,
      min: () => props.min.value,
      parse: parseValue,
      readonly: () => isReadonly.value,
      step: () => props.step.value,
    });

    function handleKeydown(e: KeyboardEvent) {
      spinner.handleKeydown(e);
    }

    const atMin = computed(() => spinner.atMin());
    const atMax = computed(() => spinner.atMax());
    const isNonInteractive = computed(() => isDisabled.value || isReadonly.value);

    return html`
      <div
        class="wrapper"
        role="spinbutton"
        part="control"
        :aria-valuenow="${() => parseValue() ?? null}"
        :aria-valuemin="${() => props.min.value ?? null}"
        :aria-valuemax="${() => props.max.value ?? null}"
        :aria-label="${() => props.label.value || null}"
        :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
        :aria-readonly="${() => (isReadonly.value ? 'true' : null)}"
        @keydown="${handleKeydown}">
        <bit-button
          icon-only
          type="button"
          part="decrement-btn"
          aria-label="Decrease"
          variant="ghost"
          :size="${() => props.size.value || null}"
          :color="${() => props.color.value || null}"
          ?disabled="${() => isNonInteractive.value || atMin.value}"
          @click="${(e: Event) => spinner.incrementBy(-(Number(props.step.value) || 1), e)}"
          ><bit-icon name="minus" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon
        ></bit-button>
        <bit-input
          part="input"
          type="text"
          inputmode="decimal"
          aria-hidden="true"
          :value="${() => inputValue.value}"
          :label="${() => props.label.value || null}"
          :label-placement="${() => props['label-placement'].value}"
          :placeholder="${() => props.placeholder.value || null}"
          :color="${() => props.color.value || null}"
          :size="${() => props.size.value || null}"
          :variant="${() => props.variant.value || null}"
          ?disabled="${() => isDisabled.value}"
          ?readonly="${() => isReadonly.value}"
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
        <bit-button
          icon-only
          type="button"
          part="increment-btn"
          aria-label="Increase"
          variant="ghost"
          :size="${() => props.size.value || null}"
          :color="${() => props.color.value || null}"
          ?disabled="${() => isNonInteractive.value || atMax.value}"
          @click="${(e: Event) => spinner.incrementBy(Number(props.step.value) || 1, e)}"
          ><bit-icon name="plus" size="14" stroke-width="2.5" aria-hidden="true"></bit-icon
        ></bit-button>
      </div>
    `;
  },
  styles: [disabledStateMixin(), styles],
});
