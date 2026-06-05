import { computed, define, defineField, html, onMounted, prop, signal } from '@vielzeug/craft';
import { Temporal, format } from '@vielzeug/tempo';

import type { ComponentSize, RoundedSize, ThemeColor } from '../../shared';

import '../../content/icon/icon';
import '../../feedback/badge/badge';
import { createDatePickerControl, parseIso, toIsoString, type DatePickerView } from '../../headless';
import { disablableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, reducedMotionMixin } from '../../styles';
import componentStyles from './calendar.css?inline';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SgCalendarEvents = {
  change: { isoValue: string | null };
};

/**
 * A calendar event entry.
 * Dates must be ISO 8601 strings (yyyy-MM-dd).
 */
export type CalendarEvent = {
  /**
   * Any CSS color value for the event dot / pill.
   * Defaults to the component's `--_day-selected-bg` (theme color) when omitted.
   */
  color?: string;
  /** ISO date the event falls on (yyyy-MM-dd) */
  date: string;
  /** Unique identifier */
  id: string;
  /** Short label shown in the calendar cell */
  label: string;
};

export type SgCalendarProps = {
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
   * <sg-calendar weekend-days="[0,6]"></sg-calendar>
   * ```
   */
  'weekend-days'?: number[];
};

/**
 * An accessible, keyboard-navigable inline calendar component.
 * Supports day/month/year drill-down views, min/max bounds, disabled weekend
 * days, and optional form association.
 *
 * @element sg-calendar
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
 * @attr {string} weekend-days - Comma-separated day indices to disable (0=Sun…6=Sat)
 * @attr {boolean} fullwidth - Expand to full container width
 * @attr {boolean} expanded - Large-cell calendar-app layout with top-aligned day numbers
 *
 * @fires change - Fired when a date is selected. detail: { value: Date | null, isoValue: string | null }
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
 * <!-- Single date -->
 * <sg-calendar value="2025-06-15" min="2025-01-01" max="2025-12-31" color="primary"></sg-calendar>
 *
 * <!-- Range selection -->
 * <sg-calendar selection-mode="range" color="primary"></sg-calendar>
 *
 * <!-- Expanded calendar-app layout -->
 * <sg-calendar expanded fullwidth color="primary"></sg-calendar>
 * ```
 */
export const CALENDAR_TAG = 'sg-calendar' as const;

define<SgCalendarProps, SgCalendarEvents>(CALENDAR_TAG, {
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

  setup(props, { bind, el: _el, emit }) {
    // ── Signals ──────────────────────────────────────────────────────────────

    const initialDate = parseIso(props.value.value);
    const selectedDate = signal(initialDate);
    const isDisabled = computed(() => props.disabled.value === true);
    const isExpanded = computed(() => props.expanded.value === true);

    // ── Date-picker control ──────────────────────────────────────────────────

    const locale = computed(() => props.locale.value || (typeof navigator !== 'undefined' ? navigator.language : 'en'));

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

    // ── Version counter + explicit display signals ─────────────────────────────
    // version drives cell arrays and view toggling.
    // displayYear / displayMonth are explicit reactive signals that mirror ctrl's
    // internal state — written on every mutation so label computeds invalidate
    // correctly (reactive systems track signal *reads* as dependencies).

    const version = signal(0);
    const displayYear = signal(ctrl.displayYear());
    const displayMonth = signal(ctrl.displayMonth());

    function bump(): void {
      displayYear.value = ctrl.displayYear();
      displayMonth.value = ctrl.displayMonth();
      version.value++;
    }

    // ── Form value ───────────────────────────────────────────────────────────

    defineField<string>({
      disabled: isDisabled,
      toFormValue: (v) => v || null,
      value: computed(() => toIsoString(selectedDate.value) ?? ''),
    });

    // ── Sync value prop → selectedDate (via onMounted watcher with cleanup) ──

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

    // ── Events lookup ─────────────────────────────────────────────────────────

    /** Map of iso-date → CalendarEvent[] for O(1) cell lookup */
    const eventsByDate = computed(() => {
      const map = new Map<string, CalendarEvent[]>();
      const evts = props.events.value ?? [];

      for (const evt of evts) {
        const list = map.get(evt.date) ?? [];

        list.push(evt);
        map.set(evt.date, list);
      }

      return map;
    });

    // ── Derived cells (version-gated — no void hacks) ─────────────────────────

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

    const displayMonth_ = computed(() => {
      const d = Temporal.PlainDate.from({ day: 1, month: displayMonth.value, year: displayYear.value });

      return format(d, { intl: { month: 'long' }, locale: locale.value, tz: 'UTC' });
    });

    const displayYear_ = computed(() => String(displayYear.value));
    const displayLabel = computed(() => `${displayMonth_.value} ${displayYear_.value}`);

    // ── Navigation ───────────────────────────────────────────────────────────
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
      // monthIndex from monthCells is 0-based (index prop) — convert to 1-based for ctrl
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
      if (isDisabled.value) return;

      const date = parseIso(isoStr);

      if (!date) return;

      ctrl.select(date);
      bump();
    }

    // ── Host bindings ────────────────────────────────────────────────────────

    bind({
      attr: {
        'aria-disabled': () => (isDisabled.value ? 'true' : null),
        'aria-label': () => displayLabel.value,
        role: () => 'group',
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
            <sg-icon name="chevron-left" size="16" stroke-width="2" aria-hidden="true"></sg-icon>
          </button>

          <button
            class="cal-label-btn"
            type="button"
            :aria-label="${() => `Switch to ${ctrl.view() === 'day' ? 'month' : 'year'} view`}"
            ?disabled="${isDisabled}"
            @click="${handleHeaderClick}">
            <span class="cal-label-month">${displayMonth_}</span><span class="cal-label-sep" aria-hidden="true">/</span
            ><span class="cal-label-year">${displayYear_}</span>
          </button>

          <button class="nav-btn" type="button" aria-label="Next" ?disabled="${isDisabled}" @click="${handleNext}">
            <sg-icon name="chevron-right" size="16" stroke-width="2" aria-hidden="true"></sg-icon>
          </button>
        </div>

        <!-- Day view -->
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
                  :aria-disabled="${() => String(cell.isDisabled || isDisabled.value)}"
                  :aria-current="${() => (cell.isToday ? 'date' : null)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-today="${() => cell.isToday}"
                  ?data-outside="${() => cell.isOutsideMonth}"
                  ?data-disabled="${() => cell.isDisabled || isDisabled.value}"
                  data-iso="${cell.iso}"
                  data-day="${String(cell.day)}"
                  tabindex="${() => (cell.isDisabled || isDisabled.value ? '-1' : '0')}"
                  @click="${() => {
                    if (!cell.isDisabled) handleSelectDay(cell.iso);
                  }}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();

                      if (!cell.isDisabled) handleSelectDay(cell.iso);
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();

                      const next = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null;

                      next?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();

                      const prev = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;

                      prev?.focus();
                    }
                  }}">
                  ${String(cell.day)}
                  ${() => {
                    const evts = eventsByDate.value.get(cell.iso) ?? [];

                    if (!evts.length) return html``;

                    const MAX_PILLS = 3;

                    if (isExpanded.value) {
                      const shownPills = evts.slice(0, MAX_PILLS);
                      const pillOverflow = evts.length - MAX_PILLS;

                      return html`<div
                        class="cal-events"
                        aria-label="${() => `${evts.length} event${evts.length > 1 ? 's' : ''}`}">
                        ${shownPills.map(
                          (evt) =>
                            html`<sg-badge
                              class="cal-event-pill"
                              size="xs"
                              rounded="sm"
                              aria-label="${evt.label}"
                              style="${() =>
                                evt.color ? `--badge-bg:${evt.color};--badge-border-color:${evt.color}` : ''}">
                              ${evt.label}
                            </sg-badge>`,
                        )}
                        ${pillOverflow > 0
                          ? html`<span class="cal-event-pill-overflow" aria-hidden="true">+${pillOverflow} more</span>`
                          : html``}
                      </div>`;
                    }

                    const MAX_DOTS = MAX_PILLS;
                    const shown = evts.slice(0, MAX_DOTS);
                    const overflow = evts.length - MAX_DOTS;

                    return html`<div
                      class="cal-dots"
                      aria-label="${() => `${evts.length} event${evts.length > 1 ? 's' : ''}`}">
                      ${shown.map(
                        (evt) =>
                          html`<sg-badge
                            class="cal-dot"
                            dot
                            size="xs"
                            aria-hidden="true"
                            style="${() =>
                              evt.color
                                ? `--badge-bg:${evt.color};--badge-border-color:${evt.color}`
                                : ''}"></sg-badge>`,
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
                  :aria-disabled="${() => String(cell.isDisabled || isDisabled.value)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-disabled="${() => cell.isDisabled || isDisabled.value}"
                  tabindex="${() => (cell.isDisabled || isDisabled.value ? '-1' : '0')}"
                  @click="${() => {
                    if (!cell.isDisabled && !isDisabled.value) handleSelectMonth(cell.index);
                  }}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();

                      if (!cell.isDisabled && !isDisabled.value) handleSelectMonth(cell.index);
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
                  :aria-disabled="${() => String(cell.isDisabled || isDisabled.value)}"
                  ?data-selected="${() => cell.isSelected}"
                  ?data-disabled="${() => cell.isDisabled || isDisabled.value}"
                  tabindex="${() => (cell.isDisabled || isDisabled.value ? '-1' : '0')}"
                  @click="${() => {
                    if (!cell.isDisabled && !isDisabled.value) handleSelectYear(cell.year);
                  }}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();

                      if (!cell.isDisabled && !isDisabled.value) handleSelectYear(cell.year);
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
