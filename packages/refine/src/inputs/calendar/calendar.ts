import { define, useField, html, prop } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { Temporal, format } from '@vielzeug/tempo';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../shared';

import '../../content/icon/icon';
import '../../feedback/badge/badge';
import { createDatePickerControl, parseIso, toIsoString, type DatePickerView } from '../../headless';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, reducedMotionMixin } from '../../styles';
import componentStyles from './calendar.css?inline';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OreCalendarEvents = {
  change: { isoValue: string | null };
};

/**
 * A calendar event entry.
 * Dates must be ISO 8601 strings (yyyy-MM-dd).
 *
 * The `color` field accepts any valid CSS color value (e.g. `'#e11d48'`,
 * `'var(--color-primary)'`). An invalid value silently falls back to the
 * component's theme color. Only pass values you control.
 */
export type CalendarEvent = {
  /**
   * Any CSS color value for the event dot / pill.
   * Defaults to the component's theme color when omitted.
   * An invalid CSS value silently produces no custom color.
   */
  color?: string;
  /** ISO date the event falls on (yyyy-MM-dd) */
  date: string;
  /** Unique identifier */
  id: string;
  /** Short label shown in the calendar cell */
  label: string;
};

export type OreCalendarProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable all date selection */
  disabled?: boolean;
  /**
   * Array of calendar events to display on day cells.
   * In normal mode each event renders as a small colored dot (max 3 dots, then "+N").
   * In expanded mode each event renders as a full-width colored pill with its label.
   * Pass as a JS property or as a JSON-encoded attribute.
   * @example
   * ```js
   * calendar.events = [
   *   { id: '1', date: '2025-06-15', label: 'Team standup', color: 'var(--color-primary)' },
   *   { id: '2', date: '2025-06-20', label: 'Release', color: '#e11d48' },
   * ];
   * ```
   */
  events?: CalendarEvent[];
  /**
   * Expanded layout — large cells with top-aligned day numbers suitable
   * for a full-page calendar app view.
   */
  expanded?: boolean;
  /** Expand to container width */
  fullwidth?: boolean;
  /** Locale for day/month names (default: browser locale) */
  locale?: string;
  /** Latest selectable date in ISO 8601 format (yyyy-MM-dd) */
  max?: string;
  /** Earliest selectable date in ISO 8601 format (yyyy-MM-dd) */
  min?: string;
  /** Form field name (when used inside a form) */
  name?: string;
  /** Mark field as required */
  required?: boolean;
  /** Border radius override */
  rounded?: RoundedSize;
  /** Component size */
  size?: ComponentSize;
  /**
   * Selected date in ISO 8601 format (yyyy-MM-dd).
   * @example '2025-06-15'
   */
  value?: string;
  /**
   * Day-of-week indices to disable (0 = Sunday … 6 = Saturday).
   * Pass as a JSON array attribute or a JS property.
   * @example
   * ```html
   * <ore-calendar weekend-days="[0,6]"></ore-calendar>
   * ```
   */
  'weekend-days'?: number[];
};

/**
 * An accessible, keyboard-navigable inline calendar component.
 * Supports day/month/year drill-down views, min/max bounds, disabled weekend
 * days, and optional form association.
 *
 * @element ore-calendar
 *
 * @attr {string} value - Selected date in ISO 8601 format (yyyy-MM-dd)
 * @attr {string} min - Minimum selectable date (yyyy-MM-dd)
 * @attr {string} max - Maximum selectable date (yyyy-MM-dd)
 * @attr {boolean} disabled - Disable all interaction
 * @attr {boolean} required - Required field (form association)
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} locale - BCP 47 locale string
 * @attr {string} weekend-days - JSON array of day indices to disable (0=Sun…6=Sat)
 * @attr {boolean} fullwidth - Expand to full container width
 * @attr {boolean} expanded - Large-cell calendar-app layout with top-aligned day numbers
 *
 * @fires change - Fired when a date is selected. detail: { isoValue: string | null }
 *
 * @cssprop --calendar-bg - Calendar background
 * @cssprop --calendar-border-color - Calendar border color
 * @cssprop --calendar-radius - Calendar border radius
 * @cssprop --calendar-shadow - Calendar drop shadow
 * @cssprop --calendar-day-selected-bg - Background of selected day cell
 * @cssprop --calendar-day-today-color - Colour of today's date number
 * @cssprop --calendar-day-outside-opacity - Opacity of days outside visible month
 *
 * @part calendar - The root calendar panel
 * @part header - Calendar header (nav + label)
 * @part grid - Day grid
 * @part day - Individual day cell
 *
 * @example
 * ```html
 * <!-- Single date with bounds -->
 * <ore-calendar value="2025-06-15" min="2025-01-01" max="2025-12-31" color="primary"></ore-calendar>
 *
 * <!-- Expanded calendar-app layout -->
 * <ore-calendar expanded fullwidth color="primary"></ore-calendar>
 * ```
 */
export const CALENDAR_TAG = 'ore-calendar' as const;

/** Maximum event dots/pills shown per cell before "+N" overflow */
const MAX_EVENTS = 3;

// ── Component ────────────────────────────────────────────────────────────────

define<OreCalendarProps, OreCalendarEvents>(CALENDAR_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...roundableBundle,
    events: prop.json([] as CalendarEvent[]),
    expanded: prop.bool(false),
    fullwidth: prop.bool(false),
    locale: prop.string(),
    max: prop.string(),
    min: prop.string(),
    name: prop.string(),
    required: prop.bool(false),
    value: prop.string(),
    'weekend-days': prop.json([] as number[]),
  },

  setup(props, { bind, emit }) {
    // ── Derived flags ────────────────────────────────────────────────────────

    const isDisabled = computed(() => props.disabled.value === true);
    const isExpanded = computed(() => props.expanded.value === true);

    // ── Selected date: local-override pattern ─────────────────────────────────
    // `localSelection` holds a user-initiated pick (or undefined = no override).
    // `selectedDate` derives from it, falling back to the value prop reactively.
    // This eliminates setInterval polling — external prop changes propagate
    // through the computed graph automatically.

    const localSelection = signal<Temporal.PlainDate | null | undefined>(undefined);

    const selectedDate = computed(() =>
      localSelection.value !== undefined ? localSelection.value : parseIso(props.value.value),
    );

    // ── Date-picker control ──────────────────────────────────────────────────

    const ctrl = createDatePickerControl({
      get locale() {
        return props.locale.value ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');
      },
      get max() {
        return parseIso(props.max.value);
      },
      get min() {
        return parseIso(props.min.value);
      },
      onChange(date) {
        localSelection.value = date;
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

    // ── Reactive display state ────────────────────────────────────────────────
    // Three separate primitive signals — the proven pattern. Mutating any one
    // of them invalidates only the computeds that read it.

    const currentView = signal<DatePickerView>('day');
    const displayYear = signal(ctrl.displayYear());
    const displayMonth = signal(ctrl.displayMonth()); // 1-indexed (Temporal)

    // ── Form value ───────────────────────────────────────────────────────────

    useField<string>({
      disabled: isDisabled,
      toFormValue: (v) => v || null,
      value: computed(() => toIsoString(selectedDate.value) ?? ''),
    });

    // ── Events lookup ─────────────────────────────────────────────────────────

    const eventsByDate = computed(() => {
      const map = new Map<string, CalendarEvent[]>();

      for (const evt of props.events.value ?? []) {
        const list = map.get(evt.date) ?? [];

        list.push(evt);
        map.set(evt.date, list);
      }

      return map;
    });

    // ── Derived cells ─────────────────────────────────────────────────────────
    // Each reads a display signal so they re-run when navigation changes.

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

    const displayMonth_ = computed(() => {
      const d = Temporal.PlainDate.from({ day: 1, month: displayMonth.value, year: displayYear.value });
      const loc = props.locale.value ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');

      return format(d, { intl: { month: 'long' }, locale: loc, tz: 'UTC' });
    });

    const displayYear_ = computed(() => String(displayYear.value));
    const displayLabel = computed(() => `${displayMonth_.value} ${displayYear_.value}`);

    // ── Navigation ───────────────────────────────────────────────────────────

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

    // ── Selection handlers — all disabled guards live here ────────────────────

    function handleSelectMonth(month: number): void {
      if (isDisabled.value) return;

      ctrl.goTo(ctrl.displayYear(), month);
      ctrl.setView('day');
      displayYear.value = ctrl.displayYear();
      displayMonth.value = ctrl.displayMonth();
      currentView.value = 'day';
    }

    function handleSelectYear(year: number): void {
      if (isDisabled.value) return;

      ctrl.goTo(year, ctrl.displayMonth());
      ctrl.setView('month');
      displayYear.value = ctrl.displayYear();
      currentView.value = 'month';
    }

    function handleSelectDay(isoStr: string): void {
      if (isDisabled.value) return;

      const date = parseIso(isoStr);

      if (!date) return;

      ctrl.select(date); // ctrl.select() internally rejects disabled/out-of-range dates
    }

    // ── Day-cell keyboard navigation (full ARIA grid pattern) ─────────────────

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
        target = allCells[Math.floor(idx / 7) * 7]; // first cell in same row
      } else if (e.key === 'End') {
        target = allCells[Math.floor(idx / 7) * 7 + 6]; // last cell in same row
      } else {
        return;
      }

      e.preventDefault();
      target?.focus();
    }

    // ── Host bindings ────────────────────────────────────────────────────────

    bind({
      attr: {
        'aria-disabled': () => (isDisabled.value ? 'true' : null),
        'aria-label': () => displayLabel.value,
        role: 'group',
      },
      class: {
        'is-disabled': isDisabled,
      },
    });

    // ── Template ─────────────────────────────────────────────────────────────

    return html`
      <div class="calendar" part="calendar" role="presentation">
        <!-- Header -->
        <div class="cal-header" part="header">
          <button class="nav-btn" type="button" aria-label="Previous" ?disabled="${isDisabled}" @click="${handlePrev}">
            <ore-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
          </button>

          <button
            class="cal-label-btn"
            type="button"
            :aria-label="${() =>
              `Switch to ${currentView.value === 'day' ? 'month' : currentView.value === 'month' ? 'year' : 'day'} view`}"
            ?disabled="${isDisabled}"
            @click="${handleHeaderClick}">
            <span class="cal-label-month">${displayMonth_}</span><span class="cal-label-sep" aria-hidden="true">/</span
            ><span class="cal-label-year">${displayYear_}</span>
          </button>

          <button class="nav-btn" type="button" aria-label="Next" ?disabled="${isDisabled}" @click="${handleNext}">
            <ore-icon name="chevron-right" size="16" stroke-width="2" aria-hidden="true"></ore-icon>
          </button>
        </div>

        <!-- Day view -->
        <div
          class="cal-grid cal-grid-days"
          role="grid"
          part="grid"
          :aria-label="${() => displayLabel.value}"
          ?hidden="${() => currentView.value !== 'day'}">
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
                  :aria-disabled="${() => String(cell.isDisabled || isDisabled.value)}"
                  :aria-current="${() => (cell.isToday ? 'date' : null)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-today="${() => cell.isToday}"
                  ?data-outside="${() => cell.isOutsideMonth}"
                  ?data-disabled="${() => cell.isDisabled || isDisabled.value}"
                  data-iso="${cell.iso}"
                  data-day="${String(cell.day)}"
                  tabindex="${() => (cell.isDisabled || isDisabled.value ? '-1' : '0')}"
                  @click="${() => handleSelectDay(cell.iso)}"
                  @keydown="${handleDayKeydown}">
                  ${String(cell.day)}
                  ${() => {
                    const evts = eventsByDate.value.get(cell.iso) ?? [];

                    if (!evts.length) return html``;

                    const shown = evts.slice(0, MAX_EVENTS);
                    const overflow = evts.length - MAX_EVENTS;

                    if (isExpanded.value) {
                      return html`<div
                        class="cal-events"
                        aria-label="${() => `${evts.length} event${evts.length > 1 ? 's' : ''}`}">
                        ${shown.map(
                          (evt) =>
                            html`<ore-badge
                              class="cal-event-pill"
                              size="xs"
                              rounded="sm"
                              aria-label="${evt.label}"
                              style="${() =>
                                evt.color ? `--badge-bg:${evt.color};--badge-border-color:${evt.color}` : ''}">
                              ${evt.label}
                            </ore-badge>`,
                        )}
                        ${overflow > 0
                          ? html`<span class="cal-event-pill-overflow" aria-hidden="true">+${overflow} more</span>`
                          : html``}
                      </div>`;
                    }

                    return html`<div
                      class="cal-dots"
                      aria-label="${() => `${evts.length} event${evts.length > 1 ? 's' : ''}`}">
                      ${shown.map(
                        (evt) =>
                          html`<ore-badge
                            class="cal-dot"
                            dot
                            size="xs"
                            aria-hidden="true"
                            style="${() =>
                              evt.color
                                ? `--badge-bg:${evt.color};--badge-border-color:${evt.color}`
                                : ''}"></ore-badge>`,
                      )}
                      ${overflow > 0
                        ? html`<span class="cal-dot-overflow" aria-hidden="true">+${overflow}</span>`
                        : html``}
                    </div>`;
                  }}
                </div>`,
            )}
        </div>

        <!-- Month view -->
        <div
          class="cal-grid cal-grid-months"
          role="grid"
          :aria-label="${() => displayYear_.value}"
          ?hidden="${() => currentView.value !== 'month'}">
          ${() =>
            monthCells.value.map(
              (cell) =>
                html`<div
                  class="cal-cell cal-cell-month"
                  role="gridcell"
                  :aria-selected="${() => String(cell.isSelected)}"
                  :aria-disabled="${() => String(cell.isDisabled || isDisabled.value)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-disabled="${() => cell.isDisabled || isDisabled.value}"
                  tabindex="${() => (cell.isDisabled || isDisabled.value ? '-1' : '0')}"
                  @click="${() => handleSelectMonth(cell.month)}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectMonth(cell.month);
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
          ?hidden="${() => currentView.value !== 'year'}">
          ${() =>
            yearCells.value.map(
              (cell) =>
                html`<div
                  class="cal-cell cal-cell-year"
                  role="gridcell"
                  :aria-selected="${() => String(cell.isSelected)}"
                  :aria-disabled="${() => String(cell.isDisabled || isDisabled.value)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-disabled="${() => cell.isDisabled || isDisabled.value}"
                  tabindex="${() => (cell.isDisabled || isDisabled.value ? '-1' : '0')}"
                  @click="${() => handleSelectYear(cell.year)}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectYear(cell.year);
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
