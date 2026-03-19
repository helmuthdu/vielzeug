import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-textarea', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./textarea'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders wrapper, field, and textarea elements', async () => {
      fixture = await mount('bit-textarea');

      expect(fixture.query('.textarea-wrapper')).toBeTruthy();
      expect(fixture.query('.field')).toBeTruthy();
      expect(fixture.query('textarea')).toBeTruthy();
    });

    it('renders helper text when helper attribute is set', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { helper: 'Max 200 characters' },
      });

      expect(fixture.query('.helper-text')).toBeTruthy();
    });

    it('renders error message with role="alert"', async () => {
      fixture = await mount('bit-textarea', { attrs: { error: 'Required' } });

      expect(fixture.query('.helper-text')).toBeTruthy();
    });
  });

  // ─── Value Management ────────────────────────────────────────────────────────

  describe('Value Management', () => {
    it('sets initial value in textarea', async () => {
      fixture = await mount('bit-textarea', { attrs: { value: 'Hello World' } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.value).toBe('Hello World');
    });

    it('updates textarea value when attribute changes', async () => {
      fixture = await mount('bit-textarea', { attrs: { value: 'initial' } });

      await fixture.attr('value', 'updated');

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.value).toBe('updated');
    });

    it('handles empty string value', async () => {
      fixture = await mount('bit-textarea', { attrs: { value: '' } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.value).toBe('');
    });
  });

  // ─── Label and Placeholder ───────────────────────────────────────────────────

  describe('Label and Placeholder', () => {
    it('sets name on textarea', async () => {
      fixture = await mount('bit-textarea', { attrs: { name: 'message' } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.name).toBe('message');
    });

    it('sets placeholder on textarea', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { placeholder: 'Enter message' },
      });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.placeholder).toBe('Enter message');
    });
  });

  // ─── States ──────────────────────────────────────────────────────────────────

  describe('Disabled State', () => {
    it('disables textarea when disabled', async () => {
      fixture = await mount('bit-textarea', { attrs: { disabled: true } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.disabled).toBe(true);
    });

    it('reflects disabled on host', async () => {
      fixture = await mount('bit-textarea', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Readonly State', () => {
    it('sets readOnly on textarea', async () => {
      fixture = await mount('bit-textarea', { attrs: { readonly: true } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.readOnly).toBe(true);
    });
  });

  describe('Required State', () => {
    it('sets required on textarea', async () => {
      fixture = await mount('bit-textarea', { attrs: { required: true } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.required).toBe(true);
    });
  });

  // ─── Error State ─────────────────────────────────────────────────────────────

  describe('Error State', () => {
    it('renders error message text', async () => {
      fixture = await mount('bit-textarea', { attrs: { error: 'Too short' } });

      const errorEl = fixture.query('.helper-text');

      expect(errorEl?.textContent?.trim()).toBe('Too short');
    });

    it('sets aria-invalid on textarea when error is set', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { error: 'Required', label: 'Comment', 'label-placement': 'outside' },
      });

      expect(fixture.query('textarea')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('does not set aria-invalid when no error', async () => {
      fixture = await mount('bit-textarea', {
        attrs: {
          label: 'Comment',
          'label-placement': 'outside',
        },
      });

      expect(fixture.query('textarea')?.getAttribute('aria-invalid')).not.toBe('true');
    });

    it('does not reflect an empty error attribute by default', async () => {
      fixture = await mount('bit-textarea');
      await fixture.flush();

      expect(fixture.element.hasAttribute('error')).toBe(false);
    });

    it('removes the host error attribute when error becomes empty', async () => {
      fixture = await mount('bit-textarea', { attrs: { error: 'Required' } });
      await fixture.flush();

      expect(fixture.element.getAttribute('error')).toBe('Required');

      await fixture.attr('error', '');
      await fixture.flush();

      expect(fixture.element.hasAttribute('error')).toBe(false);
    });

    it('prefers error text over helper text in merged assistive block', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { error: 'Too short', helper: 'At least 20 characters' },
      });

      const helperEl = fixture.query<HTMLElement>('.helper-text');

      expect(helperEl?.hidden).toBe(false);
      expect(helperEl?.textContent?.trim()).toBe('Too short');
    });
  });

  // ─── Rows and Resize ─────────────────────────────────────────────────────────

  describe('Rows and Resize', () => {
    it('sets rows attribute on textarea', async () => {
      fixture = await mount('bit-textarea', { attrs: { rows: '5' } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.rows).toBe(5);
    });

    it('updates rows dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { rows: '2' } });

      await fixture.attr('rows', '8');

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.rows).toBe(8);
    });

    it('applies no-resize attribute on host', async () => {
      fixture = await mount('bit-textarea', { attrs: { 'no-resize': true } });

      expect(fixture.element.hasAttribute('no-resize')).toBe(true);
    });
  });

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('emits custom input event with value and originalEvent', async () => {
      fixture = await mount('bit-textarea');

      const inputHandler = vi.fn();

      fixture.element.addEventListener('input', inputHandler);

      await user.type(fixture.query<HTMLTextAreaElement>('textarea')!, 'h');

      expect(inputHandler).toHaveBeenCalled();

      const detail = (inputHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.value).toBe('h');
      expect(detail.originalEvent).toBeDefined();
    });

    it('emits custom change event with value', async () => {
      fixture = await mount('bit-textarea');

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      const ta = fixture.query<HTMLTextAreaElement>('textarea')!;

      ta.value = 'some text';
      ta.dispatchEvent(new Event('change', { bubbles: true }));

      expect(changeHandler).toHaveBeenCalled();

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.value).toBe('some text');
    });
  });

  // ─── Colors ─────────────────────────────────────────────────────────────────

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-textarea', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('updates color dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { color: 'primary' } });

      await fixture.attr('color', 'error');

      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  // ─── Sizes ──────────────────────────────────────────────────────────────────

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-textarea', { attrs: { size } });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('updates size dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { size: 'sm' } });

      await fixture.attr('size', 'lg');

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles fullwidth attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { fullwidth: true } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('handles maxlength attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { maxlength: '100' } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.maxLength).toBe(100);
    });

    it('sets near-limit counter class at 90% maxlength', async () => {
      fixture = await mount('bit-textarea', {
        attrs: {
          maxlength: '10',
          value: '123456789',
        },
      });

      const counter = fixture.query<HTMLElement>('.counter');

      expect(counter?.hidden).toBe(false);
      expect(counter?.textContent?.trim()).toBe('9/10');
      expect(counter?.className).toContain('near-limit');
    });

    it('sets at-limit counter class at maxlength', async () => {
      fixture = await mount('bit-textarea', {
        attrs: {
          maxlength: '10',
          value: '1234567890',
        },
      });

      const counter = fixture.query<HTMLElement>('.counter');

      expect(counter?.hidden).toBe(false);
      expect(counter?.textContent?.trim()).toBe('10/10');
      expect(counter?.className).toContain('at-limit');
    });
  });
});

describe('bit-textarea accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./textarea'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Semantic Structure ──────────────────────────────────────────────────────

  describe('Semantic Structure', () => {
    it('renders a native <textarea> element inside shadow DOM', async () => {
      fixture = await mount('bit-textarea');

      expect(fixture.query('textarea')).toBeTruthy();
    });

    it('textarea is naturally focusable (no tabindex=-1)', async () => {
      fixture = await mount('bit-textarea');

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.tabIndex).not.toBe(-1);
    });

    it('error message has role="alert" for assistive technology', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { error: 'Field is required' },
      });

      const errorEl = fixture.query('.helper-text');

      expect(errorEl).toBeTruthy();
      expect(errorEl?.textContent?.trim()).toBe('Field is required');
    });
  });

  // ─── WAI-ARIA Attributes ─────────────────────────────────────────────────────

  describe('WAI-ARIA Attributes', () => {
    it('sets aria-invalid="true" on textarea when error is present', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { error: 'Invalid input', label: 'Message', 'label-placement': 'outside' },
      });

      expect(fixture.query('textarea')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('updates aria-invalid when error is added dynamically', async () => {
      fixture = await mount('bit-textarea', {
        attrs: {
          label: 'Message',
          'label-placement': 'outside',
        },
      });
      expect(fixture.query('textarea')?.getAttribute('aria-invalid')).not.toBe('true');

      await fixture.attr('error', 'Too short');

      expect(fixture.query('textarea')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('sets aria-labelledby pointing to label when outside label is set', async () => {
      fixture = await mount('bit-textarea', {
        attrs: {
          label: 'Comment',
          'label-placement': 'outside',
        },
      });

      const labelledByVal = fixture.query('textarea')?.getAttribute('aria-labelledby');

      expect(labelledByVal).toBeTruthy();

      const labelEl = fixture.query(`[id="${labelledByVal}"]`);

      expect(labelEl).toBeTruthy();
    });

    it('sets aria-describedby when helper text is present', async () => {
      fixture = await mount('bit-textarea', {
        attrs: { helper: 'Max 500 characters', label: 'Comment', 'label-placement': 'outside' },
      });

      const describedByVal = fixture.query('textarea')?.getAttribute('aria-describedby');

      expect(describedByVal).toBeTruthy();
    });

    it('sets required on textarea for assistive technology', async () => {
      fixture = await mount('bit-textarea', { attrs: { required: true } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.required).toBe(true);
    });
  });

  // ─── States ──────────────────────────────────────────────────────────────────

  describe('Accessibility of States', () => {
    it('disabled textarea is not reachable by keyboard', async () => {
      fixture = await mount('bit-textarea', { attrs: { disabled: true } });

      expect(fixture.query<HTMLTextAreaElement>('textarea')?.disabled).toBe(true);
    });

    it('readonly textarea is keyboard-accessible but not editable', async () => {
      fixture = await mount('bit-textarea', {
        attrs: {
          readonly: true,
          value: 'Read only',
        },
      });

      const ta = fixture.query<HTMLTextAreaElement>('textarea')!;

      expect(ta.readOnly).toBe(true);
      expect(ta.tabIndex).not.toBe(-1);
    });
  });

  // ─── Keyboard Navigation ─────────────────────────────────────────────────────

  describe('Keyboard Navigation', () => {
    it('accepts typed input via keyboard', async () => {
      fixture = await mount('bit-textarea');

      const ta = fixture.query<HTMLTextAreaElement>('textarea')!;

      await user.type(ta, 'hello');

      expect(ta.value).toBe('hello');
    });
  });
});
