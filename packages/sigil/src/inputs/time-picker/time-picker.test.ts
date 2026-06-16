import { fire, type Fixture, mount } from '@vielzeug/craft/testing';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Open the dropdown by clicking the trigger */
async function open(fixture: Fixture<HTMLElement>): Promise<void> {
  const trigger = fixture.query('sg-input.trigger');

  fire.click(trigger!);
  await fixture.flush();
}

/** Get the visible dropdown (only present when open) */
function getDropdown(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.query('.dropdown[data-open]');
}

/** Get all options in a specific column by aria-label */
function getColumnOptions(fixture: Fixture<HTMLElement>, label: string): Element[] {
  const col = Array.from(fixture.queryAll('[role="group"]')).find((el) => el.getAttribute('aria-label') === label);

  return col ? Array.from(col.querySelectorAll('.option')) : [];
}

/** Get the selected option in a column */
function getSelected(fixture: Fixture<HTMLElement>, label: string): Element | null {
  return getColumnOptions(fixture, label).find((o) => o.getAttribute('aria-selected') === 'true') ?? null;
}

/** Click an option in a column by its text content */
function clickOption(fixture: Fixture<HTMLElement>, columnLabel: string, text: string): void {
  const option = getColumnOptions(fixture, columnLabel).find((o) => o.textContent?.trim() === text);

  if (option) fire.click(option);
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('sg-time-picker', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./time-picker');
    await import('../input/input');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a trigger (sg-input)', async () => {
      fixture = await mount('sg-time-picker');

      expect(fixture.query('sg-input.trigger')).toBeTruthy();
    });

    it('renders a closed dropdown by default', async () => {
      fixture = await mount('sg-time-picker');

      expect(getDropdown(fixture)).toBeNull();
    });

    it('renders with label prop', async () => {
      fixture = await mount('sg-time-picker', { props: { label: 'Meeting time' } });

      const input = fixture.query('sg-input.trigger');

      expect(input?.getAttribute('label')).toBe('Meeting time');
    });

    it('renders placeholder when no value', async () => {
      fixture = await mount('sg-time-picker', { props: { placeholder: 'Pick a time' } });

      const input = fixture.query('sg-input.trigger');

      expect(input?.getAttribute('placeholder')).toBe('Pick a time');
    });

    it('displays formatted time in trigger when value set (24h)', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '09:30' } });

      const input = fixture.query('sg-input.trigger');

      expect(input?.getAttribute('value')).toBe('09:30');
    });

    it('displays formatted time in trigger when value set (12h)', async () => {
      fixture = await mount('sg-time-picker', {
        props: { 'time-format': '12', value: '14:00' },
      });

      const input = fixture.query('sg-input.trigger');

      expect(input?.getAttribute('value')).toBe('02:00 PM');
    });

    it('renders hours and minutes columns when open', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      expect(getColumnOptions(fixture, 'Hours').length).toBeGreaterThan(0);
      expect(getColumnOptions(fixture, 'Minutes').length).toBeGreaterThan(0);
    });

    it('renders AM/PM column in 12h mode', async () => {
      fixture = await mount('sg-time-picker', { props: { 'time-format': '12' } });
      await open(fixture);

      expect(getColumnOptions(fixture, 'Period').length).toBe(2);
    });

    it('does not render AM/PM column in 24h mode', async () => {
      fixture = await mount('sg-time-picker', { props: { 'time-format': '24' } });
      await open(fixture);

      expect(getColumnOptions(fixture, 'Period').length).toBe(0);
    });

    it('does not render an OK button', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      expect(fixture.query('.confirm-btn')).toBeNull();
    });
  });

  // ─── Open / close ─────────────────────────────────────────────────────────

  describe('Open / close', () => {
    it('opens dropdown on trigger click', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      expect(getDropdown(fixture)).toBeTruthy();
    });

    it('closes dropdown on second trigger click', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      fire.click(fixture.query('sg-input.trigger')!);
      await fixture.flush();

      expect(getDropdown(fixture)).toBeNull();
    });

    it('closes on Escape key in dropdown', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      fire.keyDown(fixture.query('.dropdown')!, { key: 'Escape' });
      await fixture.flush();

      expect(getDropdown(fixture)).toBeNull();
    });

    it('closes on Escape key on trigger', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      fire.keyDown(fixture.query('sg-input.trigger')!, { key: 'Escape' });
      await fixture.flush();

      expect(getDropdown(fixture)).toBeNull();
    });

    it('opens on ArrowDown key on trigger', async () => {
      fixture = await mount('sg-time-picker');

      fire.keyDown(fixture.query('sg-input.trigger')!, { key: 'ArrowDown' });
      await fixture.flush();

      expect(getDropdown(fixture)).toBeTruthy();
    });

    it('does not open when disabled', async () => {
      fixture = await mount('sg-time-picker', { props: { disabled: true } });
      await open(fixture);

      expect(getDropdown(fixture)).toBeNull();
    });
  });

  // ─── Hour / minute selection ─────────────────────────────────────────────

  describe('Time selection', () => {
    it('selecting an hour highlights it as aria-selected', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      clickOption(fixture, 'Hours', '10');
      await Promise.resolve();

      const selected = getSelected(fixture, 'Hours');

      expect(selected?.textContent?.trim()).toBe('10');
    });

    it('selecting a minute commits the value immediately', async () => {
      fixture = await mount('sg-time-picker', { props: { 'minute-step': 15 } });
      await open(fixture);

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));
      clickOption(fixture, 'Minutes', '30');
      await fixture.flush();

      expect(events[0].detail.value).toMatch(/:30$/);
    });

    it('clicking a minute option emits change event immediately', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      clickOption(fixture, 'Hours', '08');
      clickOption(fixture, 'Minutes', '00');
      await fixture.flush();

      expect(events.length).toBe(1);
      expect(events[0].detail.value).toBe('08:00');
    });

    it('closes dropdown after clicking a minute option', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      clickOption(fixture, 'Minutes', '00');
      await fixture.flush();

      expect(getDropdown(fixture)).toBeNull();
    });

    it('pre-selects value when reopened', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '14:30' } });
      await open(fixture);

      expect(getSelected(fixture, 'Hours')?.textContent?.trim()).toBe('14');
      expect(getSelected(fixture, 'Minutes')?.textContent?.trim()).toBe('30');
    });
  });

  // ─── 12h mode ────────────────────────────────────────────────────────────

  describe('12h format', () => {
    it('hour options range 01–12 in 12h mode', async () => {
      fixture = await mount('sg-time-picker', { props: { 'time-format': '12' } });
      await open(fixture);

      const hours = getColumnOptions(fixture, 'Hours').map((o) => o.textContent?.trim());

      expect(hours[0]).toBe('01');
      expect(hours[hours.length - 1]).toBe('12');
      expect(hours.length).toBe(12);
    });

    it('selecting PM and hour 02 emits 14:00', async () => {
      fixture = await mount('sg-time-picker', { props: { 'time-format': '12' } });
      await open(fixture);

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      clickOption(fixture, 'Hours', '02');
      clickOption(fixture, 'Period', 'PM');
      clickOption(fixture, 'Minutes', '00');
      await fixture.flush();

      expect(events[0].detail.value).toBe('14:00');
    });

    it('selecting AM and 12 emits 00:00 (midnight)', async () => {
      fixture = await mount('sg-time-picker', { props: { 'time-format': '12' } });
      await open(fixture);

      const events: CustomEvent[] = [];

      fixture.element.addEventListener('change', (e) => events.push(e as CustomEvent));

      clickOption(fixture, 'Hours', '12');
      clickOption(fixture, 'Period', 'AM');
      clickOption(fixture, 'Minutes', '00');
      await fixture.flush();

      expect(events[0].detail.value).toBe('00:00');
    });
  });

  // ─── minute-step ─────────────────────────────────────────────────────────

  describe('minute-step', () => {
    it('generates correct minute steps', async () => {
      fixture = await mount('sg-time-picker', { props: { 'minute-step': 15 } });
      await open(fixture);

      const minutes = getColumnOptions(fixture, 'Minutes').map((o) => o.textContent?.trim());

      expect(minutes).toEqual(['00', '15', '30', '45']);
    });

    it('defaults to 5-minute step', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      const minutes = getColumnOptions(fixture, 'Minutes').map((o) => o.textContent?.trim());

      expect(minutes[0]).toBe('00');
      expect(minutes[1]).toBe('05');
      expect(minutes.length).toBe(12);
    });
  });

  // ─── min / max ────────────────────────────────────────────────────────────

  describe('min / max bounds', () => {
    it('disables hours before min time', async () => {
      fixture = await mount('sg-time-picker', { props: { min: '10:00' } });
      await open(fixture);

      const hours = getColumnOptions(fixture, 'Hours');
      const hour9 = hours.find((o) => o.textContent?.trim() === '09');

      expect(hour9?.getAttribute('data-disabled')).not.toBeNull();
    });

    it('disables hours after max time', async () => {
      fixture = await mount('sg-time-picker', { props: { max: '17:00' } });
      await open(fixture);

      const hours = getColumnOptions(fixture, 'Hours');
      const hour18 = hours.find((o) => o.textContent?.trim() === '18');

      expect(hour18?.getAttribute('data-disabled')).not.toBeNull();
    });

    it('disabled options have aria-disabled="true"', async () => {
      fixture = await mount('sg-time-picker', { props: { min: '10:00' } });
      await open(fixture);

      const hours = getColumnOptions(fixture, 'Hours');
      const hour5 = hours.find((o) => o.textContent?.trim() === '05');

      expect(hour5?.getAttribute('aria-disabled')).toBe('true');
    });
  });

  // ─── Keyboard navigation ─────────────────────────────────────────────────

  describe('Keyboard navigation', () => {
    it('ArrowDown on hour column increments pending hour', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '08:00' } });
      await open(fixture);

      const selectedOption = getSelected(fixture, 'Hours');
      const selectedBefore = selectedOption?.textContent?.trim();

      fire.keyDown(selectedOption!, { key: 'ArrowDown' });
      await fixture.flush();

      const selectedAfter = getSelected(fixture, 'Hours')?.textContent?.trim();

      expect(selectedAfter).not.toBe(selectedBefore);
    });

    it('ArrowUp on hour column decrements pending hour', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '10:00' } });
      await open(fixture);

      const selectedOption = getSelected(fixture, 'Hours');

      fire.keyDown(selectedOption!, { key: 'ArrowUp' });
      await fixture.flush();

      const selected = getSelected(fixture, 'Hours')?.textContent?.trim();

      expect(selected).toBe('09');
    });

    it('ArrowDown on period toggles AM/PM', async () => {
      fixture = await mount('sg-time-picker', {
        props: { 'time-format': '12', value: '09:00' },
      });
      await open(fixture);

      const selectedOption = getSelected(fixture, 'Period');

      fire.keyDown(selectedOption!, { key: 'ArrowDown' });
      await fixture.flush();

      const selected = getSelected(fixture, 'Period')?.textContent?.trim();

      expect(selected).toBe('PM');
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('trigger has role="combobox"', async () => {
      fixture = await mount('sg-time-picker');

      expect(fixture.query('[role="combobox"]')).toBeTruthy();
    });

    it('trigger has aria-haspopup="listbox"', async () => {
      fixture = await mount('sg-time-picker');

      expect(fixture.query('[aria-haspopup="listbox"]')).toBeTruthy();
    });

    it('trigger aria-expanded is "false" when closed', async () => {
      fixture = await mount('sg-time-picker');

      expect(fixture.query('[aria-expanded="false"]')).toBeTruthy();
    });

    it('trigger aria-expanded is "true" when open', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      expect(fixture.query('[aria-expanded="true"]')).toBeTruthy();
    });

    it('dropdown has role="listbox"', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      expect(fixture.query('[role="listbox"]')).toBeTruthy();
    });

    it('columns have role="group"', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      const groups = fixture.queryAll('[role="group"]');

      expect(groups.length).toBeGreaterThanOrEqual(2);
    });

    it('options have role="option"', async () => {
      fixture = await mount('sg-time-picker');
      await open(fixture);

      const options = fixture.queryAll('[role="option"]');

      expect(options.length).toBeGreaterThan(0);
    });

    it('selected option has aria-selected="true"', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '09:00' } });
      await open(fixture);

      expect(fixture.query('[aria-selected="true"]')).toBeTruthy();
    });

    it('trigger has aria-controls pointing to dropdown', async () => {
      fixture = await mount('sg-time-picker');

      const trigger = fixture.query('[role="combobox"]');
      const controls = trigger?.getAttribute('aria-controls');
      const dropdown = fixture.query('.dropdown');

      expect(controls).toBeTruthy();
      expect(dropdown?.getAttribute('id')).toBe(controls);
    });

    it('trigger has aria-disabled="true" when disabled', async () => {
      fixture = await mount('sg-time-picker', { props: { disabled: true } });

      expect(fixture.query('[aria-disabled="true"]')).toBeTruthy();
    });

    it('non-selected options have tabindex="-1"', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '08:00' } });
      await open(fixture);

      const hours = getColumnOptions(fixture, 'Hours');
      const hour9 = hours.find((o) => o.textContent?.trim() === '09');

      expect(hour9?.getAttribute('tabindex')).toBe('-1');
    });

    it('selected option has tabindex="0"', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '08:00' } });
      await open(fixture);

      const hours = getColumnOptions(fixture, 'Hours');
      const hour8 = hours.find((o) => o.textContent?.trim() === '08');

      expect(hour8?.getAttribute('tabindex')).toBe('0');
    });
  });

  // ─── Disabled state ───────────────────────────────────────────────────────

  describe('Disabled state', () => {
    it('does not open when disabled', async () => {
      fixture = await mount('sg-time-picker', { props: { disabled: true } });
      await open(fixture);

      expect(getDropdown(fixture)).toBeNull();
    });

    it('passes disabled attribute to sg-input trigger', async () => {
      fixture = await mount('sg-time-picker', { props: { disabled: true } });

      expect(fixture.query('sg-input[disabled]')).toBeTruthy();
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles invalid value prop gracefully (shows placeholder)', async () => {
      fixture = await mount('sg-time-picker', {
        props: { placeholder: 'Pick a time', value: 'not-a-time' },
      });

      const input = fixture.query('sg-input.trigger');

      expect(input?.getAttribute('value')).toBe('Pick a time');
    });

    it('wraps hour selection from last to first (ArrowDown)', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '23:00' } });
      await open(fixture);

      const selectedOption = getSelected(fixture, 'Hours');

      fire.keyDown(selectedOption!, { key: 'ArrowDown' });
      await fixture.flush();

      const selected = getSelected(fixture, 'Hours')?.textContent?.trim();

      expect(selected).toBe('00');
    });

    it('wraps hour selection from first to last (ArrowUp)', async () => {
      fixture = await mount('sg-time-picker', { props: { value: '00:00' } });
      await open(fixture);

      const selectedOption = getSelected(fixture, 'Hours');

      fire.keyDown(selectedOption!, { key: 'ArrowUp' });
      await fixture.flush();

      const selected = getSelected(fixture, 'Hours')?.textContent?.trim();

      expect(selected).toBe('23');
    });

    it('minute-step of 1 produces 60 options', async () => {
      fixture = await mount('sg-time-picker', { props: { 'minute-step': 1 } });
      await open(fixture);

      expect(getColumnOptions(fixture, 'Minutes').length).toBe(60);
    });

    it('24h mode produces 24 hour options', async () => {
      fixture = await mount('sg-time-picker', { props: { 'time-format': '24' } });
      await open(fixture);

      expect(getColumnOptions(fixture, 'Hours').length).toBe(24);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks when closed', async () => {
      fixture = await mount('sg-time-picker', { attrs: { label: 'Pick a time' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
