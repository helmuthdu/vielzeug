import { define, useField, html, inject, prop } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor } from '../../types';

import { createSliderControl } from '../../headless';
import '../../content/icon/icon';
import { disablableBundle, sizableBundle, themableBundle } from '../../shared';
import { coarsePointerMixin, colorThemeMixin, reducedMotionMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import styles from './rating.css?inline';

export type OreRatingEvents = {
  change: { originalEvent?: Event; value: number };
};

/** Rating props */
export type OreRatingProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Accessible group label */
  label?: string;
  /** Maximum rating (number of stars) */
  max?: number;
  /** Form field name */
  name?: string;
  /** Make rating read-only */
  readonly?: boolean;
  /** Component size */
  size?: ComponentSize;
  /** Render selected stars as solid-filled instead of outline-only */
  solid?: boolean;
  /** Current rating value */
  value?: number;
};

/**
 * A star rating input.
 *
 * @element ore-rating
 *
 * @attr {number} value - Current rating value (default: 0)
 * @attr {number} max - Maximum number of stars (default: 5)
 * @attr {boolean} readonly - Read-only display mode
 * @attr {boolean} disabled - Disabled state
 * @attr {string} label - aria-label for the group (default: 'Rating')
 * @attr {string} color - Theme color for filled stars: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} name - Form field name
 * @attr {boolean} solid - Fill selected stars (outline remains default when omitted)
 *
 * @fires change - Emitted when value changes. detail: { value: number, originalEvent?: Event }
 *
 * @cssprop --rating-star-size - Star diameter
 * @cssprop --rating-color-empty - Empty star color
 * @cssprop --rating-color-filled - Filled star color
 * @cssprop --rating-gap - Gap between stars
 *
 * @part stars - Stars container.
 * @part star - Star item element.
 * @example
 * ```html
 * <ore-rating value="3" max="5" color="warning"></ore-rating>
 * <ore-rating value="4" solid></ore-rating>
 * ```
 */
export const RATING_TAG = 'ore-rating' as const;
define<OreRatingProps, OreRatingEvents>(RATING_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    label: prop.string('Rating'),
    max: prop.number(5),
    name: prop.string(),
    readonly: prop.bool(false),
    solid: prop.bool(false),
    value: prop.number(0),
  },
  setup(props, { bind, el, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const normalizedValue = computed(() => {
      const max = Math.max(1, Number(props.max!.value) || 5);
      const raw = Number(props.value!.value);
      const safe = Number.isFinite(raw) ? raw : 0;

      return Math.min(max, Math.max(0, safe));
    });

    const fd = useField({
      disabled: fCtxProps.disabled,
      value: computed(() => String(normalizedValue.value || 0)),
    });

    const triggerValidation = (on: 'blur' | 'change') => {
      if (formCtx?.validateOn?.value === on) {
        fd.reportValidity();
      }
    };

    const isInteractive = computed(() => !props.readonly!.value && !fCtxProps.disabled.value);
    const hovered = signal<number | null>(null);
    const displayValue = computed(() => hovered.value ?? normalizedValue.value);
    const getStarButtons = () => {
      return [...(el.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-star]') ?? [])];
    };
    const ratingControl = createSliderControl({
      max: computed(() => Number(props.max!.value) || 5),
      min: signal(1),
      step: signal(1),
    });

    function spawnSparkles(star: number) {
      const layer = el.shadowRoot?.querySelector<HTMLElement>('.sparkle-layer');
      const btn = el.shadowRoot?.querySelector<HTMLElement>(`[data-star="${star}"]`);

      if (!layer || !btn) return;

      const cx = btn.offsetLeft + btn.offsetWidth / 2;
      const cy = btn.offsetTop + btn.offsetHeight / 2;
      const count = 10;

      for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        const angle = (360 / count) * i + (Math.random() * 30 - 15);
        const dist = 18 + Math.random() * 20;
        const size = 3 + Math.random() * 4;
        const dur = 380 + Math.random() * 220;

        p.className = 'sparkle';
        p.style.cssText = [
          `left:${cx}px`,
          `top:${cy}px`,
          `--_angle:${angle}deg`,
          `--_dist:${dist}px`,
          `width:${size}px`,
          `height:${size}px`,
          `--_dur:${dur}ms`,
          `animation-delay:${Math.random() * 60}ms`,
        ].join(';');
        layer.appendChild(p);
        p.addEventListener('animationend', () => p.remove(), { once: true });
      }
    }
    function select(star: number, originalEvent?: Event) {
      if (!isInteractive.value) return;

      const max = Math.max(1, Number(props.max!.value) || 5);
      const nextValue = Math.min(max, Math.max(0, star));

      if (nextValue === normalizedValue.value) return;

      // Write through the host attribute; ore handles host reflection.
      el.setAttribute('value', String(nextValue));
      emit('change', { originalEvent, value: nextValue });
      triggerValidation('change');
      spawnSparkles(nextValue);
    }
    function handleKeydown(e: KeyboardEvent, star: number) {
      const next = ratingControl.nextFromKey(e.key, star);

      if (next == null) return;

      e.preventDefault();
      select(next, e);

      const buttons = getStarButtons();

      buttons[next - 1]?.focus();
    }

    const stars = computed(() => {
      const max = Number(props.max!.value) || 5;

      return Array.from({ length: max }, (_, i) => i + 1);
    });

    bind({ attr: { size: fCtxProps.size } });

    return html`
      <div class="stars" part="stars" role="radiogroup" :aria-label="${props.label}" :aria-required="${() => null}">
        ${() =>
          stars.value.map(
            (star) =>
              html`<button
                class="star-btn"
                part="star"
                type="button"
                role="radio"
                :aria-label="${() => `${star} ${star === 1 ? 'star' : 'stars'}`}"
                :aria-checked="${() => String(star === normalizedValue.value)}"
                :data-star="${star}"
                ?data-filled="${() => star <= displayValue.value}"
                :disabled="${() => (!isInteractive.value ? true : null)}"
                @click="${(e: Event) => select(star, e)}"
                @pointerenter="${() => {
                  if (isInteractive.value) hovered.value = star;
                }}"
                @pointerleave="${() => {
                  hovered.value = null;
                }}"
                @keydown="${(e: KeyboardEvent) => handleKeydown(e, star)}">
                <ore-icon name="star" size="var(--_star-size)" stroke-width="1.5" aria-hidden="true"></ore-icon>
              </button>`,
          )}
        <div class="sparkle-layer"></div>
      </div>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin({}), coarsePointerMixin, reducedMotionMixin, styles],
});
