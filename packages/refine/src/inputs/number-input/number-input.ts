import { clamp } from '@vielzeug/arsenal';
import { define, html, inject, prop, ref, bind, onElement, useEmit, watchEffect } from '@vielzeug/ore';
import { computed, signal, watch as rippleWatch } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { createSpinnerControl } from '../../headless';
import '../../content/icon/icon';
import '../input/input';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { disabledStateMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './number-input.css?inline';

export type OreNumberInputEvents = {
  change: { originalEvent?: Event; value: number | null };
  input: { originalEvent?: Event; value: number | null };
};

/** Number Input props */
export type OreNumberInputProps = {
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
 * @element ore-number-input
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
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} placeholder - Input placeholder
 *
 * @fires change - On committed value change. detail: { value: number | null, originalEvent?: Event }
 * @fires input - On every keystroke. detail: { value: number | null, originalEvent?: Event }
 *
 * @slot prefix - Content before the input (e.g. icon)
 * @slot suffix - Content after the input (e.g. unit label)
 * @slot label - Custom label content
 * @slot helper - Custom helper text content
 * @slot error - Custom error content
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
 * <ore-number-input label="Quantity" value="1" min="1" max="99" step="1"></ore-number-input>
 * ```
 */
export const NUMBER_INPUT_TAG = 'ore-number-input' as const;
define<OreNumberInputProps>(NUMBER_INPUT_TAG, {
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
  setup(props) {
    const emit = useEmit<OreNumberInputEvents>();
    const watch = watchEffect;

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);
    const isDisabled = fCtxProps.disabled;
    const isReadonly = computed(() => Boolean(props.readonly.value));

    // Internal numeric value signal (string representation for the input)
    const fieldValue = signal(props.value.value != null ? String(props.value.value) : '');

    // Keep fieldValue in sync when props.value changes externally
    rippleWatch(props.value, (v) => {
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

    // Composition uses ore-input's own documented `ref` prop (fired with the raw
    // <input> on mount, `null` on unmount) instead of reaching into its shadow DOM —
    // see `packages/refine/AGENTS.md` / input.ts's `ref` JSDoc for the supported contract.
    // Set imperatively (rather than declared in the template) because ore's template
    // engine treats a function-valued attr binding as a reactive getter to invoke, not
    // a literal value to assign — a plain property assignment avoids that entirely.
    const bitInputRef = ref<HTMLElementTagNameMap['ore-input']>();
    let stopAriaWatch: (() => void) | null = null;
    let detachListeners: (() => void) | null = null;
    let refSub: { dispose(): void } | null = null;

    const handleFieldRef = (rawInput: HTMLInputElement | null): void => {
      if (!rawInput) {
        stopAriaWatch?.();
        detachListeners?.();
        refSub?.dispose();
        stopAriaWatch = null;
        detachListeners = null;
        refSub = null;
        props.ref.value?.(null);

        return;
      }

      rawInput.setAttribute('inputmode', 'decimal');
      // The wrapper div is a plain layout container — WAI-ARIA spinbutton semantics
      // live on the actually-focusable element (the raw <input> rendered by ore-input).
      rawInput.setAttribute('role', 'spinbutton');

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
      detachListeners = () => {
        rawInput.removeEventListener('change', handleChange);
        rawInput.removeEventListener('input', handleInput);
      };

      stopAriaWatch = watch(() => {
        const now = parseValue();

        if (now == null) rawInput.removeAttribute('aria-valuenow');
        else rawInput.setAttribute('aria-valuenow', String(now));

        if (props.min.value != null) rawInput.setAttribute('aria-valuemin', String(props.min.value));
        else rawInput.removeAttribute('aria-valuemin');

        if (props.max.value != null) rawInput.setAttribute('aria-valuemax', String(props.max.value));
        else rawInput.removeAttribute('aria-valuemax');

        if (isReadonly.value) rawInput.setAttribute('aria-readonly', 'true');
        else rawInput.removeAttribute('aria-readonly');
      });

      // Fire user ref callback
      props.ref.value?.(rawInput);

      refSub = rippleWatch(props.ref, (cb) => {
        cb?.(rawInput);
      });
    };

    // ore-input's own onElement/ref lifecycle calls this back with `null` when its
    // inner <input> unmounts, so no explicit teardown is needed here.
    onElement(bitInputRef, (bitInputEl) => {
      bitInputEl.ref = handleFieldRef;
    });

    bind({
      attr: {
        size: fCtxProps.size,
        value: () => fieldValue.value || null,
        variant: fCtxProps.variant,
      },
    });

    const isNonInteractive = computed(() => isDisabled.value || isReadonly.value);

    // The stepper buttons are slotted *into* ore-input's own `prefix`/`suffix` slots instead of
    // sitting outside it in a separate wrapper — they render inside ore-input's own bordered
    // box (same as its built-in clear/password-toggle buttons), matching every other field's
    // single-box look instead of floating as two detached icon buttons either side of a
    // narrow field. `@keydown` moves to ore-input itself: native keyboard events are
    // `composed: true` and bubble out past a shadow boundary, so it still sees keydowns
    // originating from ore-input's internal <input> as well as from these slotted buttons.
    return html`
      <ore-input
        class="field"
        part="field control"
        ref="${bitInputRef}"
        :value="${() => fieldValue.value}"
        :label="${() => props.label.value ?? ''}"
        :label-placement="${() => props['label-placement'].value ?? 'inset'}"
        :placeholder="${() => props.placeholder.value ?? ''}"
        :name="${() => props.name.value ?? ''}"
        :helper="${() => props.helper.value ?? ''}"
        :error="${() => props.error.value ?? ''}"
        :size="${fCtxProps.size}"
        :color="${() => props.color.value ?? ''}"
        :variant="${() => props.variant.value ?? ''}"
        :rounded="${() => props.rounded.value}"
        ?disabled="${isDisabled}"
        ?readonly="${isReadonly}"
        ?fullwidth="${() => props.fullwidth.value}"
        @keydown="${(e: KeyboardEvent) => spinner.handleKeydown(e)}">
        <button
          slot="prefix"
          type="button"
          part="decrement-btn"
          aria-label="Decrease"
          ?disabled="${() => isNonInteractive.value || spinner.atMin()}"
          @click="${(e: Event) => spinner.incrementBy(-(Number(props.step.value) || 1), e)}">
          <ore-icon name="minus" size="14" stroke-width="2.5" aria-hidden="true"></ore-icon>
        </button>
        <button
          slot="suffix"
          type="button"
          part="increment-btn"
          aria-label="Increase"
          ?disabled="${() => isNonInteractive.value || spinner.atMax()}"
          @click="${(e: Event) => spinner.incrementBy(Number(props.step.value) || 1, e)}">
          <ore-icon name="plus" size="14" stroke-width="2.5" aria-hidden="true"></ore-icon>
        </button>
      </ore-input>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [disabledStateMixin, componentStyles],
});
