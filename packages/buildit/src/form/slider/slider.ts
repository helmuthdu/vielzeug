import {
  aria,
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineField,
  defineProps,
  defineSlots,
  guard,
  handle,
  html,
  inject,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { coarsePointerMixin, colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type {
  AddEventListeners,
  BitSliderEvents,
  DisablableProps,
  FormValidityMethods,
  SizableProps,
  ThemableProps,
} from '../../types';
import { mountFormContextSync } from '../_common/use-text-field';
import { FORM_CTX } from '../form/form';

const componentStyles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_size: var(--slider-size, var(--size-5));
      --_height: var(--slider-height, var(--size-3));
      --_track: var(--slider-track, var(--color-contrast-300));
      --_fill: var(--slider-fill, var(--color-neutral));
      --_thumb: var(--slider-thumb, var(--color-contrast-100));
      --_thumb-size: calc(var(--_size) - var(--size-1));
      --_font-size: var(--text-sm);
      --_shadow: var(--color-neutral-focus-shadow);

      align-items: center;
      cursor: pointer;
      display: inline-flex;
      gap: var(--_gap, var(--size-3));
      position: relative;
      touch-action: none;
      user-select: none;
      width: 100%;
    }
  }

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
    min-height: var(--_touch-target);
  }

  .slider-track {
    background: var(--_track);
    border-radius: var(--rounded-full);
    height: var(--_height);
    position: relative;
    width: 100%;
  }

  /* Fill: always driven by --_fill-start / --_fill-width */
  .slider-fill {
    background: var(--_fill);
    border-radius: var(--rounded-full);
    height: 100%;
    left: var(--_fill-start, 0%);
    position: absolute;
    top: 0;
    transition: left var(--transition-normal), width var(--transition-normal);
    width: var(--_fill-width, 0%);
  }

  :host([data-dragging]) .slider-fill {
    transition: none;
  }

  .slider-thumb {
    background: var(--_thumb);
    border: 2px solid var(--_fill);
    border-radius: var(--rounded-full);
    box-shadow: var(--shadow-sm);
    cursor: grab;
    height: var(--_thumb-size);
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-fast),
      left var(--transition-normal);
    width: var(--_thumb-size);
    z-index: 1;
  }

  :host([data-dragging]) .slider-thumb {
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-fast);
  }

  /* ── Single-value thumb ─────────────────────────────────── */

  .slider-thumb-sole {
    left: var(--_thumb-pos, 0%);
  }

  :host(:focus-visible) .slider-thumb-sole,
  :host(:active) .slider-thumb-sole {
    box-shadow: var(--_shadow);
    transform: translate(-50%, -50%) scale(1.1);
  }

  /* ── Range thumbs ───────────────────────────────────────── */

  .slider-thumb-start {
    left: var(--_thumb-start, 0%);
  }

  .slider-thumb-end {
    left: var(--_thumb-end, 100%);
  }

  .slider-thumb-start:focus-visible,
  .slider-thumb-end:focus-visible {
    box-shadow: var(--_shadow);
    cursor: grabbing;
    outline: var(--border-2) solid var(--_fill);
    outline-offset: 2px;
    transform: translate(-50%, -50%) scale(1.1);
    z-index: 2;
  }

  /* ── Visibility gating ──────────────────────────────────── */

  :host(:not([range])) .slider-thumb-start,
  :host(:not([range])) .slider-thumb-end {
    display: none;
  }

  :host([range]) .slider-thumb-sole {
    display: none;
  }

  @media (forced-colors: active) {
    /* Replace box-shadow focus ring with outline for sole-thumb focus visibility */
    :host(:focus-visible) .slider-thumb-sole {
      box-shadow: none;
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }
  }

  @layer buildit.overrides {
    :host {
      --_fill: var(--slider-fill, var(--_theme-base));
      --_shadow: var(--_theme-shadow);
    }
  }

  /* ========================================
     Label
     ======================================== */

  .label {
    color: var(--color-contrast);
    font-size: var(--_font-size);
    white-space: nowrap;
  }

  @media (pointer: coarse) {
    :host {
      --_thumb-size: calc(var(--_size) + var(--size-2));
      --_size: var(--size-7);
    }
  }
`;

/** Slider component properties */
export interface SliderProps extends ThemableProps, SizableProps, DisablableProps {
  /** Minimum value */
  min?: number | string;
  /** Maximum value */
  max?: number | string;
  /** Step increment */
  step?: number | string;
  /** Single-value mode: current value */
  value?: number | string;
  /** Range mode: lower bound */
  from?: number | string;
  /** Range mode: upper bound */
  to?: number | string;
  /** Activate two-thumb range selection */
  range?: boolean;
  /** Single-value mode: form field name */
  name?: string;
  /** Single-value mode a11y label override (e.g. "75%"). Overrides raw aria-valuenow. */
  'value-text'?: string;
  /** Range mode a11y label for the start thumb (e.g. "$20") */
  'from-value-text'?: string;
  /** Range mode a11y label for the end thumb (e.g. "$80") */
  'to-value-text'?: string;
}

/**
 * A slider for selecting a single numeric value or a numeric range.
 *
 * Add the boolean `range` attribute to activate two-thumb range mode.
 *
 * @element bit-slider
 *
 * @attr {number}  min   - Minimum value (default: 0)
 * @attr {number}  max   - Maximum value (default: 100)
 * @attr {number}  step  - Step increment (default: 1)
 * @attr {number}  value - Current value (single mode)
 * @attr {number}  from  - Lower bound (range mode)
 * @attr {number}  to    - Upper bound (range mode)
 * @attr {boolean} range - Activate range mode
 * @attr {boolean} disabled - Disable interaction
 * @attr {string}  name  - Form field name (single mode)
 * @attr {string}  color - Theme color
 * @attr {string}  size  - 'sm' | 'md' | 'lg'
 *
 * @fires change - `{ value }` in single mode · `{ from, to }` in range mode
 *
 * @slot - Slider label text
 *
 * @part slider      - Slider container
 * @part track       - Track element
 * @part fill        - Fill element
 * @part thumb       - Single-value thumb
 * @part thumb-start - Range start thumb
 * @part thumb-end   - Range end thumb
 * @part label       - Label element
 *
 * @cssprop --slider-height - Track height
 * @cssprop --slider-size   - Thumb dimensions
 * @cssprop --slider-track  - Track background color
 * @cssprop --slider-fill   - Fill background color
 * @cssprop --slider-thumb  - Thumb background color
 *
 * @example
 * ```html
 * <bit-slider value="50" name="volume">Volume</bit-slider>
 * <bit-slider range from="20" to="80" color="primary">Price range</bit-slider>
 * ```
 */
export const TAG = define(
  'bit-slider',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<{ change: { value?: number; from?: number; to?: number; originalEvent?: Event } }>();
    const props = defineProps<SliderProps>({
      color: { default: undefined },
      disabled: { default: false },
      from: { default: '0' },
      'from-value-text': { default: undefined },
      max: { default: '100' },
      min: { default: '0' },
      name: { default: '' },
      range: { default: false },
      size: { default: undefined },
      step: { default: '1' },
      to: { default: '100' },
      'to-value-text': { default: undefined },
      value: { default: '0' },
      'value-text': { default: undefined },
    });

    // Treat `range` as static — determined at first render
    const isRange = props.range.value;

    // ── Shared helpers ────────────────────────────────────────────

    const getNum = (v: string | number | undefined, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const snapVal = (value: number) => {
      const min = getNum(props.min.value, 0);
      const max = getNum(props.max.value, 100);
      const step = getNum(props.step.value, 1);
      return Math.max(min, Math.min(max, Math.round(value / step) * step));
    };

    const toPercent = (value: number) => {
      const min = getNum(props.min.value, 0);
      const max = getNum(props.max.value, 100);
      return ((value - min) / (max - min)) * 100;
    };

    // ── Single-value state ────────────────────────────────────────

    const formCtx = inject(FORM_CTX);
    mountFormContextSync(host, formCtx, props);
    let sliderFd: { reportValidity: () => boolean } | undefined;

    const valueSignal = signal('0');

    if (!isRange) {
      sliderFd = defineField(
        { disabled: computed(() => props.disabled.value), value: valueSignal },
        {
          onReset: () => {
            valueSignal.value = '0';
          },
        },
      );
      watch(
        props.value,
        (v) => {
          valueSignal.value = String(v);
        },
        { immediate: true },
      );
      aria({
        disabled: () => props.disabled.value,
        valuemax: () => getNum(props.max.value, 100),
        valuemin: () => getNum(props.min.value, 0),
        valuenow: () => Number(valueSignal.value || 0),
        valuetext: () => props['value-text'].value ?? null,
      });
    }

    // ── Range state ───────────────────────────────────────────────

    const startVal = signal(0);
    const endVal = signal(100);

    if (isRange) {
      sliderFd = defineField<{ from: number; to: number }>(
        {
          disabled: computed(() => Boolean(props.disabled.value)),
          toFormValue: ({ from, to }) => {
            const name = props.name.value;
            if (!name) return null;
            const fd = new FormData();
            fd.append(`${name}[from]`, String(from));
            fd.append(`${name}[to]`, String(to));
            return fd;
          },
          value: computed(() => ({ from: startVal.value, to: endVal.value })),
        },
        {
          onReset: () => {
            startVal.value = snapVal(getNum(props.from.value, 0));
            endVal.value = snapVal(getNum(props.to.value, 100));
          },
        },
      );
      watch(
        props.from,
        (v) => {
          startVal.value = snapVal(getNum(v, 0));
        },
        { immediate: true },
      );
      watch(
        props.to,
        (v) => {
          endVal.value = snapVal(getNum(v, 100));
        },
        { immediate: true },
      );
    }

    // ── Refs ──────────────────────────────────────────────────────

    const containerRef = ref<HTMLDivElement>();
    const labelRef = ref<HTMLSpanElement>();
    const thumbStartRef = ref<HTMLDivElement>();
    const thumbEndRef = ref<HTMLDivElement>();
    const startId = createId('slider-start');
    const endId = createId('slider-end');

    // ── CSS update helpers ────────────────────────────────────────

    const updateSingleCSS = (value: number) => {
      const pct = toPercent(value);
      host.style.setProperty('--_thumb-pos', `${pct}%`);
      host.style.setProperty('--_fill-start', '0%');
      host.style.setProperty('--_fill-width', `${pct}%`);
    };

    const updateRangeCSS = () => {
      const s = toPercent(startVal.value);
      const e = toPercent(endVal.value);
      host.style.setProperty('--_thumb-start', `${s}%`);
      host.style.setProperty('--_thumb-end', `${e}%`);
      host.style.setProperty('--_fill-start', `${s}%`);
      host.style.setProperty('--_fill-width', `${e - s}%`);
    };

    // ── Key-delta maps (avoids switch complexity) ─────────────────

    const keyDelta = (key: string, step: number, min: number, max: number, current: number): number | null => {
      if (key === 'ArrowRight' || key === 'ArrowUp') return current + step;
      if (key === 'ArrowLeft' || key === 'ArrowDown') return current - step;
      if (key === 'Home') return min;
      if (key === 'End') return max;
      return null;
    };

    // ── Range mode setup ──────────────────────────────────────────

    function triggerValidation(on: 'blur' | 'change'): void {
      if (formCtx?.validateOn.value === on) sliderFd?.reportValidity();
    }

    const setupRangeMode = (container: HTMLDivElement) => {
      updateRangeCSS();

      const clientToValue = (clientX: number) => {
        const rect = container.getBoundingClientRect();
        const min = getNum(props.min.value, 0);
        const max = getNum(props.max.value, 100);
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return snapVal(min + pct * (max - min));
      };

      let dragging: 'start' | 'end' | null = null;

      const applyDrag = (val: number) => {
        const min = getNum(props.min.value, 0);
        const max = getNum(props.max.value, 100);
        if (dragging === 'start') startVal.value = Math.min(snapVal(val), endVal.value);
        else if (dragging === 'end') endVal.value = Math.max(snapVal(val), startVal.value);
        startVal.value = Math.max(min, Math.min(startVal.value, max));
        endVal.value = Math.max(min, Math.min(endVal.value, max));
        updateRangeCSS();
        emit('change', { from: startVal.value, to: endVal.value });
        triggerValidation('change');
      };

      handle(
        container,
        'pointerdown',
        guard(
          () => !props.disabled.value,
          (e: PointerEvent) => {
            e.preventDefault();
            const val = clientToValue(e.clientX);
            dragging = Math.abs(val - startVal.value) <= Math.abs(val - endVal.value) ? 'start' : 'end';
            host.setAttribute('data-dragging', '');
            (e.target as Element).setPointerCapture(e.pointerId);
            applyDrag(val);
          },
        ),
      );
      handle(
        container,
        'pointermove',
        guard(
          () => !!dragging,
          (e: PointerEvent) => {
            e.preventDefault();
            applyDrag(clientToValue(e.clientX));
          },
        ),
      );
      handle(
        container,
        'pointerup',
        guard(
          () => !!dragging,
          (e: PointerEvent) => {
            e.preventDefault();
            dragging = null;
            host.removeAttribute('data-dragging');
            (e.target as Element).releasePointerCapture(e.pointerId);
          },
        ),
      );

      const makeThumbKeydown = (getVal: () => number, setVal: (v: number) => void) => (e: KeyboardEvent) => {
        if (props.disabled.value) return;
        const step = getNum(props.step.value, 1);
        const min = getNum(props.min.value, 0);
        const max = getNum(props.max.value, 100);
        const next = keyDelta(e.key, step, min, max, getVal());
        if (next === null) return;
        e.preventDefault();
        setVal(snapVal(Math.max(min, Math.min(max, next))));
        updateRangeCSS();
        emit('change', { from: startVal.value, originalEvent: e, to: endVal.value });
        triggerValidation('change');
      };

      const thumbStartEl = thumbStartRef.value;
      const thumbEndEl = thumbEndRef.value;

      if (thumbStartEl) {
        thumbStartEl.addEventListener(
          'keydown',
          makeThumbKeydown(
            () => startVal.value,
            (v) => {
              startVal.value = Math.min(v, endVal.value);
            },
          ),
        );
        aria(thumbStartEl, {
          label: 'Range start',
          valuemax: () => endVal.value,
          valuemin: () => getNum(props.min.value, 0),
          valuenow: () => startVal.value,
          valuetext: () => props['from-value-text'].value ?? null,
        });
      }
      if (thumbEndEl) {
        thumbEndEl.addEventListener(
          'keydown',
          makeThumbKeydown(
            () => endVal.value,
            (v) => {
              endVal.value = Math.max(v, startVal.value);
            },
          ),
        );
        aria(thumbEndEl, {
          label: 'Range end',
          valuemax: () => getNum(props.max.value, 100),
          valuemin: () => startVal.value,
          valuenow: () => endVal.value,
          valuetext: () => props['to-value-text'].value ?? null,
        });
      }
    };

    // ── Single-value mode setup ───────────────────────────────────

    const setupSingleMode = (container: HTMLDivElement) => {
      host.setAttribute('role', 'slider');
      if (!props.disabled.value) host.setAttribute('tabindex', '0');
      updateSingleCSS(Number(valueSignal.value));

      const updateValue = (clientX: number) => {
        if (props.disabled.value) return;
        const rect = container.getBoundingClientRect();
        const min = getNum(props.min.value, 0);
        const max = getNum(props.max.value, 100);
        const step = getNum(props.step.value, 1);
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newValue = Math.max(min, Math.min(max, Math.round((min + pct * (max - min)) / step) * step));
        if (Number(valueSignal.value) !== newValue) {
          valueSignal.value = newValue.toString();
          updateSingleCSS(newValue);
          emit('change', { value: newValue });
          triggerValidation('change');
        }
      };

      let isDragging = false;

      handle(
        container,
        'pointerdown',
        guard(
          () => !props.disabled.value,
          (e: PointerEvent) => {
            e.preventDefault();
            isDragging = true;
            updateValue(e.clientX);
            (e.target as Element).setPointerCapture(e.pointerId);
          },
        ),
      );
      handle(
        container,
        'pointermove',
        guard(
          () => isDragging,
          (e: PointerEvent) => {
            e.preventDefault();
            if (!host.hasAttribute('data-dragging')) host.setAttribute('data-dragging', '');
            updateValue(e.clientX);
          },
        ),
      );
      handle(
        container,
        'pointerup',
        guard(
          () => isDragging,
          (e: PointerEvent) => {
            e.preventDefault();
            isDragging = false;
            host.removeAttribute('data-dragging');
            (e.target as Element).releasePointerCapture(e.pointerId);
          },
        ),
      );
      handle(
        host,
        'keydown',
        guard(
          () => !props.disabled.value,
          (e: KeyboardEvent) => {
            const min = getNum(props.min.value, 0);
            const max = getNum(props.max.value, 100);
            const step = getNum(props.step.value, 1);
            const val = Number(valueSignal.value || 0);
            const next = keyDelta(e.key, step, min, max, val);
            if (next === null) return;
            e.preventDefault();
            const newValue = Math.max(min, Math.min(max, next));
            if (newValue !== val) {
              valueSignal.value = newValue.toString();
              updateSingleCSS(newValue);
              emit('change', { originalEvent: e, value: newValue });
              triggerValidation('change');
            }
          },
        ),
      );
    };

    onMount(() => {
      const container = containerRef.value;
      if (!container) return;

      if (slots.has('default').value && labelRef.value) {
        const labelId = createId('slider-label');
        labelRef.value.id = labelId;
        if (!isRange) aria({ labelledby: labelId });
      }

      if (isRange) setupRangeMode(container);
      else setupSingleMode(container);
    });

    return {
      styles: [
        disabledStateMixin(),
        colorThemeMixin,
        sizeVariantMixin({
          lg: {
            fontSize: 'var(--text-base)',
            height: 'calc(var(--size-5) - var(--size-1))',
            size: 'var(--size-5)',
          },
          md: {
            fontSize: 'var(--text-base)',
            height: 'var(--size-3)',
            size: 'var(--size-5)',
          },
          sm: {
            fontSize: 'var(--text-xs)',
            height: 'var(--size-2)',
            size: 'var(--size-4)',
          },
        }),
        componentStyles,
        coarsePointerMixin,
      ],
      template: html`
        <div class="slider-container" part="slider" ref=${containerRef}>
          <div class="slider-track" part="track">
            <div class="slider-fill" part="fill"></div>
            <div class="slider-thumb slider-thumb-sole" part="thumb"></div>
            <div
              class="slider-thumb slider-thumb-start"
              part="thumb-start"
              ref=${thumbStartRef}
              role="slider"
              tabindex="${() => (props.disabled.value ? '-1' : '0')}"
              id="${startId}"
            ></div>
            <div
              class="slider-thumb slider-thumb-end"
              part="thumb-end"
              ref=${thumbEndRef}
              role="slider"
              tabindex="${() => (props.disabled.value ? '-1' : '0')}"
              id="${endId}"
            ></div>
          </div>
        </div>
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>
      `,
    };
  },
  { formAssociated: true },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-slider': HTMLElement & SliderProps & FormValidityMethods & AddEventListeners<BitSliderEvents>;
  }
}
