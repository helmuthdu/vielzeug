import { Temporal } from '@vielzeug/tempo';
import { describe, expect, it, vi } from 'vitest';

import { createDatePickerControl } from '../date-picker';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtrl(overrides: Partial<Parameters<typeof createDatePickerControl>[0]> = {}) {
  return createDatePickerControl({
    onChange: vi.fn(),
    ...overrides,
  });
}

/** Create a Temporal.PlainDate with 1-based month (Temporal convention). */
function plain(year: number, month: number, day: number): Temporal.PlainDate {
  return Temporal.PlainDate.from({ day, month, year });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('createDatePickerControl', () => {
  describe('initial state', () => {
    it('has no selected date when value is not provided', () => {
      const ctrl = makeCtrl();

      expect(ctrl.selected()).toBeNull();
    });

    it('sets selected and display from provided value', () => {
      const d = plain(2025, 6, 15); // June 15 2025
      const ctrl = makeCtrl({ value: d });

      expect(ctrl.selected()).not.toBeNull();
      expect(ctrl.displayYear()).toBe(2025);
      expect(ctrl.displayMonth()).toBe(6); // 1-indexed
    });

    it('defaults view to day', () => {
      expect(makeCtrl().view()).toBe('day');
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  describe('month navigation', () => {
    it('nextMonth advances the month', () => {
      const ctrl = makeCtrl({ value: plain(2025, 1, 1) }); // January

      ctrl.nextMonth();

      expect(ctrl.displayMonth()).toBe(2); // February — 1-indexed
      expect(ctrl.displayYear()).toBe(2025);
    });

    it('nextMonth wraps December → January and bumps year', () => {
      const ctrl = makeCtrl({ value: plain(2025, 12, 1) }); // December

      ctrl.nextMonth();

      expect(ctrl.displayMonth()).toBe(1); // January — 1-indexed
      expect(ctrl.displayYear()).toBe(2026);
    });

    it('prevMonth moves month back', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) }); // June

      ctrl.prevMonth();

      expect(ctrl.displayMonth()).toBe(5); // May — 1-indexed
    });

    it('prevMonth wraps January → December and decrements year', () => {
      const ctrl = makeCtrl({ value: plain(2025, 1, 1) }); // January

      ctrl.prevMonth();

      expect(ctrl.displayMonth()).toBe(12); // December — 1-indexed
      expect(ctrl.displayYear()).toBe(2024);
    });
  });

  describe('year navigation', () => {
    it('nextYear increments display year', () => {
      const ctrl = makeCtrl({ value: plain(2025, 1, 1) });

      ctrl.nextYear();

      expect(ctrl.displayYear()).toBe(2026);
    });

    it('prevYear decrements display year', () => {
      const ctrl = makeCtrl({ value: plain(2025, 1, 1) });

      ctrl.prevYear();

      expect(ctrl.displayYear()).toBe(2024);
    });
  });

  describe('goTo', () => {
    it('jumps to specified year and month (1-indexed)', () => {
      const ctrl = makeCtrl();

      ctrl.goTo(2030, 4); // April

      expect(ctrl.displayYear()).toBe(2030);
      expect(ctrl.displayMonth()).toBe(4);
    });

    it('clamps month to 1–12', () => {
      const ctrl = makeCtrl();

      ctrl.goTo(2025, 0); // below range → clamp to 1
      expect(ctrl.displayMonth()).toBe(1);

      ctrl.goTo(2025, 13); // above range → clamp to 12
      expect(ctrl.displayMonth()).toBe(12);
    });
  });

  // ── Selection ────────────────────────────────────────────────────────────

  describe('select', () => {
    it('sets selected date and calls onChange', () => {
      const onChange = vi.fn();
      const ctrl = makeCtrl({ onChange });
      const d = plain(2025, 6, 15); // June 15

      ctrl.select(d);

      const sel = ctrl.selected();

      expect(sel).not.toBeNull();
      expect(sel!.year).toBe(2025);
      expect(sel!.month).toBe(6);
      expect(sel!.day).toBe(15);
      expect(onChange).toHaveBeenCalledWith(sel);
    });

    it('updates display to selected date month/year', () => {
      const ctrl = makeCtrl();

      ctrl.select(plain(2030, 11, 1)); // November

      expect(ctrl.displayYear()).toBe(2030);
      expect(ctrl.displayMonth()).toBe(11); // 1-indexed
    });

    it('clears selection when null passed', () => {
      const onChange = vi.fn();
      const ctrl = makeCtrl({ onChange, value: plain(2025, 1, 1) });

      ctrl.select(null);

      expect(ctrl.selected()).toBeNull();
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('does not select a disabled (out-of-range) date', () => {
      const onChange = vi.fn();
      const ctrl = makeCtrl({ max: plain(2025, 1, 10), onChange });

      ctrl.select(plain(2025, 1, 15));

      expect(ctrl.selected()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not select a weekend day when weekendDays is configured', () => {
      const onChange = vi.fn();
      // 2025-06-15 is a Sunday (temporalDow=7 → legacy=0)
      const ctrl = makeCtrl({ onChange, weekendDays: [0, 6] });

      ctrl.select(plain(2025, 6, 15));

      expect(ctrl.selected()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── View ─────────────────────────────────────────────────────────────────

  describe('setView', () => {
    it('switches to month view', () => {
      const ctrl = makeCtrl();

      ctrl.setView('month');

      expect(ctrl.view()).toBe('month');
    });

    it('switches to year view', () => {
      const ctrl = makeCtrl();

      ctrl.setView('year');

      expect(ctrl.view()).toBe('year');
    });

    it('switches back to day view', () => {
      const ctrl = makeCtrl();

      ctrl.setView('month');
      ctrl.setView('day');

      expect(ctrl.view()).toBe('day');
    });
  });

  // ── Day cells ────────────────────────────────────────────────────────────

  describe('dayCells', () => {
    it('returns a multiple of 7 cells', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) }); // June
      const cells = ctrl.dayCells();

      expect(cells.length % 7).toBe(0);
    });

    it('includes all days of the month (non-outside cells)', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) }); // June 2025 = 30 days

      const inMonth = ctrl.dayCells().filter((c) => !c.isOutsideMonth);

      expect(inMonth.length).toBe(30);
    });

    it('marks the selected day as isSelected', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 15) });
      const selected = ctrl.dayCells().find((c) => c.isSelected);

      expect(selected).toBeDefined();
      expect(selected!.day).toBe(15);
    });

    it('marks today correctly', () => {
      const today = Temporal.Now.plainDateISO();
      const ctrl = makeCtrl({ value: today });
      const todayCell = ctrl.dayCells().find((c) => c.isToday && !c.isOutsideMonth);

      expect(todayCell).toBeDefined();
    });

    it('marks out-of-range days as disabled', () => {
      const ctrl = makeCtrl({
        max: plain(2025, 6, 20),
        min: plain(2025, 6, 10),
        value: plain(2025, 6, 15),
      });
      const disabled = ctrl.dayCells().filter((c) => !c.isOutsideMonth && c.isDisabled);

      // Days 1-9 and 21-30 should be disabled
      expect(disabled.length).toBeGreaterThan(0);
    });

    it('sets correct iso string on each cell', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) });
      const june15 = ctrl.dayCells().find((c) => !c.isOutsideMonth && c.day === 15);

      expect(june15?.iso).toBe('2025-06-15');
    });
  });

  // ── Month cells ──────────────────────────────────────────────────────────

  describe('monthCells', () => {
    it('returns exactly 12 months', () => {
      expect(makeCtrl().monthCells().length).toBe(12);
    });

    it('each cell carries a 1-based month number', () => {
      const cells = makeCtrl().monthCells();

      expect(cells[0].month).toBe(1); // January
      expect(cells[11].month).toBe(12); // December
    });

    it('marks the selected month as isSelected', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 15) }); // June
      const selected = ctrl.monthCells().find((c) => c.isSelected);

      // month is 1-based (June = 6)
      expect(selected?.month).toBe(6);
    });
  });

  // ── Year cells ───────────────────────────────────────────────────────────

  describe('yearCells', () => {
    it('returns 12 year cells covering a full decade window', () => {
      expect(makeCtrl({ value: plain(2025, 1, 1) }).yearCells().length).toBe(12);
    });

    it('decade window starts at the rounded-down decade', () => {
      const ctrl = makeCtrl({ value: plain(2027, 1, 1) });
      const years = ctrl.yearCells().map((c) => c.year);

      expect(years[0]).toBe(2020);
    });

    it('marks the selected year as isSelected', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 15) });
      const selected = ctrl.yearCells().find((c) => c.isSelected);

      expect(selected?.year).toBe(2025);
    });
  });

  // ── monthCells disabled ──────────────────────────────────────────────────

  describe('monthCells isDisabled', () => {
    it('marks months before min as disabled', () => {
      const ctrl = makeCtrl({ min: plain(2025, 6, 1), value: plain(2025, 1, 1) });
      const cells = ctrl.monthCells();

      expect(cells[0].isDisabled).toBe(true); // January — ends before June
      expect(cells[5].isDisabled).toBe(false); // June — not disabled
      expect(cells[6].isDisabled).toBe(false); // July — not disabled
    });

    it('marks months after max as disabled', () => {
      const ctrl = makeCtrl({ max: plain(2025, 6, 30), value: plain(2025, 1, 1) });
      const cells = ctrl.monthCells();

      expect(cells[5].isDisabled).toBe(false); // June — last day is max
      expect(cells[6].isDisabled).toBe(true); // July — starts after max
    });

    it('no cells disabled when no min/max set', () => {
      const cells = makeCtrl({ value: plain(2025, 1, 1) }).monthCells();

      expect(cells.every((c) => !c.isDisabled)).toBe(true);
    });
  });

  // ── yearCells disabled ───────────────────────────────────────────────────

  describe('yearCells isDisabled', () => {
    it('marks years before min as disabled', () => {
      const ctrl = makeCtrl({ min: plain(2024, 6, 1), value: plain(2025, 1, 1) });
      const cells = ctrl.yearCells();

      const cell2023 = cells.find((c) => c.year === 2023);
      const cell2024 = cells.find((c) => c.year === 2024);

      expect(cell2023?.isDisabled).toBe(true);
      expect(cell2024?.isDisabled).toBe(false);
    });

    it('marks years after max as disabled', () => {
      const ctrl = makeCtrl({ max: plain(2025, 6, 30), value: plain(2025, 1, 1) });
      const cells = ctrl.yearCells();

      const cell2025 = cells.find((c) => c.year === 2025);
      const cell2026 = cells.find((c) => c.year === 2026);

      expect(cell2025?.isDisabled).toBe(false);
      expect(cell2026?.isDisabled).toBe(true);
    });

    it('no cells disabled when no min/max set', () => {
      const cells = makeCtrl({ value: plain(2025, 1, 1) }).yearCells();

      expect(cells.every((c) => !c.isDisabled)).toBe(true);
    });
  });

  // ── goTo() NaN guard ─────────────────────────────────────────────────────

  describe('goTo()', () => {
    it('ignores NaN year and leaves displayYear unchanged', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) });

      ctrl.goTo(Number.NaN, 3);

      expect(ctrl.displayYear()).toBe(2025);
      expect(ctrl.displayMonth()).toBe(6);
    });

    it('ignores Infinity year and leaves displayYear unchanged', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) });

      ctrl.goTo(Infinity, 3);

      expect(ctrl.displayYear()).toBe(2025);
    });

    it('applies valid year and month', () => {
      const ctrl = makeCtrl({ value: plain(2025, 6, 1) });

      ctrl.goTo(2030, 3);

      expect(ctrl.displayYear()).toBe(2030);
      expect(ctrl.displayMonth()).toBe(3);
    });
  });

  // ── Weekday labels ───────────────────────────────────────────────────────

  describe('weekdayLabels', () => {
    it('returns 7 labels', () => {
      expect(makeCtrl().weekdayLabels().length).toBe(7);
    });
  });
});
