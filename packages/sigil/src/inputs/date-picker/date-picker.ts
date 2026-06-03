import { computed, define, defineField, html, inject, onMounted, prop, signal } from '@vielzeug/craft';
import { Temporal, format } from '@vielzeug/tempo';

import type { ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../shared';

import { createDatePickerControl, formatDisplayDate, parseIso, toIsoString, type DatePickerView } from '../../headless';
import '../../content/icon/icon';
import '../input/input';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, reducedMotionMixin } from '../../styles';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import componentStyles from './date-picker.css?inline';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BitDatePickerEvents = {
  change: { isoValue: string | null };
};

export type BitDatePickerProps = {
  /** Theme color */
  color?: ThemeColor;
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
  /** Locale for day/month names (default: browser locale) */
  locale?: string;
  /** Latest selectable date in ISO 8601 format (yyyy-MM-dd) */
  max?: string;
  /** Earliest selectable date in ISO 8601 format (yyyy-MM-dd) */
  min?: string;
  /** Form field name */
  name?: string;
  /** Placeholder shown in the text trigger */
  placeholder?: string;
  /** Mark field as required */
  required?: boolean;
  /** Border radius */
  rounded?: RoundedSize;
  /** Component size */
  size?: ComponentSize;
  /**
   * Selected date in ISO 8601 format (yyyy-MM-dd).
   * @example '2025-06-15'
   */
  value?: string;
  /** Visual variant */
  variant?: Exclude<VisualVariant, 'glass' | 'text' | 'frost'>;
  /**
   * Day-of-week indices to disable (0 = Sunday … 6 = Saturday).
   * Pass as a JSON array attribute or a JS property.
   * @example
   * ```html
   * <bit-date-picker weekend-days="[0,6]"></bit-date-picker>
   * ```
   */
  'weekend-days'?: number[];
};

/**
 * An accessible, keyboard-navigable date picker with an inline calendar popup.
 * Supports min/max bounds, disabled weekend days, and form association.
 *
 * @element bit-date-picker
 *
 * @attr {string} value - Selected date in ISO 8601 format (yyyy-MM-dd)
 * @attr {string} min - Minimum selectable date (yyyy-MM-dd)
 * @attr {string} max - Maximum selectable date (yyyy-MM-dd)
 * @attr {string} label - Label text
 * @attr {string} label-placement - 'inset' | 'outside'
 * @attr {string} placeholder - Trigger placeholder
 * @attr {boolean} disabled - Disable the picker
 * @attr {boolean} required - Required field
 * @attr {string} name - Form field name
 * @attr {string} error - Error message
 * @attr {string} helper - Helper text
 * @attr {string} color - Theme color
 * @attr {string} size - Component size
 * @attr {string} variant - Visual variant
 * @attr {string} rounded - Border radius
 * @attr {string} locale - BCP 47 locale string
 * @attr {string} weekend-days - Comma-separated day indices to disable
 *
 * @fires change - Fired when a date is selected. detail: { value: Date | null, isoValue: string | null }
 *
 * @cssprop --date-picker-bg - Calendar background
 * @cssprop --date-picker-border-color - Calendar border color
 * @cssprop --date-picker-radius - Calendar border radius
 * @cssprop --date-picker-day-selected-bg - Background of selected day
 * @cssprop --date-picker-day-today-color - Color of today's date number
 * @cssprop --date-picker-day-outside-opacity - Opacity of days outside visible month
 *
 * @part field - The trigger button/field
 * @part calendar - The floating calendar panel
 * @part header - Calendar header (nav + label)
 * @part grid - Day grid
 * @part day - Individual day cell
 *
 * @example
 * ```html
 * <bit-date-picker label="Appointment date" min="2025-01-01" max="2025-12-31">
 * </bit-date-picker>
 * ```
 */
export const DATE_PICKER_TAG = 'bit-date-picker' as const;

define<BitDatePickerProps, BitDatePickerEvents>(DATE_PICKER_TAG, {
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
    locale: prop.string(),
    max: prop.string(),
    min: prop.string(),
    name: prop.string(),
    placeholder: prop.string(),
    required: prop.bool(false),
    value: prop.string(),
    variant: prop.string<'flat' | 'solid' | 'bordered' | 'outline' | 'ghost'>(),
    'weekend-days': prop.json([] as number[]),
  },

  setup(props, { bind, el, emit }) {
    // ── Signals ─────────────────────────────────────────────────────────────

    const isOpen = signal(false);
    const selectedDate = signal(parseIso(props.value.value));

    // ── Form context ────────────────────────────────────────────────────────

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const isDisabled = fCtxProps.disabled;
    const locale = computed(() => props.locale.value || (typeof navigator !== 'undefined' ? navigator.language : 'en'));

    // ── Date-picker control ─────────────────────────────────────────────────

    const ctrl = createDatePickerControl({
      get locale() {
        return locale.value;
      },
      get max() {
        return parseIso(props.max.value);
      },
      get min() {
        return parseIso(props.min.value);
      },
      onChange(date) {
        selectedDate.value = date;
        isOpen.value = false;
        ctrl.setView('day');
        bump();
        emit('change', { isoValue: toIsoString(date) });
      },
      get value() {
        return selectedDate.value;
      },
      get weekendDays() {
        return props['weekend-days'].value ?? [];
      },
    });

    // ── Version counter + explicit display signals ──────────────────────────
    // version drives cell arrays and view toggling.
    // displayYear / displayMonth mirror ctrl's internal state as proper reactive
    // signals so label computeds invalidate on every mutation.

    const version = signal(0);
    const displayYear = signal(ctrl.displayYear());
    const displayMonth = signal(ctrl.displayMonth());

    function bump(): void {
      displayYear.value = ctrl.displayYear();
      displayMonth.value = ctrl.displayMonth();
      version.value++;
    }

    // ── Form value (host is formAssociated) ──────────────────────────────────

    defineField<string>({
      disabled: isDisabled,
      toFormValue: (v) => v || null,
      value: computed(() => toIsoString(selectedDate.value) ?? ''),
    });

    const dialogId = `date-picker-${Math.random().toString(36).slice(2, 9)}-calendar`;

    // ── Sync value prop → selectedDate (with cleanup) ─────────────────────────

    onMounted(() => {
      let lastValueProp = props.value.value;

      const id = setInterval(() => {
        const current = props.value.value;

        if (current !== lastValueProp) {
          lastValueProp = current;

          const parsed = parseIso(current);

          selectedDate.value = parsed;

          if (parsed) {
            ctrl.goTo(parsed.year, parsed.month);
            bump();
          }
        }
      }, 50);

      return () => clearInterval(id);
    });

    // ── Derived display values ───────────────────────────────────────────────

    const triggerText = computed(() => {
      if (selectedDate.value) return formatDisplayDate(selectedDate.value, locale.value);

      return props.placeholder.value || '';
    });

    const displayMonth_ = computed(() => {
      const d = Temporal.PlainDate.from({ day: 1, month: displayMonth.value, year: displayYear.value });

      return format(d, { intl: { month: 'long' }, locale: locale.value, tz: 'UTC' });
    });

    const displayYear_ = computed(() => String(displayYear.value));
    const displayLabel = computed(() => `${displayMonth_.value} ${displayYear_.value}`);

    const dayCells = computed(() => {
      void version.value;

      return ctrl.dayCells();
    });
    const monthCells = computed(() => {
      void version.value;

      return ctrl.monthCells();
    });
    const yearCells = computed(() => {
      void version.value;

      return ctrl.yearCells();
    });
    const weekdayLabels = computed(() => ctrl.weekdayLabels());
    const tabIndex = () => (isDisabled.value ? '-1' : '0');

    // ── Navigation handlers ──────────────────────────────────────────────────
    // In year/month views navigate by year; in day view navigate by month.

    function handlePrev(): void {
      if (ctrl.view() === 'day') ctrl.prevMonth();
      else ctrl.prevYear();

      bump();
    }

    function handleNext(): void {
      if (ctrl.view() === 'day') ctrl.nextMonth();
      else ctrl.nextYear();

      bump();
    }

    function handleHeaderClick(): void {
      const next: DatePickerView = ctrl.view() === 'day' ? 'month' : ctrl.view() === 'month' ? 'year' : 'day';

      ctrl.setView(next);
      bump();
    }

    function handleSelectMonth(monthIndex: number): void {
      // monthIndex is 0-based (from monthCells.index) — ctrl expects 1-based
      ctrl.goTo(ctrl.displayYear(), monthIndex + 1);
      ctrl.setView('day');
      bump();
    }

    function handleSelectYear(year: number): void {
      ctrl.goTo(year, ctrl.displayMonth());
      ctrl.setView('month');
      bump();
    }

    function handleSelectDay(isoStr: string): void {
      const date = parseIso(isoStr);

      if (!date) return;

      ctrl.select(date);
      bump();
    }

    // ── Open / close ─────────────────────────────────────────────────────────

    function openPicker(): void {
      if (isDisabled.value) return;

      isOpen.value = true;
      ctrl.setView('day');

      const sel = selectedDate.value;

      if (sel) ctrl.goTo(sel.year, sel.month);

      bump();
    }

    function closePicker(): void {
      isOpen.value = false;
      ctrl.setView('day');
    }

    function handleTriggerClick(): void {
      if (isOpen.value) closePicker();
      else openPicker();
    }

    // ── Keyboard handlers ────────────────────────────────────────────────────

    function handleTriggerKeydown(e: KeyboardEvent): void {
      if (isDisabled.value) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTriggerClick();
      } else if (e.key === 'Escape' && isOpen.value) {
        e.preventDefault();
        closePicker();
      }
    }

    function handleCalendarKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePicker();
      }
    }

    function handleOutsideClick(e: MouseEvent): void {
      if (!isOpen.value) return;

      const path = e.composedPath();

      if (!path.includes(el)) closePicker();
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMounted(() => {
      document.addEventListener('click', handleOutsideClick, { capture: true });

      return () => {
        document.removeEventListener('click', handleOutsideClick, { capture: true });
      };
    });

    // ── Host bindings ────────────────────────────────────────────────────────

    bind({
      attr: {
        open: () => (isOpen.value ? true : undefined),
      },
    });

    // ── Template ─────────────────────────────────────────────────────────────

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
      <!-- Trigger: bit-input in readonly display mode -->
      <bit-input
        class="trigger"
        readonly
        tabindex="${tabIndex}"
        role="combobox"
        aria-haspopup="dialog"
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
        <bit-icon slot="suffix" name="calendar" size="16" stroke-width="1.75" aria-hidden="true"></bit-icon>
      </bit-input>

      <!-- Calendar popup -->
      <div
        class="calendar"
        id="${dialogId}"
        role="dialog"
        aria-modal="true"
        :aria-label="${() => `Choose date — ${displayLabel.value}`}"
        ?data-open="${isOpen}"
        @keydown="${handleCalendarKeydown}">
        <!-- Calendar header -->
        <div class="cal-header" part="header">
          <button class="nav-btn" type="button" aria-label="Previous" @click="${handlePrev}">
            <bit-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></bit-icon>
          </button>
          <button
            class="cal-label-btn"
            type="button"
            :aria-label="${() => `Switch to ${ctrl.view() === 'day' ? 'month' : 'year'} view`}"
            @click="${handleHeaderClick}">
            <span class="cal-label-month">${displayMonth_}</span><span class="cal-label-sep" aria-hidden="true">/</span
            ><span class="cal-label-year">${displayYear_}</span>
          </button>
          <button class="nav-btn" type="button" aria-label="Next" @click="${handleNext}">
            <bit-icon name="chevron-right" size="16" stroke-width="2" aria-hidden="true"></bit-icon>
          </button>
        </div>

        <!-- Day view: flat 7-column CSS grid, weekday headers + day cells -->
        <div
          class="cal-grid cal-grid-days"
          role="grid"
          part="grid"
          :aria-label="${() => displayLabel.value}"
          ?hidden="${() => {
            void version.value;

            return ctrl.view() !== 'day';
          }}">
          ${() =>
            weekdayLabels.value.map(
              (lbl) => html`<div class="cal-cell cal-cell-head" role="columnheader" aria-label="${lbl}">${lbl}</div>`,
            )}
          ${() =>
            dayCells.value.map(
              (cell) =>
                html`<div
                  class="cal-cell cal-cell-day"
                  role="gridcell"
                  part="day"
                  :aria-selected="${() => String(cell.isSelected)}"
                  :aria-disabled="${() => String(cell.isDisabled)}"
                  :aria-current="${() => (cell.isToday ? 'date' : null)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-today="${() => cell.isToday}"
                  ?data-outside="${() => cell.isOutsideMonth}"
                  ?data-disabled="${() => cell.isDisabled}"
                  data-iso="${cell.iso}"
                  tabindex="${() => (cell.isDisabled ? '-1' : '0')}"
                  @click="${() => {
                    if (!cell.isDisabled) handleSelectDay(cell.iso);
                  }}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();

                      if (!cell.isDisabled) handleSelectDay(cell.iso);
                    }
                  }}">
                  ${String(cell.day)}
                </div>`,
            )}
        </div>

        <!-- Month view -->
        <div
          class="cal-grid cal-grid-months"
          role="grid"
          :aria-label="${() => displayYear_.value}"
          ?hidden="${() => {
            void version.value;

            return ctrl.view() !== 'month';
          }}">
          ${() =>
            monthCells.value.map(
              (cell) =>
                html`<div
                  class="cal-cell cal-cell-month"
                  role="gridcell"
                  :aria-selected="${() => String(cell.isSelected)}"
                  :aria-disabled="${() => String(cell.isDisabled)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-disabled="${() => cell.isDisabled}"
                  tabindex="${() => (cell.isDisabled ? '-1' : '0')}"
                  @click="${() => {
                    if (!cell.isDisabled) handleSelectMonth(cell.index);
                  }}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();

                      if (!cell.isDisabled) handleSelectMonth(cell.index);
                    }
                  }}">
                  ${cell.shortLabel}
                </div>`,
            )}
        </div>

        <!-- Year view -->
        <div
          class="cal-grid cal-grid-years"
          role="grid"
          aria-label="Select year"
          ?hidden="${() => {
            void version.value;

            return ctrl.view() !== 'year';
          }}">
          ${() =>
            yearCells.value.map(
              (cell) =>
                html`<div
                  class="cal-cell cal-cell-year"
                  role="gridcell"
                  :aria-selected="${() => String(cell.isSelected)}"
                  :aria-disabled="${() => String(cell.isDisabled)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-disabled="${() => cell.isDisabled}"
                  tabindex="${() => (cell.isDisabled ? '-1' : '0')}"
                  @click="${() => {
                    if (!cell.isDisabled) handleSelectYear(cell.year);
                  }}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();

                      if (!cell.isDisabled) handleSelectYear(cell.year);
                    }
                  }}">
                  ${String(cell.year)}
                </div>`,
            )}
        </div>
      </div>
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, reducedMotionMixin, componentStyles],
});
