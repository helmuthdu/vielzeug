import { computed, css, define, defineEmits, defineField, defineProps, html, signal, watch } from '@vielzeug/craftit';
import { disabledStateMixin } from '../../styles';
import type {
  AddEventListeners,
  DisablableProps,
  FormValidityMethods,
  SizableProps,
  ThemableProps,
  VisualVariant,
} from '../../types';

// Ensure child components are registered
import '../../actions/button/button';
import '../input/input';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: inline-flex;
      width: fit-content;
    }

    :host([fullwidth]) {
      width: 100%;
    }

    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--size-1);
      width: 100%;
    }

    /* Style the inner <input> through bit-input's exported part */
    bit-input::part(input) {
      text-align: center;
    }

    bit-input {
      width: var(--size-20);
    }

    :host([fullwidth]) bit-input {
      flex: 1;
      min-width: 0;
      width: auto;
    }
  }
`;

/** Number Input events */
export interface BitNumberInputEvents {
  change: CustomEvent<{ value: number | null }>;
  input: CustomEvent<{ value: number | null }>;
}

/** Number Input props */
export interface NumberInputProps extends ThemableProps, SizableProps, DisablableProps {
  /** Current numeric value */
  value?: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step size for increment/decrement */
  step?: number;
  /** Large step (for Page Up/Down, default: 10 × step) */
  'large-step'?: number;
  /** Make the input read-only */
  readonly?: boolean;
  /** Visible label */
  label?: string;
  /** Label placement: 'inset' renders the label inside the control box, 'outside' renders it above */
  'label-placement'?: 'inset' | 'outside';
  /** Form field name */

  name?: string;
  /** Visual variant */
  variant?: VisualVariant;
  /** Placeholder text */
  placeholder?: string;
  /** Allow null/empty value */
  nullable?: boolean;
  /** Stretch to full width of container */
  fullwidth?: boolean;
}

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
 * @fires change - On committed value change, with { value: number | null }
 * @fires input - On every keystroke, with { value: number | null }
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
export const TAG = define(
  'bit-number-input',
  ({ host }) => {
    const props = defineProps<NumberInputProps>({
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
    });

    const emit = defineEmits<{ change: { value: number | null }; input: { value: number | null } }>();

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

    function commit(val: number | null) {
      const clamped = val != null ? clamp(val) : null;
      inputValue.value = clamped != null ? String(clamped) : '';
      if (clamped != null) host.setAttribute('value', String(clamped));
      else host.removeAttribute('value');
      emit('change', { value: clamped });
    }

    function increment(delta: number) {
      if (props.disabled.value || props.readonly.value) return;
      const current = parseValue() ?? (props.min.value != null ? Number(props.min.value) : 0);
      commit(current + delta);
    }

    function handleKeydown(e: KeyboardEvent) {
      if (props.disabled.value || props.readonly.value) return;
      const step = Number(props.step.value) || 1;
      const largeStep = Number(props['large-step'].value) || step * 10;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          increment(step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          increment(-step);
          break;
        case 'PageUp':
          e.preventDefault();
          increment(largeStep);
          break;
        case 'PageDown':
          e.preventDefault();
          increment(-largeStep);
          break;
        case 'Home':
          if (props.min.value != null) {
            e.preventDefault();
            commit(Number(props.min.value));
          }
          break;
        case 'End':
          if (props.max.value != null) {
            e.preventDefault();
            commit(Number(props.max.value));
          }
          break;
      }
    }

    const atMin = computed(
      () => props.min.value != null && parseValue() != null && parseValue()! <= Number(props.min.value),
    );
    const atMax = computed(
      () => props.max.value != null && parseValue() != null && parseValue()! >= Number(props.max.value),
    );

    return {
      styles: [disabledStateMixin(), styles],
      template: html`
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
        @keydown="${handleKeydown}"
      >
        <bit-button
          icon-only
          type="button"
          part="decrement-btn"
          aria-label="Decrease"
          variant="ghost"
          :size="${() => props.size.value || null}"
          :color="${() => props.color.value || null}"
          ?disabled="${() => props.disabled.value || props.readonly.value || atMin.value}"
          @click="${() => increment(-(Number(props.step.value) || 1))}"
        ><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg></bit-button>
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
            const v = (e as CustomEvent<{ value?: string }>).detail?.value;
            if (typeof v !== 'string') return;
            inputValue.value = v;
            emit('input', { value: parseValue() });
          }}"
          @change="${(e: Event) => {
            const v = (e as CustomEvent<{ value?: string }>).detail?.value;
            if (typeof v !== 'string') return;
            inputValue.value = v;
            commit(parseValue());
          }}"
        ></bit-input>
        <bit-button
          icon-only
          type="button"
          part="increment-btn"
          aria-label="Increase"
          variant="ghost"
          :size="${() => props.size.value || null}"
          :color="${() => props.color.value || null}"
          ?disabled="${() => props.disabled.value || props.readonly.value || atMax.value}"
          @click="${() => increment(Number(props.step.value) || 1)}"
        ><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></bit-button>
      </div>
    `,
    };
  },
  { formAssociated: true },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-number-input': HTMLElement & NumberInputProps & FormValidityMethods & AddEventListeners<BitNumberInputEvents>;
  }
}
