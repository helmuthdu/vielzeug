import { bind, createId, define, getHost, html, onCleanup, prop, useEmit } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { createSpinnerControl } from '../../core';
import type { ComponentSize, ThemeColor } from '../../types';
import '../../content/icon/icon';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { coarsePointerMixin, colorThemeMixin, disabledStateMixin, reducedMotionMixin } from '../../styles';
import componentStyles from './counter.css?inline';

export type OreCounterChangeDetail = {
  /** Difference between the new and the previous value */
  delta: number;
  /** New value after clamping */
  value: number;
};

export type OreCounterEvents = {
  change: OreCounterChangeDetail;
};

/** Counter props */
export type OreCounterProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** One-line timing or usage hint rendered under the controls */
  hint?: string;
  /** Visible label; also names the control for assistive technology */
  label?: string;
  /** Step for Page Up/Down (default: 10 × step) */
  'large-step'?: number;
  /** Maximum allowed value */
  max?: number;
  /** Minimum allowed value (default: 0) */
  min?: number;
  /** Render an outer pair of −/+ buttons that move by `large-step` */
  'quick-steps'?: boolean;
  /** Show the value without controls */
  readonly?: boolean;
  /** Component size */
  size?: ComponentSize;
  /** Increment/decrement step (default: 1) */
  step?: number;
  /** Current value */
  value?: number;
};

/** Hold delay before auto-repeat starts, then the repeat interval. */
export const COUNTER_HOLD_DELAY_MS = 400;
export const COUNTER_HOLD_REPEAT_MS = 120;

/**
 * A large-target tally control for counting things at a glance: `−` / value / `+` with an
 * optional icon, label and hint. Designed for touch and arm's-length use (tabletop trackers,
 * inventories, scoreboards) rather than typed form entry — use `ore-number-input` for that.
 *
 * Holding any button auto-repeats. The value is announced through a live region and is
 * keyboard-operable as a spinbutton (Arrow keys, Home/End, Page Up/Down). Set `quick-steps` to add an
 * outer pair of buttons that move by `large-step`, for values that change in chunks (damage, scores).
 *
 * @element ore-counter
 *
 * @attr {number} value - Current value (default: 0)
 * @attr {number} min - Minimum value (default: 0)
 * @attr {number} max - Maximum value
 * @attr {number} step - Increment/decrement step (default: 1)
 * @attr {number} large-step - Step for Page Up/Down and the quick-step buttons (default: 10 × step)
 * @attr {boolean} quick-steps - Adds an outer −/+ pair that moves by `large-step`
 * @attr {boolean} disabled - Disables the control
 * @attr {boolean} readonly - Shows the value without the −/+ buttons
 * @attr {string} label - Visible label and accessible name
 * @attr {string} hint - One-line hint under the controls
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 *
 * @fires change - Fired after every accepted change. detail: { value: number, delta: number }
 *
 * @slot icon - Leading icon or token artwork shown before the label
 * @slot hint - Custom hint content (replaces the `hint` attribute)
 *
 * @cssprop --counter-value-size - Font size of the value
 * @cssprop --counter-button-size - Width/height of the −/+ buttons
 * @cssprop --counter-gap - Gap between the buttons and the value
 * @cssprop --counter-bg - Background of the control
 * @cssprop --counter-border-color - Border color of the control
 * @cssprop --counter-radius - Border radius of the control
 * @cssprop --counter-icon-size - Size of the slotted icon
 *
 * @part counter - Root container.
 * @part header - Icon and label row.
 * @part label - Label element.
 * @part controls - Buttons and value row.
 * @part decrement-large-btn - Quick-step decrement button (`quick-steps` only).
 * @part decrement-btn - Decrement button.
 * @part value - Value output.
 * @part increment-btn - Increment button.
 * @part increment-large-btn - Quick-step increment button (`quick-steps` only).
 * @part hint - Hint element.
 *
 * @example
 * ```html
 * <ore-counter label="Stamina" value="3" hint="Pay for actions">
 *   <ore-icon slot="icon" name="zap"></ore-icon>
 * </ore-counter>
 * <ore-counter label="Score" value="10" min="0" max="99" size="lg" color="primary"></ore-counter>
 * <ore-counter label="Damage" value="12" large-step="5" quick-steps></ore-counter>
 * ```
 */
export const COUNTER_TAG = 'ore-counter' as const;
define<OreCounterProps>(COUNTER_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    hint: prop.string(),
    label: prop.string(),
    'large-step': prop.json(undefined as number | undefined),
    max: prop.json(undefined as number | undefined),
    min: prop.number(0),
    'quick-steps': prop.bool(false),
    readonly: prop.bool(false),
    step: prop.number(1),
    value: prop.number(0),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OreCounterEvents>();
    const labelId = createId('counter-label');
    const hintId = createId('counter-hint');

    const current = signal(Number(props.value.value) || 0);

    watch(props.value, (next) => {
      const parsed = Number(next);

      if (Number.isFinite(parsed) && parsed !== current.value) current.value = parsed;
    });

    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isReadonly = computed(() => Boolean(props.readonly.value));
    const isInteractive = computed(() => !isDisabled.value && !isReadonly.value);
    const hasHint = computed(() => Boolean(props.hint.value));

    // Toggled briefly on every change so the CSS bump animation restarts.
    const bumped = signal(false);
    let bumpTimer: ReturnType<typeof setTimeout> | null = null;

    const commit = (next: number | null): void => {
      if (next == null) return;

      const delta = next - current.value;

      if (delta === 0) return;

      current.value = next;
      el.setAttribute('value', String(next));
      emit('change', { delta, value: next });

      if (bumpTimer) clearTimeout(bumpTimer);
      bumped.value = false;
      bumped.value = true;
      bumpTimer = setTimeout(() => {
        bumped.value = false;
        bumpTimer = null;
      }, 200);
    };

    const spinner = createSpinnerControl({
      commit,
      disabled: isDisabled,
      largeStep: props['large-step'],
      max: props.max,
      min: props.min,
      parse: () => current.value,
      readonly: isReadonly,
      step: props.step,
    });

    const stepSize = (): number => Number(props.step.value) || 1;
    const largeStepSize = (): number => Number(props['large-step'].value) || stepSize() * 10;
    const hasQuickSteps = computed(() => Boolean(props['quick-steps'].value));

    // ── Press-and-hold auto-repeat ──────────────────────────────────────────
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let repeatTimer: ReturnType<typeof setInterval> | null = null;
    let repeated = false;

    const stopHold = (): void => {
      if (holdTimer) clearTimeout(holdTimer);
      if (repeatTimer) clearInterval(repeatTimer);
      holdTimer = null;
      repeatTimer = null;
    };

    const startHold = (amount: () => number, e: PointerEvent): void => {
      if (!isInteractive.value || e.button !== 0) return;

      stopHold();
      repeated = false;
      holdTimer = setTimeout(() => {
        repeated = true;
        spinner.incrementBy(amount(), e);
        repeatTimer = setInterval(() => {
          const direction = amount();

          if ((direction > 0 && spinner.atMax()) || (direction < 0 && spinner.atMin())) {
            stopHold();

            return;
          }

          spinner.incrementBy(direction, e);
        }, COUNTER_HOLD_REPEAT_MS);
      }, COUNTER_HOLD_DELAY_MS);
    };

    // The click that ends a long-press must not add one more step on top of the repeats.
    const handleClick = (amount: () => number, e: Event): void => {
      if (repeated) {
        repeated = false;

        return;
      }

      spinner.incrementBy(amount(), e);
    };

    const small = (direction: 1 | -1) => (): number => direction * stepSize();
    const large = (direction: 1 | -1) => (): number => direction * largeStepSize();
    const quickLabel = (direction: 1 | -1) => (): string => `${direction > 0 ? '+' : '−'}${largeStepSize()}`;

    onCleanup(() => {
      stopHold();
      if (bumpTimer) clearTimeout(bumpTimer);
    });

    bind({
      attr: {
        'data-bump': () => (bumped.value ? '' : null),
        size: props.size,
      },
    });

    const describedBy = computed(() => (hasHint.value ? hintId : null));

    return html`
      <div class="counter" part="counter" role="group" aria-labelledby="${labelId}">
        <div class="header" part="header">
          <slot name="icon"></slot>
          <span class="label" part="label" id="${labelId}">${() => props.label.value ?? ''}</span>
        </div>
        <div class="controls" part="controls" @keydown="${(e: KeyboardEvent) => spinner.handleKeydown(e)}">
          <button
            class="btn btn-large"
            part="decrement-large-btn"
            type="button"
            tabindex="-1"
            aria-label="${() => `Decrease ${props.label.value ?? ''} by ${largeStepSize()}`.trim()}"
            ?hidden="${() => isReadonly.value || !hasQuickSteps.value}"
            ?disabled="${() => !isInteractive.value || spinner.atMin()}"
            @pointerdown="${(e: PointerEvent) => startHold(large(-1), e)}"
            @pointerup="${stopHold}"
            @pointercancel="${stopHold}"
            @pointerleave="${stopHold}"
            @click="${(e: Event) => handleClick(large(-1), e)}">
            ${quickLabel(-1)}
          </button>
          <button
            class="btn"
            part="decrement-btn"
            type="button"
            tabindex="-1"
            aria-label="${() => `Decrease ${props.label.value ?? ''}`.trim()}"
            ?hidden="${isReadonly}"
            ?disabled="${() => !isInteractive.value || spinner.atMin()}"
            @pointerdown="${(e: PointerEvent) => startHold(small(-1), e)}"
            @pointerup="${stopHold}"
            @pointercancel="${stopHold}"
            @pointerleave="${stopHold}"
            @click="${(e: Event) => handleClick(small(-1), e)}">
            <ore-icon name="minus" size="var(--_icon-size)" stroke-width="2.5" aria-hidden="true"></ore-icon>
          </button>
          <output
            class="value"
            part="value"
            role="spinbutton"
            aria-live="polite"
            aria-labelledby="${labelId}"
            aria-describedby="${describedBy}"
            aria-valuenow="${() => String(current.value)}"
            aria-valuemin="${() => (props.min.value != null ? String(props.min.value) : null)}"
            aria-valuemax="${() => (props.max.value != null ? String(props.max.value) : null)}"
            aria-readonly="${() => (isReadonly.value ? 'true' : null)}"
            aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
            tabindex="${() => (isDisabled.value ? '-1' : '0')}">
            ${() => String(current.value)}
          </output>
          <button
            class="btn"
            part="increment-btn"
            type="button"
            tabindex="-1"
            aria-label="${() => `Increase ${props.label.value ?? ''}`.trim()}"
            ?hidden="${isReadonly}"
            ?disabled="${() => !isInteractive.value || spinner.atMax()}"
            @pointerdown="${(e: PointerEvent) => startHold(small(1), e)}"
            @pointerup="${stopHold}"
            @pointercancel="${stopHold}"
            @pointerleave="${stopHold}"
            @click="${(e: Event) => handleClick(small(1), e)}">
            <ore-icon name="plus" size="var(--_icon-size)" stroke-width="2.5" aria-hidden="true"></ore-icon>
          </button>
          <button
            class="btn btn-large"
            part="increment-large-btn"
            type="button"
            tabindex="-1"
            aria-label="${() => `Increase ${props.label.value ?? ''} by ${largeStepSize()}`.trim()}"
            ?hidden="${() => isReadonly.value || !hasQuickSteps.value}"
            ?disabled="${() => !isInteractive.value || spinner.atMax()}"
            @pointerdown="${(e: PointerEvent) => startHold(large(1), e)}"
            @pointerup="${stopHold}"
            @pointercancel="${stopHold}"
            @pointerleave="${stopHold}"
            @click="${(e: Event) => handleClick(large(1), e)}">
            ${quickLabel(1)}
          </button>
        </div>
        <slot name="hint">
          <span class="hint" part="hint" id="${hintId}" ?hidden="${() => !hasHint.value}">
            ${() => props.hint.value ?? ''}
          </span>
        </slot>
      </div>
    `;
  },
  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, disabledStateMixin, coarsePointerMixin, reducedMotionMixin, componentStyles],
});
