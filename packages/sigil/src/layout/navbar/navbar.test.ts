import { type Fixture, mount, user } from '@vielzeug/craft/testing';

describe('sg-navbar', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./navbar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders a nav landmark with default label', async () => {
    fixture = await mount('sg-navbar');

    expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('uses custom nav label', async () => {
    fixture = await mount('sg-navbar', { attrs: { label: 'Application navigation' } });

    expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Application navigation');
  });

  it('supports floating mode', async () => {
    fixture = await mount('sg-navbar', { attrs: { floating: '' } });

    expect(fixture.element.getAttribute('data-mode')).toBe('floating');
  });

  it('supports sticky mode', async () => {
    fixture = await mount('sg-navbar', { attrs: { sticky: '' } });

    expect(fixture.element.getAttribute('data-mode')).toBe('sticky');
  });

  it('turns floating+sticky into sticky mode after scroll threshold', async () => {
    const originalScrollY = window.scrollY;

    try {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 0,
      });

      fixture = await mount('sg-navbar', { attrs: { floating: '', 'scroll-threshold': '20', sticky: '' } });
      expect(fixture.element.getAttribute('data-mode')).toBe('floating');
      expect(fixture.element.hasAttribute('data-scrolled')).toBe(false);

      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 80,
      });
      window.dispatchEvent(new Event('scroll'));
      await fixture.flush();

      expect(fixture.element.getAttribute('data-mode')).toBe('sticky');
      expect(fixture.element.hasAttribute('data-scrolled')).toBe(true);
    } finally {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: originalScrollY,
      });
    }
  });

  it('keeps menu closed when no mobile-menu slot is present', async () => {
    fixture = await mount('sg-navbar');

    expect(fixture.query('[part="mobile-menu"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('keeps mobile toggle hidden when no mobile-menu slot is present', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar');
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile')).toBe(true);
      expect(fixture.query('[part="mobile-toggle"]')?.hasAttribute('hidden')).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('keeps mobile toggle hidden when mobile-menu slot is empty', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        html: '<div slot="mobile-menu"></div>',
      });
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile')).toBe(true);
      expect(fixture.query('[part="mobile-toggle"]')?.hasAttribute('hidden')).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('shows mobile toggle and controls external sidebar when mobile-sidebar is set', async () => {
    const originalMatchMedia = window.matchMedia;
    const sidebar = document.createElement('sg-sidebar') as HTMLElement & {
      toggleMobile?: () => void;
    };

    sidebar.id = 'external-sidebar';
    sidebar.toggleMobile = vi.fn(() => {
      sidebar.toggleAttribute('data-mobile-open');
      sidebar.dispatchEvent(new CustomEvent('mobile-open-change'));
    });
    document.body.append(sidebar);

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        attrs: { 'mobile-sidebar': '#external-sidebar' },
      });
      await fixture.flush();

      const btn = fixture.query<HTMLButtonElement>('[part="mobile-toggle"]');

      expect(btn?.hasAttribute('hidden')).toBe(false);

      await user.click(btn!);
      await fixture.flush();

      expect(sidebar.toggleMobile).toHaveBeenCalledTimes(1);
      expect(btn?.getAttribute('aria-expanded')).toBe('true');
    } finally {
      sidebar.remove();
      window.matchMedia = originalMatchMedia;
    }
  });

  it('follows external sidebar mobile mode changes', async () => {
    const originalMatchMedia = window.matchMedia;
    const sidebar = document.createElement('sg-sidebar');

    sidebar.id = 'external-sidebar-mode';
    sidebar.setAttribute('data-bottom-nav', '');
    document.body.append(sidebar);

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        attrs: { 'mobile-sidebar': '#external-sidebar-mode' },
      });
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile')).toBe(true);

      sidebar.removeAttribute('data-bottom-nav');
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile')).toBe(false);
    } finally {
      sidebar.remove();
      window.matchMedia = originalMatchMedia;
    }
  });

  it('supports imperative mobile menu API', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        html: '<div slot="mobile-menu">Menu</div>',
      });

      const el = fixture.element as HTMLElement & {
        closeMobileMenu(): void;
        openMobileMenu(): void;
        toggleMobileMenu(): void;
      };

      el.openMobileMenu();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(true);

      el.closeMobileMenu();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(false);

      el.toggleMobileMenu();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('does not open mobile menu when mobile-menu slot is empty', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        html: '<div slot="mobile-menu"></div>',
      });

      const el = fixture.element as HTMLElement & {
        openMobileMenu(): void;
      };

      el.openMobileMenu();
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(false);
      expect(fixture.query('[part="mobile-menu"]')?.hasAttribute('hidden')).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('opens mobile menu in floating-only mode', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        attrs: { floating: '' },
        html: '<div slot="mobile-menu">Menu</div>',
      });

      const el = fixture.element as HTMLElement & {
        openMobileMenu(): void;
      };

      expect(fixture.element.getAttribute('data-mode')).toBe('floating');

      el.openMobileMenu();
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(true);
      expect(fixture.query('[part="mobile-menu"]')?.hasAttribute('hidden')).toBe(false);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('emits mobile-menu-change when menu state changes', async () => {
    fixture = await mount('sg-navbar', {
      html: '<div slot="mobile-menu">Menu</div>',
    });

    const handler = vi.fn();

    fixture.element.addEventListener('mobile-menu-change', handler);
    (fixture.element as HTMLElement & { openMobileMenu(): void }).openMobileMenu();
    await fixture.flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ open: true });
  });

  it('toggles menu button in mobile mode', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        attrs: { breakpoint: '(max-width: 1000px)' },
        html: '<div slot="mobile-menu">Menu</div>',
      });

      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile')).toBe(true);

      const btn = fixture.query<HTMLButtonElement>('[part="mobile-toggle"]');

      expect(btn).toBeTruthy();
      await user.click(btn!);
      await fixture.flush();

      expect(btn?.getAttribute('aria-expanded')).toBe('true');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('closes mobile menu on Escape key', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-navbar', {
        html: '<div slot="mobile-menu">Menu</div>',
      });

      (fixture.element as HTMLElement & { openMobileMenu(): void }).openMobileMenu();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(true);

      fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(false);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('respects invalid scroll-threshold by falling back to 0', async () => {
    const originalScrollY = window.scrollY;

    try {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 1,
      });

      fixture = await mount('sg-navbar', { attrs: { floating: '', 'scroll-threshold': 'abc', sticky: '' } });

      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 2,
      });

      window.dispatchEvent(new Event('scroll'));
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-scrolled')).toBe(true);
    } finally {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: originalScrollY,
      });
    }
  });
});

describe('sg-navbar-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./navbar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders an anchor when href is present', async () => {
    fixture = await mount('sg-navbar-item', { attrs: { href: '/dashboard' } });

    expect(fixture.query('a.item')).toBeTruthy();
  });

  it('renders a button when href is absent', async () => {
    fixture = await mount('sg-navbar-item');

    expect(fixture.query('button.item')).toBeTruthy();
  });

  it('renders non-interactive item when disabled', async () => {
    fixture = await mount('sg-navbar-item', { attrs: { disabled: '', href: '/dashboard' } });

    expect(fixture.query('div.item')?.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.query('a.item')).toBeFalsy();
  });

  it('applies aria-current=page when active', async () => {
    fixture = await mount('sg-navbar-item', { attrs: { active: '', href: '/dashboard' } });

    expect(fixture.query('a.item')?.getAttribute('aria-current')).toBe('page');
  });

  it('keeps semantic text content accessible', async () => {
    fixture = await mount('sg-navbar-item', { html: 'Dashboard' });

    expect(fixture.element.textContent?.trim()).toBe('Dashboard');
  });
});
