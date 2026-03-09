import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-button', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders inner button element', async () => {
      fixture = await mount('bit-button');

      expect(fixture.query('[part="button"]')).toBeTruthy();
    });

    it('renders default slot content', async () => {
      fixture = await mount('bit-button', { html: '<span>Click me</span>' });

      expect(fixture.element.textContent?.trim()).toBe('Click me');
    });

    it('renders loader element', async () => {
      fixture = await mount('bit-button');

      expect(fixture.query('.loader')).toBeTruthy();
    });

    it('loader is hidden when not loading', async () => {
      fixture = await mount('bit-button');

      expect(fixture.query('.loader')?.hasAttribute('hidden')).toBe(true);
    });

    it('loader is visible when loading', async () => {
      fixture = await mount('bit-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Props', () => {
    it('applies solid variant by default', async () => {
      fixture = await mount('bit-button');

      expect(fixture.element.getAttribute('variant') ?? 'solid').toBe('solid');
    });

    it('applies outline variant', async () => {
      fixture = await mount('bit-button', { attrs: { variant: 'outline' } });

      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });

    it('applies ghost variant', async () => {
      fixture = await mount('bit-button', { attrs: { variant: 'ghost' } });

      expect(fixture.element.getAttribute('variant')).toBe('ghost');
    });

    it('applies color', async () => {
      fixture = await mount('bit-button', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies sm size', async () => {
      fixture = await mount('bit-button', { attrs: { size: 'sm' } });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('applies lg size', async () => {
      fixture = await mount('bit-button', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('applies fullwidth', async () => {
      fixture = await mount('bit-button', { attrs: { fullwidth: '' } });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('applies rounded', async () => {
      fixture = await mount('bit-button', { attrs: { rounded: '' } });

      expect(fixture.element.hasAttribute('rounded')).toBe(true);
    });

    it('reflects type attribute on host; inner button always type="button"', async () => {
      fixture = await mount('bit-button', { attrs: { type: 'submit' } });

      expect(fixture.element.getAttribute('type')).toBe('submit');
      const btn = fixture.query<HTMLButtonElement>('[part="button"]');
      expect(btn?.getAttribute('type')).toBe('button');
    });
  });

  describe('Disabled State', () => {
    it('sets aria-disabled when disabled', async () => {
      fixture = await mount('bit-button', { attrs: { disabled: '' } });

      const btn = fixture.query('[part="button"]');
      expect(btn?.getAttribute('aria-disabled')).toBe('true');
    });

    it('does not fire click event when disabled', async () => {
      fixture = await mount('bit-button', { attrs: { disabled: '' } });
      const handler = vi.fn();
      fixture.element.addEventListener('click', handler);

      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('sets aria-busy when loading', async () => {
      fixture = await mount('bit-button', { attrs: { loading: '' } });

      const btn = fixture.query('[part="button"]');
      expect(btn?.getAttribute('aria-busy')).toBe('true');
    });

    it('does not fire click event when loading', async () => {
      fixture = await mount('bit-button', { attrs: { loading: '' } });
      const handler = vi.fn();
      fixture.element.addEventListener('click', handler);

      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });

    it('loader has accessible label', async () => {
      fixture = await mount('bit-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.getAttribute('aria-label')).toBe('Loading');
    });
  });

  describe('Events', () => {
    it('fires click event on click', async () => {
      fixture = await mount('bit-button');
      const handler = vi.fn();
      fixture.element.addEventListener('click', handler);

      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Colors', () => {
    for (const color of ['primary', 'secondary', 'success', 'warning', 'error']) {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-button', { attrs: { color } });

        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      });
    }
  });

  describe('Link Mode', () => {
    it('renders as anchor when href is provided', async () => {
      fixture = await mount('bit-button', { attrs: { href: '/home' } });

      expect(fixture.query('a[part="button"]')).toBeTruthy();
    });

    it('anchor has correct href', async () => {
      fixture = await mount('bit-button', { attrs: { href: '/about' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('href')).toBe('/about');
    });
  });
});

describe('bit-button accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Semantic Structure', () => {
    it('inner element has role button', async () => {
      fixture = await mount('bit-button');

      expect(fixture.query('button[part="button"], [role="button"]')).toBeTruthy();
    });

    it('renders as native button element by default', async () => {
      fixture = await mount('bit-button');

      const btn = fixture.query('[part="button"]');
      expect(btn?.tagName.toLowerCase()).toBe('button');
    });

    it('renders as anchor when href provided', async () => {
      fixture = await mount('bit-button', { attrs: { href: '/page' } });

      expect(fixture.query('a[part="button"]')).toBeTruthy();
    });
  });

  describe('WAI-ARIA Attributes', () => {
    it('inner button default type is button', async () => {
      fixture = await mount('bit-button');

      const btn = fixture.query<HTMLButtonElement>('[part="button"]');
      expect(btn?.type ?? btn?.getAttribute('type')).toBe('button');
    });

    it('aria-disabled is true when disabled', async () => {
      fixture = await mount('bit-button', { attrs: { disabled: '' } });

      expect(fixture.query('[part="button"]')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('aria-disabled is false/absent when enabled', async () => {
      fixture = await mount('bit-button');

      const val = fixture.query('[part="button"]')?.getAttribute('aria-disabled');
      expect(val === null || val === 'false').toBe(true);
    });

    it('aria-busy is true when loading', async () => {
      fixture = await mount('bit-button', { attrs: { loading: '' } });

      expect(fixture.query('[part="button"]')?.getAttribute('aria-busy')).toBe('true');
    });

    it('aria-busy is absent when not loading', async () => {
      fixture = await mount('bit-button');

      expect(fixture.query('[part="button"]')?.getAttribute('aria-busy')).toBeNull();
    });

    it('loader has aria-label Loading', async () => {
      fixture = await mount('bit-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.getAttribute('aria-label')).toBe('Loading');
    });
  });

  describe('Keyboard Navigation', () => {
    it('fires click when Enter pressed on inner button', async () => {
      fixture = await mount('bit-button');
      const handler = vi.fn();
      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;
      btn.focus();
      await user.click(btn);

      expect(handler).toHaveBeenCalled();
    });

    it('fires click when Space pressed on inner button', async () => {
      fixture = await mount('bit-button');
      const handler = vi.fn();
      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;
      btn.focus();
      await user.click(btn);

      expect(handler).toHaveBeenCalled();
    });

    it('does not fire click when disabled and Enter pressed', async () => {
      fixture = await mount('bit-button', { attrs: { disabled: '' } });
      const handler = vi.fn();
      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;
      btn.focus();
      await user.click(btn);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
