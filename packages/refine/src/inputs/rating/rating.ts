import { bind, createId, define, getHost, html, prop, useField, useSlots } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { createSliderControl } from '../../core';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, sizeVariantMixin, touchTargetMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';
import { defineFieldValue, dispatchNativeFieldEvent, setFieldValue } from '../shared/native-field-event';
import componentStyles from './rating.css?inline';

export type OreRatingEvents = {
  change: Event;
  input: Event;
};

/** Localizable strings for the rating control. */
export type RatingLabels = {
  /** `aria-valuetext` shown when nothing is rated. */
  unrated: string;
  /** `aria-valuetext` for a selected rating. */
  value: (value: number, max: number) => string;
};

/** Default (English) rating labels. */
export const DEFAULT_RATING_LABELS: RatingLabels = {
  unrated: 'Not rated',
  value: (value, max) => `${value} out of ${max} ${max === 1 ? 'star' : 'stars'}`,
};

/** Rating props */
export type OreRatingProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Re-clicking the selected star clears the rating back to 0 */
  clearable?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message: marks the field as invalid */
  error?: string;
  /** Helper text displayed below the stars */
  helper?: string;
  /** Visible label above the stars (falls back to an accessible-only label when unset) */
  label?: string;
  /** Localized `aria-valuetext` strings */
  labels?: Partial<RatingLabels>;
  /** Maximum rating (number of stars) */
  max?: number;
  /** Form field name */
  name?: string;
  /** Selection granularity: `1` or `0.5` stars */
  precision?: number;
  /** Make rating read-only */
  readonly?: boolean;
  /** Mark the field as required (blocks form submission until rated) */
  required?: boolean;
  /** Component size */
  size?: ComponentSize;
  /** Current rating value */
  value?: number;
};

/**
 * A star rating control.
 *
 * Implements the WAI-ARIA slider rating pattern: the star row is a single
 * focusable `role="slider"`, arrows adjust by `precision`, Home/End jump to
 * 0/max, click or drag sets the star (the right half of a star with
 * `precision="0.5"` selects the half step). Selected stars are always filled,
 * so filled-vs-outline carries the value without relying on color.
 *
 * @element ore-rating
 *
 * @attr {number} value - Current rating value, snapped to `precision` (default: 0)
 * @attr {number} max - Maximum number of stars (default: 5)
 * @attr {number} precision - Selection granularity: 1 or 0.5 (default: 1)
 * @attr {boolean} clearable - Re-clicking the selected star clears to 0 (default: true)
 * @attr {boolean} readonly - Read-only display mode
 * @attr {boolean} required - Required until a rating is selected
 * @attr {boolean} disabled - Disabled state
 * @attr {string} label - Visible label above the stars
 * @attr {string} helper - Helper text below the stars
 * @attr {string} error - Error text below the stars (hides the helper text)
 * @attr {string} color - Theme color for filled stars: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} name - Form field name
 *
 * @slot label - Visible label content (overrides `label`).
 * @slot helper - Helper text content (overrides `helper`).
 * @slot error - Error text content (overrides `error`).
 *
 * @fires input - Emitted when the rating changes.
 * @fires change - Emitted when the rating changes.
 *
 * @cssprop --rating-star-size - Star diameter
 * @cssprop --rating-color-empty - Empty star color
 * @cssprop --rating-color-filled - Filled star color
 * @cssprop --rating-gap - Gap between stars
 *
 * @part wrapper - Column wrapping label, stars, and assistive text.
 * @part label - The visible label element.
 * @part stars - The focusable slider row.
 * @part star - One star cell (fill + outline layers).
 * @part helper - The helper text element.
 * @part error - The error text element.
 *
 * @example
 * ```html
 * <ore-rating label="Quality" value="4" color="warning"></ore-rating>
 * <ore-rating value="4.5" precision="0.5" color="warning" readonly></ore-rating>
 * ```
 */
export const RATING_TAG = 'ore-rating' as const;
define<OreRatingProps>(RATING_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    clearable: prop.bool(true),
    error: prop.string(),
    helper: prop.string(),
    label: prop.string(''),
    labels: prop.data<Partial<RatingLabels>>({}),
    max: prop.number(5),
    name: prop.string(),
    precision: prop.number(1),
    readonly: prop.bool(false),
    required: prop.bool(false),
    value: prop.number(0),
  },
  setup(props) {
    const el = getHost();
    const slots = useSlots();
    const labels = computed<RatingLabels>(() => ({ ...DEFAULT_RATING_LABELS, ...props.labels.value }));

    const isDisabled = computed(() => Boolean(props.disabled.value));
    const isInteractive = computed(() => !props.readonly.value && !isDisabled.value);

    // ── Field chrome (label / helper / error) ─────────────────────────────────
    const labelId = createId('rating-label');
    const assistiveId = createId('rating-helper');
    const errorId = createId('rating-error');

    const errorText = computed(() => props.error.value ?? '');
    const helperText = computed(() => props.helper.value ?? '');

    const labelVisible = computed(() => Boolean(props.label.value) || slots.has('label').value);
    const labelHidden = () => !labelVisible.value;
    const helperHidden = () => Boolean(errorText.value) || (!helperText.value && !slots.has('helper').value);
    const errorHidden = () => !errorText.value && !slots.has('error').value;

    const sliderLabelledBy = () => (labelVisible.value ? labelId : null);
    const sliderAriaLabel = () => (labelVisible.value ? null : 'Rating');
    const ariaDescribedBy = () => (errorText.value ? errorId : helperText.value ? assistiveId : null);
    const ariaInvalid = computed<'true' | null>(() => (errorText.value ? 'true' : null));

    // ── Value model ────────────────────────────────────────────────────────────
    const maxValue = computed(() => Math.max(1, Number(props.max.value) || 5));
    const stepSize = computed(() => (Number(props.precision.value) === 0.5 ? 0.5 : 1));
    const ratingControl = createSliderControl({
      disabled: isDisabled,
      max: maxValue,
      readonly: props.readonly,
      step: stepSize,
    });

    // Snaps every value (including external sets) onto the precision grid.
    const normalizedValue = computed(() => ratingControl.snap(Number(props.value.value)));
    const hovered = signal<number | null>(null);
    const displayValue = computed(() => hovered.value ?? normalizedValue.value);
    const dragging = signal(false);

    let starsEl: HTMLDivElement | null = null;

    defineFieldValue(
      el,
      () => String(normalizedValue.value),
      (value) => {
        el.setAttribute('value', value);
      },
    );

    useField<string>({
      disabled: isDisabled,
      validity: computed(() =>
        props.required.value && normalizedValue.value < 1
          ? { flags: { valueMissing: true }, message: 'Select a rating.' }
          : null,
      ),
      value: computed(() => String(normalizedValue.value)),
    });

    function commit(next: number, fromPress: boolean): void {
      const current = normalizedValue.value;

      if (next === current) {
        // Re-pressing the same star clears the rating; a drag passing back over
        // it (fromPress=false) must not.
        if (!fromPress || next === 0 || !props.clearable.value) return;

        next = 0;
      }

      setFieldValue(el, String(next));
      dispatchNativeFieldEvent(el, 'input');
      dispatchNativeFieldEvent(el, 'change');
    }

    // ── Pointer interaction ────────────────────────────────────────────────────
    function pointerValue(e: PointerEvent): number | null {
      const starEl = (e.target as Element | null)?.closest?.('[data-star]') as HTMLElement | null;

      if (starEl) {
        const index = Number(starEl.dataset.star);

        if (stepSize.value < 1) {
          const width = starEl.clientWidth;

          if (width > 0) {
            const x = (e as PointerEvent & MouseEvent).clientX - starEl.getBoundingClientRect().left;

            if (x < width / 2) return ratingControl.snap(index - 0.5);
          }
        }

        return ratingControl.snap(index);
      }

      // During a drag, pointer capture retargets events to the row; map by X.
      if (starsEl) {
        const rect = starsEl.getBoundingClientRect();

        if (rect.width > 0) return ratingControl.fromClientX((e as PointerEvent & MouseEvent).clientX, rect);
      }

      return null;
    }

    function handlePointerDown(e: PointerEvent): void {
      if (!isInteractive.value) return;

      dragging.value = true;

      if (starsEl && 'setPointerCapture' in starsEl) {
        try {
          starsEl.setPointerCapture(e.pointerId);
        } catch {
          // Pointer already released between hit-test and capture.
        }
      }

      const next = pointerValue(e);

      if (next !== null) commit(next, true);
    }

    function handlePointerMove(e: PointerEvent): void {
      if (!isInteractive.value) return;

      const next = pointerValue(e);

      if (next === null) return;

      hovered.value = next;
      if (dragging.value) commit(next, false);
    }

    function handlePointerUp(): void {
      dragging.value = false;
    }

    function handlePointerLeave(): void {
      hovered.value = null;
    }

    function handleKeydown(e: KeyboardEvent): void {
      ratingControl.handleKeydown(e, normalizedValue.value, (next) => commit(next, false));
    }

    const stars = computed(() => Array.from({ length: maxValue.value }, (_, i) => i + 1));

    bind({ attr: { size: props.size } });

    return html`
      <div class="rating-wrapper" part="wrapper">
        <span class="label" id="${labelId}" part="label" ?hidden="${labelHidden}">
          <slot name="label">${props.label}</slot>
        </span>
        <div
          class="stars"
          part="stars"
          role="slider"
          tabindex="${() => (isInteractive.value ? '0' : null)}"
          aria-valuemin="0"
          aria-valuenow="${() => String(normalizedValue.value)}"
          aria-valuetext="${() =>
            normalizedValue.value === 0
              ? labels.value.unrated
              : labels.value.value(normalizedValue.value, maxValue.value)}"
          aria-valuemax="${() => String(maxValue.value)}"
          aria-label="${sliderAriaLabel}"
          aria-labelledby="${sliderLabelledBy}"
          aria-describedby="${ariaDescribedBy}"
          aria-errormessage="${() => (errorText.value ? errorId : null)}"
          aria-invalid="${ariaInvalid}"
          aria-required="${() => (props.required.value && isInteractive.value ? 'true' : null)}"
          aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
          aria-readonly="${() => (props.readonly.value && !isDisabled.value ? 'true' : null)}"
          ref=${(node: HTMLDivElement | null) => {
            starsEl = node;
          }}
          @pointerdown="${handlePointerDown}"
          @pointermove="${handlePointerMove}"
          @pointerup="${handlePointerUp}"
          @pointercancel="${handlePointerUp}"
          @pointerleave="${handlePointerLeave}"
          @keydown="${handleKeydown}">
          ${() =>
            stars.value.map(
              (star) => html`
                <span
                  class="star"
                  part="star"
                  aria-hidden="true"
                  data-star="${star}"
                  ?data-current="${() =>
                    isInteractive.value && normalizedValue.value > 0 && star === Math.ceil(normalizedValue.value)}">
                  <span class="star-fill" style="${() => `width:${Math.max(0, Math.min(1, displayValue.value - (star - 1))) * 100}%`}">
                    <span class="star-fill-inner">
                      <ore-icon name="star" size="var(--_star-size)" aria-hidden="true"></ore-icon>
                    </span>
                  </span>
                  <ore-icon name="star" class="base-icon" size="var(--_star-size)" stroke-width="1.5" aria-hidden="true"></ore-icon>
                </span>
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
  styles: [colorThemeMixin, sizeVariantMixin({}), touchTargetMixin, componentStyles],
});
