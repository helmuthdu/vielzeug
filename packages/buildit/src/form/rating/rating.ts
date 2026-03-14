import { computed, css, define, defineEmits, defineField, defineProps, html, inject, signal } from '@vielzeug/craftit';

import type { AddEventListeners, DisablableProps, FormValidityMethods, SizableProps, ThemableProps } from '../../types';

import { mountFormContextSync } from '../_common/use-text-field';
import { coarsePointerMixin, colorThemeMixin, reducedMotionMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      --_star-size: var(--rating-star-size, var(--size-7));
      --_color-empty: var(--rating-color-empty, var(--color-contrast-200));
      --_color-filled: var(--rating-color-filled, var(--_theme-base, var(--color-warning)));
      --_gap: var(--rating-gap, var(--size-0_5));

      display: inline-flex;
      align-items: center;
    }

    .stars {
      display: flex;
      align-items: center;
      gap: var(--_gap);
      position: relative;
    }

    .sparkle-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
    }

    .sparkle {
      position: absolute;
      background: var(--_color-filled);
      border-radius: 50%;
      pointer-events: none;
      animation: var(--_motion-animation, sparkle-fly var(--_dur, 500ms) ease-out forwards);
    }

    @keyframes sparkle-fly {
      from {
        transform: translate(-50%, -50%) rotate(var(--_angle)) translateY(0) scale(1);
        opacity: 0.9;
      }
      to {
        transform: translate(-50%, -50%) rotate(var(--_angle)) translateY(calc(-1 * var(--_dist))) scale(0);
        opacity: 0;
      }
    }

    .star-btn {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_star-size);
      height: var(--_star-size);
      min-height: var(--_touch-target);
      min-width: var(--_touch-target);
      color: var(--_color-empty);
      transition:
        color var(--transition-fast),
        transform var(--transition-fast);
      border-radius: var(--rounded-sm);
    }

    .star-btn[data-filled] {
      color: var(--_color-filled);
    }

    .star-btn:hover:not([disabled]),
    .star-btn:focus-visible:not([disabled]) {
      transform: scale(1.15);
    }

    .star-btn:focus-visible {
      outline: var(--border-2) solid var(--_color-filled);
      outline-offset: var(--border-2);
    }

    .star-btn[disabled] {
      cursor: default;
    }

    :host([readonly]) .star-btn,
    :host([disabled]) .star-btn {
      pointer-events: none;
    }

    :host([disabled]) {
      opacity: 0.5;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  }

  @layer buildit.utilities {
    :host([size='sm']) {
      --_star-size: var(--size-5);
    }
    :host([size='lg']) {
      --_star-size: var(--size-9);
    }

    @media (forced-colors: active) {
      /* Distinguish filled vs unfilled stars with system button colors */
      .star-btn {
        color: ButtonText;
      }
      .star-btn[data-filled] {
        color: Highlight;
        forced-color-adjust: none;
      }
      .star-btn:focus-visible {
        outline: 2px solid Highlight;
        box-shadow: none;
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sparkle {
      display: none;
    }
  }
`;

const FULL_STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function starIcon(filled: boolean) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"
    fill="${filled ? 'currentColor' : 'none'}"
    stroke="currentColor"
    stroke-width="${filled ? 0 : 1.5}"
    stroke-linecap="round"
    stroke-linejoin="round"
  ><path d="${FULL_STAR_PATH}"/></svg>`;
}

/** Rating events */
export interface BitRatingEvents {
  change: CustomEvent<{ value: number }>;
}

/** Rating props */
export interface RatingProps extends ThemableProps, SizableProps, DisablableProps {
  /** Current rating value */
  value?: number;
  /** Maximum rating (number of stars) */
  max?: number;
  /** Make rating read-only */
  readonly?: boolean;
  /** Accessible group label */
  label?: string;
  /** Form field name */
  name?: string;
}

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
 * @fires change - Emitted when value changes, with { value: number }
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
export const TAG = define(
  'bit-rating',
  ({ host }) => {
    const props = defineProps<RatingProps>({
      color: { default: undefined },
      disabled: { default: false },
      label: { default: 'Rating' },
      max: { default: 5 },
      name: { default: undefined },
      readonly: { default: false },
      size: { default: undefined },
      value: { default: 0 },
    });

    const emit = defineEmits<{ change: { value: number } }>();

    const formCtx = inject(FORM_CTX);

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

    function triggerValidation(on: 'blur' | 'change'): void {
      if (formCtx?.validateOn.value === on) fd.reportValidity();
    }

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

    function select(star: number) {
      if (props.readonly.value || props.disabled.value) return;

      host.setAttribute('value', String(star));
      emit('change', { value: star });
      triggerValidation('change');
      spawnSparkles(star);
    }

    function handleKeydown(e: KeyboardEvent, star: number) {
      const max = Number(props.max.value) || 5;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(Math.min(max, star + 1));

        const nextBtn = host.shadowRoot?.querySelector<HTMLButtonElement>(`[data-star="${Math.min(max, star + 1)}"]`);

        nextBtn?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(Math.max(1, star - 1));

        const prevBtn = host.shadowRoot?.querySelector<HTMLButtonElement>(`[data-star="${Math.max(1, star - 1)}"]`);

        prevBtn?.focus();
      }
    }

    const stars = computed(() => {
      const max = Number(props.max.value) || 5;

      return Array.from({ length: max }, (_, i) => i + 1);
    });

    return {
      styles: [colorThemeMixin, sizeVariantMixin({}), coarsePointerMixin, reducedMotionMixin, styles],
      template: html`
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
                @click="${() => select(star)}"
                @mouseenter="${() => {
                  if (!props.readonly.value && !props.disabled.value) hovered.value = star;
                }}"
                @mouseleave="${() => {
                  hovered.value = null;
                }}"
                @keydown="${(e: KeyboardEvent) => handleKeydown(e, star)}"
                .innerHTML="${starIcon(star <= displayValue.value)}"></button>`;
            })}
          <div class="sparkle-layer"></div>
        </div>
      `,
    };
  },
  { formAssociated: true },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-rating': HTMLElement & RatingProps & FormValidityMethods & AddEventListeners<BitRatingEvents>;
  }
}
