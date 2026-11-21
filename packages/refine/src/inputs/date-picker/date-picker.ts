import { createDismissal } from '@vielzeug/focus';
import { bind, define, getHost, html, onCleanup, onMounted, prop, ref, useField } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { format, Temporal } from '@vielzeug/tempo';
import {
  createDatePickerControl,
  createDropdownPositioner,
  type DatePickerView,
  formatDisplayDate,
  handleCalendarGridKeydown,
  lifecycleSignal,
  parseIso,
  toIsoString,
} from '../../core';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../shared';
import {
  disablableBundle,
  FIELD_VARIANTS,
  type FieldVariant,
  roundableBundle,
  sizableBundle,
  themableBundle,
} from '../../shared';
import { colorThemeMixin, overlayMotionMixin } from '../../styles';
import { defineFieldValue, dispatchNativeFieldEvent, setFieldValue } from '../shared/native-field-event';
import componentStyles from './date-picker.css?inline';

export { ICON_TAG } from '../../content/icon/icon';
export { INPUT_TAG } from '../input/input';
// ── Types ─────────────────────────────────────────────────────────────────────

export type OreDatePickerEvents = {
  change: Event;
  input: Event;
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
  /** Select a complete inclusive date range. */
  range?: boolean;
  /** Instruction displayed while choosing the first endpoint. */
  'range-start-label'?: string;
  /** Instruction displayed while choosing the second endpoint. */
  'range-end-label'?: string;
  /** Message for an invalid range. */
  'range-invalid-message'?: string;
  /** Message for an empty required range. */
  'range-required-message'?: string;
  /** Accessible label for the selected start date. */
  'range-start-selected-label'?: string;
  /** Accessible label for the selected end date. */
  'range-end-selected-label'?: string;
  /** Border radius */
  rounded?: RoundedSize;
  /** Component size */
  size?: ComponentSize;
  /**
   * Shows an inline green check icon inside the field to confirm the value has
   * passed validation. Ignored while `error` is set: an error always wins.
   */
  success?: boolean;
  /**
   * Selected date (`yyyy-MM-dd`) or, in range mode, inclusive interval
   * (`yyyy-MM-dd/yyyy-MM-dd`).
   * @example '2025-06-15/2025-06-20'
   */
  value?: string;
  /** Visual variant */
  variant?: FieldVariant;
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
 * @attr {string} value - ISO date, or inclusive ISO interval separated by "/" in range mode
 * @attr {string} min - Minimum selectable date (yyyy-MM-dd)
 * @attr {string} max - Maximum selectable date (yyyy-MM-dd)
 * @attr {string} label - Label text
 * @attr {string} label-placement - 'inset' | 'outside'
 * @attr {string} placeholder - Trigger placeholder
 * @attr {boolean} disabled - Disable the picker
 * @attr {boolean} required - Required field
 * @attr {boolean} range - Select an inclusive date range
 * @attr {string} range-start-label - Instruction for the first endpoint
 * @attr {string} range-end-label - Instruction for the second endpoint
 * @attr {string} range-start-selected-label - Label for the selected start date
 * @attr {string} range-end-selected-label - Label for the selected end date
 * @attr {string} range-invalid-message - Invalid range message
 * @attr {string} range-required-message - Empty required range message
 * @attr {string} name - Form field name
 * @attr {string} error - Error message
 * @attr {boolean} success - Show an inline success check icon (suppressed while `error` is set)
 * @attr {string} helper - Helper text
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} locale - BCP 47 locale string
 * @attr {string} weekend-days - Comma-separated day indices to disable
 *
 * @fires input - Fired when a date is selected.
 * @fires change - Fired when a date is selected.
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
 * @cssprop --date-picker-day-outside-color - Color of day numbers outside the visible month
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

define<OreDatePickerProps>(DATE_PICKER_TAG, {
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
    range: prop.bool(false),
    'range-end-label': prop.string('Choose an end date'),
    'range-end-selected-label': prop.string('End date'),
    'range-invalid-message': prop.string('Enter a valid date range.'),
    'range-required-message': prop.string('Choose a date range.'),
    'range-start-label': prop.string('Choose a start date'),
    'range-start-selected-label': prop.string('Start date'),
    required: prop.bool(false),
    success: prop.bool(false),
    value: prop.string(),
    variant: prop.oneOf(FIELD_VARIANTS),
    'weekend-days': prop.json([] as number[]),
  },

  setup(props) {
    const el = getHost();

    // ── Signals ─────────────────────────────────────────────────────────────

    const isOpen = signal(false);

    const localValue = signal<string | undefined>(undefined);
    const draftStart = signal<Temporal.PlainDate | null>(null);
    const customMessage = signal('');
    const rawValue = computed(() => localValue.value ?? props.value.value ?? '');
    const rangeDates = computed((): [Temporal.PlainDate, Temporal.PlainDate] | null => {
      if (!props.range.value) return null;

      const parts = rawValue.value.split('/');

      if (parts.length !== 2 || !parts.every((part) => /^\d{4}-\d{2}-\d{2}$/.test(part))) return null;

      const start = parseIso(parts[0]);
      const end = parseIso(parts[1]);

      return start && end && Temporal.PlainDate.compare(start, end) <= 0 ? [start, end] : null;
    });
    const selectedDate = computed(() =>
      props.range.value ? (rangeDates.value?.[0] ?? null) : parseIso(rawValue.value),
    );

    watch(props.value, () => {
      localValue.value = undefined;
      draftStart.value = null;
    });

    // Ore does not emit a prop change when an attribute is written with the same value.
    // That write still resets the live value, just like a write with a different value.
    const valueObserver = new MutationObserver((records) => {
      if (records.some((record) => record.oldValue === el.getAttribute('value'))) {
        localValue.value = undefined;
        draftStart.value = null;
      }
    });

    valueObserver.observe(el, { attributeFilter: ['value'], attributeOldValue: true });
    onCleanup(() => valueObserver.disconnect());

    defineFieldValue(
      el,
      () => (props.range.value ? rawValue.value : (toIsoString(selectedDate.value) ?? '')),
      (value) => {
        valueObserver.takeRecords();
        localValue.value = value;
        draftStart.value = null;
      },
    );

    const isDisabled = computed(() => Boolean(props.disabled.value));
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
        if (props.range.value && date) {
          if (!draftStart.value) {
            draftStart.value = date;
            displayYear.value = ctrl.displayYear();
            displayMonth.value = ctrl.displayMonth();
            focusCalendarDay();

            return;
          }

          const first = draftStart.value;
          const ordered = Temporal.PlainDate.compare(first, date) <= 0 ? [first, date] : [date, first];

          setFieldValue(el, `${ordered[0].toString()}/${ordered[1].toString()}`);
        } else {
          setFieldValue(el, toIsoString(date) ?? '');
        }

        closePicker();
        displayYear.value = ctrl.displayYear();
        displayMonth.value = ctrl.displayMonth();
        dispatchNativeFieldEvent(el, 'input');
        dispatchNativeFieldEvent(el, 'change');
        triggerRef.value?.focus();
      },
      get value() {
        return selectedDate.value;
      },
      get weekendDays() {
        return props['weekend-days'].value ?? [];
      },
    });

    // ── Reactive display state ────────────────────────────────────────────
    // Three separate primitive signals: the proven pattern.

    const currentView = signal<DatePickerView>('day');
    const displayYear = signal(ctrl.displayYear());
    const displayMonth = signal(ctrl.displayMonth()); // 1-indexed (Temporal)

    // ── Form value (host is formAssociated) ──────────────────────────────────

    const rangeValid = computed(() => {
      const dates = rangeDates.value;

      if (!dates) return false;

      const min = parseIso(props.min.value);
      const max = parseIso(props.max.value);
      const disabledDays = props['weekend-days'].value ?? [];

      return dates.every(
        (date) =>
          (!min || Temporal.PlainDate.compare(date, min) >= 0) &&
          (!max || Temporal.PlainDate.compare(date, max) <= 0) &&
          !disabledDays.includes(date.dayOfWeek % 7),
      );
    });
    const validity = computed(() => {
      if (customMessage.value) return { flags: { customError: true }, message: customMessage.value };
      if (!props.range.value) return null;
      if (draftStart.value)
        return { flags: { customError: true }, message: props['range-end-label'].value || 'Choose an end date' };
      if (!rawValue.value) {
        return props.required.value
          ? { flags: { valueMissing: true }, message: props['range-required-message'].value || 'Choose a date range.' }
          : null;
      }

      return rangeValid.value
        ? null
        : {
            flags: { customError: true },
            message: props['range-invalid-message'].value || 'Enter a valid date range.',
          };
    });
    const formField = useField<string>({
      disabled: isDisabled,
      onReset: () => {
        localValue.value = undefined;
        draftStart.value = null;
        closePicker();
      },
      toFormValue: (v) => v || null,
      validity,
      value: computed(() =>
        props.range.value ? (rangeValid.value ? rawValue.value : '') : (toIsoString(selectedDate.value) ?? ''),
      ),
    });

    Object.defineProperties(el, {
      checkValidity: { configurable: true, value: formField.checkValidity },
      reportValidity: { configurable: true, value: formField.reportValidity },
      setCustomValidity: {
        configurable: true,
        value: (message: string) => {
          customMessage.value = message;
        },
      },
    });

    const dialogId = `date-picker-${Math.random().toString(36).slice(2, 9)}-calendar`;

    // ── Floating position ────────────────────────────────────────────────────
    // The old CSS-only `position: absolute; top: 100%` positioned the calendar relative to
    // the host box: fine until the host sits near a scroll/clip ancestor's edge (e.g. a form
    // grid inside a dialog), where the same absolute box also expands that ancestor's
    // *scrollable* overflow area even though it never changes the ancestor's own layout size,
    // which reads as "the dialog got bigger"/jumped. `createDropdownPositioner`: the same
    // Orbit-powered primitive `ore-select`'s dropdown already uses: positions via `fixed` +
    // computed `top`/`left`, auto-detecting both the nearest clipping ancestor (so flip/shift
    // keep the calendar within the dialog panel, not just the page viewport) and any ancestor
    // that establishes a containing block for `position: fixed` (a dialog panel's entrance
    // transition commonly leaves a permanent, if visually-identity, `transform` at rest) :
    // see `createDropdownPositioner`'s own `boundary`/`containingBlock` docs.
    const triggerRef = ref<HTMLElement>();
    const calendarRef = ref<HTMLElement>();

    const positioner = createDropdownPositioner({
      getFloating: () => calendarRef.value ?? null,
      getOffsetPx: () => 4,
      getReference: () => triggerRef.value ?? null,
      matchWidth: false,
    });

    let stopAutoUpdate: (() => void) | null = null;

    // ── Derived display values ───────────────────────────────────────────────

    const triggerText = computed(() => {
      if (props.range.value && rangeDates.value) {
        return rangeDates.value.map((date) => formatDisplayDate(date, locale.value)).join(' – ');
      }

      if (selectedDate.value) return formatDisplayDate(selectedDate.value, locale.value);

      return props.placeholder.value || '';
    });

    const displayMonth_ = computed(() => {
      const d = Temporal.PlainDate.from({ day: 1, month: displayMonth.value, year: displayYear.value });

      return format(d, { intl: { month: 'long' }, locale: locale.value, timeZone: 'UTC' });
    });

    const displayYear_ = computed(() => String(displayYear.value));
    const displayLabel = computed(() => `${displayMonth_.value} ${displayYear_.value}`);

    const dayCells = computed(() => {
      void displayYear.value;
      void displayMonth.value;

      const selected = toIsoString(selectedDate.value);
      const range = props.range.value ? rangeDates.value : null;
      const draft = toIsoString(draftStart.value);

      const cells = ctrl.dayCells().map((cell) => {
        const start = draft ?? (range ? range[0].toString() : null);
        const end = draft ? null : (range?.[1].toString() ?? null);

        return {
          ...cell,
          isEnd: end === cell.iso,
          isInside: !!start && !!end && cell.iso > start && cell.iso < end,
          isSelected: props.range.value
            ? cell.iso === start || cell.iso === end || (!!start && !!end && cell.iso > start && cell.iso < end)
            : cell.iso === selected,
          isStart: start === cell.iso,
        };
      });
      const focusable =
        cells.find((cell) => cell.isSelected && !cell.isDisabled) ??
        cells.find((cell) => cell.isToday && !cell.isDisabled) ??
        cells.find((cell) => !cell.isDisabled);

      return cells.map((cell) => ({ ...cell, isFocusable: cell.iso === focusable?.iso }));
    });
    const monthCells = computed(() => {
      void displayYear.value;

      const selected = selectedDate.value;
      const cells = ctrl.monthCells().map((cell) => ({
        ...cell,
        isSelected: selected !== null && selected.year === displayYear.value && selected.month === cell.month,
      }));
      const focusable =
        cells.find((cell) => cell.isSelected && !cell.isDisabled) ?? cells.find((cell) => !cell.isDisabled);

      return cells.map((cell) => ({ ...cell, isFocusable: cell.month === focusable?.month }));
    });
    const yearCells = computed(() => {
      void displayYear.value;

      const selected = selectedDate.value;
      const cells = ctrl
        .yearCells()
        .map((cell) => ({ ...cell, isSelected: selected !== null && selected.year === cell.year }));
      const focusable =
        cells.find((cell) => cell.isSelected && !cell.isDisabled) ?? cells.find((cell) => !cell.isDisabled);

      return cells.map((cell) => ({ ...cell, isFocusable: cell.year === focusable?.year }));
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
      handleCalendarGridKeydown(e, '.cal-cell-day', 7, (cell) => handleSelectDay(cell.dataset.iso ?? ''));
    }

    // ── Open / close ─────────────────────────────────────────────────────────

    function focusCalendarDay(): void {
      requestAnimationFrame(() => {
        if (isOpen.value) calendarRef.value?.querySelector<HTMLElement>('.cal-cell-day[tabindex="0"]')?.focus();
      });
    }

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

      positioner.update();
      stopAutoUpdate = positioner.startAutoUpdate?.() ?? null;
      focusCalendarDay();
    }

    function closePicker(): void {
      isOpen.value = false;
      draftStart.value = null;
      ctrl.setView('day');
      currentView.value = 'day';
      stopAutoUpdate?.();
      stopAutoUpdate = null;
    }

    watch(isDisabled, (disabled) => {
      if (disabled) closePicker();
    });

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
        triggerRef.value?.focus();
      }
    }

    function handleCalendarKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePicker();
        triggerRef.value?.focus();
      }
    }

    createDismissal({
      getTargets: () => [el],
      isActive: () => isOpen.value,
      onDismiss: () => closePicker(),
      ownerDocument: el.ownerDocument,
      signal: lifecycleSignal(onCleanup),
    });

    // ── Lifecycle ────────────────────────────────────────────────────────────

    onMounted(() => {
      return () => {
        stopAutoUpdate?.();
        stopAutoUpdate = null;
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
    const inputSize = () => props.size?.value ?? undefined;
    const inputVariant = () => props.variant?.value ?? undefined;
    const inputRounded = () => props.rounded?.value ?? undefined;
    const inputHelper = () => props.helper.value ?? '';
    const inputError = () => props.error.value || validity.value?.message || '';
    const inputDisabled = () => (isDisabled.value ? true : undefined);
    const inputRequired = () => (props.required.value ? true : undefined);
    const inputFullwidth = () => (props.fullwidth.value ? true : undefined);

    return html`
      <!-- Trigger: ore-input in readonly display mode -->
      <ore-input
        class="trigger"
        ref="${triggerRef}"
        readonly
        tabindex="${tabIndex}"
        role="combobox"
        aria-haspopup="dialog"
        aria-controls="${dialogId}"
        aria-expanded="${() => String(isOpen.value)}"
        aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
        value="${inputValue}"
        label="${inputLabel}"
        placeholder="${inputPlaceholder}"
        label-placement="${inputLabelPlacement}"
        color="${inputColor}"
        size="${inputSize}"
        variant="${inputVariant}"
        rounded="${inputRounded}"
        helper="${inputHelper}"
        error="${inputError}"
        ?disabled="${inputDisabled}"
        ?required="${inputRequired}"
        ?fullwidth="${inputFullwidth}"
        ?success="${() => props.success.value}"
        @click="${handleTriggerClick}"
        @keydown="${handleTriggerKeydown}">
        <ore-icon slot="suffix" name="calendar" size="16" stroke-width="1.75" aria-hidden="true"></ore-icon>
      </ore-input>

      <!-- Calendar popup -->
      <div
        class="calendar"
        ref="${calendarRef}"
        id="${dialogId}"
        role="dialog"
        aria-label="${() => `Choose date: ${displayLabel.value}`}"
        ?hidden="${() => !isOpen.value}"
        ?data-open="${isOpen}"
        @keydown="${handleCalendarKeydown}">
        <p class="range-instruction" ?hidden="${() => !props.range.value}" aria-live="polite">
          ${() => (draftStart.value ? props['range-end-label'].value : props['range-start-label'].value)}
        </p>
        <!-- Calendar header -->
        <div class="cal-header" part="header">
          <button class="nav-btn" type="button" aria-label="Previous" @click="${handlePrev}">
            <ore-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
          </button>
          <button
            class="cal-label-btn"
            type="button"
            aria-label="${() =>
              `${displayLabel.value} — switch to ${currentView.value === 'day' ? 'month' : currentView.value === 'month' ? 'year' : 'day'} view`}"
            @click="${handleHeaderClick}">
            <span class="cal-label-month">${displayMonth_}</span>
            <span class="cal-label-sep" aria-hidden="true">/</span>
            <span class="cal-label-year">${displayYear_}</span>
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
          aria-label="${() => displayLabel.value}"
          aria-multiselectable="${() => (props.range.value ? 'true' : null)}"
          ?hidden="${() => currentView.value !== 'day'}">
          <div role="row" class="cal-grid-row">
            ${() =>
              weekdayLabels.value.map(
                (lbl) => html`
                  <div class="cal-cell cal-cell-head" role="columnheader" aria-label="${lbl}">${lbl}</div>
                `,
              )}
          </div>
          ${() => {
            const cells = dayCells.value;
            const rows: (typeof cells)[number][][] = [];

            for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

            return rows.map(
              (row) => html`
                <div role="row" class="cal-grid-row">
                  ${row.map(
                    (cell) => html`
                      <div
                        class="cal-cell cal-cell-day"
                        role="gridcell"
                        part="day"
                        aria-selected="${() => String(cell.isSelected)}"
                        aria-disabled="${() => String(cell.isDisabled)}"
                        aria-current="${() => (cell.isToday ? 'date' : null)}"
                        ?data-selected="${() => cell.isSelected && (!props.range.value || cell.isStart || cell.isEnd)}"
                        ?data-range-start="${() => props.range.value && cell.isStart}"
                        ?data-range-end="${() => props.range.value && cell.isEnd}"
                        ?data-range-inside="${() => props.range.value && cell.isInside}"
                        aria-label="${() =>
                          [
                            formatDisplayDate(cell.plain, locale.value),
                            props.range.value && cell.isStart ? props['range-start-selected-label'].value : '',
                            props.range.value && cell.isEnd ? props['range-end-selected-label'].value : '',
                          ]
                            .filter(Boolean)
                            .join(', ')}"
                        ?data-today="${() => cell.isToday}"
                        ?data-outside="${() => cell.isOutsideMonth}"
                        ?data-disabled="${() => cell.isDisabled}"
                        data-iso="${cell.iso}"
                        tabindex="${() => (cell.isFocusable ? '0' : '-1')}"
                        @click="${() => handleSelectDay(cell.iso)}"
                        @keydown="${handleDayKeydown}">
                        ${String(cell.day)}
                      </div>
                    `,
                  )}
                </div>
              `,
            );
          }}
        </div>

        <!-- Month view -->
        <div
          class="cal-grid cal-grid-months"
          role="grid"
          aria-label="${() => displayYear_.value}"
          ?hidden="${() => currentView.value !== 'month'}">
          ${() => {
            const cells = monthCells.value;
            const rows: (typeof cells)[number][][] = [];

            for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));

            return rows.map(
              (row) => html`
                <div role="row">
                  ${row.map(
                    (cell) => html`
                      <div
                        class="cal-cell cal-cell-month"
                        role="gridcell"
                        aria-selected="${() => String(cell.isSelected)}"
                        aria-disabled="${() => String(cell.isDisabled)}"
                        ?data-selected="${() => cell.isSelected}"
                        ?data-disabled="${() => cell.isDisabled}"
                        tabindex="${() => (cell.isFocusable ? '0' : '-1')}"
                        @click="${() => {
                          if (!cell.isDisabled) handleSelectMonth(cell.month);
                        }}"
                        @keydown="${(e: KeyboardEvent) =>
                          handleCalendarGridKeydown(e, '.cal-cell-month', 4, () => {
                            if (!cell.isDisabled) handleSelectMonth(cell.month);
                          })}">
                        ${cell.shortLabel}
                      </div>
                    `,
                  )}
                </div>
              `,
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
              (row) => html`
                <div role="row">
                  ${row.map(
                    (cell) => html`
                      <div
                        class="cal-cell cal-cell-year"
                        role="gridcell"
                        aria-selected="${() => String(cell.isSelected)}"
                        aria-disabled="${() => String(cell.isDisabled)}"
                        ?data-selected="${() => cell.isSelected}"
                        ?data-disabled="${() => cell.isDisabled}"
                        tabindex="${() => (cell.isFocusable ? '0' : '-1')}"
                        @click="${() => {
                          if (!cell.isDisabled) handleSelectYear(cell.year);
                        }}"
                        @keydown="${(e: KeyboardEvent) =>
                          handleCalendarGridKeydown(e, '.cal-cell-year', 4, () => {
                            if (!cell.isDisabled) handleSelectYear(cell.year);
                          })}">
                        ${String(cell.year)}
                      </div>
                    `,
                  )}
                </div>
              `,
            );
          }}
        </div>
      </div>
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, overlayMotionMixin('dropdown'), componentStyles],
});
