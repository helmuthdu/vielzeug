import {
  aria,
  computed,
  createId,
  defineComponent,
  defineField,
  guard,
  handle,
  html,
  inject,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit/core';

import type { DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';
import { SLIDER_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import { createFieldValidation } from '../shared/validation';
import componentStyles from './slider.css?inline';

/** Slider component properties */

export type BitSliderEvents = {
  change: { from?: number; originalEvent?: Event; to?: number; value: number | { from: number; to: number } };
};

export type BitSliderProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Range mode: lower bound */
    from?: number | string;
    /** Range mode a11y label for the start thumb (e.g. "$20") */
    'from-value-text'?: string;
    /** Maximum value */
    max?: number | string;
    /** Minimum value */
    min?: number | string;
    /** Single-value mode: form field name */
    name?: string;
    /** Activate two-thumb range selection */
    range?: boolean;
    /** Step increment */
    step?: number | string;
    /** Range mode: upper bound */
    to?: number | string;
    /** Range mode a11y label for the end thumb (e.g. "$80") */
    'to-value-text'?: string;
    /** Single-value mode: current value */
    value?: number | string;
    /** Single-value mode a11y label override (e.g. "75%"). Overrides raw aria-valuenow. */
    'value-text'?: string;
  };

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
 * @fires change - detail always includes `value`; single mode: { value: number }, range mode: { value: { from, to }, from, to }, plus optional originalEvent
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
export const SLIDER_TAG = defineComponent<BitSliderProps, BitSliderEvents>({
  formAssociated: true,
  props: {
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
  },
  setup({ emit, host, props, slots }) {
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
    const formCtx = inject(FORM_CTX, undefined);

    mountFormContextSync(host, formCtx, props);

    let sliderFd:
      | {
          reportValidity: () => boolean;
        }
      | undefined;
    const valueSignal = signal('0');

    if (!isRange) {
      sliderFd = defineField(
        { disabled: computed(() => Boolean(props.disabled.value)), value: valueSignal },
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
        disabled: () => Boolean(props.disabled.value),
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
      sliderFd = defineField<{
        from: number;
        to: number;
      }>(
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
          startVal.value = snapVal(getNum(v as string | number | undefined, 0));
        },
        { immediate: true },
      );
      watch(
        props.to,
        (v) => {
          endVal.value = snapVal(getNum(v as string | number | undefined, 100));
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
    const { triggerValidation } = createFieldValidation(formCtx, {
      reportValidity: () => sliderFd?.reportValidity() ?? false,
    });

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
        emit('change', {
          from: startVal.value,
          to: endVal.value,
          value: { from: startVal.value, to: endVal.value },
        });
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
        emit('change', {
          from: startVal.value,
          originalEvent: e,
          to: endVal.value,
          value: { from: startVal.value, to: endVal.value },
        });
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

    return html`
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
            id="${startId}"></div>
          <div
            class="slider-thumb slider-thumb-end"
            part="thumb-end"
            ref=${thumbEndRef}
            role="slider"
            tabindex="${() => (props.disabled.value ? '-1' : '0')}"
            id="${endId}"></div>
        </div>
      </div>
      <span class="label" part="label" ref=${labelRef}><slot></slot></span>
    `;
  },
  styles: [
    disabledStateMixin(),
    colorThemeMixin,
    sizeVariantMixin(SLIDER_SIZE_PRESET),
    componentStyles,
    coarsePointerMixin,
  ],
  tag: 'bit-slider',
});
