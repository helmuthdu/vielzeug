import {
  aria,
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  defineSlots,
  field,
  guard,
  handle,
  html,
  onFormReset,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

const styles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_size: var(--slider-size, var(--size-5));
      --_height: var(--slider-height, calc(var(--size-5) / 3));
      --_track: var(--slider-track, var(--color-contrast-300));
      --_fill: var(--slider-fill, var(--color-neutral));
      --_thumb: var(--slider-thumb, var(--color-contrast-100));
      --_font-size: var(--text-sm);
      --_shadow: var(--color-neutral-focus-shadow);

      align-items: center;
      cursor: pointer;
      display: inline-flex;
      gap: var(--_gap, var(--size-3));
      min-height: var(--size-11);
      position: relative;
      touch-action: none;
      user-select: none;
      width: 100%;
    }
  }

  /* ========================================
     States (Shared Mixin)
     ======================================== */

  ${disabledStateMixin()}

  /* ========================================
     Track, Fill & Thumb
     ======================================== */

  .slider-container {
    align-items: center;
    display: flex;
    flex: 1;
    height: var(--_size);
    position: relative;
    width: 100%;
  }

  .slider-track {
    background: var(--_track);
    border-radius: var(--rounded-full);
    height: var(--_height);
    position: relative;
    width: 100%;
  }

  .slider-fill {
    background: var(--_fill);
    border-radius: var(--rounded-full);
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: var(--_progress, 0%);
    transition: width var(--transition-normal);
  }

  /* Disable transitions during dragging for responsive feel */
  :host([data-dragging]) .slider-fill {
    transition: none;
  }

  .slider-thumb {
    background: var(--_thumb);
    border: 2px solid var(--_fill);
    border-radius: var(--rounded-full);
    box-shadow: var(--shadow-sm);
    height: var(--_size);
    left: var(--_progress, 0%);
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-fast),
      left var(--transition-normal);
    width: var(--_size);
    z-index: 1;
  }

  /* Disable transitions during dragging for responsive feel */
  :host([data-dragging]) .slider-thumb {
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-fast);
  }

  :host(:focus-visible) .slider-thumb,
  :host(:active) .slider-thumb {
    box-shadow: var(--_shadow);
    transform: translate(-50%, -50%) scale(1.1);
  }

  /* ========================================
     Color Themes (Shared Mixin)
     ======================================== */

  ${colorThemeMixin()}

  @layer buildit.overrides {
    /* Map theme variables to slider-specific variables */
    :host {
      --_fill: var(--slider-fill, var(--_theme-base));
      --_shadow: var(--_theme-shadow);
    }
  }

  ${sizeVariantMixin({
    lg: {
      fontSize: 'var(--text-base)',
      size: 'var(--size-6)',
    },
    sm: {
      fontSize: 'var(--text-xs)',
      size: 'var(--size-4)',
    },
  })}

  /* ========================================
     Label & Hidden Input
     ======================================== */

  input {
    opacity: 0;
    pointer-events: none;
    position: absolute;
  }

  .label {
    color: var(--color-contrast);
    font-size: var(--_font-size);
    white-space: nowrap;
  }
`;

/** Slider component properties */
export interface SliderProps {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Current value */
  value?: number;
  /** Disable slider interaction */
  disabled?: boolean;
  /** Form field name */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Slider size */
  size?: ComponentSize;
}

/**
 * A range slider component for selecting numeric values.
 *
 * @element bit-slider
 *
 * @attr {number} min - Minimum value
 * @attr {number} max - Maximum value
 * @attr {number} step - Step increment
 * @attr {number} value - Current value
 * @attr {boolean} disabled - Disable slider interaction
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} size - Slider size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when slider value changes (on release)
 * @fires input - Emitted continuously while slider is being draged
 *
 * @slot - Slider label text
 *
 * @part slider - The slider container element
 * @part track - The slider track element
 * @part fill - The slider fill (progress) element
 * @part thumb - The slider thumb element
 * @part label - The label element
 *
 * @cssprop --slider-height - Track height
 * @cssprop --slider-size - Thumb dimensions
 * @cssprop --slider-track - Track background color
 * @cssprop --slider-fill - Fill (progress) background color
 * @cssprop --slider-thumb - Thumb background color
 *
 * @example
 * ```html
 * <bit-slider min="0" max="100" value="50">Volume</bit-slider>
 * <bit-slider min="0" max="10" step="0.5" color="primary">Rating</bit-slider>
 * <bit-slider size="lg" value="70">Large</bit-slider>
 * ```
 */
define(
  'bit-slider',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<{ change: { originalEvent?: Event; value: number } }>();
    const props = defineProps({
      color: { default: undefined as ThemeColor | undefined },
      disabled: { default: false },
      max: { default: '100' },
      min: { default: '0' },
      name: { default: '' },
      size: { default: undefined as ComponentSize | undefined },
      step: { default: '1' },
      value: { default: '0' },
    });

    const valueSignal = signal('0');

    field({
      disabled: computed(() => props.disabled.value),
      value: valueSignal,
    });

    onFormReset(() => {
      valueSignal.value = '0';
    });

    const containerRef = ref<HTMLDivElement>();
    const labelRef = ref<HTMLSpanElement>();

    watch(
      props.value,
      (v) => {
        valueSignal.value = v;
      },
      { immediate: true },
    );

    aria({
      disabled: () => props.disabled.value,
      valuemax: () => Number(props.max.value || 100),
      valuemin: () => Number(props.min.value || 0),
      valuenow: () => Number(valueSignal.value || 0),
    });

    onMount(() => {
      const container = containerRef.value;
      if (!container) return;

      // Label association
      const label = labelRef.value;
      if (slots.has('default') && label) {
        const labelId = createId('slider-label');
        label.id = labelId;
        aria({ labelledby: labelId });
      }

      const calculateProgress = (value: number, min: number, max: number) => ((value - min) / (max - min)) * 100;

      const updateUI = (value: number) => {
        const min = Number(props.min.value || 0);
        const max = Number(props.max.value || 100);
        const progress = calculateProgress(value, min, max);
        host.style.setProperty('--_progress', `${progress}%`);
      };

      host.setAttribute('role', 'slider');
      if (!props.disabled.value) host.setAttribute('tabindex', '0');
      updateUI(Number(valueSignal.value));

      const updateValue = (clientX: number) => {
        if (props.disabled.value) return;
        const rect = container.getBoundingClientRect();
        const minN = Number(props.min.value || 0);
        const maxN = Number(props.max.value || 100);
        const stepN = Number(props.step.value || 1);

        let percentage = (clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        let newValue = minN + percentage * (maxN - minN);
        newValue = Math.round(newValue / stepN) * stepN;
        newValue = Math.max(minN, Math.min(maxN, newValue));

        if (Number(valueSignal.value) !== newValue) {
          valueSignal.value = newValue.toString();
          updateUI(newValue);
          emit('change', { value: newValue });
        }
      };

      let isDragging = false;

      const handlePointerDown = guard(
        () => !props.disabled.value,
        (e: PointerEvent) => {
          e.preventDefault();
          isDragging = true;
          updateValue(e.clientX);
          (e.target as Element).setPointerCapture(e.pointerId);
        },
      );

      const handlePointerMove = guard(
        () => isDragging,
        (e: PointerEvent) => {
          e.preventDefault();
          if (!host.hasAttribute('data-dragging')) host.setAttribute('data-dragging', '');
          updateValue(e.clientX);
        },
      );

      const handlePointerUp = guard(
        () => isDragging,
        (e: PointerEvent) => {
          e.preventDefault();
          isDragging = false;
          host.removeAttribute('data-dragging');
          (e.target as Element).releasePointerCapture(e.pointerId);
        },
      );

      const handleKeydown = guard(
        () => !props.disabled.value,
        (e: KeyboardEvent) => {
          const minN = Number(props.min.value || 0);
          const maxN = Number(props.max.value || 100);
          const stepN = Number(props.step.value || 1);
          const val = Number(valueSignal.value || 0);
          let newValue = val;

          switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
              newValue = Math.min(maxN, val + stepN);
              break;
            case 'ArrowLeft':
            case 'ArrowDown':
              newValue = Math.max(minN, val - stepN);
              break;
            case 'Home':
              newValue = minN;
              break;
            case 'End':
              newValue = maxN;
              break;
            default:
              return;
          }

          e.preventDefault();
          if (newValue !== val) {
            valueSignal.value = newValue.toString();
            updateUI(newValue);
            emit('change', { originalEvent: e, value: newValue });
          }
        },
      );

      handle(container, 'pointerdown', handlePointerDown);
      handle(container, 'pointermove', handlePointerMove);
      handle(container, 'pointerup', handlePointerUp);
      handle(host, 'keydown', handleKeydown);
    });

    return {
      styles: [styles],
      template: html` <div class="slider-container" part="slider" ref=${containerRef}>
          <input type="range" aria-hidden="true" tabindex="-1" />
          <div class="slider-track" part="track">
            <div class="slider-fill" part="fill"></div>
            <div class="slider-thumb" part="thumb"></div>
          </div>
        </div>
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>`,
    };
  },
  { formAssociated: true },
);

export default {};
