import { define, useField, html, inject, prop } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
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

export type OreDatePickerEvents = {
  change: { isoValue: string | null };
};

export type OreDatePickerProps = {
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
  variant?: Exclude<VisualVariant, 'text' | 'frost'>;
  /**
   * Day-of-week indices to disable (0 = Sunday … 6 = Saturday).
   * Pass as a JSON array attribute or a JS property.
   * @example
   * ```html
   * <ore-date-picker weekend-days="[0,6]"></ore-date-picker>
   * ```
   */
  'weekend-days'?: number[];
};

/**
 * An accessible, keyboard-navigable date picker with an inline calendar popup.
 * Supports min/max bounds, disabled weekend days, and form association.
 *
 * @element ore-date-picker
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
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} locale - BCP 47 locale string
 * @attr {string} weekend-days - Comma-separated day indices to disable
 *
 * @fires change - Fired when a date is selected. detail: { isoValue: string | null }
 *
 * @slot label - Custom label for the trigger field
 * @slot prefix - Content before the trigger text (e.g. icon)
 * @slot helper - Custom helper text
 * @slot error - Custom error content
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
 * <!-- Single date with constraints -->
 * <ore-date-picker label="Appointment date" name="date" min="2025-01-01" max="2025-12-31" color="primary"></ore-date-picker>
 *
 *
 * <!-- Outside label, bordered variant -->
 * <ore-date-picker label="Start date" label-placement="outside" variant="bordered"></ore-date-picker>
 * ```
 */
export const DATE_PICKER_TAG = 'ore-date-picker' as const;

define<OreDatePickerProps, OreDatePickerEvents>(DATE_PICKER_TAG, {
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

  setup(props, { bind, el, emit, onMounted }) {
    // ── Signals ─────────────────────────────────────────────────────────────

    const isOpen = signal(false);

    // ── Selected date: local-override pattern ──────────────────────────────
    // localSelection holds a user-initiated pick (or undefined = no override).
    // selectedDate falls back to the value prop reactively — no setInterval needed.

    const localSelection = signal<Temporal.PlainDate | null | undefined>(undefined);

    const selectedDate = computed(() =>
      localSelection.value !== undefined ? localSelection.value : parseIso(props.value.value),
    );

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
        localSelection.value = date;
        isOpen.value = false;
        ctrl.setView('day');
        currentView.value = 'day';
        displayYear.value = ctrl.displayYear();
        displayMonth.value = ctrl.displayMonth();
        emit('change', { isoValue: toIsoString(date) });
      },
      get value() {
        return selectedDate.value;
      },
      get weekendDays() {
        return props['weekend-days'].value ?? [];
      },
    });

    // ── Reactive display state ────────────────────────────────────────────
    // Three separate primitive signals — the proven pattern.

    const currentView = signal<DatePickerView>('day');
    const displayYear = signal(ctrl.displayYear());
    const displayMonth = signal(ctrl.displayMonth()); // 1-indexed (Temporal)

    // ── Form value (host is formAssociated) ──────────────────────────────────

    useField<string>({
      disabled: isDisabled,
      toFormValue: (v) => v || null,
      value: computed(() => toIsoString(selectedDate.value) ?? ''),
    });

    const dialogId = `date-picker-${Math.random().toString(36).slice(2, 9)}-calendar`;

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
      void displayYear.value;
      void displayMonth.value;
      void selectedDate.value; // re-run when selection changes to refresh isSelected flags

      return ctrl.dayCells();
    });
    const monthCells = computed(() => {
      void displayYear.value;

      return ctrl.monthCells();
    });
    const yearCells = computed(() => {
      void displayYear.value;

      return ctrl.yearCells();
    });
    const weekdayLabels = computed(() => ctrl.weekdayLabels());
    const tabIndex = () => (isDisabled.value ? '-1' : '0');

    // ── Navigation handlers ──────────────────────────────────────────────────
    // In year/month views navigate by year; in day view navigate by month.

    function handlePrev(): void {
      if (currentView.value === 'day') ctrl.prevMonth();
      else ctrl.prevYear();

      displayYear.value = ctrl.displayYear();
      displayMonth.value = ctrl.displayMonth();
    }

    function handleNext(): void {
      if (currentView.value === 'day') ctrl.nextMonth();
      else ctrl.nextYear();

      displayYear.value = ctrl.displayYear();
      displayMonth.value = ctrl.displayMonth();
    }

    function handleHeaderClick(): void {
      const views: DatePickerView[] = ['day', 'month', 'year'];
      const next = views[(views.indexOf(currentView.value) + 1) % views.length];

      ctrl.setView(next);
      currentView.value = next;
    }

    function handleSelectMonth(month: number): void {
      ctrl.goTo(ctrl.displayYear(), month);
      ctrl.setView('day');
      displayYear.value = ctrl.displayYear();
      displayMonth.value = ctrl.displayMonth();
      currentView.value = 'day';
    }

    function handleSelectYear(year: number): void {
      ctrl.goTo(year, ctrl.displayMonth());
      ctrl.setView('month');
      displayYear.value = ctrl.displayYear();
      currentView.value = 'month';
    }

    function handleSelectDay(isoStr: string): void {
      const date = parseIso(isoStr);

      if (!date) return;

      ctrl.select(date);
    }

    function handleDayKeydown(e: KeyboardEvent): void {
      const cell = e.currentTarget as HTMLElement;
      const grid = cell.closest('.cal-grid-days');

      if (!grid) return;

      const allCells = Array.from(grid.querySelectorAll<HTMLElement>('.cal-cell-day'));
      const idx = allCells.indexOf(cell);

      if (idx === -1) return;

      let target: HTMLElement | undefined;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectDay(cell.dataset.iso ?? '');

        return;
      } else if (e.key === 'ArrowRight') {
        target = allCells[idx + 1];
      } else if (e.key === 'ArrowLeft') {
        target = allCells[idx - 1];
      } else if (e.key === 'ArrowDown') {
        target = allCells[idx + 7];
      } else if (e.key === 'ArrowUp') {
        target = allCells[idx - 7];
      } else if (e.key === 'Home') {
        target = allCells[Math.floor(idx / 7) * 7];
      } else if (e.key === 'End') {
        target = allCells[Math.floor(idx / 7) * 7 + 6];
      } else {
        return;
      }

      e.preventDefault();
      target?.focus();
    }

    // ── Month/year-cell keyboard navigation (fixed 4-column grid) ─────────────

    function handleGridKeydown(e: KeyboardEvent, cellSelector: string, columns: number, onSelect: () => void): void {
      const cell = e.currentTarget as HTMLElement;
      const grid = cell.closest('.cal-grid');

      if (!grid) return;

      const allCells = Array.from(grid.querySelectorAll<HTMLElement>(cellSelector));
      const idx = allCells.indexOf(cell);

      if (idx === -1) return;

      let target: HTMLElement | undefined;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();

        return;
      } else if (e.key === 'ArrowRight') {
        target = allCells[idx + 1];
      } else if (e.key === 'ArrowLeft') {
        target = allCells[idx - 1];
      } else if (e.key === 'ArrowDown') {
        target = allCells[idx + columns];
      } else if (e.key === 'ArrowUp') {
        target = allCells[idx - columns];
      } else if (e.key === 'Home') {
        target = allCells[Math.floor(idx / columns) * columns];
      } else if (e.key === 'End') {
        target = allCells[Math.min(Math.floor(idx / columns) * columns + columns - 1, allCells.length - 1)];
      } else {
        return;
      }

      e.preventDefault();
      target?.focus();
    }

    // ── Open / close ─────────────────────────────────────────────────────────

    function openPicker(): void {
      if (isDisabled.value) return;

      isOpen.value = true;
      ctrl.setView('day');
      currentView.value = 'day';

      const sel = selectedDate.value;

      if (sel) {
        ctrl.goTo(sel.year, sel.month);
        displayYear.value = ctrl.displayYear();
        displayMonth.value = ctrl.displayMonth();
      }
    }

    function closePicker(): void {
      isOpen.value = false;
      ctrl.setView('day');
      currentView.value = 'day';
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

    function handleOutsideClick(e: PointerEvent | MouseEvent): void {
      if (!isOpen.value) return;

      const path = e.composedPath();

      if (!path.includes(el)) closePicker();
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMounted(() => {
      document.addEventListener('pointerdown', handleOutsideClick, { capture: true });

      return () => {
        document.removeEventListener('pointerdown', handleOutsideClick, { capture: true });
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
      <!-- Trigger: ore-input in readonly display mode -->
      <ore-input
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
        <ore-icon slot="suffix" name="calendar" size="16" stroke-width="1.75" aria-hidden="true"></ore-icon>
      </ore-input>

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
            <ore-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
          </button>
          <button
            class="cal-label-btn"
            type="button"
            :aria-label="${() =>
              `Switch to ${currentView.value === 'day' ? 'month' : currentView.value === 'month' ? 'year' : 'day'} view`}"
            @click="${handleHeaderClick}">
            <span class="cal-label-month">${displayMonth_}</span><span class="cal-label-sep" aria-hidden="true">/</span
            ><span class="cal-label-year">${displayYear_}</span>
          </button>
          <button class="nav-btn" type="button" aria-label="Next" @click="${handleNext}">
            <ore-icon name="chevron-right" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
          </button>
        </div>

        <!-- Day view: flat 7-column CSS grid, weekday headers + day cells -->
        <div
          class="cal-grid cal-grid-days"
          role="grid"
          part="grid"
          :aria-label="${() => displayLabel.value}"
          ?hidden="${() => currentView.value !== 'day'}">
          <div role="row" class="cal-grid-row">
            ${() =>
              weekdayLabels.value.map(
                (lbl) => html`<div class="cal-cell cal-cell-head" role="columnheader" aria-label="${lbl}">${lbl}</div>`,
              )}
          </div>
          ${() => {
            const cells = dayCells.value;
            const rows: (typeof cells)[number][][] = [];

            for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

            return rows.map(
              (row) =>
                html`<div role="row" class="cal-grid-row">
                  ${row.map(
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
                        @click="${() => handleSelectDay(cell.iso)}"
                        @keydown="${handleDayKeydown}">
                        ${String(cell.day)}
                      </div>`,
                  )}
                </div>`,
            );
          }}
        </div>

        <!-- Month view -->
        <div
          class="cal-grid cal-grid-months"
          role="grid"
          :aria-label="${() => displayYear_.value}"
          ?hidden="${() => currentView.value !== 'month'}">
          ${() => {
            const cells = monthCells.value;
            const rows: (typeof cells)[number][][] = [];

            for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));

            return rows.map(
              (row) =>
                html`<div role="row">
                  ${row.map(
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
                          if (!cell.isDisabled) handleSelectMonth(cell.month);
                        }}"
                        @keydown="${(e: KeyboardEvent) =>
                          handleGridKeydown(e, '.cal-cell-month', 4, () => {
                            if (!cell.isDisabled) handleSelectMonth(cell.month);
                          })}">
                        ${cell.shortLabel}
                      </div>`,
                  )}
                </div>`,
            );
          }}
        </div>

        <!-- Year view -->
        <div
          class="cal-grid cal-grid-years"
          role="grid"
          aria-label="Select year"
          ?hidden="${() => currentView.value !== 'year'}">
          ${() => {
            const cells = yearCells.value;
            const rows: (typeof cells)[number][][] = [];

            for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));

            return rows.map(
              (row) =>
                html`<div role="row">
                  ${row.map(
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
                        @keydown="${(e: KeyboardEvent) =>
                          handleGridKeydown(e, '.cal-cell-year', 4, () => {
                            if (!cell.isDisabled) handleSelectYear(cell.year);
                          })}">
                        ${String(cell.year)}
                      </div>`,
                  )}
                </div>`,
            );
          }}
        </div>
      </div>
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, reducedMotionMixin, componentStyles],
});
