import { type Fixture, fire, mount } from '@vielzeug/craftit/test';

describe('bit-number-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./number-input');
    await import('../input/input');
    await import('../../actions/button/button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a spinbutton control div', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('[role="spinbutton"]')).toBeTruthy();
    });

    it('renders a decrease button', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('[aria-label="Decrease"]')).toBeTruthy();
    });

    it('renders an increase button', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('[aria-label="Increase"]')).toBeTruthy();
    });

    it('renders a bit-input with part="input"', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('bit-input[part="input"]')).toBeTruthy();
    });

    it('passes label to bit-input when label prop is set', async () => {
      fixture = await mount('bit-number-input', { attrs: { label: 'Quantity' } });

      const inp = fixture.query('bit-input');
      expect(inp?.getAttribute('label')).toBe('Quantity');
    });

    it('does not pass label to bit-input when label prop is absent', async () => {
      fixture = await mount('bit-number-input');

      const inp = fixture.query('bit-input');
      expect(inp?.getAttribute('label') || '').toBeFalsy();
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('reflects value attribute on host', async () => {
      fixture = await mount('bit-number-input', { attrs: { value: '42' } });

      expect(fixture.element.getAttribute('value')).toBe('42');
    });

    it('reflects disabled attribute on host', async () => {
      fixture = await mount('bit-number-input', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('reflects readonly attribute on host', async () => {
      fixture = await mount('bit-number-input', { attrs: { readonly: '' } });

      expect(fixture.element.hasAttribute('readonly')).toBe(true);
    });

    it('applies placeholder to inner input', async () => {
      fixture = await mount('bit-number-input', { attrs: { placeholder: '0' } });

      const input = fixture.query<HTMLInputElement>('[part="input"]');
      expect(input?.getAttribute('placeholder')).toBe('0');
    });

    it('inner input uses inputmode="decimal"', async () => {
      fixture = await mount('bit-number-input');

      const input = fixture.query('[part="input"]');
      expect(input?.getAttribute('inputmode')).toBe('decimal');
    });
  });

  // ─── Increment / Decrement ───────────────────────────────────────────────────

  describe('Increment / Decrement', () => {
    it('clicking increase button increments value by default step', async () => {
      fixture = await mount('bit-number-input', { attrs: { value: '3' } });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Increase"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('4');
    });

    it('clicking decrease button decrements value by default step', async () => {
      fixture = await mount('bit-number-input', { attrs: { value: '5' } });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Decrease"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('4');
    });

    it('respects custom step value', async () => {
      fixture = await mount('bit-number-input', { attrs: { step: '5', value: '0' } });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Increase"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('5');
    });

    it('clamps increase to max value', async () => {
      fixture = await mount('bit-number-input', { attrs: { max: '10', value: '9' } });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Increase"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('10');
    });

    it('clamps decrease to min value', async () => {
      fixture = await mount('bit-number-input', { attrs: { min: '0', value: '1' } });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Decrease"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('0');
    });

    it('increase button is disabled when at max', async () => {
      fixture = await mount('bit-number-input', { attrs: { max: '10', value: '10' } });

      const btn = fixture.query('[aria-label="Increase"]');
      expect(btn?.hasAttribute('disabled')).toBe(true);
    });

    it('decrease button is disabled when at min', async () => {
      fixture = await mount('bit-number-input', { attrs: { min: '0', value: '0' } });

      const btn = fixture.query('[aria-label="Decrease"]');
      expect(btn?.hasAttribute('disabled')).toBe(true);
    });

    it('does not change value when disabled', async () => {
      fixture = await mount('bit-number-input', { attrs: { disabled: '', value: '5' } });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Increase"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('5');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires change when the value is committed', async () => {
      fixture = await mount('bit-number-input', { attrs: { value: '1' } });
      const handler = vi.fn();
      fixture.element.addEventListener('change', handler);

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Increase"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('change event detail carries the new value', async () => {
      fixture = await mount('bit-number-input', { attrs: { value: '3' } });
      let detail: { value: number | null } | undefined;
      fixture.element.addEventListener('change', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      const btn = fixture.query<HTMLButtonElement>('[aria-label="Increase"]');
      if (btn) fire.click(btn);
      await fixture.flush();

      expect(detail?.value).toBe(4);
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-number-input accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./number-input');
    await import('../input/input');
    await import('../../actions/button/button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WAI-ARIA Spinbutton Pattern', () => {
    it('control div has role="spinbutton"', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('[role="spinbutton"]')).toBeTruthy();
    });

    it('spinbutton has aria-label when label prop is set', async () => {
      fixture = await mount('bit-number-input', { attrs: { label: 'Quantity' } });

      const control = fixture.query('[role="spinbutton"]');
      expect(control?.getAttribute('aria-label')).toBe('Quantity');
    });

    it('spinbutton has aria-valuenow when value is set', async () => {
      fixture = await mount('bit-number-input', { attrs: { value: '7' } });

      const control = fixture.query('[role="spinbutton"]');
      expect(control?.getAttribute('aria-valuenow')).toBe('7');
    });

    it('spinbutton has aria-valuemin when min is set', async () => {
      fixture = await mount('bit-number-input', { attrs: { min: '1' } });

      const control = fixture.query('[role="spinbutton"]');
      expect(control?.getAttribute('aria-valuemin')).toBe('1');
    });

    it('spinbutton has aria-valuemax when max is set', async () => {
      fixture = await mount('bit-number-input', { attrs: { max: '100' } });

      const control = fixture.query('[role="spinbutton"]');
      expect(control?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('spinbutton has aria-disabled when disabled', async () => {
      fixture = await mount('bit-number-input', { attrs: { disabled: '' } });

      const control = fixture.query('[role="spinbutton"]');
      expect(control?.getAttribute('aria-disabled')).toBe('true');
    });

    it('spinbutton has aria-readonly when readonly', async () => {
      fixture = await mount('bit-number-input', { attrs: { readonly: '' } });

      const control = fixture.query('[role="spinbutton"]');
      expect(control?.getAttribute('aria-readonly')).toBe('true');
    });
  });

  describe('Button Labels', () => {
    it('decrease button has aria-label="Decrease"', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('[aria-label="Decrease"]')).toBeTruthy();
    });

    it('increase button has aria-label="Increase"', async () => {
      fixture = await mount('bit-number-input');

      expect(fixture.query('[aria-label="Increase"]')).toBeTruthy();
    });
  });

  describe('Input Hidden from AT', () => {
    it('inner input has aria-hidden="true"', async () => {
      fixture = await mount('bit-number-input');

      const input = fixture.query('[part="input"]');
      expect(input?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
