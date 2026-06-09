import { fire, type Fixture, mount } from '@vielzeug/craft/testing';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function open(fixture: Fixture<HTMLElement>): Promise<void> {
  const trigger = fixture.query('sg-input.trigger');

  fire.click(trigger!);
  await fixture.flush();
}

function getCalendar(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('.calendar[data-open]');
}

function getDayCells(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.day-cell:not([aria-disabled="true"])'));
}

function getSelectedDay(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('[aria-selected="true"]');
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('sg-date-picker', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./date-picker');
    await import('../input/input');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a trigger (sg-input)', async () => {
      fixture = await mount('sg-date-picker');

      expect(fixture.query('sg-input.trigger')).toBeTruthy();
    });

    it('calendar is closed by default', async () => {
      fixture = await mount('sg-date-picker');

      expect(getCalendar(fixture)).toBeNull();
    });

    it('opens calendar on trigger click', async () => {
      fixture = await mount('sg-date-picker');
      await open(fixture);

      expect(getCalendar(fixture)).toBeTruthy();
    });

    it('passes label to trigger', async () => {
      fixture = await mount('sg-date-picker', { props: { label: 'Birthday' } });

      expect(fixture.query('sg-input.trigger')?.getAttribute('label')).toBe('Birthday');
    });

    it('passes placeholder to trigger', async () => {
      fixture = await mount('sg-date-picker', { props: { placeholder: 'Select date' } });

      expect(fixture.query('sg-input.trigger')?.getAttribute('placeholder')).toBe('Select date');
    });
  });

  // ─── Value / display ─────────────────────────────────────────────────────

  describe('Value handling', () => {
    it('displays formatted date in trigger when value is set', async () => {
      fixture = await mount('sg-date-picker', { props: { value: '2025-06-15' } });

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('value')).toBeTruthy();
      expect(trigger?.getAttribute('value')).not.toBe('');
    });

    it('shows placeholder when no value is set', async () => {
      fixture = await mount('sg-date-picker', { props: { placeholder: 'Pick date' } });

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('value')).toBeFalsy();
      expect(trigger?.getAttribute('placeholder')).toBe('Pick date');
    });

    it('marks the initial value as selected in the day grid', async () => {
      fixture = await mount('sg-date-picker', { props: { value: '2025-06-15' } });
      await open(fixture);

      expect(getSelectedDay(fixture)).toBeTruthy();
    });

    it('emits change event when a day cell is clicked', async () => {
      fixture = await mount('sg-date-picker', { props: { value: '2025-06-01' } });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));
      await open(fixture);

      const cells = getDayCells(fixture);
      const firstCell = cells[0];

      fire.click(firstCell!);
      await fixture.flush();

      expect(events.length).toBe(1);
      expect(events[0].detail).toHaveProperty('isoValue');
    });

    it('emits change event with null isoValue when day is cleared', async () => {
      fixture = await mount('sg-date-picker', { props: { value: '2025-06-15' } });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));
      await open(fixture);

      const selected = getSelectedDay(fixture);

      fire.click(selected!);
      await fixture.flush();

      expect(events.length).toBe(1);
      expect(events[0].detail.isoValue).toBeNull();
    });
  });

  // ─── Min/Max bounds ──────────────────────────────────────────────────────

  describe('Min/Max bounds', () => {
    it('marks days before min as aria-disabled', async () => {
      fixture = await mount('sg-date-picker', {
        props: { min: '2025-06-10', value: '2025-06-15' },
      });
      await open(fixture);

      const disabled = fixture.queryAll('.day-cell[aria-disabled="true"]');

      expect(disabled.length).toBeGreaterThan(0);
    });

    it('marks days after max as aria-disabled', async () => {
      fixture = await mount('sg-date-picker', {
        props: { max: '2025-06-20', value: '2025-06-01' },
      });
      await open(fixture);

      const disabled = fixture.queryAll('.day-cell[aria-disabled="true"]');

      expect(disabled.length).toBeGreaterThan(0);
    });

    it('does not emit change when disabled day is clicked', async () => {
      fixture = await mount('sg-date-picker', {
        props: { min: '2025-06-10', value: '2025-06-15' },
      });

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));
      await open(fixture);

      const disabled = fixture.query('.day-cell[aria-disabled="true"]');

      fire.click(disabled!);
      await fixture.flush();

      expect(events.length).toBe(0);
    });
  });

  // ─── Disabled state ──────────────────────────────────────────────────────

  describe('Disabled state', () => {
    it('does not open when disabled', async () => {
      fixture = await mount('sg-date-picker', { props: { disabled: true } });
      await open(fixture);

      expect(getCalendar(fixture)).toBeNull();
    });

    it('passes disabled to trigger', async () => {
      fixture = await mount('sg-date-picker', { props: { disabled: true } });

      expect(fixture.query('sg-input[disabled]')).toBeTruthy();
    });

    it('trigger has aria-disabled when disabled', async () => {
      fixture = await mount('sg-date-picker', { props: { disabled: true } });

      expect(fixture.query('[aria-disabled="true"]')).toBeTruthy();
    });
  });

  // ─── Keyboard navigation ─────────────────────────────────────────────────

  describe('Keyboard navigation', () => {
    it('closes calendar on Escape', async () => {
      fixture = await mount('sg-date-picker');
      await open(fixture);

      const calendar = fixture.query('.calendar[data-open]')!;

      fire.keyDown(calendar, { key: 'Escape' });
      await fixture.flush();

      expect(getCalendar(fixture)).toBeNull();
    });

    it('closes calendar on Enter with selected day', async () => {
      fixture = await mount('sg-date-picker', { props: { value: '2025-06-15' } });
      await open(fixture);

      const selected = getSelectedDay(fixture)!;

      fire.keyDown(selected, { key: 'Enter' });
      await fixture.flush();

      expect(getCalendar(fixture)).toBeNull();
    });
  });

  // ─── ARIA ────────────────────────────────────────────────────────────────

  describe('ARIA', () => {
    it('trigger has role=combobox', async () => {
      fixture = await mount('sg-date-picker');

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('role')).toBe('combobox');
    });

    it('trigger has aria-haspopup=dialog', async () => {
      fixture = await mount('sg-date-picker');

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('trigger aria-expanded is false when closed', async () => {
      fixture = await mount('sg-date-picker');

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger aria-expanded is true when open', async () => {
      fixture = await mount('sg-date-picker');
      await open(fixture);

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    it('calendar has role=dialog', async () => {
      fixture = await mount('sg-date-picker');
      await open(fixture);

      const calendar = fixture.query('.calendar[data-open]');

      expect(calendar?.getAttribute('role')).toBe('dialog');
    });

    it('error is passed to trigger', async () => {
      fixture = await mount('sg-date-picker', { props: { error: 'Required' } });

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('error')).toBe('Required');
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles invalid value gracefully (shows placeholder)', async () => {
      fixture = await mount('sg-date-picker', {
        props: { placeholder: 'Pick a date', value: 'not-a-date' },
      });

      const trigger = fixture.query('sg-input.trigger');

      expect(trigger?.getAttribute('value') ?? '').toBeFalsy();
    });

    it('renders weekend-days as disabled when set', async () => {
      fixture = await mount('sg-date-picker', {
        props: { value: '2025-06-16', 'weekend-days': [0, 6] },
      });
      await open(fixture);

      const disabled = fixture.queryAll('.day-cell[aria-disabled="true"]');

      expect(disabled.length).toBeGreaterThan(0);
    });
  });
});
