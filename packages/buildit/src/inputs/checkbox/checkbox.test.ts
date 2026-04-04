import { type Fixture, mount, user } from '@vielzeug/craftit/testing';

describe('bit-checkbox', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./checkbox'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders required shadow DOM elements', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.query('.box')).toBeTruthy();
      expect(fixture.query('.label')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });

    it('renders checkmark and dash icons inside the box', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.query('bit-icon[name="check"]')).toBeTruthy();
      expect(fixture.query('bit-icon[name="minus"]')).toBeTruthy();
    });

    it('renders icon state classes expected by the stylesheet', async () => {
      fixture = await mount('bit-checkbox');

      expect(fixture.query('bit-icon.checkmark[name="check"]')).toBeTruthy();
      expect(fixture.query('bit-icon.dash[name="minus"]')).toBeTruthy();
    });

    it('renders slot content as label text', async () => {
      fixture = await mount('bit-checkbox');
      fixture.element.textContent = 'Accept terms';

      const slot = fixture.query('slot:not([name])');

      expect(slot).toBeTruthy();
    });
  });

  // ─── Checked State ───────────────────────────────────────────────────────────
  describe('Checked State', () => {
    it('is unchecked by default', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('reflects checked attribute when set initially', async () => {
      fixture = await mount('bit-checkbox', { attrs: { checked: true } });
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('toggles checked on user click', async () => {
      fixture = await mount('bit-checkbox');
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('updates checked attribute dynamically', async () => {
      fixture = await mount('bit-checkbox');
      await fixture.attr('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      await fixture.attr('checked', false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  // ─── Indeterminate State ─────────────────────────────────────────────────────
  describe('Indeterminate State', () => {
    it('reflects indeterminate attribute', async () => {
      fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      expect(fixture.element.hasAttribute('indeterminate')).toBe(true);
    });

    it('sets aria-checked="mixed" when indeterminate', async () => {
      fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
    });

    it('clears indeterminate on click without toggling checked', async () => {
      fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('indeterminate')).toBe(false);
      // First click clears indeterminate state; checked remains as it was
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('transitions indeterminate → unchecked → checked on successive clicks', async () => {
      fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      await user.click(fixture.element); // clears indeterminate
      expect(fixture.element.hasAttribute('indeterminate')).toBe(false);
      await user.click(fixture.element); // now checks
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });
  });

  // ─── Disabled State ──────────────────────────────────────────────────────────
  describe('Disabled State', () => {
    it('reflects disabled attribute on host', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('does not toggle checked when disabled', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('does not emit change when disabled', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.click(fixture.element);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('removes tabindex when disabled (not keyboard-focusable)', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('restores tabindex="0" when re-enabled', async () => {
      fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      await fixture.attr('disabled', false);
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('preserves checked state when disabled and clicked', async () => {
      fixture = await mount('bit-checkbox', {
        attrs: {
          checked: true,
          disabled: true,
        },
      });
      await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────────────
  describe('Events', () => {
    it('emits change with checked=true when checked', async () => {
      fixture = await mount('bit-checkbox');

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.click(fixture.element);
      expect(onChange).toHaveBeenCalledTimes(1);

      const detail = (onChange.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.checked).toBe(true);
      expect(detail.fieldValue).toBe('on');
      expect(detail.originalEvent).toBeDefined();
    });

    it('emits change with checked=false when unchecked', async () => {
      fixture = await mount('bit-checkbox', { attrs: { checked: true } });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.click(fixture.element);

      const detail = (onChange.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.checked).toBe(false);
    });

    it('emits change on Space keypress', async () => {
      fixture = await mount('bit-checkbox');

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, ' ');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('emits change on Enter keypress', async () => {
      fixture = await mount('bit-checkbox');

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, 'Enter');
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Form Integration ────────────────────────────────────────────────────────
  describe('Form Integration', () => {
    it('reflects name attribute', async () => {
      fixture = await mount('bit-checkbox', { attrs: { name: 'terms' } });
      expect(fixture.element.getAttribute('name')).toBe('terms');
    });

    it('reflects value attribute', async () => {
      fixture = await mount('bit-checkbox', { attrs: { value: 'accepted' } });
      expect(fixture.element.getAttribute('value')).toBe('accepted');
    });

    it('defaults value to "on"', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.element.getAttribute('value')).toBe('on');
    });

    it('updates name dynamically', async () => {
      fixture = await mount('bit-checkbox', { attrs: { name: 'a' } });
      await fixture.attr('name', 'b');
      expect(fixture.element.getAttribute('name')).toBe('b');
    });
  });

  // ─── Colors ──────────────────────────────────────────────────────────────────
  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies color="${color}"`, async () => {
        fixture = await mount('bit-checkbox', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('updates color dynamically', async () => {
      fixture = await mount('bit-checkbox', { attrs: { color: 'primary' } });
      await fixture.attr('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  // ─── Sizes ───────────────────────────────────────────────────────────────────
  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies size="${size}"`, async () => {
        fixture = await mount('bit-checkbox', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('updates size dynamically', async () => {
      fixture = await mount('bit-checkbox', { attrs: { size: 'sm' } });
      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('has role="checkbox" on host', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.element.getAttribute('role')).toBe('checkbox');
    });

    it('has tabindex="0" when enabled', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('has aria-checked="false" by default', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });

    it('has aria-checked="true" when checked', async () => {
      fixture = await mount('bit-checkbox', { attrs: { checked: true } });
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('has aria-checked="mixed" for indeterminate', async () => {
      fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });
      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
    });

    it('sets aria-labelledby when label text is provided', async () => {
      fixture = await mount('bit-checkbox', { html: 'Accept terms' });
      expect(fixture.element.hasAttribute('aria-labelledby')).toBe(true);
    });

    it('is operable by keyboard (Space)', async () => {
      fixture = await mount('bit-checkbox');

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, ' ');
      expect(onChange).toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('handles rapid toggling without getting stuck', async () => {
      fixture = await mount('bit-checkbox');
      for (let i = 0; i < 5; i++) await user.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('renders correctly without a label (icon-only usage)', async () => {
      fixture = await mount('bit-checkbox');
      expect(fixture.element.getAttribute('role')).toBe('checkbox');
    });

    it('handles both checked and indeterminate set simultaneously (checked wins)', async () => {
      fixture = await mount('bit-checkbox', {
        attrs: {
          checked: true,
          indeterminate: false,
        },
      });
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });
  });
});

// Dedicated WAI-ARIA / accessibility spec for bit-checkbox
describe('bit-checkbox accessibility', () => {
  beforeAll(async () => {
    await (() => import('./checkbox'))();
  });

  // ─── Semantic Structure ───────────────────────────────────────────────────
  describe('Semantic Structure', () => {
    it('has role="checkbox" on the host element', async () => {
      const fixture = await mount('bit-checkbox');

      expect(fixture.element.getAttribute('role')).toBe('checkbox');
      fixture.destroy();
    });

    it('renders a visually-checkable .box element', async () => {
      const fixture = await mount('bit-checkbox');

      expect(fixture.query('.box')).toBeTruthy();
      fixture.destroy();
    });

    it('renders a .label wrapper for slot content', async () => {
      const fixture = await mount('bit-checkbox');

      fixture.element.textContent = 'Accept terms';
      expect(fixture.query('.label')).toBeTruthy();
      fixture.destroy();
    });
  });

  // ─── WAI-ARIA Attributes ──────────────────────────────────────────────────
  describe('WAI-ARIA Attributes', () => {
    it('has aria-checked="false" by default (unchecked state)', async () => {
      const fixture = await mount('bit-checkbox');

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });

    it('has aria-checked="mixed" when indeterminate (partial selection)', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });

      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
      fixture.destroy();
    });

    it('updates aria-checked dynamically as state changes', async () => {
      const fixture = await mount('bit-checkbox');

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      await user.click(fixture.element);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      await user.click(fixture.element);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });

    it('sets aria-labelledby pointing to label span when label text provided', async () => {
      const fixture = await mount('bit-checkbox', { html: 'Remember me' });
      const labelledBy = fixture.element.getAttribute('aria-labelledby');

      expect(labelledBy).toBeTruthy();

      // Verify the referenced element exists
      const labelEl = fixture.element.shadowRoot?.getElementById(labelledBy!);

      expect(labelEl).toBeTruthy();
      fixture.destroy();
    });
  });

  // ─── Keyboard Navigation ──────────────────────────────────────────────────
  describe('Keyboard Navigation', () => {
    it('has tabindex="0" when enabled (keyboard-focusable)', async () => {
      const fixture = await mount('bit-checkbox');

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      fixture.destroy();
    });

    it('has no tabindex when disabled (not keyboard-focusable)', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
      fixture.destroy();
    });

    it('toggles state on Space (standard checkbox activation key)', async () => {
      const fixture = await mount('bit-checkbox');

      await user.press(fixture.element, ' ');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();
    });

    it('toggles state on Enter', async () => {
      const fixture = await mount('bit-checkbox');

      await user.press(fixture.element, 'Enter');
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();
    });

    it('does not toggle on keyboard interaction when disabled', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { disabled: true } });
      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await user.press(fixture.element, ' ');
      expect(onChange).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  // ─── Focus Management ─────────────────────────────────────────────────────
  describe('Focus Management', () => {
    it('restores tabindex="0" when re-enabled after being disabled', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { disabled: true } });

      await fixture.attr('disabled', false);
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      fixture.destroy();
    });
  });

  // ─── Dynamic State Announcements ─────────────────────────────────────────
  describe('Dynamic State Announcements', () => {
    it('aria-checked transitions from false → true when checked', async () => {
      const fixture = await mount('bit-checkbox');

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      await fixture.attr('checked', true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      fixture.destroy();
    });

    it('aria-checked transitions from true → false when unchecked', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { checked: true } });

      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
      await fixture.attr('checked', false);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });

    it('aria-checked transitions from mixed → false when indeterminate is cleared', async () => {
      const fixture = await mount('bit-checkbox', { attrs: { indeterminate: true } });

      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
      await fixture.attr('indeterminate', false);
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
      fixture.destroy();
    });
  });
});
