import { Temporal, format, parsePlainDate } from '@vielzeug/tempo';

// ── Public ISO helpers (single source of truth for both components) ───────────

/**
 * Parses an ISO 8601 date string (`yyyy-MM-dd`) into a `Temporal.PlainDate`.
 * Returns `null` for any invalid / empty input — never throws.
 */
export function parseIso(iso: string | undefined | null): Temporal.PlainDate | null {
  if (!iso) return null;

  try {
    return parsePlainDate(iso);
  } catch {
    return null;
  }
}

/**
 * Serialises a `Temporal.PlainDate` (or `null`) to an ISO 8601 string (`yyyy-MM-dd`).
 * Returns `null` when the input is `null`.
 */
export function toIsoString(date: Temporal.PlainDate | null): string | null {
  return date ? date.toString() : null;
}

/**
 * Formats a `Temporal.PlainDate` for display in a given locale.
 * e.g. "15 Jun 2025" (default medium pattern).
 */
export function formatDisplayDate(date: Temporal.PlainDate, locale: string): string {
  return format(date, { intl: { day: 'numeric', month: 'short', year: 'numeric' }, locale, tz: 'UTC' });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type DatePickerView = 'day' | 'month' | 'year';

export type DateCell = {
  /** Day-of-month number (1–31) */
  day: number;
  isDisabled: boolean;
  /** ISO date string yyyy-MM-dd — stable key for rendering */
  iso: string;
  isOutsideMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  plain: Temporal.PlainDate;
};

export type MonthCell = {
  isDisabled: boolean;
  isSelected: boolean;
  label: string;
  /** 1-based month number (Temporal convention: 1 = January … 12 = December) */
  month: number;
  shortLabel: string;
};

export type YearCell = {
  isDisabled: boolean;
  isSelected: boolean;
  year: number;
};

export type DatePickerControlOptions = {
  /** Locale for day/month names, defaults to `navigator.language` or `'en'` */
  locale?: string;
  /** Maximum selectable date (inclusive) */
  max?: Temporal.PlainDate | null;
  /** Minimum selectable date (inclusive) */
  min?: Temporal.PlainDate | null;
  /** Called when a date is committed by the user */
  onChange: (date: Temporal.PlainDate | null) => void;
  /** Currently selected date */
  value?: Temporal.PlainDate | null;
  /**
   * Which days of the week to disable (0 = Sunday … 6 = Saturday).
   * @example [0, 6] disables weekends
   */
  weekendDays?: number[];
};

export type DatePickerControl = {
  /** Ordered day cells for the visible month grid (includes leading/trailing days) */
  dayCells(): DateCell[];
  /** Month currently shown in the header (1-indexed, Temporal convention) */
  displayMonth(): number;
  /** Year currently shown in the header */
  displayYear(): number;
  /** Jump to a specific display month/year without selecting */
  goTo(year: number, month: number): void;
  /** All 12 month cells */
  monthCells(): MonthCell[];
  /** Move display month forward by one */
  nextMonth(): void;
  /** Move display year forward by one */
  nextYear(): void;
  /** Move display month backward by one */
  prevMonth(): void;
  /** Move display year backward by one */
  prevYear(): void;
  /** Select a date. Pass null to clear. */
  select(date: Temporal.PlainDate | null): void;
  /** The currently selected date, or null */
  selected(): Temporal.PlainDate | null;
  /** Switch the calendar view */
  setView(view: DatePickerView): void;
  /** Currently rendered calendar view */
  view(): DatePickerView;
  /** Short week-day labels in locale order e.g. ["Su","Mo",…] */
  weekdayLabels(): string[];
  /** Year cells for the visible decade window */
  yearCells(): YearCell[];
};

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Returns today as a `Temporal.PlainDate` in the ISO calendar.
 * @internal
 */
function todayPlain(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}

/**
 * Converts a `Temporal.PlainDate.dayOfWeek` value (1=Mon…7=Sun) to the
 * 0-based weekday index (0=Sun…6=Sat) used in the `weekendDays` prop.
 * @internal
 */
function temporalDowToIndex(dow: number): number {
  // Temporal: 1=Mon, 2=Tue, …, 7=Sun  →  0=Sun, 1=Mon, …, 6=Sat
  return dow % 7;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Pure, framework-agnostic date-picker state machine backed by `Temporal.PlainDate`.
 *
 * All state is held in plain mutable variables — suitable for wrapping in any
 * reactive layer (craft `signal`, Vue ref, etc.). The factory returns a stable
 * handle object; callers are responsible for reactivity.
 *
 * Options with getter-based live bindings (e.g. `get min() { ... }`) are read
 * on every call so the control always reflects the latest reactive state.
 *
 * @example
 * ```ts
 * const ctrl = createDatePickerControl({
 *   value: Temporal.PlainDate.from('2025-06-15'),
 *   locale: 'en-US',
 *   onChange: (date) => console.log(date?.toString()),
 * });
 *
 * ctrl.nextMonth();
 * ctrl.select(Temporal.PlainDate.from('2025-07-04'));
 * ```
 */
export function createDatePickerControl(options: DatePickerControlOptions): DatePickerControl {
  // ── Mutable state ─────────────────────────────────────────────────────────

  let _selected: Temporal.PlainDate | null = options.value ?? null;
  let _view: DatePickerView = 'day';

  const initial = _selected ?? todayPlain();

  let _displayYear = initial.year;
  let _displayMonth = initial.month; // 1-indexed (Temporal convention)

  // ── Live option accessors (always read from options for reactive compat) ───

  function locale(): string {
    return options.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');
  }

  function weekendDays(): number[] {
    return options.weekendDays ?? [];
  }

  // ── Range / disabled helpers ───────────────────────────────────────────────

  function isOutOfRange(date: Temporal.PlainDate): boolean {
    if (options.min && Temporal.PlainDate.compare(date, options.min) < 0) return true;

    if (options.max && Temporal.PlainDate.compare(date, options.max) > 0) return true;

    return false;
  }

  function isDayDisabled(date: Temporal.PlainDate): boolean {
    if (isOutOfRange(date)) return true;

    if (weekendDays().includes(temporalDowToIndex(date.dayOfWeek))) return true;

    return false;
  }

  // ── Grid builders ─────────────────────────────────────────────────────────

  function buildDayCells(): DateCell[] {
    const todayDate = todayPlain();
    const firstOfMonth = Temporal.PlainDate.from({ day: 1, month: _displayMonth, year: _displayYear });

    // Sunday-start grid: Temporal dayOfWeek is 1=Mon…7=Sun, convert to 0=Sun offset
    const startOffset = temporalDowToIndex(firstOfMonth.dayOfWeek);
    const cells: DateCell[] = [];

    // Leading days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = firstOfMonth.subtract({ days: i + 1 });

      cells.push({
        day: d.day,
        isDisabled: isDayDisabled(d),
        iso: d.toString(),
        isOutsideMonth: true,
        isSelected: _selected !== null && Temporal.PlainDate.compare(d, _selected) === 0,
        isToday: Temporal.PlainDate.compare(d, todayDate) === 0,
        plain: d,
      });
    }

    // Days in current month
    const daysInMonth = firstOfMonth.daysInMonth;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = Temporal.PlainDate.from({ day, month: _displayMonth, year: _displayYear });

      cells.push({
        day,
        isDisabled: isDayDisabled(d),
        iso: d.toString(),
        isOutsideMonth: false,
        isSelected: _selected !== null && Temporal.PlainDate.compare(d, _selected) === 0,
        isToday: Temporal.PlainDate.compare(d, todayDate) === 0,
        plain: d,
      });
    }

    // Trailing days to fill last row (always end at multiple of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    const firstOfNext = firstOfMonth.add({ months: 1 });

    for (let i = 0; i < remaining; i++) {
      const d = firstOfNext.add({ days: i });

      cells.push({
        day: d.day,
        isDisabled: isDayDisabled(d),
        iso: d.toString(),
        isOutsideMonth: true,
        isSelected: _selected !== null && Temporal.PlainDate.compare(d, _selected) === 0,
        isToday: Temporal.PlainDate.compare(d, todayDate) === 0,
        plain: d,
      });
    }

    return cells;
  }

  function buildMonthCells(): MonthCell[] {
    const cells: MonthCell[] = [];
    const loc = locale();

    for (let m = 1; m <= 12; m++) {
      const plain = Temporal.PlainDate.from({ day: 1, month: m, year: _displayYear });
      const lastOfMonth = plain.with({ day: plain.daysInMonth });

      const isDisabled =
        (options.min !== null && options.min !== undefined
          ? Temporal.PlainDate.compare(lastOfMonth, options.min) < 0
          : false) ||
        (options.max !== null && options.max !== undefined
          ? Temporal.PlainDate.compare(plain, options.max) > 0
          : false);

      cells.push({
        isDisabled,
        isSelected: _selected !== null && _selected.year === _displayYear && _selected.month === m,
        label: format(plain, { intl: { month: 'long' }, locale: loc, tz: 'UTC' }),
        month: m,
        shortLabel: format(plain, { intl: { month: 'short' }, locale: loc, tz: 'UTC' }),
      });
    }

    return cells;
  }

  function buildYearCells(): YearCell[] {
    const decadeStart = Math.floor(_displayYear / 10) * 10;
    const cells: YearCell[] = [];

    for (let y = decadeStart; y < decadeStart + 12; y++) {
      const firstOfYear = Temporal.PlainDate.from({ day: 1, month: 1, year: y });
      const lastOfYear = Temporal.PlainDate.from({ day: 31, month: 12, year: y });

      const isDisabled =
        (options.min !== null && options.min !== undefined
          ? Temporal.PlainDate.compare(lastOfYear, options.min) < 0
          : false) ||
        (options.max !== null && options.max !== undefined
          ? Temporal.PlainDate.compare(firstOfYear, options.max) > 0
          : false);

      cells.push({
        isDisabled,
        isSelected: _selected !== null && _selected.year === y,
        year: y,
      });
    }

    return cells;
  }

  function buildWeekdayLabels(): string[] {
    // 2024-01-07 is a Sunday — use it as the Sunday anchor
    const sunday = parsePlainDate('2024-01-07');
    const loc = locale();

    return Array.from({ length: 7 }, (_, i) =>
      format(sunday.add({ days: i }), { intl: { weekday: 'short' }, locale: loc, tz: 'UTC' }),
    );
  }

  // ── Handle ────────────────────────────────────────────────────────────────

  return {
    dayCells: buildDayCells,
    displayMonth: () => _displayMonth,
    displayYear: () => _displayYear,

    goTo(year: number, month: number): void {
      _displayYear = year;
      _displayMonth = Math.max(1, Math.min(12, month));
    },

    monthCells: buildMonthCells,

    nextMonth(): void {
      if (_displayMonth === 12) {
        _displayMonth = 1;
        _displayYear++;
      } else {
        _displayMonth++;
      }
    },

    nextYear(): void {
      _displayYear++;
    },

    prevMonth(): void {
      if (_displayMonth === 1) {
        _displayMonth = 12;
        _displayYear--;
      } else {
        _displayMonth--;
      }
    },

    prevYear(): void {
      _displayYear--;
    },

    select(date: Temporal.PlainDate | null): void {
      if (date !== null && isDayDisabled(date)) return;

      _selected = date;

      if (_selected) {
        _displayYear = _selected.year;
        _displayMonth = _selected.month;
      }

      options.onChange(_selected);
    },

    selected: () => _selected,

    setView(view: DatePickerView): void {
      _view = view;
    },

    view: () => _view,

    weekdayLabels: buildWeekdayLabels,

    yearCells: buildYearCells,
  };
}
