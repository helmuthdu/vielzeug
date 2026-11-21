import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function open(fixture: Fixture<HTMLElement>): Promise<void> {
  const trigger = fixture.query('ore-input.trigger');

  fireClick(trigger!);
  await fixture.flush();
}

function getCalendar(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('.calendar[data-open]');
}

function getDayCells(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.cal-cell-day[aria-disabled="false"]'));
}

function getSelectedDay(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('[aria-selected="true"]');
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('ore-date-picker', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./date-picker');
    await import('../input/input');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a trigger (ore-input)', async () => {
      fixture = await mount('ore-date-picker');

      expect(fixture.query('ore-input.trigger')).toBeTruthy();
    });

    it('calendar is closed by default', async () => {
      fixture = await mount('ore-date-picker');

      expect(getCalendar(fixture)).toBeNull();
    });

    it('opens calendar on trigger click', async () => {
      fixture = await mount('ore-date-picker');
      await open(fixture);

      expect(getCalendar(fixture)).toBeTruthy();
    });

    it('closes the calendar and cancels a draft when disabled', async () => {
      fixture = await mount('ore-date-picker', { attrs: { range: true, value: '2025-06-10/2025-06-20' } });
      await open(fixture);
      fireClick(fixture.query('[data-iso="2025-06-12"]')!);
      await fixture.flush();

      await fixture.attr('disabled', '');

      expect(getCalendar(fixture)).toBeNull();
      expect((fixture.element as HTMLElement & { value: string }).value).toBe('2025-06-10/2025-06-20');
    });

    it('passes label to trigger', async () => {
      fixture = await mount('ore-date-picker', { props: { label: 'Birthday' } });

      expect(fixture.query('ore-input.trigger')?.getAttribute('label')).toBe('Birthday');
    });

    it('passes placeholder to trigger', async () => {
      fixture = await mount('ore-date-picker', { props: { placeholder: 'Select date' } });

      expect(fixture.query('ore-input.trigger')?.getAttribute('placeholder')).toBe('Select date');
    });
  });

  // ─── Value / display ─────────────────────────────────────────────────────

  describe('Value handling', () => {
    it('reapplies the value attribute after a user selection even when the attribute is unchanged', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-10' } });
      const picker = fixture.element as HTMLElement & { value: string };

      await open(fixture);
      fireClick(fixture.query('[data-iso="2025-06-12"]')!);
      await fixture.flush();
      expect(picker.value).toBe('2025-06-12');
      await fixture.act(() => picker.setAttribute('value', '2025-06-10'));
      expect(picker.value).toBe('2025-06-10');
      await fixture.act(() => {
        picker.setAttribute('value', '2025-06-10');
        picker.value = '2025-06-15';
      });
      expect(picker.value).toBe('2025-06-15');
    });

    it('displays formatted date in trigger when value is set', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });

      const trigger = fixture.query('ore-input.trigger');

      expect(trigger?.getAttribute('value')).toBeTruthy();
      expect(trigger?.getAttribute('value')).not.toBe('');
    });

    describe('Range selection', () => {
      it('commits only after two endpoints and orders a reversed selection', async () => {
        fixture = await mount('ore-date-picker', {
          attrs: { range: true, value: '2025-06-10/2025-06-20' },
        });
        const picker = fixture.element as HTMLElement & { value: string; checkValidity(): boolean };
        const events: string[] = [];

        picker.addEventListener('input', () => events.push('input'));
        picker.addEventListener('change', () => events.push('change'));
        await open(fixture);
        fireClick(fixture.query('[data-iso="2025-06-18"]')!);
        await fixture.flush();

        expect(picker.value).toBe('2025-06-10/2025-06-20');
        expect(events).toEqual([]);
        expect(picker.checkValidity()).toBe(false);
        expect(getCalendar(fixture)).toBeTruthy();

        fireClick(fixture.query('[data-iso="2025-06-12"]')!);
        await fixture.flush();

        expect(picker.value).toBe('2025-06-12/2025-06-18');
        expect(events).toEqual(['input', 'change']);
        expect(picker.checkValidity()).toBe(true);
        expect(getCalendar(fixture)).toBeNull();
      });

      it('allows a same-day range and discards a new draft on Escape', async () => {
        fixture = await mount('ore-date-picker', { attrs: { range: true, value: '2025-06-10/2025-06-20' } });
        const picker = fixture.element as HTMLElement & { value: string };

        await open(fixture);
        fireClick(fixture.query('[data-iso="2025-06-15"]')!);
        await fixture.flush();
        fireClick(fixture.query('[data-iso="2025-06-15"]')!);
        await fixture.flush();
        expect(picker.value).toBe('2025-06-15/2025-06-15');

        await open(fixture);
        fireClick(fixture.query('[data-iso="2025-06-16"]')!);
        await fixture.flush();
        fireKeyDown(getCalendar(fixture)!, { key: 'Escape' });
        await fixture.flush();
        expect(picker.value).toBe('2025-06-15/2025-06-15');
      });

      it('retains invalid external values and rejects invalid endpoints and required emptiness', async () => {
        fixture = await mount('ore-date-picker', {
          attrs: { min: '2025-06-10', range: true, required: true, value: '2025-06-01/2025-06-15' },
        });
        const picker = fixture.element as HTMLElement & { value: string; checkValidity(): boolean };

        expect(picker.value).toBe('2025-06-01/2025-06-15');
        expect(picker.checkValidity()).toBe(false);
        await fixture.act(() => {
          picker.value = '2025-06-10/2025-06-15';
        });
        expect(picker.checkValidity()).toBe(true);
        await fixture.act(() => {
          picker.value = '2025-06-15/';
        });
        expect(picker.value).toBe('2025-06-15/');
        expect(picker.checkValidity()).toBe(false);
        await fixture.act(() => {
          picker.value = '';
        });
        expect(picker.checkValidity()).toBe(false);
      });

      it('validates endpoints rather than interior days and responds to changed bounds', async () => {
        fixture = await mount('ore-date-picker', {
          attrs: { range: true, value: '2025-06-13/2025-06-16', 'weekend-days': '[0,6]' },
        });
        const picker = fixture.element as HTMLElement & { checkValidity(): boolean };

        expect(picker.checkValidity()).toBe(true);
        await fixture.attr('min', '2025-06-14');
        expect(picker.checkValidity()).toBe(false);
        await fixture.attr('min', '2025-06-13');
        expect(picker.checkValidity()).toBe(true);
      });

      it('resets to the current value attribute', async () => {
        const form = document.createElement('form');

        document.body.append(form);
        fixture = await mount('ore-date-picker', {
          attrs: { range: true, value: '2025-06-10/2025-06-20' },
          container: form,
        });
        const picker = fixture.element as HTMLElement & { value: string };

        await fixture.act(() => {
          picker.value = '2025-06-12/2025-06-14';
        });
        form.reset();
        await fixture.flush();
        expect(picker.value).toBe('2025-06-10/2025-06-20');
        form.remove();
      });
    });

    it('shows placeholder when no value is set', async () => {
      fixture = await mount('ore-date-picker', { props: { placeholder: 'Pick date' } });

      const trigger = fixture.query('ore-input.trigger');

      // No date selected: value attribute reflects the placeholder text (triggerText fallback),
      // not a real ISO date. The placeholder attribute is also forwarded.
      expect(trigger?.getAttribute('value')).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(trigger?.getAttribute('placeholder')).toBe('Pick date');
    });

    it('marks the initial value as selected in the day grid', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });
      await open(fixture);

      expect(getSelectedDay(fixture)).toBeTruthy();
    });

    it('updates the displayed selection when the value attribute changes after a pick', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });
      await open(fixture);
      fireClick(fixture.query('[data-iso="2025-06-16"]')!);
      await fixture.flush();

      await fixture.act(() => {
        fixture.element.setAttribute('value', '2025-06-20');
      });
      expect((fixture.element as HTMLElement & { value: string }).value).toBe('2025-06-20');

      await open(fixture);
      expect(fixture.query('[data-iso="2025-06-20"]')?.getAttribute('aria-selected')).toBe('true');
    });

    it('updates the selected grid cell when the value property changes', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });
      const picker = fixture.element as HTMLElement & { value: string };

      await fixture.act(() => {
        picker.value = '2025-06-20';
      });
      await open(fixture);

      expect(fixture.query('[data-iso="2025-06-20"]')?.getAttribute('aria-selected')).toBe('true');
      expect(fixture.query('[data-iso="2025-06-15"]')?.getAttribute('aria-selected')).toBe('false');
    });

    it('emits change event when a day cell is clicked', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });

      const events: Array<HTMLElement & { value: string }> = [];

      fixture.element.addEventListener('change', (e) =>
        events.push(e.currentTarget as HTMLElement & { value: string }),
      );
      await open(fixture);

      // Find an enabled, in-month cell that is not the currently selected one
      const cells = getDayCells(fixture);
      const nonSelected = cells.find((c) => c.getAttribute('aria-selected') !== 'true');

      fireClick(nonSelected!);
      await fixture.flush();

      expect(events.length).toBe(1);
      expect(events[0].value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('emits change event when the selected day is re-clicked', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });

      const events: Array<HTMLElement & { value: string }> = [];

      fixture.element.addEventListener('change', (e) =>
        events.push(e.currentTarget as HTMLElement & { value: string }),
      );
      await open(fixture);

      const selected = getSelectedDay(fixture);

      fireClick(selected!);
      await fixture.flush();

      // Re-clicking the selected day still fires change (implementation toggles or re-selects)
      expect(events.length).toBe(1);
      expect(events[0].value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ─── Min/Max bounds ──────────────────────────────────────────────────────

  describe('Min/Max bounds', () => {
    it('marks days before min as aria-disabled', async () => {
      fixture = await mount('ore-date-picker', {
        props: { min: '2025-06-10', value: '2025-06-15' },
      });
      await open(fixture);

      const disabled = fixture.queryAll('.cal-cell-day[aria-disabled="true"]');

      expect(disabled.length).toBeGreaterThan(0);
    });

    it('marks days after max as aria-disabled', async () => {
      fixture = await mount('ore-date-picker', {
        props: { max: '2025-06-20', value: '2025-06-01' },
      });
      await open(fixture);

      const disabled = fixture.queryAll('.cal-cell-day[aria-disabled="true"]');

      expect(disabled.length).toBeGreaterThan(0);
    });

    it('does not emit change when disabled day is clicked', async () => {
      fixture = await mount('ore-date-picker', {
        props: { min: '2025-06-10', value: '2025-06-15' },
      });

      const events: Array<HTMLElement & { value: string }> = [];

      fixture.element.addEventListener('change', (e) =>
        events.push(e.currentTarget as HTMLElement & { value: string }),
      );
      await open(fixture);

      const disabled = fixture.query('.cal-cell-day[aria-disabled="true"]');

      fireClick(disabled!);
      await fixture.flush();

      expect(events.length).toBe(0);
    });
  });

  // ─── Disabled state ──────────────────────────────────────────────────────

  describe('Disabled state', () => {
    it('does not open when disabled', async () => {
      fixture = await mount('ore-date-picker', { props: { disabled: true } });
      await open(fixture);

      expect(getCalendar(fixture)).toBeNull();
    });

    it('passes disabled to trigger', async () => {
      fixture = await mount('ore-date-picker', { props: { disabled: true } });

      expect(fixture.query('ore-input[disabled]')).toBeTruthy();
    });

    it('trigger has aria-disabled when disabled', async () => {
      fixture = await mount('ore-date-picker', { props: { disabled: true } });

      expect(fixture.query('[aria-disabled="true"]')).toBeTruthy();
    });
  });

  // ─── Keyboard navigation ─────────────────────────────────────────────────

  describe('Keyboard navigation', () => {
    it('keeps one tab stop in the month and year grids', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-15' } });
      await open(fixture);

      const getTabStops = (selector: string) =>
        Array.from(fixture.shadow!.querySelectorAll<HTMLElement>(selector)).filter((cell) => cell.tabIndex === 0);

      fireClick(fixture.query('[class="cal-label-btn"]')!);
      await fixture.flush();
      expect(getTabStops('.cal-cell-month')).toHaveLength(1);

      const selectedMonth = fixture.query<HTMLElement>('.cal-cell-month[data-selected]')!;
      fireKeyDown(selectedMonth, { key: 'ArrowRight' });
      await fixture.flush();
      expect(getTabStops('.cal-cell-month')).toHaveLength(1);

      fireClick(fixture.query('[class="cal-label-btn"]')!);
      await fixture.flush();
      expect(getTabStops('.cal-cell-year')).toHaveLength(1);
    });

    it('does not consume an arrow key when the day grid has no destination', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-01' } });
      await open(fixture);
      const firstDay = fixture.query<HTMLElement>('[data-iso="2025-06-01"]')!;
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' });

      firstDay.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('does not consume modified arrow keys', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-03' } });
      await open(fixture);
      const day = fixture.query<HTMLElement>('[data-iso="2025-06-03"]')!;
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        key: 'ArrowRight',
      });

      day.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('keeps vertical navigation in the same weekday when skipping disabled days', async () => {
      fixture = await mount('ore-date-picker', {
        attrs: { value: '2025-06-03' },
      });
      await open(fixture);

      const tuesday = fixture.query<HTMLElement>('[data-iso="2025-06-03"]')!;
      fixture.query<HTMLElement>('[data-iso="2025-06-10"]')!.setAttribute('aria-disabled', 'true');

      fireKeyDown(tuesday, { key: 'ArrowDown' });
      await fixture.flush();

      expect(fixture.shadow?.activeElement).toBe(fixture.query('[data-iso="2025-06-17"]'));
    });

    it('closes calendar on Escape', async () => {
      fixture = await mount('ore-date-picker');
      await open(fixture);

      const calendar = fixture.query('.calendar[data-open]')!;

      fireKeyDown(calendar, { key: 'Escape' });
      await fixture.flush();

      expect(getCalendar(fixture)).toBeNull();
    });

    it('closes calendar on Enter with selected day', async () => {
      fixture = await mount('ore-date-picker', { props: { value: '2025-06-15' } });
      await open(fixture);

      const selected = getSelectedDay(fixture)!;

      fireKeyDown(selected, { key: 'Enter' });
      await fixture.flush();

      expect(getCalendar(fixture)).toBeNull();
    });
  });

  // ─── ARIA ────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('trigger has role=combobox', async () => {
      fixture = await mount('ore-date-picker');

      const trigger = fixture.query('ore-input.trigger');

      expect(trigger?.getAttribute('role')).toBe('combobox');
    });

    it('trigger has aria-haspopup=dialog', async () => {
      fixture = await mount('ore-date-picker');

      const trigger = fixture.query('ore-input.trigger');

      expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('trigger aria-expanded is false when closed', async () => {
      fixture = await mount('ore-date-picker');

      const trigger = fixture.query('ore-input.trigger');

      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger aria-expanded is true when open', async () => {
      fixture = await mount('ore-date-picker');
      await open(fixture);

      const trigger = fixture.query('ore-input.trigger');

      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    it('calendar has role=dialog', async () => {
      fixture = await mount('ore-date-picker');
      await open(fixture);

      const calendar = fixture.query('.calendar[data-open]');

      expect(calendar?.getAttribute('role')).toBe('dialog');
    });

    it('error is passed to trigger', async () => {
      fixture = await mount('ore-date-picker', { props: { error: 'Required' } });

      const trigger = fixture.query('ore-input.trigger');

      expect(trigger?.getAttribute('error')).toBe('Required');
    });

    it('day view wraps header + week cells in role="row" elements', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2024-03-15' } });

      await open(fixture);

      const rows = fixture.queryAll('.cal-grid-days [role="row"]');

      expect(rows.length).toBeGreaterThan(1);
      expect(rows[0]?.querySelector('[role="columnheader"]')).toBeTruthy();
      expect(rows[1]?.querySelector('[role="gridcell"]')).toBeTruthy();
    });

    it('month view wraps cells in role="row" elements', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2024-03-15' } });

      await open(fixture);
      fireClick(fixture.query('.cal-label-btn')!);
      await fixture.flush();

      const rows = fixture.queryAll('.cal-grid-months [role="row"]');

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]?.querySelectorAll('[role="gridcell"]').length).toBe(4);
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles invalid value gracefully (shows placeholder)', async () => {
      fixture = await mount('ore-date-picker', {
        props: { placeholder: 'Pick a date', value: 'not-a-date' },
      });

      const trigger = fixture.query('ore-input.trigger');

      // Invalid ISO: value attribute should not contain a valid yyyy-MM-dd date
      expect(trigger?.getAttribute('value') ?? '').not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('renders weekend-days as disabled when set', async () => {
      fixture = await mount('ore-date-picker', {
        // prop.json reads the attribute as a JSON string
        attrs: { value: '2025-06-16', 'weekend-days': '[0,6]' },
      });
      await open(fixture);

      const disabled = fixture.queryAll('.cal-cell-day[aria-disabled="true"]');

      expect(disabled.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks when closed', async () => {
      fixture = await mount('ore-date-picker', { attrs: { label: 'Pick a date', value: '2024-03-15' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks when open (calendar grid rendered)', async () => {
      fixture = await mount('ore-date-picker', { attrs: { label: 'Pick a date', value: '2024-03-15' } });

      await open(fixture);

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
