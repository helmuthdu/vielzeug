import {
  define,
  computed,
  createId,
  defineField,
  handle,
  html,
  inject,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { createSliderControl, createValidationControl } from '@vielzeug/craftit/controls';

import type { DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import { syncAria } from '../../utils/aria';
import { disablableBundle, sizableBundle, themableBundle, type PropBundle } from '../shared/bundles';
import { SLIDER_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import componentStyles from './slider.css?inline';

const guard =
  <E extends Event = Event>(condition: () => unknown, handler: (e: E) => void): ((e: E) => void) =>
  (e) => {
    if (condition()) handler(e);
  };

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

const sliderProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  from: '0',
  'from-value-text': undefined,
  max: '100',
  min: '0',
  name: '',
  range: false,
  step: '1',
  to: '100',
  'to-value-text': undefined,
  value: '0',
  'value-text': undefined,
} satisfies PropBundle<BitSliderProps>;

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
export const SLIDER_TAG = define<BitSliderProps, BitSliderEvents>('bit-slider', {
  formAssociated: true,
  props: sliderProps,
  setup({ emit, host, props, slots }) {
    // Treat `range` as static — determined at first render
    const isRange = props.range.value;
    // ── Shared helpers ────────────────────────────────────────────
    const sliderControl = createSliderControl({
      max: () => props.max.value,
      min: () => props.min.value,
      step: () => props.step.value,
    });
    // ── Single-value state ────────────────────────────────────────
    const formCtx = inject(FORM_CTX, undefined);
    const isDragging = signal(false);
    const isDisabled = computed(() => Boolean(props.disabled.value));
    const labelledById = signal<string | undefined>(undefined);

    mountFormContextSync(host.el, formCtx, props);

    host.bind('attr', {
      'data-dragging': () => (isDragging.value ? true : undefined),
    });

    let sliderFd:
      | {
          reportValidity: () => boolean;
        }
      | undefined;
    const valueSignal = signal('0');

    if (!isRange) {
      sliderFd = defineField(
        { disabled: isDisabled, value: valueSignal },
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
      host.bind('attr', {
        ariaDisabled: () => (isDisabled.value ? 'true' : null),
        ariaLabelledby: () => labelledById.value ?? null,
        ariaValuemax: () => sliderControl.max(),
        ariaValuemin: () => sliderControl.min(),
        ariaValuenow: () => Number(valueSignal.value || 0),
        ariaValuetext: () => props['value-text'].value ?? null,
        role: () => 'slider',
        tabindex: () => (isDisabled.value ? null : '0'),
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
          disabled: isDisabled,
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
            startVal.value = sliderControl.snap(Number(props.from.value));
            endVal.value = sliderControl.snap(Number(props.to.value));
          },
        },
      );
      watch(
        props.from,
        (v) => {
          startVal.value = sliderControl.snap(Number(v));
        },
        { immediate: true },
      );
      watch(
        props.to,
        (v) => {
          endVal.value = sliderControl.snap(Number(v));
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
      const pct = sliderControl.toPercent(value);

      host.el.style.setProperty('--_thumb-pos', `${pct}%`);
      host.el.style.setProperty('--_fill-start', '0%');
      host.el.style.setProperty('--_fill-width', `${pct}%`);
    };
    const updateRangeCSS = () => {
      const s = sliderControl.toPercent(startVal.value);
      const e = sliderControl.toPercent(endVal.value);

      host.el.style.setProperty('--_thumb-start', `${s}%`);
      host.el.style.setProperty('--_thumb-end', `${e}%`);
      host.el.style.setProperty('--_fill-start', `${s}%`);
      host.el.style.setProperty('--_fill-width', `${e - s}%`);
    };

    // ── Range mode setup ──────────────────────────────────────────
    const { triggerValidation } = createValidationControl(formCtx?.validateOn, {
      reportValidity: () => sliderFd?.reportValidity() ?? false,
    });

    const setupRangeMode = (container: HTMLDivElement) => {
      updateRangeCSS();

      const clientToValue = (clientX: number) => {
        const rect = container.getBoundingClientRect();

        return sliderControl.fromClientX(clientX, rect);
      };
      let dragging: 'start' | 'end' | null = null;
      const applyDrag = (val: number) => {
        if (dragging === 'start') startVal.value = Math.min(sliderControl.snap(val), endVal.value);
        else if (dragging === 'end') endVal.value = Math.max(sliderControl.snap(val), startVal.value);

        startVal.value = sliderControl.clamp(startVal.value);
        endVal.value = sliderControl.clamp(endVal.value);
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
          () => !isDisabled.value,
          (e: PointerEvent) => {
            e.preventDefault();

            const val = clientToValue(e.clientX);

            dragging = Math.abs(val - startVal.value) <= Math.abs(val - endVal.value) ? 'start' : 'end';
            isDragging.value = true;
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
            isDragging.value = false;
            (e.target as Element).releasePointerCapture(e.pointerId);
          },
        ),
      );

      const makeThumbKeydown = (getVal: () => number, setVal: (v: number) => void) => (e: KeyboardEvent) => {
        if (isDisabled.value) return;

        const next = sliderControl.nextFromKey(e.key, getVal());

        if (next === null) return;

        e.preventDefault();
        setVal(sliderControl.snap(next));
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
        handle(
          thumbStartEl,
          'keydown',
          makeThumbKeydown(
            () => startVal.value,
            (v) => {
              startVal.value = Math.min(v, endVal.value);
            },
          ),
        );
        syncAria(thumbStartEl, {
          label: 'Range start',
          valuemax: () => endVal.value,
          valuemin: () => sliderControl.min(),
          valuenow: () => startVal.value,
          valuetext: () => props['from-value-text'].value ?? null,
        });
      }

      if (thumbEndEl) {
        handle(
          thumbEndEl,
          'keydown',
          makeThumbKeydown(
            () => endVal.value,
            (v) => {
              endVal.value = Math.max(v, startVal.value);
            },
          ),
        );
        syncAria(thumbEndEl, {
          label: 'Range end',
          valuemax: () => sliderControl.max(),
          valuemin: () => startVal.value,
          valuenow: () => endVal.value,
          valuetext: () => props['to-value-text'].value ?? null,
        });
      }
    };
    // ── Single-value mode setup ───────────────────────────────────
    const setupSingleMode = (container: HTMLDivElement) => {
      updateSingleCSS(Number(valueSignal.value));

      const updateValue = (clientX: number) => {
        if (isDisabled.value) return;

        const rect = container.getBoundingClientRect();
        const newValue = sliderControl.fromClientX(clientX, rect);

        if (Number(valueSignal.value) !== newValue) {
          valueSignal.value = newValue.toString();
          updateSingleCSS(newValue);
          emit('change', { value: newValue });
          triggerValidation('change');
        }
      };
      let isPointerDragging = false;

      handle(
        container,
        'pointerdown',
        guard(
          () => !isDisabled.value,
          (e: PointerEvent) => {
            e.preventDefault();
            isPointerDragging = true;
            updateValue(e.clientX);
            (e.target as Element).setPointerCapture(e.pointerId);
          },
        ),
      );
      handle(
        container,
        'pointermove',
        guard(
          () => isPointerDragging,
          (e: PointerEvent) => {
            e.preventDefault();

            if (!isDragging.value) isDragging.value = true;

            updateValue(e.clientX);
          },
        ),
      );
      handle(
        container,
        'pointerup',
        guard(
          () => isPointerDragging,
          (e: PointerEvent) => {
            e.preventDefault();
            isPointerDragging = false;
            isDragging.value = false;
            (e.target as Element).releasePointerCapture(e.pointerId);
          },
        ),
      );
      handle(
        host.el,
        'keydown',
        guard(
          () => !isDisabled.value,
          (e: KeyboardEvent) => {
            const val = Number(valueSignal.value || 0);
            const next = sliderControl.nextFromKey(e.key, val);

            if (next === null) return;

            e.preventDefault();

            const newValue = sliderControl.clamp(next);

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

      if (slots.has().value && labelRef.value) {
        const labelId = createId('slider-label');

        labelRef.value.id = labelId;

        if (!isRange) labelledById.value = labelId;
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
            tabindex="${() => (isDisabled.value ? '-1' : '0')}"
            id="${startId}"></div>
          <div
            class="slider-thumb slider-thumb-end"
            part="thumb-end"
            ref=${thumbEndRef}
            role="slider"
            tabindex="${() => (isDisabled.value ? '-1' : '0')}"
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
});
