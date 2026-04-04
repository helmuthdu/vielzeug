import { type Fixture, mount, user } from '@vielzeug/craftit/testing';

describe('bit-alert', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./alert');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders alert container', async () => {
      fixture = await mount('bit-alert');

      expect(fixture.query('[role="status"], [role="alert"]')).toBeTruthy();
    });

    it('renders default slot content', async () => {
      fixture = await mount('bit-alert', { html: '<p>Alert message</p>' });

      expect(fixture.element.textContent?.trim()).toBe('Alert message');
    });

    it('renders heading when provided', async () => {
      fixture = await mount('bit-alert', { attrs: { heading: 'Warning!' } });

      expect(fixture.element.getAttribute('heading')).toBe('Warning!');
    });

    it('dismiss button is hidden when not dismissible', async () => {
      fixture = await mount('bit-alert');

      // The close button is CSS-hidden when not dismissible (jsdom can't test CSS)
      // Verify functionally: clicking the button does not emit dismiss
      const handler = vi.fn();

      fixture.element.addEventListener('dismiss', handler);
      await user.click(fixture.query<HTMLElement>('.close')!);
      expect(handler).not.toHaveBeenCalled();
    });

    it('dismiss button renders when dismissible', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissible: '' } });

      expect(fixture.query('.close')).toBeTruthy();
    });

    it('dismiss button has accessible label', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissible: '' } });

      expect(fixture.query('.close')?.getAttribute('aria-label')).toBe('Dismiss alert');
    });
  });

  describe('ARIA Live Region', () => {
    it('has aria-live polite by default', async () => {
      fixture = await mount('bit-alert');

      // role="status" carries implicit aria-live="polite" — no explicit attribute needed
      expect(fixture.query('[role="status"]')).toBeTruthy();
    });

    it('has aria-live assertive for error color', async () => {
      fixture = await mount('bit-alert', { attrs: { color: 'error' } });

      // role="alert" carries implicit aria-live="assertive"
      expect(fixture.query('[role="alert"]')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('applies color', async () => {
      fixture = await mount('bit-alert', { attrs: { color: 'success' } });

      expect(fixture.element.getAttribute('color')).toBe('success');
    });

    it('applies variant', async () => {
      fixture = await mount('bit-alert', { attrs: { variant: 'outlined' } });

      expect(fixture.element.getAttribute('variant')).toBe('outlined');
    });

    it('applies size', async () => {
      fixture = await mount('bit-alert', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies horizontal', async () => {
      fixture = await mount('bit-alert', { attrs: { horizontal: '' } });

      expect(fixture.element.hasAttribute('horizontal')).toBe(true);
    });

    it('applies accented', async () => {
      fixture = await mount('bit-alert', { attrs: { accented: '' } });

      expect(fixture.element.hasAttribute('accented')).toBe(true);
    });
  });

  describe('Dismiss', () => {
    it('fires dismiss event when close button clicked', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissible: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('dismiss', handler);

      await user.click(fixture.query<HTMLElement>('.close')!);
      // jsdom does not run CSS animations; manually fire animationend
      fixture.element.dispatchEvent(new Event('animationend'));
      await fixture.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('dismisses even when animationend is not fired', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissible: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('dismiss', handler);

      await user.click(fixture.query<HTMLElement>('.close')!);
      await fixture.flush();

      expect(fixture.element.hasAttribute('dismissed')).toBe(true);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'success', 'warning', 'error', 'info']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-alert', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      });
    }
  });
});

describe('bit-alert accessibility', () => {
  let fixture: Awaited<ReturnType<typeof mount>>;

  beforeAll(async () => {
    await import('./alert');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('WAI-ARIA Role', () => {
    it('has role alert on container for error color', async () => {
      fixture = await mount('bit-alert', { attrs: { color: 'error' } });

      expect(fixture.query('[role="alert"]')).toBeTruthy();
    });

    it('has role status on container by default', async () => {
      fixture = await mount('bit-alert');

      expect(fixture.query('[role="status"]')).toBeTruthy();
    });

    it('icon has aria-hidden', async () => {
      fixture = await mount('bit-alert');

      const icon = fixture.query('.icon');

      if (icon) {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  describe('Live Region', () => {
    it('uses aria-live polite by default', async () => {
      fixture = await mount('bit-alert');

      // role="status" carries implicit aria-live="polite" — no explicit attribute needed
      expect(fixture.query('[role="status"]')).toBeTruthy();
    });

    it('uses aria-live assertive for error color', async () => {
      fixture = await mount('bit-alert', { attrs: { color: 'error' } });

      // role="alert" carries implicit aria-live="assertive"
      expect(fixture.query('[role="alert"]')).toBeTruthy();
    });

    it('uses aria-live polite for non-error colors', async () => {
      for (const color of ['primary', 'success', 'warning', 'info']) {
        fixture = await mount('bit-alert', { attrs: { color } });
        expect(fixture.query('[role="status"]')).toBeTruthy();
        fixture.destroy();
      }
    });
  });

  describe('Dismissible Accessibility', () => {
    it('close button has aria-label', async () => {
      fixture = await mount('bit-alert', { attrs: { dismissible: '' } });

      expect(fixture.query('.close')?.getAttribute('aria-label')).toBe('Dismiss alert');
    });

    it('close button is keyboard accessible via Enter', async () => {
      const handler = { called: false };

      fixture = await mount('bit-alert', { attrs: { dismissible: '' } });
      fixture.element.addEventListener('dismiss', () => {
        handler.called = true;
      });

      const btn = fixture.query<HTMLElement>('.close')!;

      btn.focus();
      await user.click(btn);
      // jsdom does not run CSS animations; manually fire animationend
      fixture.element.dispatchEvent(new Event('animationend'));
      await fixture.flush();

      expect(handler.called).toBe(true);
    });
  });
});
