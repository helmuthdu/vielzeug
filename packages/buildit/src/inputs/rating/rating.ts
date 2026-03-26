import { define, computed, defineField, html, inject, signal } from '@vielzeug/craftit';
import { createSliderControl, createValidationControl } from '@vielzeug/craftit/controls';

import type { DisablableProps, SizableProps, ThemableProps } from '../../types';

import '../../content/icon/icon';
import { coarsePointerMixin, colorThemeMixin, reducedMotionMixin, sizeVariantMixin } from '../../styles';
import { disablableBundle, sizableBundle, themableBundle, type PropBundle } from '../shared/bundles';
import { mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import styles from './rating.css?inline';

export type BitRatingEvents = {
  change: { originalEvent?: Event; value: number };
};

/** Rating props */
export type BitRatingProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Accessible group label */
    label?: string;
    /** Maximum rating (number of stars) */
    max?: number;
    /** Form field name */
    name?: string;
    /** Make rating read-only */
    readonly?: boolean;
    /** Render selected stars as solid-filled instead of outline-only */
    solid?: boolean;
    /** Current rating value */
    value?: number;
  };

const ratingProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  label: 'Rating',
  max: 5,
  name: undefined,
  readonly: false,
  solid: false,
  value: 0,
} satisfies PropBundle<BitRatingProps>;

/**
 * A star rating input.
 *
 * @element bit-rating
 *
 * @attr {number} value - Current rating value (default: 0)
 * @attr {number} max - Maximum number of stars (default: 5)
 * @attr {boolean} readonly - Read-only display mode
 * @attr {boolean} disabled - Disabled state
 * @attr {string} label - aria-label for the group (default: 'Rating')
 * @attr {string} color - Theme color for filled stars
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
 * @example
 * ```html
 * <bit-rating value="3" max="5" color="warning"></bit-rating>
 * <bit-rating value="4" solid></bit-rating>
 * ```
 */
export const RATING_TAG = define<BitRatingProps, BitRatingEvents>('bit-rating', {
  formAssociated: true,
  props: ratingProps,
  setup({ emit, host, props }) {
    const formCtx = inject(FORM_CTX, undefined);

    mountFormContextSync(host.el, formCtx, props);

    const normalizedValue = computed(() => {
      const max = Math.max(1, Number(props.max.value) || 5);
      const raw = Number(props.value.value);
      const safe = Number.isFinite(raw) ? raw : 0;

      return Math.min(max, Math.max(0, safe));
    });

    const fd = defineField(
      {
        disabled: computed(() => Boolean(props.disabled.value)),
        value: computed(() => String(normalizedValue.value || 0)),
      },
      {
        onReset: () => {
          props.value.value = 0;
        },
      },
    );

    const { triggerValidation } = createValidationControl(formCtx?.validateOn, fd);

    const isInteractive = computed(() => !props.readonly.value && !props.disabled.value);
    const hovered = signal<number | null>(null);
    const displayValue = computed(() => hovered.value ?? normalizedValue.value);
    const getStarButtons = () => {
      return [...(host.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-star]') ?? [])];
    };
    const ratingControl = createSliderControl({
      max: () => Number(props.max.value) || 5,
      min: () => 1,
      step: () => 1,
    });

    function spawnSparkles(star: number) {
      const layer = host.shadowRoot?.querySelector<HTMLElement>('.sparkle-layer');
      const btn = host.shadowRoot?.querySelector<HTMLElement>(`[data-star="${star}"]`);

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

      const max = Math.max(1, Number(props.max.value) || 5);
      const nextValue = Math.min(max, Math.max(0, star));

      if (nextValue === normalizedValue.value) return;

      // Write through the reactive prop signal; craftit handles host reflection.
      props.value.value = nextValue;
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
      const max = Number(props.max.value) || 5;

      return Array.from({ length: max }, (_, i) => i + 1);
    });

    return html`
      <div
        class="stars"
        part="stars"
        role="radiogroup"
        :aria-label="${() => props.label.value}"
        :aria-required="${() => null}">
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
                <bit-icon name="star" size="var(--_star-size)" stroke-width="1.5" aria-hidden="true"></bit-icon>
              </button>`,
          )}
        <div class="sparkle-layer"></div>
      </div>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin({}), coarsePointerMixin, reducedMotionMixin, styles],
});
