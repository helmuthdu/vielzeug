import { computed, defineComponent, defineField, html, signal, watch } from '@vielzeug/craftit';

import type { DisablableProps, SizableProps, ThemableProps, VisualVariant } from '../../types';

import { minusIcon, plusIcon } from '../../icons';
import { disabledStateMixin } from '../../styles';
// Ensure child components are registered
import '../../actions/button/button';
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
export const NUMBER_INPUT_TAG = defineComponent<BitNumberInputProps, BitNumberInputEvents>({
  formAssociated: true,
  props: {
    color: { default: undefined },
    disabled: { default: false },
    fullwidth: { default: false },
    label: { default: undefined },
    'label-placement': { default: 'inset' },
    'large-step': { default: undefined },
    max: { default: undefined },
    min: { default: undefined },
    name: { default: undefined },
    nullable: { default: false },
    placeholder: { default: undefined },
    readonly: { default: false },
    size: { default: undefined },
    step: { default: 1 },
    value: { default: undefined },
    variant: { default: undefined },
  },
  setup({ emit, host, props }) {
    const inputValue = signal<string>(props.value.value != null ? String(props.value.value) : '');

    defineField(
      {
        disabled: computed(() => Boolean(props.disabled.value)),
        value: computed(() => (inputValue.value !== '' ? inputValue.value : null)),
      },
      {
        onReset: () => {
          inputValue.value = props.value.value != null ? String(props.value.value) : '';
        },
      },
    );
    watch(props.value, (v) => {
      const newVal = v != null ? String(v) : '';

      if (inputValue.value !== newVal) inputValue.value = newVal;
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

      inputValue.value = clamped != null ? String(clamped) : '';

      if (clamped != null) host.setAttribute('value', String(clamped));
      else host.removeAttribute('value');

      emit('change', { originalEvent, value: clamped });
    }
    function increment(delta: number, originalEvent?: Event) {
      if (props.disabled.value || props.readonly.value) return;

      const current = parseValue() ?? (props.min.value != null ? Number(props.min.value) : 0);

      commit(current + delta, originalEvent);
    }
    function handleKeydown(e: KeyboardEvent) {
      if (props.disabled.value || props.readonly.value) return;

      const step = Number(props.step.value) || 1;
      const largeStep = Number(props['large-step'].value) || step * 10;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          increment(-step, e);
          break;
        case 'ArrowUp':
          e.preventDefault();
          increment(step, e);
          break;
        case 'End':
          if (props.max.value != null) {
            e.preventDefault();
            commit(Number(props.max.value), e);
          }

          break;
        case 'Home':
          if (props.min.value != null) {
            e.preventDefault();
            commit(Number(props.min.value), e);
          }

          break;
        case 'PageDown':
          e.preventDefault();
          increment(-largeStep, e);
          break;
        case 'PageUp':
          e.preventDefault();
          increment(largeStep, e);
          break;
      }
    }

    const atMin = computed(
      () => props.min.value != null && parseValue() != null && parseValue()! <= Number(props.min.value),
    );
    const atMax = computed(
      () => props.max.value != null && parseValue() != null && parseValue()! >= Number(props.max.value),
    );

    return html`
      <div
        class="wrapper"
        role="spinbutton"
        part="control"
        :aria-valuenow="${() => parseValue() ?? null}"
        :aria-valuemin="${() => props.min.value ?? null}"
        :aria-valuemax="${() => props.max.value ?? null}"
        :aria-label="${() => props.label.value || null}"
        :aria-disabled="${() => (props.disabled.value ? 'true' : null)}"
        :aria-readonly="${() => (props.readonly.value ? 'true' : null)}"
        @keydown="${handleKeydown}">
        <bit-button
          icon-only
          type="button"
          part="decrement-btn"
          aria-label="Decrease"
          variant="ghost"
          :size="${() => props.size.value || null}"
          :color="${() => props.color.value || null}"
          ?disabled="${() => props.disabled.value || props.readonly.value || atMin.value}"
          @click="${(e: Event) => increment(-(Number(props.step.value) || 1), e)}"
          >${minusIcon}</bit-button
        >
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
          ?disabled="${() => props.disabled.value}"
          ?readonly="${() => props.readonly.value}"
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
          ?disabled="${() => props.disabled.value || props.readonly.value || atMax.value}"
          @click="${(e: Event) => increment(Number(props.step.value) || 1, e)}"
          >${plusIcon}</bit-button
        >
      </div>
    `;
  },
  styles: [disabledStateMixin(), styles],
  tag: 'bit-number-input',
});
