import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';
import { COUNTER_HOLD_DELAY_MS, COUNTER_HOLD_REPEAT_MS, type OreCounterChangeDetail } from './counter';

const getDecrement = (fixture: Fixture<HTMLElement>) => fixture.query<HTMLButtonElement>('[part="decrement-btn"]');
const getIncrement = (fixture: Fixture<HTMLElement>) => fixture.query<HTMLButtonElement>('[part="increment-btn"]');
const getValue = (fixture: Fixture<HTMLElement>) => fixture.query<HTMLOutputElement>('[part="value"]');
const getDecrementLarge = (fixture: Fixture<HTMLElement>) =>
  fixture.query<HTMLButtonElement>('[part="decrement-large-btn"]');
const getIncrementLarge = (fixture: Fixture<HTMLElement>) =>
  fixture.query<HTMLButtonElement>('[part="increment-large-btn"]');
const valueText = (fixture: Fixture<HTMLElement>) => getValue(fixture)?.textContent?.trim();

const pointerInit: PointerEventInit = { bubbles: true, button: 0, composed: true, isPrimary: true, pointerId: 1 };

const listenChanges = (fixture: Fixture<HTMLElement>): OreCounterChangeDetail[] => {
  const details: OreCounterChangeDetail[] = [];

  fixture.element.addEventListener('change', (e) => {
    details.push((e as CustomEvent<OreCounterChangeDetail>).detail);
  });

  return details;
};

describe('ore-counter', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./counter'))();
  });

  afterEach(() => {
    fixture?.dispose();
    vi.useRealTimers();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders label, value and both buttons', async () => {
      fixture = await mount('ore-counter', { attrs: { label: 'Stamina', value: 3 } });
      await fixture.flush();

      expect(fixture.query('[part="label"]')?.textContent?.trim()).toBe('Stamina');
      expect(valueText(fixture)).toBe('3');
      expect(getDecrement(fixture)).toBeTruthy();
      expect(getIncrement(fixture)).toBeTruthy();
    });

    it('defaults to 0 and reflects the size attribute on the host', async () => {
      fixture = await mount('ore-counter', { attrs: { size: 'lg' } });
      await fixture.flush();

      expect(valueText(fixture)).toBe('0');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('renders the hint attribute and hides it when absent', async () => {
      fixture = await mount('ore-counter', { attrs: { hint: 'Pay for actions' } });
      await fixture.flush();

      const hint = fixture.query<HTMLElement>('[part="hint"]');

      expect(hint?.hidden).toBe(false);
      expect(hint?.textContent?.trim()).toBe('Pay for actions');

      await fixture.attr('hint', false);
      expect(fixture.query<HTMLElement>('[part="hint"]')?.hidden).toBe(true);
    });

    it('exposes icon and hint slots', async () => {
      fixture = await mount('ore-counter', { html: '<span slot="icon">★</span><span slot="hint">Custom</span>' });
      await fixture.flush();

      expect(fixture.query('slot[name="icon"]')).toBeTruthy();
      expect(fixture.query('slot[name="hint"]')).toBeTruthy();
    });
  });

  // ─── Increment / decrement ───────────────────────────────────────────────────
  describe('Stepping', () => {
    it('increments and decrements by step and emits change with delta', async () => {
      fixture = await mount('ore-counter', { attrs: { value: 2 } });
      await fixture.flush();
      const changes = listenChanges(fixture);

      fireClick(getIncrement(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('3');
      expect(fixture.element.getAttribute('value')).toBe('3');

      fireClick(getDecrement(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('2');

      expect(changes).toEqual([
        { delta: 1, value: 3 },
        { delta: -1, value: 2 },
      ]);
    });

    it('respects a custom step', async () => {
      fixture = await mount('ore-counter', { attrs: { step: 5, value: 10 } });
      await fixture.flush();

      fireClick(getIncrement(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('15');
    });

    it('clamps at min (default 0) and disables the decrement button there', async () => {
      fixture = await mount('ore-counter', { attrs: { value: 0 } });
      await fixture.flush();
      const changes = listenChanges(fixture);

      expect(getDecrement(fixture)?.disabled).toBe(true);
      fireClick(getDecrement(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('0');
      expect(changes).toEqual([]);
    });

    it('clamps at max and disables the increment button there', async () => {
      fixture = await mount('ore-counter', { attrs: { max: 2, value: 1 } });
      await fixture.flush();

      fireClick(getIncrement(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('2');
      expect(getIncrement(fixture)?.disabled).toBe(true);

      fireClick(getIncrement(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('2');
    });

    it('follows external value changes', async () => {
      fixture = await mount('ore-counter', { attrs: { value: 1 } });
      await fixture.flush();

      await fixture.attr('value', 7);
      expect(valueText(fixture)).toBe('7');
      expect(getValue(fixture)?.getAttribute('aria-valuenow')).toBe('7');
    });
  });

  // ─── Quick steps ─────────────────────────────────────────────────────────────
  describe('Quick steps', () => {
    it('hides the quick-step buttons by default', async () => {
      fixture = await mount('ore-counter', { attrs: { value: 2 } });
      await fixture.flush();

      expect(getIncrementLarge(fixture)?.hidden).toBe(true);
      expect(getDecrementLarge(fixture)?.hidden).toBe(true);
    });

    it('moves by large-step, labels the buttons with the amount and emits the delta', async () => {
      fixture = await mount('ore-counter', {
        attrs: { label: 'Damage', 'large-step': 5, 'quick-steps': true, value: 12 },
      });
      await fixture.flush();
      const changes = listenChanges(fixture);
      const inc = getIncrementLarge(fixture)!;
      const dec = getDecrementLarge(fixture)!;

      expect(inc.hidden).toBe(false);
      expect(inc.textContent?.trim()).toBe('+5');
      expect(dec.textContent?.trim()).toBe('−5');
      expect(inc.getAttribute('aria-label')).toBe('Increase Damage by 5');

      fireClick(inc);
      await fixture.flush();
      fireClick(dec);
      await fixture.flush();
      fireClick(dec);
      await fixture.flush();

      expect(valueText(fixture)).toBe('7');
      expect(changes).toEqual([
        { delta: 5, value: 17 },
        { delta: -5, value: 12 },
        { delta: -5, value: 7 },
      ]);
    });

    it('defaults large-step to 10 × step and clamps at the bounds', async () => {
      fixture = await mount('ore-counter', { attrs: { max: 15, 'quick-steps': true, value: 8 } });
      await fixture.flush();

      expect(getIncrementLarge(fixture)?.textContent?.trim()).toBe('+10');

      fireClick(getIncrementLarge(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('15');
      expect(getIncrementLarge(fixture)?.disabled).toBe(true);

      fireClick(getDecrementLarge(fixture)!);
      await fixture.flush();
      expect(valueText(fixture)).toBe('5');
    });

    it('stays hidden while readonly', async () => {
      fixture = await mount('ore-counter', { attrs: { 'quick-steps': true, readonly: true, value: 4 } });
      await fixture.flush();

      expect(getIncrementLarge(fixture)?.hidden).toBe(true);
    });
  });

  // ─── Press and hold ──────────────────────────────────────────────────────────
  describe('Press and hold', () => {
    it('auto-repeats while the increment button is held and ignores the trailing click', async () => {
      fixture = await mount('ore-counter', { attrs: { value: 0 } });
      await fixture.flush();
      vi.useFakeTimers();
      const increment = getIncrement(fixture)!;
      const changes = listenChanges(fixture);

      increment.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
      vi.advanceTimersByTime(COUNTER_HOLD_DELAY_MS);
      expect(changes.length).toBe(1);

      vi.advanceTimersByTime(COUNTER_HOLD_REPEAT_MS * 3);
      expect(changes.length).toBe(4);

      increment.dispatchEvent(new PointerEvent('pointerup', pointerInit));
      fireClick(increment);
      vi.advanceTimersByTime(COUNTER_HOLD_REPEAT_MS * 3);
      expect(changes.length).toBe(4);
    });

    it('does not repeat when released before the hold delay', async () => {
      fixture = await mount('ore-counter', { attrs: { value: 0 } });
      await fixture.flush();
      vi.useFakeTimers();
      const increment = getIncrement(fixture)!;
      const changes = listenChanges(fixture);

      increment.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
      vi.advanceTimersByTime(COUNTER_HOLD_DELAY_MS / 2);
      increment.dispatchEvent(new PointerEvent('pointerup', pointerInit));
      fireClick(increment);
      vi.advanceTimersByTime(COUNTER_HOLD_DELAY_MS * 2);

      expect(changes.map((c) => c.value)).toEqual([1]);
    });

    it('stops repeating at max', async () => {
      fixture = await mount('ore-counter', { attrs: { max: 2, value: 0 } });
      await fixture.flush();
      vi.useFakeTimers();
      const increment = getIncrement(fixture)!;
      const changes = listenChanges(fixture);

      increment.dispatchEvent(new PointerEvent('pointerdown', pointerInit));
      vi.advanceTimersByTime(COUNTER_HOLD_DELAY_MS + COUNTER_HOLD_REPEAT_MS * 10);
      increment.dispatchEvent(new PointerEvent('pointerup', pointerInit));

      expect(changes.map((c) => c.value)).toEqual([1, 2]);
    });
  });

  // ─── Keyboard ────────────────────────────────────────────────────────────────
  describe('Keyboard', () => {
    it('supports Arrow, Home/End and Page keys on the value', async () => {
      fixture = await mount('ore-counter', { attrs: { 'large-step': 5, max: 20, value: 3 } });
      await fixture.flush();
      const value = getValue(fixture)!;

      fireKeyDown(value, { key: 'ArrowUp' });
      await fixture.flush();
      expect(valueText(fixture)).toBe('4');

      fireKeyDown(value, { key: 'ArrowDown' });
      await fixture.flush();
      expect(valueText(fixture)).toBe('3');

      fireKeyDown(value, { key: 'PageUp' });
      await fixture.flush();
      expect(valueText(fixture)).toBe('8');

      fireKeyDown(value, { key: 'End' });
      await fixture.flush();
      expect(valueText(fixture)).toBe('20');

      fireKeyDown(value, { key: 'Home' });
      await fixture.flush();
      expect(valueText(fixture)).toBe('0');
    });
  });

  // ─── Disabled / readonly ─────────────────────────────────────────────────────
  describe('Disabled and readonly', () => {
    it('ignores clicks and keyboard while disabled', async () => {
      fixture = await mount('ore-counter', { attrs: { disabled: true, value: 2 } });
      await fixture.flush();
      const changes = listenChanges(fixture);

      expect(getIncrement(fixture)?.disabled).toBe(true);
      expect(getValue(fixture)?.getAttribute('tabindex')).toBe('-1');
      fireClick(getIncrement(fixture)!);
      fireKeyDown(getValue(fixture)!, { key: 'ArrowUp' });
      await fixture.flush();

      expect(valueText(fixture)).toBe('2');
      expect(changes).toEqual([]);
    });

    it('hides the buttons and blocks changes while readonly', async () => {
      fixture = await mount('ore-counter', { attrs: { readonly: true, value: 4 } });
      await fixture.flush();

      expect(getIncrement(fixture)?.hidden).toBe(true);
      expect(getDecrement(fixture)?.hidden).toBe(true);
      expect(getValue(fixture)?.getAttribute('aria-readonly')).toBe('true');

      fireKeyDown(getValue(fixture)!, { key: 'ArrowUp' });
      await fixture.flush();
      expect(valueText(fixture)).toBe('4');
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('exposes spinbutton semantics tied to the label and hint', async () => {
      fixture = await mount('ore-counter', {
        attrs: { hint: 'Discard after check', label: 'Defense', max: 9, value: 1 },
      });
      await fixture.flush();

      const value = getValue(fixture)!;
      const labelId = fixture.query('[part="label"]')?.id;
      const hintId = fixture.query('[part="hint"]')?.id;

      expect(value.getAttribute('role')).toBe('spinbutton');
      expect(value.getAttribute('aria-live')).toBe('polite');
      expect(value.getAttribute('aria-valuenow')).toBe('1');
      expect(value.getAttribute('aria-valuemin')).toBe('0');
      expect(value.getAttribute('aria-valuemax')).toBe('9');
      expect(value.getAttribute('aria-labelledby')).toBe(labelId);
      expect(value.getAttribute('aria-describedby')).toBe(hintId);
      expect(fixture.query('[part="counter"]')?.getAttribute('aria-labelledby')).toBe(labelId);
    });

    it('names the buttons after the label', async () => {
      fixture = await mount('ore-counter', { attrs: { label: 'Strain' } });
      await fixture.flush();

      expect(getDecrement(fixture)?.getAttribute('aria-label')).toBe('Decrease Strain');
      expect(getIncrement(fixture)?.getAttribute('aria-label')).toBe('Increase Strain');
    });
  });
});
