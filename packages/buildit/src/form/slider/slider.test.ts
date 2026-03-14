import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-slider', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./slider');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the slider track and thumb', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.query('.slider-track')).toBeTruthy();
      expect(fixture.query('.slider-thumb')).toBeTruthy();
    });

    it('host has role="slider"', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('role')).toBe('slider');
    });
  });

  // ─── Value / Range ───────────────────────────────────────────────────────────

  describe('Value and Range', () => {
    it('has default min=0 and max=100', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('0');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('100');
    });

    it('reflects initial value via aria-valuenow', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '40' } });

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('40');
    });

    it('updates aria-valuenow when value attribute changes', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '20' } });

      await fixture.attr('value', '75');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('75');
    });

    it('applies custom min/max attributes', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '200', min: '50' } });

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('50');
      expect(fixture.element.getAttribute('aria-valuemax')).toBe('200');
    });

    it('applies step attribute on host', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '5' } });

      expect(fixture.element.getAttribute('step')).toBe('5');
    });
  });

  // ─── Disabled State ─────────────────────────────────────────────────────────

  describe('Disabled State', () => {
    it('reflects disabled on host', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('host has no tabindex when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true } });

      expect(fixture.element.getAttribute('tabindex')).not.toBe('0');
    });

    it('does not emit change event when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: true, value: '50' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('emits change event with value and originalEvent on arrow key', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '50' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect(changeHandler).toHaveBeenCalledTimes(1);

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.value).toBeDefined();
      expect(detail.originalEvent).toBeDefined();
    });

    it('increases value on ArrowRight', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '10', value: '50' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowRight');

      expect((changeHandler.mock.calls[0][0] as CustomEvent).detail.value).toBeGreaterThan(50);
    });

    it('decreases value on ArrowLeft', async () => {
      fixture = await mount('bit-slider', { attrs: { step: '10', value: '50' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'ArrowLeft');

      expect((changeHandler.mock.calls[0][0] as CustomEvent).detail.value).toBeLessThan(50);
    });
  });

  // ─── Colors ─────────────────────────────────────────────────────────────────

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-slider', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  // ─── Sizes ──────────────────────────────────────────────────────────────────

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-slider', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('clamps value at maximum boundary', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '100', value: '100' } });

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('100');
    });

    it('clamps value at minimum boundary', async () => {
      fixture = await mount('bit-slider', { attrs: { min: '0', value: '0' } });

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('0');
    });
  });
});

describe('bit-slider accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./slider');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('host has role slider', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('role')).toBe('slider');
    });

    it('host is focusable by default', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('host is not focusable when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: '' } });

      expect(fixture.element.getAttribute('tabindex')).not.toBe('0');
    });
  });

  describe('WAI-ARIA Attributes', () => {
    it('exposes aria-valuemin', async () => {
      fixture = await mount('bit-slider', { attrs: { min: '10' } });

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('10');
    });

    it('exposes aria-valuemax', async () => {
      fixture = await mount('bit-slider', { attrs: { max: '200' } });

      expect(fixture.element.getAttribute('aria-valuemax')).toBe('200');
    });

    it('exposes aria-valuenow reflecting current value', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '42' } });

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('42');
    });

    it('defaults aria-valuemin to 0', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('aria-valuemin')).toBe('0');
    });

    it('defaults aria-valuemax to 100', async () => {
      fixture = await mount('bit-slider');

      expect(fixture.element.getAttribute('aria-valuemax')).toBe('100');
    });

    it('updates aria-valuenow after keyboard increment', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '50' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('51');
    });

    it('updates aria-valuenow after keyboard decrement', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '50' } });

      await user.press(fixture.element, 'ArrowLeft');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('49');
    });
  });

  describe('Keyboard Navigation', () => {
    it('ArrowRight increments value', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '30' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('31');
    });

    it('ArrowUp increments value', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '30' } });

      await user.press(fixture.element, 'ArrowUp');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('31');
    });

    it('ArrowLeft decrements value', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '30' } });

      await user.press(fixture.element, 'ArrowLeft');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('29');
    });

    it('ArrowDown decrements value', async () => {
      fixture = await mount('bit-slider', { attrs: { value: '30' } });

      await user.press(fixture.element, 'ArrowDown');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('29');
    });

    it('does not respond to keyboard when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: '', value: '30' } });

      await user.press(fixture.element, 'ArrowRight');

      expect(fixture.element.getAttribute('aria-valuenow')).toBe('30');
    });
  });

  describe('Disabled State', () => {
    it('aria-disabled is set when disabled', async () => {
      fixture = await mount('bit-slider', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });
  });
});
