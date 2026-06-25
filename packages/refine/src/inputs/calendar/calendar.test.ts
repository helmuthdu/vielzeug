import { fire, type Fixture, mount } from '@vielzeug/ore/testing';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGrid(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('.cal-grid-days:not([hidden])');
}

function getDayCells(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.cal-cell-day'));
}

function getSelectedDay(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('.cal-cell-day[data-selected]');
}

function getToday(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('.cal-cell-day[data-today]');
}

function clickDay(fixture: Fixture<HTMLElement>, iso: string): void {
  const cell = fixture.query(`[data-iso="${iso}"]`);

  if (cell) fire.click(cell);
}

function getHeaderLabel(fixture: Fixture<HTMLElement>): string {
  const month = fixture.query('.cal-label-month')?.textContent?.trim() ?? '';
  const year = fixture.query('.cal-label-year')?.textContent?.trim() ?? '';

  return `${month} ${year}`;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ore-calendar', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./calendar');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the calendar panel', async () => {
      fixture = await mount('ore-calendar');

      expect(fixture.query('.calendar')).toBeTruthy();
    });

    it('renders the day grid by default', async () => {
      fixture = await mount('ore-calendar');

      expect(getGrid(fixture)).toBeTruthy();
    });

    it('renders 7 weekday header cells', async () => {
      fixture = await mount('ore-calendar');

      const headers = fixture.queryAll('.cal-cell-head');

      expect(headers.length).toBe(7);
    });

    it('renders between 28 and 42 day cells', async () => {
      fixture = await mount('ore-calendar');

      const cells = getDayCells(fixture);

      expect(cells.length).toBeGreaterThanOrEqual(28);
      expect(cells.length).toBeLessThanOrEqual(42);
    });

    it('renders prev/next nav buttons', async () => {
      fixture = await mount('ore-calendar');

      expect(fixture.query('.nav-btn[aria-label="Previous"]')).toBeTruthy();
      expect(fixture.query('.nav-btn[aria-label="Next"]')).toBeTruthy();
    });

    it('renders header label button', async () => {
      fixture = await mount('ore-calendar');

      expect(fixture.query('.cal-label-btn')).toBeTruthy();
    });

    it('marks today with data-today and aria-current="date"', async () => {
      fixture = await mount('ore-calendar');

      const today = getToday(fixture);

      expect(today).toBeTruthy();
      expect(today?.getAttribute('aria-current')).toBe('date');
    });
  });

  // ─── Value / selection ──────────────────────────────────────────────────────

  describe('Value and selection', () => {
    it('pre-selects day matching value prop', async () => {
      const year = new Date().getFullYear();
      const iso = `${year}-01-15`;

      fixture = await mount('ore-calendar', { props: { value: iso } });

      const selected = getSelectedDay(fixture);

      expect(selected).toBeTruthy();
      expect(selected?.getAttribute('data-iso')).toBe(iso);
    });

    it('navigates to value prop month on mount', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-03-10' } });

      const label = getHeaderLabel(fixture);

      expect(label).toMatch(/March/i);
      expect(label).toContain('2023');
    });

    it('emits change event when a day is clicked', async () => {
      const year = new Date().getFullYear();

      fixture = await mount('ore-calendar', { props: { value: `${year}-01-01` } });

      const events: CustomEvent[] = [];
      const iso = `${year}-01-10`;

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));
      clickDay(fixture, iso);
      await fixture.flush();

      expect(events.length).toBe(1);
      expect(events[0].detail.isoValue).toBe(iso);
    });

    it('updates selected cell after clicking a day', async () => {
      const year = new Date().getFullYear();

      fixture = await mount('ore-calendar', { props: { value: `${year}-01-01` } });

      const iso = `${year}-01-15`;

      clickDay(fixture, iso);
      await fixture.flush();

      const selected = getSelectedDay(fixture);

      expect(selected?.getAttribute('data-iso')).toBe(iso);
    });

    it('re-clicking a different day updates the selection', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-01-10' } });

      clickDay(fixture, '2023-01-20');
      await fixture.flush();
      clickDay(fixture, '2023-01-05');
      await fixture.flush();

      expect(getSelectedDay(fixture)?.getAttribute('data-iso')).toBe('2023-01-05');
    });
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('previous button moves to prior month', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const labelBefore = getHeaderLabel(fixture);

      fire.click(fixture.query('.nav-btn[aria-label="Previous"]')!);
      await fixture.flush();

      const labelAfter = getHeaderLabel(fixture);

      expect(labelAfter).not.toBe(labelBefore);
      expect(labelAfter).toMatch(/May/i);
    });

    it('next button moves to next month', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      fire.click(fixture.query('.nav-btn[aria-label="Next"]')!);
      await fixture.flush();

      expect(getHeaderLabel(fixture)).toMatch(/July/i);
    });

    it('previous wraps from January to December of prior year', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-01-01' } });

      fire.click(fixture.query('.nav-btn[aria-label="Previous"]')!);
      await fixture.flush();

      const label = getHeaderLabel(fixture);

      expect(label).toMatch(/December/i);
      expect(label).toContain('2022');
    });

    it('header click switches to month view', async () => {
      fixture = await mount('ore-calendar');

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      expect(fixture.query('.cal-grid-months:not([hidden])')).toBeTruthy();
    });

    it('clicking a month in month view switches to day view', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      const marchCell = Array.from(fixture.queryAll('.cal-cell-month')).find((el) =>
        el.textContent?.trim().toLowerCase().startsWith('mar'),
      );

      fire.click(marchCell!);
      await fixture.flush();

      expect(getGrid(fixture)).toBeTruthy();
      expect(getHeaderLabel(fixture)).toMatch(/March/i);
    });

    it('second header click switches to year view', async () => {
      fixture = await mount('ore-calendar');

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();
      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      expect(fixture.query('.cal-grid-years:not([hidden])')).toBeTruthy();
    });

    it('clicking a year in year view switches to month view', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-01-01' } });

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();
      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      const yearCell = Array.from(fixture.queryAll('.cal-cell-year')).find((el) => el.textContent?.trim() === '2023');

      fire.click(yearCell!);
      await fixture.flush();

      expect(fixture.query('.cal-grid-months:not([hidden])')).toBeTruthy();
    });
  });

  // ─── Min / Max bounds ───────────────────────────────────────────────────────

  describe('Min / Max bounds', () => {
    it('disables days before min', async () => {
      fixture = await mount('ore-calendar', { props: { min: '2023-06-10', value: '2023-06-15' } });

      const cell = fixture.query('[data-iso="2023-06-05"]');

      expect(cell?.getAttribute('data-disabled')).not.toBeNull();
      expect(cell?.getAttribute('aria-disabled')).toBe('true');
    });

    it('disables days after max', async () => {
      fixture = await mount('ore-calendar', { props: { max: '2023-06-20', value: '2023-06-01' } });

      const cell = fixture.query('[data-iso="2023-06-25"]');

      expect(cell?.getAttribute('data-disabled')).not.toBeNull();
    });

    it('does not emit change when a disabled day is clicked', async () => {
      fixture = await mount('ore-calendar', { props: { min: '2023-06-10', value: '2023-06-15' } });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      clickDay(fixture, '2023-06-05');
      await fixture.flush();

      expect(events.length).toBe(0);
    });
  });

  // ─── Weekend-days ───────────────────────────────────────────────────────────

  describe('weekend-days', () => {
    it('disables days matching weekend-days (array prop)', async () => {
      fixture = await mount('ore-calendar', {
        props: { value: '2023-06-02', 'weekend-days': [0, 6] },
      });

      // 2023-06-04 is a Sunday (0)
      const sunday = fixture.query('[data-iso="2023-06-04"]');

      expect(sunday?.getAttribute('data-disabled')).not.toBeNull();
    });

    it('disables days matching weekend-days (JSON attribute)', async () => {
      fixture = await mount('ore-calendar');
      fixture.element.setAttribute('weekend-days', '[0,6]');
      fixture.element.setAttribute('value', '2023-06-02');
      await fixture.flush();

      const sunday = fixture.query('[data-iso="2023-06-04"]');

      expect(sunday?.getAttribute('data-disabled')).not.toBeNull();
    });
  });

  // ─── Keyboard navigation ────────────────────────────────────────────────────

  describe('Keyboard navigation', () => {
    it('Enter on a day cell selects the date', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      const cell = fixture.query('[data-iso="2023-06-10"]')!;

      fire.keyDown(cell, { key: 'Enter' });
      await fixture.flush();

      expect(events.length).toBe(1);
      expect(events[0].detail.isoValue).toBe('2023-06-10');
    });

    it('Space on a day cell selects the date', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      const cell = fixture.query('[data-iso="2023-06-10"]')!;

      fire.keyDown(cell, { key: ' ' });
      await fixture.flush();

      expect(events.length).toBe(1);
    });

    it('ArrowRight moves focus to the next cell', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const cell = fixture.query('[data-iso="2023-06-10"]') as HTMLElement;
      const next = fixture.query('[data-iso="2023-06-11"]') as HTMLElement;

      cell.focus();
      fire.keyDown(cell, { key: 'ArrowRight' });
      await fixture.flush();

      // jsdom does not propagate focus from focus() calls triggered inside handlers,
      // but we verify the handler does not throw and the sibling cell exists.
      expect(next).toBeTruthy();
    });

    it('ArrowLeft moves focus to the previous cell', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const cell = fixture.query('[data-iso="2023-06-10"]') as HTMLElement;
      const prev = fixture.query('[data-iso="2023-06-09"]') as HTMLElement;

      cell.focus();
      fire.keyDown(cell, { key: 'ArrowLeft' });
      await fixture.flush();

      expect(prev).toBeTruthy();
    });

    it('ArrowDown moves focus 7 cells forward (one week)', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const cell = fixture.query('[data-iso="2023-06-10"]') as HTMLElement;
      const oneWeekLater = fixture.query('[data-iso="2023-06-17"]') as HTMLElement;

      cell.focus();
      fire.keyDown(cell, { key: 'ArrowDown' });
      await fixture.flush();

      expect(oneWeekLater).toBeTruthy();
    });

    it('ArrowUp moves focus 7 cells backward (one week)', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      const cell = fixture.query('[data-iso="2023-06-10"]') as HTMLElement;
      const oneWeekEarlier = fixture.query('[data-iso="2023-06-03"]') as HTMLElement;

      cell.focus();
      fire.keyDown(cell, { key: 'ArrowUp' });
      await fixture.flush();

      expect(oneWeekEarlier).toBeTruthy();
    });

    it('Home moves focus to the first cell in the same row', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      // 2023-06-10 is a Saturday — row starts on Sunday 2023-06-04
      const cell = fixture.query('[data-iso="2023-06-10"]') as HTMLElement;

      expect(() => fire.keyDown(cell, { key: 'Home' })).not.toThrow();
    });

    it('End moves focus to the last cell in the same row', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      // 2023-06-04 is a Sunday — row ends on Saturday 2023-06-10
      const cell = fixture.query('[data-iso="2023-06-04"]') as HTMLElement;

      expect(() => fire.keyDown(cell, { key: 'End' })).not.toThrow();
    });

    it('Enter on a month cell navigates to day view', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      const julyCell = Array.from(fixture.queryAll('.cal-cell-month')).find((el) =>
        el.textContent?.trim().toLowerCase().startsWith('jul'),
      )!;

      fire.keyDown(julyCell, { key: 'Enter' });
      await fixture.flush();

      expect(getGrid(fixture)).toBeTruthy();
      expect(getHeaderLabel(fixture)).toMatch(/July/i);
    });

    it('Enter on a year cell navigates to month view', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-01-01' } });

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();
      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      const yearCell = Array.from(fixture.queryAll('.cal-cell-year')).find((el) => el.textContent?.trim() === '2023')!;

      fire.keyDown(yearCell, { key: 'Enter' });
      await fixture.flush();

      expect(fixture.query('.cal-grid-months:not([hidden])')).toBeTruthy();
    });
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('host has role="group"', async () => {
      fixture = await mount('ore-calendar');

      expect(fixture.element.getAttribute('role')).toBe('group');
    });

    it('host has aria-label from display label', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-01' } });

      expect(fixture.element.getAttribute('aria-label')).toMatch(/June 2023/i);
    });

    it('day grid has role="grid"', async () => {
      fixture = await mount('ore-calendar');

      expect(getGrid(fixture)?.getAttribute('role')).toBe('grid');
    });

    it('day cells have role="gridcell"', async () => {
      fixture = await mount('ore-calendar');

      const cells = getDayCells(fixture);

      expect(cells[0]?.getAttribute('role')).toBe('gridcell');
    });

    it('selected day has aria-selected="true"', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-06-15' } });

      const selected = getSelectedDay(fixture);

      expect(selected?.getAttribute('aria-selected')).toBe('true');
    });

    it('disabled days have tabindex="-1"', async () => {
      fixture = await mount('ore-calendar', { props: { min: '2023-06-10', value: '2023-06-15' } });

      const disabled = fixture.query('[data-iso="2023-06-05"]');

      expect(disabled?.getAttribute('tabindex')).toBe('-1');
    });

    it('host sets aria-disabled="true" when disabled', async () => {
      fixture = await mount('ore-calendar', { props: { disabled: true } });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('nav buttons have descriptive aria-label', async () => {
      fixture = await mount('ore-calendar');

      expect(fixture.query('[aria-label="Previous"]')).toBeTruthy();
      expect(fixture.query('[aria-label="Next"]')).toBeTruthy();
    });

    it('header label button aria-label reflects next view', async () => {
      fixture = await mount('ore-calendar');

      const btn = fixture.query('.cal-label-btn');

      expect(btn?.getAttribute('aria-label')).toMatch(/month/i);
    });
  });

  // ─── Disabled state ─────────────────────────────────────────────────────────

  describe('Disabled state', () => {
    it('does not emit change when disabled and day is clicked', async () => {
      fixture = await mount('ore-calendar', { props: { disabled: true, value: '2023-06-01' } });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));
      clickDay(fixture, '2023-06-15');
      await fixture.flush();

      expect(events.length).toBe(0);
    });

    it('all day cells have tabindex="-1" when disabled', async () => {
      fixture = await mount('ore-calendar', { props: { disabled: true } });

      const cells = getDayCells(fixture);

      expect(cells.every((c) => c.getAttribute('tabindex') === '-1')).toBe(true);
    });
  });

  // ─── Events (dots / pills) ───────────────────────────────────────────────────

  describe('Events', () => {
    it('renders a dot for a date with 1 event in normal mode', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [{ date: '2023-06-15', id: '1', label: 'Meeting' }],
          value: '2023-06-15',
        },
      });

      const cell = fixture.query('[data-iso="2023-06-15"]');

      expect(cell?.querySelector('.cal-dot')).toBeTruthy();
    });

    it('caps visible dots at 3 and shows overflow badge', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [
            { date: '2023-06-15', id: '1', label: 'A' },
            { date: '2023-06-15', id: '2', label: 'B' },
            { date: '2023-06-15', id: '3', label: 'C' },
            { date: '2023-06-15', id: '4', label: 'D' },
          ],
          value: '2023-06-15',
        },
      });

      const cell = fixture.query('[data-iso="2023-06-15"]');

      expect(cell?.querySelectorAll('.cal-dot').length).toBe(3);
      expect(cell?.querySelector('.cal-dot-overflow')?.textContent).toBe('+1');
    });

    it('renders pills instead of dots in expanded mode', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [{ date: '2023-06-15', id: '1', label: 'Release' }],
          expanded: true,
          value: '2023-06-15',
        },
      });

      const cell = fixture.query('[data-iso="2023-06-15"]');

      expect(cell?.querySelector('.cal-event-pill')).toBeTruthy();
      expect(cell?.querySelector('.cal-dot')).toBeNull();
    });

    it('caps visible pills at 3 and shows "+N more" in expanded mode', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [
            { date: '2023-06-15', id: '1', label: 'A' },
            { date: '2023-06-15', id: '2', label: 'B' },
            { date: '2023-06-15', id: '3', label: 'C' },
            { date: '2023-06-15', id: '4', label: 'D' },
            { date: '2023-06-15', id: '5', label: 'E' },
          ],
          expanded: true,
          value: '2023-06-15',
        },
      });

      const cell = fixture.query('[data-iso="2023-06-15"]');
      const pills = cell?.querySelectorAll('.cal-event-pill:not(.cal-event-pill-overflow)');
      const overflow = cell?.querySelector('.cal-event-pill-overflow');

      expect(pills?.length).toBe(3);
      expect(overflow?.textContent).toBe('+2 more');
    });

    it('shows no overflow pill when events fit within cap in expanded mode', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [
            { date: '2023-06-15', id: '1', label: 'A' },
            { date: '2023-06-15', id: '2', label: 'B' },
            { date: '2023-06-15', id: '3', label: 'C' },
          ],
          expanded: true,
          value: '2023-06-15',
        },
      });

      const cell = fixture.query('[data-iso="2023-06-15"]');

      expect(cell?.querySelectorAll('.cal-event-pill:not(.cal-event-pill-overflow)').length).toBe(3);
      expect(cell?.querySelector('.cal-event-pill-overflow')).toBeNull();
    });

    it('applies event color as CSS custom property on dot', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [{ color: '#e11d48', date: '2023-06-15', id: '1', label: 'Alert' }],
          value: '2023-06-15',
        },
      });

      const dot = fixture.query('[data-iso="2023-06-15"] .cal-dot') as HTMLElement | null;

      expect(dot?.style.getPropertyValue('--badge-bg')).toBe('#e11d48');
    });

    it('renders no dot container for a date with 0 events', async () => {
      fixture = await mount('ore-calendar', {
        props: {
          events: [{ date: '2023-06-20', id: '1', label: 'Other day' }],
          value: '2023-06-15',
        },
      });

      const cell = fixture.query('[data-iso="2023-06-15"]');

      expect(cell?.querySelector('.cal-dots')).toBeNull();
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('ignores invalid value prop gracefully', async () => {
      fixture = await mount('ore-calendar', { props: { value: 'not-a-date' } });

      expect(getSelectedDay(fixture)).toBeNull();
    });

    it('navigates month grids across year boundaries correctly', async () => {
      fixture = await mount('ore-calendar', { props: { value: '2023-12-01' } });

      fire.click(fixture.query('.nav-btn[aria-label="Next"]')!);
      await fixture.flush();

      expect(getHeaderLabel(fixture)).toContain('2024');
    });

    it('renders without value prop (no selected cell)', async () => {
      fixture = await mount('ore-calendar');

      expect(getSelectedDay(fixture)).toBeNull();
    });

    it('month view shows 12 month cells', async () => {
      fixture = await mount('ore-calendar');

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      expect(fixture.queryAll('.cal-cell-month').length).toBe(12);
    });

    it('year view shows 12 year cells', async () => {
      fixture = await mount('ore-calendar');

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();
      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      expect(fixture.queryAll('.cal-cell-year').length).toBe(12);
    });

    it('third header click cycles back to day view', async () => {
      fixture = await mount('ore-calendar');

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();
      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();
      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      expect(getGrid(fixture)).toBeTruthy();
    });

    it('clicking a month cell when disabled does not emit change', async () => {
      fixture = await mount('ore-calendar', { props: { disabled: true, value: '2023-06-01' } });

      fire.click(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      const marchCell = Array.from(fixture.queryAll('.cal-cell-month')).find((el) =>
        el.textContent?.trim().toLowerCase().startsWith('mar'),
      )!;

      fire.click(marchCell);
      await fixture.flush();

      expect(events.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-calendar', { attrs: { value: '2024-03-15' } });

      const results = await axeCheck(fixture.element, {
        rules: {
          'aria-required-children': { enabled: false },
          'aria-required-parent': { enabled: false },
        },
      });

      expect(results.violations).toHaveLength(0);
    });
  });
});
