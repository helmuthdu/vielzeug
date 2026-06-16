import { type Fixture, mount } from '@vielzeug/craft/testing';

describe('sg-sidebar', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders a nav landmark with default label', async () => {
    fixture = await mount('sg-sidebar');

    expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Sidebar navigation');
  });

  it('uses a custom nav label', async () => {
    fixture = await mount('sg-sidebar', { attrs: { label: 'Main navigation' } });

    expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('starts collapsed in uncontrolled mode with default-collapsed', async () => {
    fixture = await mount('sg-sidebar', { attrs: { 'default-collapsed': '' } });

    expect(fixture.element.hasAttribute('data-collapsed')).toBe(true);
  });

  it('reflects collapsed state in controlled mode', async () => {
    fixture = await mount('sg-sidebar', { attrs: { collapsed: '' } });

    expect(fixture.element.hasAttribute('data-collapsed')).toBe(true);
  });

  it('toggles in uncontrolled mode and emits collapsed-change', async () => {
    fixture = await mount('sg-sidebar', { attrs: { collapsible: '' } });

    const handler = vi.fn();

    fixture.element.addEventListener('collapsed-change', handler);
    fixture.query<HTMLButtonElement>('[part="toggle-btn"]')?.click();
    await fixture.flush();

    expect(fixture.element.hasAttribute('data-collapsed')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ collapsed: true, source: 'toggle' });
  });

  it('does not mutate collapsed UI in controlled mode when toggled', async () => {
    fixture = await mount('sg-sidebar', {
      attrs: {
        collapsed: '',
        collapsible: '',
      },
    });

    const handler = vi.fn();

    fixture.element.addEventListener('collapsed-change', handler);
    fixture.query<HTMLButtonElement>('[part="toggle-btn"]')?.click();
    await fixture.flush();

    expect(fixture.element.hasAttribute('data-collapsed')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ collapsed: false, source: 'toggle' });
  });

  it('supports setCollapsed() and toggle() imperative API', async () => {
    fixture = await mount('sg-sidebar', { attrs: { collapsible: '' } });

    const el = fixture.element as HTMLElement & {
      setCollapsed(next: boolean): void;
      toggle(): void;
    };

    el.setCollapsed(true);
    await fixture.flush();
    expect(fixture.element.hasAttribute('data-collapsed')).toBe(true);

    el.toggle();
    await fixture.flush();
    expect(fixture.element.hasAttribute('data-collapsed')).toBe(false);
  });

  it('applies responsive collapse on media-query match', async () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
        changeHandler = cb;
      },
      matches: false,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-sidebar', { attrs: { responsive: '(max-width: 768px)' } });
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-collapsed')).toBe(false);

      changeHandler?.({ matches: true } as MediaQueryListEvent);
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-collapsed')).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('enters bottom-nav mode when bottom-nav-at query matches', async () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
        changeHandler = cb;
      },
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-sidebar', { attrs: { 'bottom-nav-at': '(max-width: 768px)' } });
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-bottom-nav')).toBe(true);
      expect(fixture.element.hasAttribute('data-collapsed')).toBe(false);

      changeHandler?.({ matches: false } as MediaQueryListEvent);
      await fixture.flush();

      expect(fixture.element.hasAttribute('data-bottom-nav')).toBe(false);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('supports openMobile/closeMobile/toggleMobile API in bottom-nav mode', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-sidebar', {
        attrs: { 'bottom-nav-at': '(max-width: 768px)' },
      });

      const el = fixture.element as HTMLElement & {
        closeMobile(): void;
        openMobile(): void;
        toggleMobile(): void;
      };

      el.openMobile();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(true);

      el.toggleMobile();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(false);

      el.openMobile();
      await fixture.flush();
      el.closeMobile();
      await fixture.flush();
      expect(fixture.element.hasAttribute('data-mobile-open')).toBe(false);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('renders bottom tabs only from direct sidebar-item children', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches: true,
      removeEventListener: vi.fn(),
    }));

    try {
      fixture = await mount('sg-sidebar', {
        attrs: { 'bottom-nav-at': '(max-width: 768px)' },
        html: `
          <sg-sidebar-item href="#" active>Home</sg-sidebar-item>
          <sg-sidebar-item href="#">Search</sg-sidebar-item>
          <sg-sidebar-group label="More">
            <sg-sidebar-item href="#">Nested</sg-sidebar-item>
          </sg-sidebar-group>
        `,
      });
      await fixture.flush();

      const bar = fixture.query('[part="bottom-bar"]');
      const tabs = bar?.querySelectorAll('.bottom-tab') ?? [];

      expect(tabs.length).toBe(2);
      expect(bar?.textContent).toContain('Home');
      expect(bar?.textContent).toContain('Search');
      expect(bar?.textContent).not.toContain('Nested');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

describe('sg-sidebar-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('uses native details/summary structure', async () => {
    fixture = await mount('sg-sidebar-group', { attrs: { label: 'Main' } });

    expect(fixture.query('[part="group"]')?.tagName.toLowerCase()).toBe('details');
    expect(fixture.query('[part="group-header"]')?.tagName.toLowerCase()).toBe('summary');
  });

  it('keeps non-collapsible groups open', async () => {
    fixture = await mount('sg-sidebar-group', { attrs: { label: 'Main' } });

    expect(fixture.query<HTMLDetailsElement>('[part="group"]')?.open).toBe(true);
  });

  it('starts closed in uncontrolled mode when default-open is false', async () => {
    fixture = await mount('sg-sidebar-group', { attrs: { collapsible: '', 'default-open': 'false' } });

    expect(fixture.element.hasAttribute('open')).toBe(false);
    expect(fixture.query<HTMLDetailsElement>('[part="group"]')?.open).toBe(false);
  });

  it('does not mutate open state in controlled mode without external update', async () => {
    fixture = await mount('sg-sidebar-group', { attrs: { collapsible: '', open: '' } });

    fixture.query<HTMLElement>('[part="group-header"]')?.click();
    await fixture.flush();

    expect(fixture.element.hasAttribute('open')).toBe(true);
  });
});

describe('sg-sidebar-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders an anchor only when href is present and not disabled', async () => {
    fixture = await mount('sg-sidebar-item', { attrs: { href: '/home' } });

    expect(fixture.query('a.item')).toBeTruthy();
  });

  it('renders a button when disabled even if href is present', async () => {
    fixture = await mount('sg-sidebar-item', { attrs: { disabled: '', href: '/home' } });

    // Should render a <div class="item"> with aria-disabled and tabindex
    const divItem = fixture.query('div.item');

    expect(divItem).toBeTruthy();
    expect(divItem?.getAttribute('aria-disabled')).toBe('true');
    expect(divItem?.getAttribute('tabindex')).toBe('-1');
    expect(fixture.query('a.item')).toBeFalsy();
  });

  it('applies aria-current="page" when active', async () => {
    fixture = await mount('sg-sidebar-item', { attrs: { active: '', href: '/dashboard' } });

    expect(fixture.query('a.item')?.getAttribute('aria-current')).toBe('page');
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('sg-sidebar', {
        attrs: { 'aria-label': 'Sidebar navigation' },
        html: '<sg-sidebar-item href="/">Home</sg-sidebar-item>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
