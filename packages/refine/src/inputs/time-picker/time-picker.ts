import { define, useField, html, inject, prop } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';

import type { VisualVariant } from '../../shared';

import '../../content/icon/icon';
import '../input/input';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, reducedMotionMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './time-picker.css?inline';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OreTimePickerEvents = {
  change: { value: string | null };
};

export type OreTimePickerProps = {
  /** Theme color */
  color?: string;
  /** Disable the picker */
  disabled?: boolean;
  /** Validation error message */
  error?: string;
  /** Expand to container width */
  fullwidth?: boolean;
  /** Helper text below the field */
  helper?: string;
  /** Visible label */
  label?: string;
  /** Label placement */
  'label-placement'?: 'inset' | 'outside';
  /** Maximum selectable time in HH:MM format (24-hour) */
  max?: string;
  /** Minimum selectable time in HH:MM format (24-hour) */
  min?: string;
  /** Minute step interval (1–59) */
  'minute-step'?: number;
  /** Form field name */
  name?: string;
  /** Placeholder shown in the trigger */
  placeholder?: string;
  /** Mark field as required */
  required?: boolean;
  /** Border radius */
  rounded?: string;
  /** Component size */
  size?: string;
  /** Display format: '12' for AM/PM, '24' for 24-hour (default: '24') */
  'time-format'?: '12' | '24';
  /** Selected time in HH:MM format (24-hour) */
  value?: string;
  /** Visual variant */
  variant?: Exclude<VisualVariant, 'text' | 'frost'>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → { hours: 0-23, minutes: 0-59 } | null */
function parseTime(val: string | undefined | null): { hours: number; minutes: number } | null {
  if (!val) return null;

  const match = /^(\d{1,2}):(\d{2})$/.exec(val.trim());

  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return { hours: h, minutes: m };
}

/** Format { hours, minutes } → "HH:MM" (24-hour, zero-padded) */
function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format for display label (respects 12/24 mode) */
function formatDisplay(h: number, m: number, format: '12' | '24'): string {
  if (format === '12') {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;

    return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  return formatTime(h, m);
}

/** Clamp value to [min, max] in total minutes */
function clampTime(
  h: number,
  m: number,
  minVal: string | undefined | null,
  maxVal: string | undefined | null,
): { hours: number; minutes: number } {
  const total = h * 60 + m;
  const minParsed = parseTime(minVal);
  const maxParsed = parseTime(maxVal);
  const minMins = minParsed ? minParsed.hours * 60 + minParsed.minutes : 0;
  const maxMins = maxParsed ? maxParsed.hours * 60 + maxParsed.minutes : 23 * 60 + 59;
  const clamped = Math.min(Math.max(total, minMins), maxMins);

  return { hours: Math.floor(clamped / 60), minutes: clamped % 60 };
}

/**
 * An accessible time picker with a scrollable clock dropdown.
 * Supports 12/24-hour display formats, min/max bounds, minute steps, and form association.
 *
 * @element ore-time-picker
 *
 * @attr {string} value - Selected time in HH:MM (24-hour) format
 * @attr {string} min - Minimum selectable time (HH:MM)
 * @attr {string} max - Maximum selectable time (HH:MM)
 * @attr {string} label - Label text
 * @attr {string} label-placement - 'inset' | 'outside'
 * @attr {string} placeholder - Trigger placeholder
 * @attr {boolean} disabled - Disable the picker
 * @attr {boolean} required - Required field
 * @attr {string} name - Form field name
 * @attr {string} error - Error message
 * @attr {string} helper - Helper text
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} time-format - '12' or '24' (default: '24')
 * @attr {number} minute-step - Minute increment (default: 5)
 *
 * @fires change - Fired when a time is selected. detail: { value: string | null }
 *
 * @slot label - Custom label for the trigger field
 * @slot prefix - Content before the trigger text (e.g. icon)
 * @slot helper - Custom helper text
 * @slot error - Custom error content
 *
 * @cssprop --time-picker-bg - Dropdown background
 * @cssprop --time-picker-border-color - Dropdown border color
 * @cssprop --time-picker-radius - Dropdown border radius
 * @cssprop --time-picker-shadow - Dropdown shadow
 * @cssprop --time-picker-selected-bg - Selected option background
 * @cssprop --time-picker-option-hover-bg - Option hover background
 *
 * @part field - The trigger field
 * @part dropdown - The floating time dropdown
 * @part column - A scrollable column (hours / minutes / period)
 * @part option - An individual time option cell
 *
 * @example
 * ```html
 * <!-- 24-hour clock, 15-minute steps -->
 * <ore-time-picker label="Meeting time" value="09:30" minute-step="15" color="primary"></ore-time-picker>
 *
 * <!-- 12-hour AM/PM format -->
 * <ore-time-picker label="Appointment" time-format="12" minute-step="30"></ore-time-picker>
 *
 * <!-- Outside label, bordered variant -->
 * <ore-time-picker label="Start time" label-placement="outside" variant="bordered"></ore-time-picker>
 * ```
 */
export const TIME_PICKER_TAG = 'ore-time-picker' as const;

define<OreTimePickerProps, OreTimePickerEvents>(TIME_PICKER_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...roundableBundle,
    error: prop.string(),
    fullwidth: prop.bool(false),
    helper: prop.string(),
    label: prop.string(),
    'label-placement': prop.oneOf(['inset', 'outside'] as const, 'inset'),
    max: prop.string(),
    min: prop.string(),
    'minute-step': prop.number(5),
    name: prop.string(),
    placeholder: prop.string(),
    required: prop.bool(false),
    'time-format': prop.oneOf(['12', '24'] as const, '24'),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
  },

  setup(props, { bind, el, emit, onMounted }) {
    // ── Signals ──────────────────────────────────────────────────────────────

    const isOpen = signal(false);
    const selectedTime = signal<{ hours: number; minutes: number } | null>(parseTime(props.value.value));

    // ── Form context ─────────────────────────────────────────────────────────

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const isDisabled = fCtxProps.disabled;

    // ── Form value ────────────────────────────────────────────────────────────

    useField<string>({
      disabled: isDisabled,
      toFormValue: (v) => v || null,
      value: computed(() => {
        const t = selectedTime.value;

        return t ? formatTime(t.hours, t.minutes) : '';
      }),
    });

    // ── Computed helpers ──────────────────────────────────────────────────────

    const fmt = computed(() => props['time-format'].value ?? '24');
    const minuteStep = computed(() => Math.max(1, Math.min(59, props['minute-step'].value ?? 5)));

    const triggerText = computed(() => {
      if (!selectedTime.value) return props.placeholder.value || '';

      return formatDisplay(selectedTime.value.hours, selectedTime.value.minutes, fmt.value as '12' | '24');
    });

    /** All hour options for the column (0-23 in 24h; 1-12 in 12h) */
    const hourOptions = computed<number[]>(() => {
      if (fmt.value === '12') {
        return Array.from({ length: 12 }, (_, i) => i + 1);
      }

      return Array.from({ length: 24 }, (_, i) => i);
    });

    /** All minute options for the column, stepped */
    const minuteOptions = computed<number[]>(() => {
      const step = minuteStep.value;
      const opts: number[] = [];

      for (let m = 0; m < 60; m += step) opts.push(m);

      return opts;
    });

    const dialogId = `time-picker-${Math.random().toString(36).slice(2, 9)}-dropdown`;

    /** Convert 24h hour to display hour in current format */
    function toDisplayHour(h24: number): number {
      if (fmt.value === '24') return h24;

      const h12 = h24 % 12;

      return h12 === 0 ? 12 : h12;
    }

    /** Convert display hour + period → 24h hour */
    function to24Hour(displayHour: number, period: 'AM' | 'PM'): number {
      if (fmt.value === '24') return displayHour;

      if (period === 'AM') return displayHour === 12 ? 0 : displayHour;

      return displayHour === 12 ? 12 : displayHour + 12;
    }

    /** Whether a given HH:MM is out of [min, max] */
    function isTimeDisabled(h: number, m: number): boolean {
      const total = h * 60 + m;
      const minParsed = parseTime(props.min.value);
      const maxParsed = parseTime(props.max.value);

      if (minParsed && total < minParsed.hours * 60 + minParsed.minutes) return true;

      if (maxParsed && total > maxParsed.hours * 60 + maxParsed.minutes) return true;

      return false;
    }

    // ── State for focused/pending selection ───────────────────────────────────

    /** Pending hour (24h) while user is navigating columns */
    const pendingHour = signal<number>(selectedTime.value?.hours ?? 0);
    /** Pending minute */
    const pendingMinute = signal<number>(selectedTime.value?.minutes ?? 0);
    /** Pending period (12h mode) */
    const pendingPeriod = signal<'AM' | 'PM'>((selectedTime.value?.hours ?? 0) >= 12 ? 'PM' : 'AM');

    // ── Sync value prop externally ────────────────────────────────────────────

    let lastValueProp = props.value.value;

    onMounted(() => {
      const interval = setInterval(() => {
        const current = props.value.value;

        if (current !== lastValueProp) {
          lastValueProp = current;

          const parsed = parseTime(current);

          selectedTime.value = parsed;

          if (parsed) {
            pendingHour.value = parsed.hours;
            pendingMinute.value = parsed.minutes;
            pendingPeriod.value = parsed.hours >= 12 ? 'PM' : 'AM';
          }
        }
      }, 50);

      return () => clearInterval(interval);
    });

    // ── Commit ────────────────────────────────────────────────────────────────

    function commit(h24: number, m: number): void {
      const clamped = clampTime(h24, m, props.min.value, props.max.value);
      const snapped = Math.round(clamped.minutes / minuteStep.value) * minuteStep.value;
      const snappedMin = Math.min(snapped, 59);

      selectedTime.value = { hours: clamped.hours, minutes: snappedMin };
      emit('change', { value: formatTime(clamped.hours, snappedMin) });
    }

    function commitFromMinute(m: number): void {
      const h24 = fmt.value === '12' ? to24Hour(pendingHour.value, pendingPeriod.value) : pendingHour.value;

      pendingMinute.value = m;
      commit(h24, m);
      closePicker();
    }

    // ── Open / close ──────────────────────────────────────────────────────────

    function openPicker(): void {
      if (isDisabled.value) return;

      const current = selectedTime.value;

      if (current) {
        pendingHour.value = fmt.value === '12' ? toDisplayHour(current.hours) : current.hours;
        pendingMinute.value = current.minutes;
        pendingPeriod.value = current.hours >= 12 ? 'PM' : 'AM';
      } else {
        pendingHour.value = fmt.value === '12' ? 12 : 0;
        pendingMinute.value = 0;
        pendingPeriod.value = 'AM';
      }

      isOpen.value = true;
    }

    function closePicker(): void {
      isOpen.value = false;
    }

    function handleTriggerClick(): void {
      if (isOpen.value) closePicker();
      else openPicker();
    }

    // ── Outside click ─────────────────────────────────────────────────────────

    function handleOutsideClick(e: PointerEvent | MouseEvent): void {
      if (!isOpen.value) return;

      if (!e.composedPath().includes(el)) closePicker();
    }

    onMounted(() => {
      document.addEventListener('pointerdown', handleOutsideClick, { capture: true });

      return () => document.removeEventListener('pointerdown', handleOutsideClick, { capture: true });
    });

    // ── Keyboard ──────────────────────────────────────────────────────────────

    function handleTriggerKeydown(e: KeyboardEvent): void {
      if (isDisabled.value) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTriggerClick();
      } else if (e.key === 'Escape' && isOpen.value) {
        e.preventDefault();
        closePicker();
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isOpen.value) {
        e.preventDefault();
        openPicker();
      }
    }

    function handleDropdownKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePicker();
      }
    }

    function handleHourKeydown(e: KeyboardEvent): void {
      const opts = hourOptions.value;
      const idx = opts.indexOf(pendingHour.value);

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        pendingHour.value = opts[(idx - 1 + opts.length) % opts.length];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        pendingHour.value = opts[(idx + 1) % opts.length];
      }
    }

    function handleMinuteKeydown(e: KeyboardEvent): void {
      const opts = minuteOptions.value;
      const idx = opts.indexOf(pendingMinute.value);

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        pendingMinute.value = opts[(idx - 1 + opts.length) % opts.length];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        pendingMinute.value = opts[(idx + 1) % opts.length];
      }
    }

    function handlePeriodKeydown(e: KeyboardEvent): void {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        pendingPeriod.value = pendingPeriod.value === 'AM' ? 'PM' : 'AM';
      }
    }

    // ── Host bindings ─────────────────────────────────────────────────────────

    bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
      },
    });

    // ── ore-input prop helpers ────────────────────────────────────────────────

    const inputValue = () => triggerText.value;
    const inputLabel = () => props.label.value ?? '';
    const inputPlaceholder = () => props.placeholder.value ?? '';
    const inputLabelPlacement = () => props['label-placement'].value ?? 'inset';
    const inputColor = () => props.color?.value ?? undefined;
    const inputSize = () => fCtxProps.size?.value ?? undefined;
    const inputVariant = () => fCtxProps.variant?.value ?? undefined;
    const inputRounded = () => props.rounded?.value ?? undefined;
    const inputHelper = () => props.helper.value ?? '';
    const inputError = () => props.error.value ?? '';
    const inputDisabled = () => (isDisabled.value ? true : undefined);
    const inputRequired = () => (props.required.value ? true : undefined);
    const inputFullwidth = () => (props.fullwidth.value ? true : undefined);

    return html`
      <!-- Trigger -->
      <ore-input
        class="trigger"
        readonly
        tabindex="0"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls="${dialogId}"
        :aria-expanded="${() => String(isOpen.value)}"
        :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
        :value="${inputValue}"
        :label="${inputLabel}"
        :placeholder="${inputPlaceholder}"
        :label-placement="${inputLabelPlacement}"
        :color="${inputColor}"
        :size="${inputSize}"
        :variant="${inputVariant}"
        :rounded="${inputRounded}"
        :helper="${inputHelper}"
        :error="${inputError}"
        ?disabled="${inputDisabled}"
        ?required="${inputRequired}"
        ?fullwidth="${inputFullwidth}"
        @click="${handleTriggerClick}"
        @keydown="${handleTriggerKeydown}">
        <ore-icon slot="suffix" name="clock" size="16" stroke-width="1.75" aria-hidden="true"></ore-icon>
      </ore-input>

      <!-- Dropdown -->
      <div
        class="dropdown"
        id="${dialogId}"
        role="listbox"
        aria-label="${() => (props.label.value ? `${props.label.value} — select time` : 'Select time')}"
        ?data-open="${isOpen}"
        @keydown="${handleDropdownKeydown}">
        <div class="cols-row">
          <!-- Hours column -->
          <div class="col" part="column" role="group" aria-label="Hours">
            <div class="col-label" aria-hidden="true">HH</div>
            <div class="col-scroll">
              ${() =>
                hourOptions.value.map((h) => {
                  const h24 = fmt.value === '12' ? to24Hour(h, pendingPeriod.value) : h;
                  const disabled = isTimeDisabled(h24, pendingMinute.value);

                  return html`<div
                    class="option"
                    part="option"
                    role="option"
                    tabindex="${() => (pendingHour.value === h && !disabled ? '0' : '-1')}"
                    :aria-selected="${() => String(pendingHour.value === h)}"
                    :aria-disabled="${() => String(disabled)}"
                    ?data-disabled="${() => disabled}"
                    @click="${() => {
                      if (!disabled) pendingHour.value = h;
                    }}"
                    @keydown="${handleHourKeydown}">
                    ${String(h).padStart(2, '0')}
                  </div>`;
                })}
            </div>
          </div>

          <div class="col-sep" aria-hidden="true">:</div>

          <!-- Minutes column -->
          <div class="col" part="column" role="group" aria-label="Minutes">
            <div class="col-label" aria-hidden="true">MM</div>
            <div class="col-scroll">
              ${() =>
                minuteOptions.value.map((m) => {
                  const h24 = fmt.value === '12' ? to24Hour(pendingHour.value, pendingPeriod.value) : pendingHour.value;
                  const disabled = isTimeDisabled(h24, m);

                  return html`<div
                    class="option"
                    part="option"
                    role="option"
                    tabindex="${() => (pendingMinute.value === m && !disabled ? '0' : '-1')}"
                    :aria-selected="${() => String(pendingMinute.value === m)}"
                    :aria-disabled="${() => String(disabled)}"
                    ?data-disabled="${() => disabled}"
                    @click="${() => {
                      if (!disabled) commitFromMinute(m);
                    }}"
                    @keydown="${handleMinuteKeydown}">
                    ${String(m).padStart(2, '0')}
                  </div>`;
                })}
            </div>
          </div>

          <!-- AM/PM column (12h mode only) -->
          ${() =>
            fmt.value === '12'
              ? html` <div class="col col-period" part="column" role="group" aria-label="Period">
                  <div class="col-label" aria-hidden="true">AM/PM</div>
                  <div class="col-scroll">
                    ${(['AM', 'PM'] as const).map(
                      (p) =>
                        html`<div
                          class="option"
                          part="option"
                          role="option"
                          tabindex="${() => (pendingPeriod.value === p ? '0' : '-1')}"
                          :aria-selected="${() => String(pendingPeriod.value === p)}"
                          @click="${() => {
                            pendingPeriod.value = p;
                          }}"
                          @keydown="${handlePeriodKeydown}">
                          ${p}
                        </div>`,
                    )}
                  </div>
                </div>`
              : html``}
        </div>
      </div>
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, reducedMotionMixin, componentStyles],
});
