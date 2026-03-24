import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-radio', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./radio'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders shadow DOM structure with circle and dot', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.query('.radio-wrapper')).toBeTruthy();
      expect(fixture.query('.circle')).toBeTruthy();
      expect(fixture.query('.dot')).toBeTruthy();
    });

    it('renders label slot', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.query('.label slot')).toBeTruthy();
    });

    it('renders label text from slot content', async () => {
      fixture = await mount('bit-radio');
      fixture.element.textContent = 'Option A';
      await fixture.flush();

      const slot = fixture.query<HTMLSlotElement>('.label slot');

      expect(slot?.assignedNodes().length).toBeGreaterThan(0);
    });
  });

  // ─── Checked State ──────────────────────────────────────────────────────────

  describe('Checked State', () => {
    it('is unchecked by default', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('reflects checked attribute on initial render', async () => {
      fixture = await mount('bit-radio', { attrs: { checked: true } });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('becomes checked on click', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp' } });

      await user.click(fixture.element);

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('stays checked when clicked again (radio cannot uncheck itself)', async () => {
      fixture = await mount('bit-radio', { attrs: { checked: true, name: 'grp2' } });

      await user.click(fixture.element);

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('updates checked state dynamically via attribute', async () => {
      fixture = await mount('bit-radio');

      await fixture.attr('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await fixture.attr('checked', false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  // ─── Disabled State ─────────────────────────────────────────────────────────

  describe('Disabled State', () => {
    it('reflects disabled attribute', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('does not have tabindex when disabled', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('does not toggle checked when disabled', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true, name: 'grp3' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('preserves checked state when disabled', async () => {
      fixture = await mount('bit-radio', {
        attrs: { checked: true, disabled: true },
      });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('restores tabindex when re-enabled', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true } });
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);

      await fixture.attr('disabled', false);
      expect(fixture.element.hasAttribute('tabindex')).toBe(true);
    });
  });

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('emits change with checked=true on click', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'ev', value: 'yes' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.element);

      expect(changeHandler).toHaveBeenCalledTimes(1);

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.checked).toBe(true);
      expect(detail.value).toBe(true);
      expect(detail.fieldValue).toBe('yes');
    });

    it('includes originalEvent in change detail', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'ev2', value: 'yes' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.element);

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.originalEvent).toBeDefined();
      expect(detail.fieldValue).toBe('yes');
    });

    it('does not emit change when disabled', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true, name: 'ev3' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });

    it('emits change via Space key', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'ev4' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, ' ');

      expect(changeHandler).toHaveBeenCalledTimes(1);
      expect((changeHandler.mock.calls[0][0] as CustomEvent).detail.checked).toBe(true);
    });

    it('emits change via Enter key', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'ev5' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.press(fixture.element, 'Enter');

      expect(changeHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Form Integration ───────────────────────────────────────────────────────

  describe('Form Integration', () => {
    it('exposes name attribute', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'size-choice' } });

      expect(fixture.element.getAttribute('name')).toBe('size-choice');
    });

    it('exposes value attribute', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp', value: 'large' } });

      expect(fixture.element.getAttribute('value')).toBe('large');
    });

    it('updates name dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'old-group' } });

      await fixture.attr('name', 'new-group');

      expect(fixture.element.getAttribute('name')).toBe('new-group');
    });
  });

  // ─── Colors ─────────────────────────────────────────────────────────────────

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-radio', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('updates color dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { color: 'primary' } });

      await fixture.attr('color', 'error');

      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  // ─── Sizes ──────────────────────────────────────────────────────────────────

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-radio', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('updates size dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { size: 'sm' } });

      await fixture.attr('size', 'lg');

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has role="radio" on host', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.element.getAttribute('role')).toBe('radio');
    });

    it('has tabindex="-1" when unchecked (roving tabindex)', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'a11y' } });

      expect(fixture.element.getAttribute('tabindex')).toBe('-1');
    });

    it('has tabindex="0" when checked', async () => {
      fixture = await mount('bit-radio', { attrs: { checked: true, name: 'a11y2' } });

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('has no tabindex when disabled', async () => {
      fixture = await mount('bit-radio', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles missing name attribute (no group behavior)', async () => {
      fixture = await mount('bit-radio', { attrs: { value: 'standalone' } });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.element);

      // Radio without name silently does nothing (no group to manage)
      expect(changeHandler).not.toHaveBeenCalled();
    });

    it('handles missing value attribute', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'no-val' } });

      expect(fixture.element.getAttribute('value') || '').toBe('');
    });

    it('does not emit duplicate events when clicking an already-checked radio', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'grp-dup',
        },
      });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });
});

describe('bit-radio accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./radio'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Semantic Structure ──────────────────────────────────────────────────────

  describe('Semantic Structure', () => {
    it('has role="radio" identifying it as a radio button', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp', value: 'opt1' } });

      expect(fixture.element.getAttribute('role')).toBe('radio');
    });

    it('renders visual circle and dot inside shadow DOM', async () => {
      fixture = await mount('bit-radio');

      expect(fixture.query('.circle')).toBeTruthy();
      expect(fixture.query('.dot')).toBeTruthy();
    });
  });

  // ─── WAI-ARIA Attributes ─────────────────────────────────────────────────────

  describe('WAI-ARIA Attributes', () => {
    it('has aria-checked="false" when unchecked', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp', value: 'opt1' } });

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });

    it('has aria-checked="true" when checked', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'grp',
          value: 'opt1',
        },
      });

      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('updates aria-checked to "true" when checked dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp', value: 'opt1' } });

      await fixture.attr('checked', true);

      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('updates aria-checked to "false" when unchecked dynamically', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'grp',
          value: 'opt1',
        },
      });

      await fixture.attr('checked', false);

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });

    it('sets aria-labelledby when label text is provided', async () => {
      fixture = await mount('bit-radio', {
        attrs: { name: 'grp', value: 'opt1' },
        html: 'Option 1',
      });

      expect(fixture.element.getAttribute('aria-labelledby')).toBeTruthy();
    });
  });

  // ─── Roving Tabindex (Focus Management) ─────────────────────────────────────

  describe('Roving Tabindex', () => {
    it('has tabindex="-1" when unchecked (not initial focus target)', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp', value: 'opt1' } });

      expect(fixture.element.getAttribute('tabindex')).toBe('-1');
    });

    it('has tabindex="0" when checked (initial focus target)', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'grp',
          value: 'opt1',
        },
      });

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('removes tabindex entirely when disabled', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          disabled: true,
          name: 'grp',
          value: 'opt1',
        },
      });

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });

    it('updates tabindex="0" when becoming checked', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp2' } });
      expect(fixture.element.getAttribute('tabindex')).toBe('-1');

      await fixture.attr('checked', true);

      expect(fixture.element.getAttribute('tabindex')).toBe('0');
    });

    it('updates tabindex="-1" when unchecked', async () => {
      fixture = await mount('bit-radio', { attrs: { checked: true, name: 'grp2' } });
      expect(fixture.element.getAttribute('tabindex')).toBe('0');

      await fixture.attr('checked', false);

      expect(fixture.element.getAttribute('tabindex')).toBe('-1');
    });

    it('removes tabindex when disabled dynamically', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'grp3' } });
      expect(fixture.element.hasAttribute('tabindex')).toBe(true);

      await fixture.attr('disabled', true);

      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
    });
  });

  // ─── Keyboard Navigation ─────────────────────────────────────────────────────

  describe('Keyboard Navigation', () => {
    it('selects radio on Space key', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'kb-grp' } });

      await user.press(fixture.element, ' ');

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('selects radio on Enter key', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'kb-grp2' } });

      await user.press(fixture.element, 'Enter');

      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('navigates to next radio with ArrowDown and selects it', async () => {
      const f1 = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'nav-grp',
          value: 'a',
        },
      });
      const f2 = await mount('bit-radio', { attrs: { name: 'nav-grp', value: 'b' } });

      f1.element.focus();
      await user.press(f1.element, 'ArrowDown');

      expect(f2.element.hasAttribute('checked')).toBe(true);
      expect(f1.element.hasAttribute('checked')).toBe(false);

      f1.destroy();
      f2.destroy();
    });

    it('navigates to next radio with ArrowRight and selects it', async () => {
      const f1 = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'nav-grp2',
          value: 'a',
        },
      });
      const f2 = await mount('bit-radio', {
        attrs: { name: 'nav-grp2', value: 'b' },
      });

      f1.element.focus();
      await user.press(f1.element, 'ArrowRight');

      expect(f2.element.hasAttribute('checked')).toBe(true);
      expect(f1.element.hasAttribute('checked')).toBe(false);

      f1.destroy();
      f2.destroy();
    });

    it('navigates to previous radio with ArrowUp and selects it', async () => {
      const f1 = await mount('bit-radio', {
        attrs: { name: 'nav-grp3', value: 'a' },
      });
      const f2 = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'nav-grp3',
          value: 'b',
        },
      });

      f2.element.focus();
      await user.press(f2.element, 'ArrowUp');

      expect(f1.element.hasAttribute('checked')).toBe(true);
      expect(f2.element.hasAttribute('checked')).toBe(false);

      f1.destroy();
      f2.destroy();
    });

    it('does not respond to keyboard when disabled', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          disabled: true,
          name: 'kb-disabled',
        },
      });

      await user.press(fixture.element, ' ');

      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  // ─── Dynamic State Announcements ────────────────────────────────────────────

  describe('Dynamic State Announcements', () => {
    it('reflects checked state change to assistive technology via aria-checked', async () => {
      fixture = await mount('bit-radio', { attrs: { name: 'dyn-grp' } });
      expect(fixture.element.getAttribute('aria-checked')).toBe('false');

      await user.click(fixture.element);

      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('clears checked state via attribute removal (aria-checked updates)', async () => {
      fixture = await mount('bit-radio', {
        attrs: {
          checked: true,
          name: 'dyn-grp2',
        },
      });
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');

      await fixture.attr('checked', false);

      expect(fixture.element.getAttribute('aria-checked')).toBe('false');
    });
  });
});
