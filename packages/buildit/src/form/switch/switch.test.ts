import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-switch', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./switch');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders required shadow DOM elements', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.query('.switch-track')).toBeTruthy();
      expect(fixture.query('.switch-thumb')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });

    it('renders a .label wrapper for slot content', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.query('.label')).toBeTruthy();
    });
  });

  // ─── Checked State ────────────────────────────────────────────────────────────
  describe('Checked State', () => {
    it('is off (unchecked) by default', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('reflects checked attribute when set initially', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true } });
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('toggles checked on click', async () => {
      fixture = await mount('bit-switch');
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('updates checked attribute dynamically', async () => {
      fixture = await mount('bit-switch');
      await fixture.attr('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      await fixture.attr('checked', false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  // ─── Disabled State ────────────────────────────────────────────────────────────
  describe('Disabled State', () => {
    it('reflects disabled attribute on host', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('removes tabindex when disabled', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('does not toggle when disabled', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('does not emit change when disabled', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.click(fixture.element);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('preserves checked=true when disabled and clicked', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true, disabled: true } });
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('restores tabindex when re-enabled', async () => {
      fixture = await mount('bit-switch', { attrs: { disabled: true } });
      await fixture.attr('disabled', false);
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });
  });

  // ─── Events ───────────────────────────────────────────────────────────────────
  describe('Events', () => {
    it('emits change with checked=true on switch-on', async () => {
      fixture = await mount('bit-switch');
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.click(fixture.element);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.checked).toBe(true);
    });

    it('emits change with checked=false on switch-off', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true } });
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.click(fixture.element);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.checked).toBe(false);
    });

    it('emits change on Space keypress', async () => {
      fixture = await mount('bit-switch');
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, ' ');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('emits change on Enter keypress', async () => {
      fixture = await mount('bit-switch');
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, 'Enter');
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Form Integration ───────────────────────────────────────────────────────────
  describe('Form Integration', () => {
    it('reflects name attribute', async () => {
      fixture = await mount('bit-switch', { attrs: { name: 'notifications' } });
      expect(fixture.element.getAttribute('name')).toBe('notifications');
    });

    it('reflects value attribute', async () => {
      fixture = await mount('bit-switch', { attrs: { value: 'enabled' } });
      expect(fixture.element.getAttribute('value')).toBe('enabled');
    });

    it('defaults value to "on"', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('value')).toBe('on');
    });
  });

  // ─── Colors ───────────────────────────────────────────────────────────────────
  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies color="${color}"`, async () => {
        fixture = await mount('bit-switch', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('updates color dynamically', async () => {
      fixture = await mount('bit-switch', { attrs: { color: 'primary' } });
      await fixture.attr('color', 'success');
      expect(fixture.element.getAttribute('color')).toBe('success');
    });
  });

  // ─── Sizes ───────────────────────────────────────────────────────────────────
  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies size="${size}"`, async () => {
        fixture = await mount('bit-switch', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('updates size dynamically', async () => {
      fixture = await mount('bit-switch', { attrs: { size: 'sm' } });
      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('has role="switch" on host', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('role')).toBe('switch');
    });

    it('has tabindex="0" when enabled', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('has aria-checked="false" by default', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });

    it('has aria-checked="true" when checked', async () => {
      fixture = await mount('bit-switch', { attrs: { checked: true } });
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('is operable by keyboard (Space)', async () => {
      fixture = await mount('bit-switch');
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, ' ');
      expect(onChange).toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('handles rapid toggling without getting stuck', async () => {
      fixture = await mount('bit-switch');
      for (let i = 0; i < 5; i++) await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('renders without a label (icon-only usage)', async () => {
      fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('role')).toBe('switch');
    });
  });
});

// Dedicated WAI-ARIA / accessibility spec for bit-switch
describe('bit-switch accessibility', () => {
  beforeAll(async () => {
    await import('./switch');
  });

  // ─── Semantic Structure ───────────────────────────────────────────────────
  describe('Semantic Structure', () => {
    it('has role="switch" on the host (toggle button pattern)', async () => {
      const fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('role')).toBe('switch');
      fixture.destroy();
    });

    it('renders visual track and thumb accessible indicator elements', async () => {
      const fixture = await mount('bit-switch');
      expect(fixture.query('.switch-track')).toBeTruthy();
      expect(fixture.query('.switch-thumb')).toBeTruthy();
      fixture.destroy();
    });
  });

  // ─── WAI-ARIA Attributes ──────────────────────────────────────────────────
  describe('WAI-ARIA Attributes', () => {
    it('has aria-checked="false" by default (off state)', async () => {
      const fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });

    it('has aria-checked="true" when checked (on state)', async () => {
      const fixture = await mount('bit-switch', { attrs: { checked: true } });
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();
    });

    it('updates aria-checked dynamically as the switch is toggled', async () => {
      const fixture = await mount('bit-switch');
      await user.click(fixture.element);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      await user.click(fixture.element);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });

    it('sets aria-labelledby when label text is slotted', async () => {
      const fixture = await mount('bit-switch', { html: 'Enable dark mode' });
      expect(fixture.element.hasAttribute('aria-labelledby')).toBe(true);
      fixture.destroy();
    });
  });

  // ─── Keyboard Navigation ──────────────────────────────────────────────────
  describe('Keyboard Navigation', () => {
    it('has tabindex="0" when enabled (reachable via Tab)', async () => {
      const fixture = await mount('bit-switch');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      fixture.destroy();
    });

    it('has no tabindex when disabled (excluded from tab order)', async () => {
      const fixture = await mount('bit-switch', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
      fixture.destroy();
    });

    it('toggles on Space keypress', async () => {
      const fixture = await mount('bit-switch');
      await user.press(fixture.element, ' ');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();
    });

    it('toggles on Enter keypress', async () => {
      const fixture = await mount('bit-switch');
      await user.press(fixture.element, 'Enter');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();
    });

    it('ignores keyboard interaction when disabled', async () => {
      const fixture = await mount('bit-switch', { attrs: { disabled: true } });
      const onChange = vi.fn();
      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, ' ');
      expect(onChange).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  // ─── Focus Management ─────────────────────────────────────────────────────
  describe('Focus Management', () => {
    it('restores tabindex="0" when re-enabled', async () => {
      const fixture = await mount('bit-switch', { attrs: { disabled: true } });
      await fixture.attr('disabled', false);
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      fixture.destroy();
    });
  });

  // ─── Dynamic State Announcements ─────────────────────────────────────────
  describe('Dynamic State Announcements', () => {
    it('aria-checked updates when prop changes programmatically', async () => {
      const fixture = await mount('bit-switch');
      await fixture.attr('checked', true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      await fixture.attr('checked', false);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });
  });
});
