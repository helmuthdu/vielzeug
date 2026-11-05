import { fireClick, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';
import type { ChoiceChangeDetail } from '../../core';
import type { OreColorPickerOption } from './color-picker';

const OPTIONS: OreColorPickerOption[] = [
  { color: '#19202b', label: 'Midnight Black', value: 'midnight' },
  { color: '#f2efe9', label: 'Pearl White', value: 'pearl' },
  { color: '#7a1f2b', label: 'Crimson', value: 'crimson' },
];

describe('ore-color-picker', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./color-picker'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const mountPicker = (
    options: OreColorPickerOption[] = OPTIONS,
    attrs: Record<string, string | number | boolean> = {},
  ): Promise<Fixture<HTMLElement>> =>
    mount('ore-color-picker', { attrs: { label: 'Paint', ...attrs }, props: { options } });

  const swatches = (): HTMLButtonElement[] => [
    ...(fixture.shadow?.querySelectorAll<HTMLButtonElement>('[data-swatch]') ?? []),
  ];

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a radiogroup with one swatch per option', async () => {
      fixture = await mountPicker();

      expect(fixture.query('[role="radiogroup"]')).toBeTruthy();
      expect(swatches().length).toBe(3);
      expect(fixture.shadow?.querySelectorAll('[part="swatch"]').length).toBe(3);
    });

    it('renders the legend label and hides it without one', async () => {
      fixture = await mountPicker();

      expect(fixture.query('legend')?.textContent).toContain('Paint');

      await fixture.attr('label', '');
      expect(fixture.query('legend')?.hasAttribute('hidden')).toBe(true);
    });

    it('paints each swatch color through the inline custom property', async () => {
      fixture = await mountPicker();

      expect(swatches()[0]?.style.getPropertyValue('--_swatch-color')).toBe('#19202b');
    });

    it('labels each swatch with its option label', async () => {
      fixture = await mountPicker();

      expect(swatches()[1]?.getAttribute('aria-label')).toBe('Pearl White');
    });

    it('falls back to the color as label when no label is given', async () => {
      fixture = await mountPicker([{ color: '#ff0000' }]);

      expect(swatches()[0]?.getAttribute('aria-label')).toBe('#ff0000');
    });

    it('renders nothing for missing options', async () => {
      fixture = await mount('ore-color-picker');

      expect(swatches().length).toBe(0);
    });
  });

  // ─── Selection ───────────────────────────────────────────────────────────────

  describe('Selection', () => {
    it('marks the value-provided option as checked', async () => {
      fixture = await mountPicker(OPTIONS, { value: 'pearl' });

      expect(swatches()[1]?.getAttribute('aria-checked')).toBe('true');
      expect(swatches()[0]?.getAttribute('aria-checked')).toBe('false');
    });

    it('selects on click and emits change with labels and values', async () => {
      fixture = await mountPicker();
      const changes: ChoiceChangeDetail[] = [];
      fixture.element.addEventListener('change', (event) =>
        changes.push((event as CustomEvent<ChoiceChangeDetail>).detail),
      );

      fireClick(swatches()[2]!);
      await fixture.flush();

      expect(changes).toEqual([{ labels: ['Crimson'], originalEvent: expect.any(Event), values: ['crimson'] }]);
      expect(swatches()[2]?.getAttribute('aria-checked')).toBe('true');
    });

    it('does not emit change when the selected swatch is clicked again', async () => {
      fixture = await mountPicker(OPTIONS, { value: 'pearl' });
      const changes: ChoiceChangeDetail[] = [];
      fixture.element.addEventListener('change', (event) =>
        changes.push((event as CustomEvent<ChoiceChangeDetail>).detail),
      );

      fireClick(swatches()[1]!);

      expect(changes).toHaveLength(0);
    });

    it('reflects the selection into the value attribute', async () => {
      fixture = await mountPicker();

      fireClick(swatches()[0]!);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('midnight');
    });

    it('honors an external value change over the picked selection', async () => {
      fixture = await mountPicker();

      fireClick(swatches()[0]!);
      await fixture.flush();

      await fixture.attr('value', 'crimson');

      expect(swatches()[2]?.getAttribute('aria-checked')).toBe('true');
      expect(swatches()[0]?.getAttribute('aria-checked')).toBe('false');
    });

    it('uses the color as the value when the option has no value', async () => {
      fixture = await mountPicker([{ color: '#ff0000', label: 'Red' }]);

      fireClick(swatches()[0]!);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('#ff0000');
    });
  });

  // ─── Keyboard ────────────────────────────────────────────────────────────────

  describe('Keyboard', () => {
    it('moves and selects with arrow keys', async () => {
      fixture = await mountPicker(OPTIONS, { value: 'midnight' });

      const first = swatches()[0]!;
      first.focus();
      fireKeyDown(first, { key: 'ArrowRight' });
      await fixture.flush();

      expect(swatches()[1]?.getAttribute('aria-checked')).toBe('true');
    });

    it('wraps around at the ends', async () => {
      fixture = await mountPicker(OPTIONS, { value: 'crimson' });

      const last = swatches()[2]!;
      last.focus();
      fireKeyDown(last, { key: 'ArrowRight' });
      await fixture.flush();

      expect(swatches()[0]?.getAttribute('aria-checked')).toBe('true');
    });

    it('keeps only the selected swatch tabbable', async () => {
      fixture = await mountPicker(OPTIONS, { value: 'pearl' });

      expect(swatches().map((s) => s.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    });

    it('gives the first swatch the tab stop when no value is selected', async () => {
      fixture = await mountPicker(OPTIONS);

      expect(swatches().map((s) => s.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    });

    it('gives the first swatch the tab stop when value matches no option', async () => {
      fixture = await mountPicker(OPTIONS, { value: 'not-a-color' });

      expect(swatches().map((s) => s.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    });
  });

  // ─── Disabled ────────────────────────────────────────────────────────────────

  describe('Disabled', () => {
    it('disables every swatch when the host is disabled', async () => {
      fixture = await mountPicker(OPTIONS, { disabled: '' });

      expect(swatches().every((s) => s.disabled)).toBe(true);
    });

    it('does not emit change when disabled', async () => {
      fixture = await mountPicker(OPTIONS, { disabled: '' });
      const changes: ChoiceChangeDetail[] = [];
      fixture.element.addEventListener('change', (event) =>
        changes.push((event as CustomEvent<ChoiceChangeDetail>).detail),
      );

      swatches()[1]?.click();

      expect(changes).toHaveLength(0);
    });

    it('skips per-option disabled swatches in arrow navigation', async () => {
      fixture = await mountPicker([
        { color: '#111111', value: 'a' },
        { color: '#222222', disabled: true, value: 'b' },
        { color: '#333333', value: 'c' },
      ]);

      const first = swatches()[0]!;
      first.focus();
      fireKeyDown(first, { key: 'ArrowRight' });
      await fixture.flush();

      expect(swatches()[2]?.getAttribute('aria-checked')).toBe('true');
    });

    it('refuses to select a disabled option', async () => {
      fixture = await mountPicker([
        { color: '#111111', value: 'a' },
        { color: '#222222', disabled: true, value: 'b' },
      ]);

      swatches()[1]?.click();
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBeNull();
    });
  });

  // ─── Assistive region ────────────────────────────────────────────────────────

  describe('Assistive region', () => {
    it('renders helper text and switches to an error alert', async () => {
      fixture = await mountPicker(OPTIONS, { helper: 'Pick your paint' });

      const helper = fixture.query<HTMLElement>('.helper-text');
      expect(helper?.textContent).toContain('Pick your paint');
      expect(helper?.getAttribute('role')).toBeNull();

      await fixture.attr('error', 'Required');

      expect(helper?.textContent).toContain('Required');
      expect(helper?.getAttribute('role')).toBe('alert');
    });
  });

  // ─── Form association ────────────────────────────────────────────────────────

  describe('Form association', () => {
    it('participates in FormData under its name', async () => {
      fixture = await mountPicker(OPTIONS, { name: 'paint', value: 'pearl' });

      const form = document.createElement('form');
      form.appendChild(fixture.element);

      expect(new FormData(form).get('paint')).toBe('pearl');

      fixture.element.remove();
    });
  });
});
