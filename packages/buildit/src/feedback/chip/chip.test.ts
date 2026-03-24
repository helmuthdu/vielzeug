import { type Fixture, fire, mount } from '@vielzeug/craftit/test';

describe('bit-chip', () => {
  let fixture: Fixture<HTMLElement> | undefined;

  beforeAll(async () => {
    await import('./chip');
  });

  afterEach(() => {
    fixture = undefined;
  });

  describe('Rendering', () => {
    it('renders chip content via slot', async () => {
      fixture = await mount('bit-chip', { html: 'Label' });

      expect(fixture.element.textContent?.trim()).toBe('Label');
    });

    it('does not render remove button in static mode', async () => {
      fixture = await mount('bit-chip');

      expect(fixture.query('.remove-btn')).toBeNull();
    });

    it('renders remove button in removable mode', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'removable' } });

      expect(fixture.query('.remove-btn')?.hasAttribute('hidden')).toBe(false);
    });

    it('renders selectable mode as button with checkbox semantics', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'selectable' } });

      const toggle = fixture.query<HTMLButtonElement>('.chip-btn');

      expect(toggle).toBeTruthy();
      expect(toggle?.getAttribute('role')).toBe('checkbox');
      expect(toggle?.getAttribute('aria-checked')).toBe('false');
      expect(toggle?.hasAttribute('aria-label')).toBe(false);
    });

    it('remove button has accessible label', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'removable' } });

      expect(fixture.query('.remove-btn')?.getAttribute('aria-label')).toBe('Remove');
    });

    it('remove button uses the explicit aria-label when provided', async () => {
      fixture = await mount('bit-chip', {
        attrs: { 'aria-label': 'Saved filter', mode: 'removable', value: 'filter-1' },
      });

      expect(fixture.query('.remove-btn')?.getAttribute('aria-label')).toBe('Remove Saved filter');
    });
  });

  describe('Props', () => {
    it('applies color', async () => {
      fixture = await mount('bit-chip', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size', async () => {
      fixture = await mount('bit-chip', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies disabled', async () => {
      fixture = await mount('bit-chip', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      await fixture.attr('disabled', false);
    });

    it('applies value', async () => {
      fixture = await mount('bit-chip', { attrs: { value: 'tag-1' } });

      expect(fixture.element.getAttribute('value')).toBe('tag-1');
    });
  });

  describe('Removable Mode', () => {
    it('fires remove event when remove button clicked', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'removable', value: 'chip-1' } });

      const handler = vi.fn();

      fixture.element.addEventListener('remove', handler);

      fire.click(fixture.query<HTMLElement>('.remove-btn')!);

      expect(handler).toHaveBeenCalled();
    });

    it('remove event carries value', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'removable', value: 'chip-x' } });

      let detail: { originalEvent?: Event; value?: string } | undefined;

      fixture.element.addEventListener('remove', (e: Event) => {
        detail = (e as CustomEvent).detail;
      });

      fire.click(fixture.query<HTMLElement>('.remove-btn')!);

      expect(detail?.value).toBe('chip-x');
      expect(detail?.originalEvent).toBeInstanceOf(MouseEvent);
    });

    it('does not emit remove when disabled', async () => {
      fixture = await mount('bit-chip', { attrs: { disabled: '', mode: 'removable', value: 'chip-x' } });

      const handler = vi.fn();

      fixture.element.addEventListener('remove', handler);

      fire.click(fixture.query<HTMLElement>('.remove-btn')!);

      expect(handler).not.toHaveBeenCalled();
      await fixture.attr('disabled', false);
    });
  });

  describe('Selectable Mode', () => {
    it('toggles unchecked to checked in uncontrolled mode', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'selectable', value: 'chip-a' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      const toggle = fixture.query<HTMLButtonElement>('.chip-btn')!;

      fire.click(toggle);
      await fixture.flush();

      expect(handler).toHaveBeenCalledTimes(1);

      const ev = handler.mock.calls[0][0] as CustomEvent<{
        checked: boolean;
        originalEvent: Event;
        value: string | undefined;
      }>;

      expect(ev.detail.checked).toBe(true);
      expect(ev.detail.value).toBe('chip-a');
      expect(ev.detail.originalEvent).toBeInstanceOf(MouseEvent);
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    it('uses default-checked for initial uncontrolled state', async () => {
      fixture = await mount('bit-chip', { attrs: { 'default-checked': '', mode: 'selectable' } });

      const toggle = fixture.query<HTMLButtonElement>('.chip-btn')!;

      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    it('emits change in controlled mode without mutating aria-checked', async () => {
      fixture = await mount('bit-chip', { attrs: { checked: '', mode: 'selectable' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      const toggle = fixture.query<HTMLButtonElement>('.chip-btn')!;

      expect(toggle.getAttribute('aria-checked')).toBe('true');

      fire.click(toggle);

      expect(handler).toHaveBeenCalledTimes(1);

      const ev = handler.mock.calls[0][0] as CustomEvent<{ checked: boolean }>;

      expect(ev.detail.checked).toBe(false);
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    it('treats a defined checked property as controlled and reflects host state', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'selectable' } });

      const toggle = fixture.query<HTMLButtonElement>('.chip-btn')!;

      (fixture.element as HTMLElement & { checked?: boolean }).checked = true;
      await fixture.flush();

      expect(toggle.getAttribute('aria-checked')).toBe('true');
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      fire.click(toggle);
      await fixture.flush();

      expect(toggle.getAttribute('aria-checked')).toBe('true');
      expect(fixture.element.hasAttribute('checked')).toBe(true);
    });

    it('does not emit change when disabled', async () => {
      fixture = await mount('bit-chip', { attrs: { disabled: '', mode: 'selectable' } });

      const handler = vi.fn();

      fixture.element.addEventListener('change', handler);

      fire.click(fixture.query<HTMLButtonElement>('.chip-btn')!);

      expect(handler).not.toHaveBeenCalled();
      await fixture.attr('disabled', false);
    });

    it('switching mode from selectable clears host checked attribute', async () => {
      fixture = await mount('bit-chip', { attrs: { 'default-checked': '', mode: 'selectable' } });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
      await fixture.attr('mode', 'static');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Action Mode', () => {
    it('fires click event with detail when action chip clicked', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'action', value: 'add' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      fire.click(fixture.query<HTMLButtonElement>('.chip-btn')!);

      expect(handler).toHaveBeenCalledTimes(1);

      const ev = handler.mock.calls[0][0] as CustomEvent<{
        originalEvent: MouseEvent;
        value: string | undefined;
      }>;

      expect(ev.detail.value).toBe('add');
      expect(ev.detail.originalEvent).toBeInstanceOf(MouseEvent);
    });

    it('does not emit click when disabled', async () => {
      fixture = await mount('bit-chip', { attrs: { disabled: '', mode: 'action', value: 'add' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      fire.click(fixture.query<HTMLButtonElement>('.chip-btn')!);

      expect(handler).not.toHaveBeenCalled();
      await fixture.attr('disabled', false);
    });
  });

  describe('Disabled State', () => {
    it('remove button is disabled when chip is disabled in removable mode', async () => {
      fixture = await mount('bit-chip', { attrs: { disabled: '', mode: 'removable' } });

      const btn = fixture.query<HTMLButtonElement>('.remove-btn');

      if (btn) {
        expect(btn.disabled || btn.hasAttribute('disabled')).toBe(true);
      }

      await fixture.attr('disabled', false);
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'success', 'warning', 'error', 'info']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-chip', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    }
  });
});

describe('bit-chip accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>> | undefined;

  beforeAll(async () => {
    await import('./chip');
  });

  afterEach(() => {
    fixture = undefined;
  });

  describe('Remove Button', () => {
    it('remove button has aria-label Remove', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'removable' } });

      expect(fixture.query('.remove-btn')?.getAttribute('aria-label')).toBe('Remove');
    });

    it('remove button is keyboard accessible', async () => {
      fixture = await mount('bit-chip', { attrs: { mode: 'removable' } });

      const btn = fixture.query<HTMLButtonElement>('.remove-btn');

      expect(btn?.tagName.toLowerCase()).toBe('button');
    });
  });

  describe('Disabled State', () => {
    it('chip with disabled has aria-disabled or disabled attribute', async () => {
      fixture = await mount('bit-chip', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled') || fixture.element.getAttribute('aria-disabled') === 'true').toBe(
        true,
      );

      await fixture.attr('disabled', false);
    });
  });
});
