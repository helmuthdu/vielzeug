import { type Fixture, mount, user } from '@vielzeug/ore/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('ore-date-picker', () => {
  let fixture: Fixture<HTMLElement>;

  // Shorthand: query inside ore-date-picker's own shadow root
  const shadow = () => fixture.element.shadowRoot!;
  const sq = <T extends Element = Element>(sel: string) => shadow().querySelector<T>(sel);

  // Query inside ore-input's shadow root (the trigger)
  const triggerShadow = () => shadow().querySelector('ore-input.trigger')?.shadowRoot ?? null;
  const tq = <T extends Element = Element>(sel: string) => triggerShadow()?.querySelector<T>(sel) ?? null;

  beforeAll(async () => {
    await import('../date-picker/date-picker');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the ore-input trigger element', async () => {
      fixture = await mount('ore-date-picker');

      expect(sq('ore-input.trigger')).toBeTruthy();
    });

    it('renders the calendar panel (hidden by default)', async () => {
      fixture = await mount('ore-date-picker');

      expect(sq('.calendar')).toBeTruthy();
      expect(sq('.calendar[data-open]')).toBeFalsy();
    });

    it('shows placeholder when no value is set', async () => {
      fixture = await mount('ore-date-picker', { attrs: { placeholder: 'Select a date' } });
      await fixture.flush();

      const input = tq<HTMLInputElement>('input');

      expect(input?.placeholder).toBe('Select a date');
    });

    it('shows formatted date when value is set', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-15' } });
      await fixture.flush();

      const input = tq<HTMLInputElement>('input');

      expect(input?.value).toBeTruthy();
    });

    it('renders label when label prop is set', async () => {
      fixture = await mount('ore-date-picker', { attrs: { label: 'Appointment date' } });
      await fixture.flush();

      expect(tq('.label')?.textContent?.trim()).toBe('Appointment date');
    });

    it('renders helper text', async () => {
      fixture = await mount('ore-date-picker', { attrs: { helper: 'Choose a weekday' } });
      await fixture.flush();

      const helperEl = tq('.helper-text:not([hidden])') ?? tq('[part="helper"]');

      expect(helperEl?.textContent?.trim()).toBe('Choose a weekday');
    });

    it('renders error message', async () => {
      fixture = await mount('ore-date-picker', { attrs: { error: 'Date is required' } });
      await fixture.flush();

      const errorEl = tq('[part="error"]') ?? tq('.helper-text[role="alert"]');

      expect(errorEl?.textContent?.trim()).toBe('Date is required');
    });
  });

  // ── Open / close ─────────────────────────────────────────────────────────

  describe('Open / Close', () => {
    it('opens the calendar when the trigger is clicked', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      expect(sq('.calendar[data-open]')).toBeTruthy();
    });

    it('closes the calendar when the trigger is clicked again', async () => {
      fixture = await mount('ore-date-picker');

      const trigger = sq<HTMLElement>('ore-input.trigger')!;

      await user.click(trigger);
      await user.click(trigger);

      expect(sq('.calendar[data-open]')).toBeFalsy();
    });

    it('opens on Enter key on the trigger', async () => {
      fixture = await mount('ore-date-picker');

      await user.press(sq<HTMLElement>('ore-input.trigger')!, 'Enter');

      expect(sq('.calendar[data-open]')).toBeTruthy();
    });

    it('opens on Space key on the trigger', async () => {
      fixture = await mount('ore-date-picker');

      await user.press(sq<HTMLElement>('ore-input.trigger')!, ' ');

      expect(sq('.calendar[data-open]')).toBeTruthy();
    });

    it('closes on Escape key when calendar is open', async () => {
      fixture = await mount('ore-date-picker');

      const trigger = sq<HTMLElement>('ore-input.trigger')!;

      await user.click(trigger);
      expect(sq('.calendar[data-open]')).toBeTruthy();

      await user.press(trigger, 'Escape');

      expect(sq('.calendar[data-open]')).toBeFalsy();
    });
  });

  // ── ARIA ─────────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('trigger has role="combobox"', async () => {
      fixture = await mount('ore-date-picker');

      expect(sq('ore-input.trigger')?.getAttribute('role')).toBe('combobox');
    });

    it('trigger has aria-haspopup="dialog"', async () => {
      fixture = await mount('ore-date-picker');

      expect(sq('ore-input.trigger')?.getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('aria-expanded is false when closed', async () => {
      fixture = await mount('ore-date-picker');

      expect(sq('ore-input.trigger')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('aria-expanded is true when open', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      expect(sq('ore-input.trigger')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('calendar has role="dialog"', async () => {
      fixture = await mount('ore-date-picker');

      expect(sq('.calendar')?.getAttribute('role')).toBe('dialog');
    });

    it('day cells have role="gridcell"', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const cells = sq('.cal-grid-days')?.querySelectorAll('[role="gridcell"]');

      expect(cells?.length).toBeGreaterThan(0);
    });

    it('day grid has role="grid"', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      expect(sq('.cal-grid-days')?.getAttribute('role')).toBe('grid');
    });

    it('aria-disabled is set on the trigger when disabled', async () => {
      fixture = await mount('ore-date-picker', { attrs: { disabled: '' } });

      expect(sq('ore-input.trigger')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('aria-invalid is set on the inner input when error prop is provided', async () => {
      fixture = await mount('ore-date-picker', { attrs: { error: 'Required' } });
      await fixture.flush();

      // ore-input reflects aria-invalid on its inner <input>, not on the host
      expect(tq<HTMLInputElement>('input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('today cell has aria-current="date"', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const todayCell = sq('[aria-current="date"]');

      expect(todayCell).toBeTruthy();
    });

    it('weekday headers have role="columnheader"', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const headers = sq('.cal-grid-days')?.querySelectorAll('[role="columnheader"]');

      expect(headers?.length).toBe(7);
    });
  });

  // ── Date selection ────────────────────────────────────────────────────────

  describe('Date selection', () => {
    it('selects a day and closes the calendar', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-01' } });

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const cells = [...(sq('.cal-grid-days')?.querySelectorAll<HTMLElement>('.cal-cell-day') ?? [])];
      const june15 = cells.find((c) => c.dataset['iso'] === '2025-06-15');

      expect(june15).toBeTruthy();
      await user.click(june15!);

      expect(sq('.calendar[data-open]')).toBeFalsy();
    });

    it('fires change event with correct value after day selection', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-06-01' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const cells = [...(sq('.cal-grid-days')?.querySelectorAll<HTMLElement>('.cal-cell-day') ?? [])];
      const june15 = cells.find((c) => c.dataset['iso'] === '2025-06-15');

      await user.click(june15!);

      expect(handler).toHaveBeenCalled();

      const detail = (handler.mock.calls[0]?.[0] as CustomEvent).detail;

      expect(detail.isoValue).toBe('2025-06-15');
    });

    it('does not fire change when a disabled day is clicked', async () => {
      fixture = await mount('ore-date-picker', { attrs: { max: '2025-06-10', value: '2025-06-01' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const cells = [...(sq('.cal-grid-days')?.querySelectorAll<HTMLElement>('.cal-cell-day') ?? [])];
      const disabledCell = cells.find((c) => c.dataset['disabled'] === '');

      if (disabledCell) {
        await user.click(disabledCell);
        expect(handler).not.toHaveBeenCalled();
      }
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  describe('Calendar navigation', () => {
    it('renders previous and next navigation buttons', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      expect(sq('[aria-label="Previous"]')).toBeTruthy();
      expect(sq('[aria-label="Next"]')).toBeTruthy();
    });

    it('clicking Next changes the displayed month label', async () => {
      fixture = await mount('ore-date-picker', { attrs: { value: '2025-01-01' } });

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      const labelBefore = sq<HTMLElement>('.cal-label-btn')?.textContent?.trim();

      await user.click(sq<HTMLElement>('[aria-label="Next"]')!);
      await fixture.flush();

      const labelAfter = sq<HTMLElement>('.cal-label-btn')?.textContent?.trim();

      expect(labelAfter).not.toBe(labelBefore);
    });

    it('clicking header label switches to month view', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);
      await user.click(sq<HTMLElement>('.cal-label-btn')!);

      expect(sq('.cal-grid-months:not([hidden])')).toBeTruthy();
    });

    it('clicking a month in month view switches to day view', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);
      await user.click(sq<HTMLElement>('.cal-label-btn')!);

      const monthCell = sq<HTMLElement>('.cal-cell-month:not([data-disabled])');

      expect(monthCell).toBeTruthy();
      await user.click(monthCell!);

      expect(sq('.cal-grid-days:not([hidden])')).toBeTruthy();
    });

    it('clicking header label twice switches to year view', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);
      await user.click(sq<HTMLElement>('.cal-label-btn')!);
      await user.click(sq<HTMLElement>('.cal-label-btn')!);

      expect(sq('.cal-grid-years:not([hidden])')).toBeTruthy();
    });
  });

  // ── Props ─────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('does not open when disabled', async () => {
      fixture = await mount('ore-date-picker', { attrs: { disabled: '' } });

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      expect(sq('.calendar[data-open]')).toBeFalsy();
    });

    it('reflects open state as host attribute', async () => {
      fixture = await mount('ore-date-picker');

      await user.click(sq<HTMLElement>('ore-input.trigger')!);

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('passes error to ore-input', async () => {
      fixture = await mount('ore-date-picker', { attrs: { error: 'Required' } });
      await fixture.flush();

      expect(sq('ore-input.trigger')?.getAttribute('error')).toBe('Required');
    });
  });
});
