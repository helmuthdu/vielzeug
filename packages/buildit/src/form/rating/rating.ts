import { computed, defineComponent, typed, defineField, html, inject, signal } from '@vielzeug/craftit/core';

import type { DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, colorThemeMixin, reducedMotionMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';
import { mountFormContextSync } from '../shared/dom-sync';
import { createFieldValidation } from '../shared/validation';
import styles from './rating.css?inline';

const FULL_STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function starIcon(filled: boolean) {
  return html`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="${filled ? 'currentColor' : 'none'}"
    stroke="currentColor"
    stroke-width="${filled ? 0 : 1.5}"
    stroke-linecap="round"
    stroke-linejoin="round">
    <path d="${FULL_STAR_PATH}" />
  </svg>`;
}

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
    /** Current rating value */
    value?: number;
  };

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
 * ```
 */
export const RATING_TAG = defineComponent<BitRatingProps, BitRatingEvents>({
  formAssociated: true,
  props: {
    color: typed<BitRatingProps['color']>(undefined),
    disabled: typed<boolean>(false),
    label: typed<string>('Rating'),
    max: typed<number>(5),
    name: typed<string | undefined>(undefined),
    readonly: typed<boolean>(false),
    size: typed<BitRatingProps['size']>(undefined),
    value: typed<number>(0),
  },
  setup({ emit, host, props }) {
    const formCtx = inject(FORM_CTX, undefined);

    mountFormContextSync(host, formCtx, props);

    const fd = defineField(
      {
        disabled: computed(() => Boolean(props.disabled.value)),
        value: computed(() => String(props.value.value || 0)),
      },
      {
        onReset: () => {
          host.removeAttribute('value');
        },
      },
    );

    const { triggerValidation } = createFieldValidation(formCtx, fd);

    const hovered = signal<number | null>(null);
    // eslint-disable-next-line no-constant-binary-expression
    const displayValue = computed(() => hovered.value ?? Number(props.value.value) ?? 0);

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
      if (props.readonly.value || props.disabled.value) return;

      host.setAttribute('value', String(star));
      emit('change', { originalEvent, value: star });
      triggerValidation('change');
      spawnSparkles(star);
    }
    function handleKeydown(e: KeyboardEvent, star: number) {
      const max = Number(props.max.value) || 5;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(Math.min(max, star + 1), e);

        const nextBtn = host.shadowRoot?.querySelector<HTMLButtonElement>(`[data-star="${Math.min(max, star + 1)}"]`);

        nextBtn?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(Math.max(1, star - 1), e);

        const prevBtn = host.shadowRoot?.querySelector<HTMLButtonElement>(`[data-star="${Math.max(1, star - 1)}"]`);

        prevBtn?.focus();
      }
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
          stars.value.map((star) => {
            const filled = star <= displayValue.value;

            return html`<button
              class="star-btn"
              part="star"
              type="button"
              role="radio"
              :aria-label="${() => `${star} ${star === 1 ? 'star' : 'stars'}`}"
              :aria-checked="${() => String(star === (Number(props.value.value) || 0))}"
              :data-star="${star}"
              ?data-filled="${() => filled}"
              :disabled="${() => props.disabled.value || props.readonly.value || null}"
              @click="${(e: Event) => select(star, e)}"
              @mouseenter="${() => {
                if (!props.readonly.value && !props.disabled.value) hovered.value = star;
              }}"
              @mouseleave="${() => {
                hovered.value = null;
              }}"
              @keydown="${(e: KeyboardEvent) => handleKeydown(e, star)}">
              ${starIcon(filled)}
            </button>`;
          })}
        <div class="sparkle-layer"></div>
      </div>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin({}), coarsePointerMixin, reducedMotionMixin, styles],
  tag: 'bit-rating',
});
