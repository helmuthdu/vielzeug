import { type Fixture, mount, user } from '@vielzeug/craftit/testing';

describe('bit-input', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./input'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders wrapper, field, and input elements', async () => {
      fixture = await mount('bit-input');

      expect(fixture.query('.input-wrapper')).toBeTruthy();
      expect(fixture.query('.field')).toBeTruthy();
      expect(fixture.query('input')).toBeTruthy();
    });

    it('renders with default type "text"', async () => {
      fixture = await mount('bit-input');

      expect(fixture.query<HTMLInputElement>('input')?.type).toBe('text');
    });

    it('renders prefix and suffix slots', async () => {
      fixture = await mount('bit-input');

      expect(fixture.query('slot[name="prefix"]')).toBeTruthy();
      expect(fixture.query('slot[name="suffix"]')).toBeTruthy();
    });

    it('renders outside label when label-placement is "outside"', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          label: 'Email',
          'label-placement': 'outside',
        },
      });

      expect(fixture.query('.label-outside')).toBeTruthy();
    });

    it('renders inset label when label-placement is "inset"', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          label: 'Email',
          'label-placement': 'inset',
        },
      });

      expect(fixture.query('.label-inset')).toBeTruthy();
    });

    it('renders helper text when helper attribute is set', async () => {
      fixture = await mount('bit-input', { attrs: { helper: 'Enter your email' } });

      const helperEl = fixture.query('.helper-text');

      expect(helperEl).toBeTruthy();
    });

    it('renders error message when error attribute is set', async () => {
      fixture = await mount('bit-input', {
        attrs: { error: 'This field is required' },
      });

      const errorEl = fixture.query('.helper-text[role="alert"]');

      expect(errorEl).toBeTruthy();
    });
  });

  // ─── Input Types ────────────────────────────────────────────────────────────

  describe('Input Types', () => {
    const types = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'] as const;

    types.forEach((type) => {
      it(`forwards type="${type}" to inner input`, async () => {
        fixture = await mount('bit-input', { attrs: { type } });

        expect(fixture.query<HTMLInputElement>('input')?.type).toBe(type);
      });
    });

    it('falls back to "text" for invalid type', async () => {
      fixture = await mount('bit-input', { attrs: { type: 'invalid' } });

      expect(fixture.query<HTMLInputElement>('input')?.type).toBe('text');
    });

    it('updates type dynamically', async () => {
      fixture = await mount('bit-input', { attrs: { type: 'text' } });

      await fixture.attr('type', 'email');

      expect(fixture.query<HTMLInputElement>('input')?.type).toBe('email');
    });
  });

  // ─── Value Management ────────────────────────────────────────────────────────

  describe('Value Management', () => {
    it('sets initial value in inner input', async () => {
      fixture = await mount('bit-input', { attrs: { value: 'hello world' } });

      expect(fixture.query<HTMLInputElement>('input')?.value).toBe('hello world');
    });

    it('updates inner input value when attribute changes', async () => {
      fixture = await mount('bit-input', { attrs: { value: 'initial' } });

      await fixture.attr('value', 'updated');
      await fixture.flush();

      expect(fixture.query<HTMLInputElement>('input')?.value).toBe('updated');
    });

    it('handles empty string value', async () => {
      fixture = await mount('bit-input', { attrs: { value: '' } });

      expect(fixture.query<HTMLInputElement>('input')?.value).toBe('');
    });
  });

  // ─── Label and Placeholder ───────────────────────────────────────────────────

  describe('Label and Placeholder', () => {
    it('sets name on inner input', async () => {
      fixture = await mount('bit-input', { attrs: { name: 'email' } });

      expect(fixture.query<HTMLInputElement>('input')?.name).toBe('email');
    });

    it('updates name dynamically', async () => {
      fixture = await mount('bit-input', { attrs: { name: 'old' } });

      await fixture.attr('name', 'new-name');

      expect(fixture.query<HTMLInputElement>('input')?.name).toBe('new-name');
    });

    it('sets placeholder on inner input', async () => {
      fixture = await mount('bit-input', { attrs: { placeholder: 'Enter email' } });

      expect(fixture.query<HTMLInputElement>('input')?.placeholder).toBe('Enter email');
    });

    it('updates placeholder dynamically', async () => {
      fixture = await mount('bit-input');

      await fixture.attr('placeholder', 'Enter username');

      expect(fixture.query<HTMLInputElement>('input')?.placeholder).toBe('Enter username');
    });
  });

  // ─── Disabled / Readonly / Required States ───────────────────────────────────

  describe('Disabled State', () => {
    it('disables inner input when disabled', async () => {
      fixture = await mount('bit-input', { attrs: { disabled: true } });

      expect(fixture.query<HTMLInputElement>('input')?.disabled).toBe(true);
    });

    it('reflects disabled on host', async () => {
      fixture = await mount('bit-input', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('enables inner input when disabled is removed', async () => {
      fixture = await mount('bit-input', { attrs: { disabled: true } });

      await fixture.attr('disabled', false);

      expect(fixture.query<HTMLInputElement>('input')?.disabled).toBe(false);
    });
  });

  describe('Readonly State', () => {
    it('sets readOnly on inner input when readonly', async () => {
      fixture = await mount('bit-input', { attrs: { readonly: true } });

      expect(fixture.query<HTMLInputElement>('input')?.readOnly).toBe(true);
    });

    it('updates readonly dynamically', async () => {
      fixture = await mount('bit-input');

      await fixture.attr('readonly', true);

      expect(fixture.query<HTMLInputElement>('input')?.readOnly).toBe(true);
    });
  });

  describe('Required State', () => {
    it('sets required on inner input', async () => {
      fixture = await mount('bit-input', { attrs: { required: true } });

      expect(fixture.query<HTMLInputElement>('input')?.required).toBe(true);
    });

    it('updates required dynamically', async () => {
      fixture = await mount('bit-input');

      await fixture.attr('required', true);

      expect(fixture.query<HTMLInputElement>('input')?.required).toBe(true);
    });
  });

  // ─── Error State ─────────────────────────────────────────────────────────────

  describe('Error State', () => {
    it('renders error message element with role="alert"', async () => {
      fixture = await mount('bit-input', { attrs: { error: 'Required' } });

      const errorEl = fixture.query('.helper-text[role="alert"]');

      expect(errorEl).toBeTruthy();
      expect(errorEl?.textContent?.trim()).toBe('Required');
    });

    it('sets aria-invalid="true" on inner input when error', async () => {
      fixture = await mount('bit-input', {
        attrs: { error: 'Invalid email', label: 'Email', 'label-placement': 'outside' },
      });

      expect(fixture.query('input')?.getAttribute('aria-invalid')).toBe('true');
    });
    it('does not set aria-invalid when no error', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          label: 'Email',
          'label-placement': 'outside',
        },
      });

      expect(fixture.query('input')?.getAttribute('aria-invalid')).not.toBe('true');
    });

    it('does not reflect an empty error attribute by default', async () => {
      fixture = await mount('bit-input');
      await fixture.flush();

      expect(fixture.element.hasAttribute('error')).toBe(false);
    });

    it('removes the host error attribute when error becomes empty', async () => {
      fixture = await mount('bit-input', { attrs: { error: 'Required' } });
      await fixture.flush();

      expect(fixture.element.getAttribute('error')).toBe('Required');

      await fixture.attr('error', '');
      await fixture.flush();

      expect(fixture.element.hasAttribute('error')).toBe(false);
    });

    it('hides helper text when error is present', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          error: 'Required',
          helper: 'Enter your email',
        },
      });

      const helperEl = fixture.query<HTMLElement>('.helper-text:not([role="alert"])');
      const errorEl = fixture.query<HTMLElement>('.helper-text[role="alert"]');

      expect(helperEl?.hidden).toBe(true);
      expect(errorEl?.hidden).toBe(false);
      expect(errorEl?.textContent?.trim()).toBe('Required');
    });
  });

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('emits custom input event with value and originalEvent', async () => {
      fixture = await mount('bit-input');

      const inputHandler = vi.fn();

      fixture.element.addEventListener('input', inputHandler);

      await user.type(fixture.query<HTMLInputElement>('input')!, 'a');

      expect(inputHandler).toHaveBeenCalledTimes(1);

      const detail = (inputHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.value).toBe('a');
      expect(detail.originalEvent).toBeDefined();
    });

    it('emits custom change event with value and originalEvent', async () => {
      fixture = await mount('bit-input');

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      const input = fixture.query<HTMLInputElement>('input')!;

      input.value = 'changed';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(changeHandler).toHaveBeenCalledTimes(1);

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.value).toBe('changed');
      expect(detail.originalEvent).toBeDefined();
    });
  });

  // ─── Colors ─────────────────────────────────────────────────────────────────

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-input', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('updates color dynamically', async () => {
      fixture = await mount('bit-input', { attrs: { color: 'primary' } });

      await fixture.attr('color', 'error');

      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  // ─── Variants ──────────────────────────────────────────────────────────────

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost'] as const;

    variants.forEach((variant) => {
      it(`applies ${variant} variant`, async () => {
        fixture = await mount('bit-input', { attrs: { variant } });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('updates variant dynamically', async () => {
      fixture = await mount('bit-input', { attrs: { variant: 'solid' } });

      await fixture.attr('variant', 'outline');

      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });
  });

  // ─── Sizes ──────────────────────────────────────────────────────────────────

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-input', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('updates size dynamically', async () => {
      fixture = await mount('bit-input', { attrs: { size: 'sm' } });

      await fixture.attr('size', 'lg');

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles multiple attribute changes at once', async () => {
      fixture = await mount('bit-input');

      await fixture.attrs({ placeholder: 'Enter email', required: true, size: 'lg', type: 'email' });

      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.type).toBe('email');
      expect(input?.placeholder).toBe('Enter email');
      expect(input?.required).toBe(true);
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('handles fullwidth attribute', async () => {
      fixture = await mount('bit-input', { attrs: { fullwidth: true } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('handles rounded attribute', async () => {
      fixture = await mount('bit-input', { attrs: { rounded: 'full' } });

      expect(fixture.element.getAttribute('rounded')).toBe('full');
    });

    it('marks char counter as near-limit at 90% maxlength', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          maxlength: '10',
          value: '123456789',
        },
      });

      const counter = fixture.query<HTMLElement>('.char-counter');

      expect(counter?.hidden).toBe(false);
      expect(counter?.textContent?.trim()).toBe('9 / 10');
      expect(counter?.hasAttribute('data-near-limit')).toBe(true);
      expect(counter?.hasAttribute('data-at-limit')).toBe(false);
    });

    it('marks char counter as at-limit at maxlength', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          maxlength: '10',
          value: '1234567890',
        },
      });

      const counter = fixture.query<HTMLElement>('.char-counter');

      expect(counter?.hidden).toBe(false);
      expect(counter?.textContent?.trim()).toBe('10 / 10');
      expect(counter?.hasAttribute('data-at-limit')).toBe(true);
      expect(counter?.hasAttribute('data-near-limit')).toBe(false);
    });
  });
});

describe('bit-input accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./input'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Semantic Structure ──────────────────────────────────────────────────────

  describe('Semantic Structure', () => {
    it('renders a native <input> element inside shadow DOM', async () => {
      fixture = await mount('bit-input');

      expect(fixture.query('input')).toBeTruthy();
    });

    it('input is naturally focusable (no tabindex=-1)', async () => {
      fixture = await mount('bit-input');

      expect(fixture.query<HTMLInputElement>('input')?.tabIndex).not.toBe(-1);
    });

    it('error message has role="alert" for assistive technology announcements', async () => {
      fixture = await mount('bit-input', { attrs: { error: 'Required field' } });

      const errorEl = fixture.query('[role="alert"]');

      expect(errorEl).toBeTruthy();
      expect(errorEl?.textContent?.trim()).toBe('Required field');
    });
  });

  // ─── WAI-ARIA Attributes ─────────────────────────────────────────────────────

  describe('WAI-ARIA Attributes', () => {
    it('sets aria-invalid="true" on inner input when error is present', async () => {
      fixture = await mount('bit-input', {
        attrs: { error: 'Invalid email', label: 'Email', 'label-placement': 'outside' },
      });

      expect(fixture.query('input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('updates aria-invalid when error is added dynamically', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          label: 'Email',
          'label-placement': 'outside',
        },
      });
      expect(fixture.query('input')?.getAttribute('aria-invalid')).not.toBe('true');

      await fixture.attr('error', 'Invalid');

      expect(fixture.query('input')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('clears aria-invalid when error is removed', async () => {
      fixture = await mount('bit-input', {
        attrs: { error: 'Required', label: 'Email', 'label-placement': 'outside' },
      });
      expect(fixture.query('input')?.getAttribute('aria-invalid')).toBe('true');

      await fixture.attr('error', '');

      expect(fixture.query('input')?.getAttribute('aria-invalid')).not.toBe('true');
    });

    it('sets aria-labelledby pointing to label when outside label is set', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          label: 'Username',
          'label-placement': 'outside',
        },
      });

      const labelledByVal = fixture.query('input')?.getAttribute('aria-labelledby');

      expect(labelledByVal).toBeTruthy();

      const labelEl = fixture.query(`[id="${labelledByVal}"]`);

      expect(labelEl).toBeTruthy();
    });

    it('sets aria-describedby when helper text is present', async () => {
      fixture = await mount('bit-input', {
        attrs: { helper: 'Enter your email', label: 'Email', 'label-placement': 'outside' },
      });

      const describedByVal = fixture.query('input')?.getAttribute('aria-describedby');

      expect(describedByVal).toBeTruthy();
    });

    it('sets required on input for assistive technology', async () => {
      fixture = await mount('bit-input', { attrs: { required: true } });

      expect(fixture.query<HTMLInputElement>('input')?.required).toBe(true);
    });
  });

  // ─── States ──────────────────────────────────────────────────────────────────

  describe('Accessibility of States', () => {
    it('disabled input is not reachable by keyboard', async () => {
      fixture = await mount('bit-input', { attrs: { disabled: true } });

      expect(fixture.query<HTMLInputElement>('input')?.disabled).toBe(true);
    });

    it('readonly input is keyboard-accessible but not editable', async () => {
      fixture = await mount('bit-input', {
        attrs: {
          readonly: true,
          value: 'Read only',
        },
      });

      const input = fixture.query<HTMLInputElement>('input')!;

      expect(input.readOnly).toBe(true);
      expect(input.tabIndex).not.toBe(-1);
    });
  });

  // ─── Input Type Forwarding ───────────────────────────────────────────────────

  describe('Input Type Forwarding', () => {
    const types = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'] as const;

    types.forEach((type) => {
      it(`forwards type="${type}" to inner input for correct keyboard behavior`, async () => {
        fixture = await mount('bit-input', { attrs: { type } });

        expect(fixture.query<HTMLInputElement>('input')?.type).toBe(type);
      });
    });
  });

  // ─── Keyboard Navigation ─────────────────────────────────────────────────────

  describe('Keyboard Navigation', () => {
    it('accepts typed input via keyboard', async () => {
      fixture = await mount('bit-input');

      const inputEl = fixture.query<HTMLInputElement>('input')!;

      await user.type(inputEl, 'hello');

      expect(inputEl.value).toBe('hello');
    });

    it('clear button is accessible with aria-label="Clear"', async () => {
      fixture = await mount('bit-input', { attrs: { value: 'some text' } });
      await fixture.flush();

      const clearBtn = fixture.query('.clear-btn');

      if (clearBtn) {
        expect(clearBtn.getAttribute('aria-label')).toBe('Clear');
      }
    });
  });
});
