import { type Fixture, mount } from '@vielzeug/craftit/test';

// ─── bit-sidebar ─────────────────────────────────────────────────────────────

describe('bit-sidebar', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a nav element', async () => {
      fixture = await mount('bit-sidebar');

      expect(fixture.query('nav')).toBeTruthy();
    });

    it('renders the sidebar content slot', async () => {
      fixture = await mount('bit-sidebar', {
        html: '<bit-sidebar-item>Home</bit-sidebar-item>',
      });

      expect(fixture.element.textContent).toContain('Home');
    });

    it('renders header slot content', async () => {
      fixture = await mount('bit-sidebar', { html: '<span slot="header">My App</span>' });

      expect(fixture.element.textContent).toContain('My App');
    });

    it('renders footer slot content', async () => {
      fixture = await mount('bit-sidebar', { html: '<span slot="footer">v1.0</span>' });

      expect(fixture.element.textContent).toContain('v1.0');
    });

    it('does not render toggle button without collapsible attribute', async () => {
      fixture = await mount('bit-sidebar');

      const btn = fixture.query('[part="toggle-btn"]') as HTMLElement | null;

      expect(!btn || btn.hasAttribute('hidden')).toBe(true);
    });

    it('renders toggle button when collapsible is set', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      expect(btn && !btn.hidden).toBe(true);
    });
  });

  // ─── Props ─────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('reflects collapsed attribute', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '' } });

      expect(fixture.element.hasAttribute('collapsed')).toBe(true);
    });

    it('reflects variant attribute', async () => {
      fixture = await mount('bit-sidebar', { attrs: { variant: 'floating' } });

      expect(fixture.element.getAttribute('variant')).toBe('floating');
    });

    it('reflects collapsible attribute', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      expect(fixture.element.hasAttribute('collapsible')).toBe(true);
    });

    it('applies custom label to nav', async () => {
      fixture = await mount('bit-sidebar', { attrs: { label: 'Main navigation' } });

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Main navigation');
    });

    it('defaults nav aria-label to "Sidebar navigation"', async () => {
      fixture = await mount('bit-sidebar');

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Sidebar navigation');
    });
  });

  // ─── Toggle collapse ───────────────────────────────────────────────────────

  describe('Collapse / Expand', () => {
    it('toggle button collapses when sidebar is expanded', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      btn?.click();
      await fixture.flush();

      expect(fixture.element.hasAttribute('collapsed')).toBe(true);
    });

    it('toggle button expands when sidebar is collapsed', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '', collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      btn?.click();
      await fixture.flush();

      expect(fixture.element.hasAttribute('collapsed')).toBe(false);
    });

    it('toggle button aria-expanded is "true" when expanded', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      expect(btn?.getAttribute('aria-expanded')).toBe('true');
    });

    it('toggle button aria-expanded is "false" when collapsed', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '', collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggle button aria-label is "Collapse sidebar" when expanded', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      expect(btn?.getAttribute('aria-label')).toBe('Collapse sidebar');
    });

    it('toggle button aria-label is "Expand sidebar" when collapsed', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '', collapsible: '' } });

      const btn = fixture.query<HTMLButtonElement>('[part="toggle-btn"]');

      expect(btn?.getAttribute('aria-label')).toBe('Expand sidebar');
    });
  });

  // ─── Events ────────────────────────────────────────────────────────────────

  describe('Events', () => {
    it('fires collapse event when toggling from expanded', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('collapse', handler);

      fixture.query<HTMLButtonElement>('[part="toggle-btn"]')?.click();
      await fixture.flush();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires expand event when toggling from collapsed', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '', collapsible: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('expand', handler);

      fixture.query<HTMLButtonElement>('[part="toggle-btn"]')?.click();
      await fixture.flush();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Imperative API ────────────────────────────────────────────────────────

  describe('Imperative API', () => {
    it('collapse() sets the collapsed attribute', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const el = fixture.element as typeof fixture.element & { collapse(): void };

      el.collapse();
      await fixture.flush();

      expect(fixture.element.hasAttribute('collapsed')).toBe(true);
    });

    it('expand() removes the collapsed attribute', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '', collapsible: '' } });

      const el = fixture.element as typeof fixture.element & { expand(): void };

      el.expand();
      await fixture.flush();

      expect(fixture.element.hasAttribute('collapsed')).toBe(false);
    });

    it('toggle() switches collapsed state', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const el = fixture.element as typeof fixture.element & { toggle(): void };

      el.toggle();
      await fixture.flush();

      expect(fixture.element.hasAttribute('collapsed')).toBe(true);

      el.toggle();
      await fixture.flush();

      expect(fixture.element.hasAttribute('collapsed')).toBe(false);
    });

    it('collapse() does not fire event when already collapsed', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsed: '', collapsible: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('collapse', handler);

      const el = fixture.element as typeof fixture.element & { collapse(): void };

      el.collapse();
      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });

    it('expand() does not fire event when already expanded', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('expand', handler);

      const el = fixture.element as typeof fixture.element & { expand(): void };

      el.expand();
      await fixture.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// ─── bit-sidebar accessibility ───────────────────────────────────────────────

describe('bit-sidebar accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Navigation Landmark', () => {
    it('contains a <nav> landmark element', async () => {
      fixture = await mount('bit-sidebar');

      expect(fixture.query('nav')).toBeTruthy();
    });

    it('nav has an accessible aria-label', async () => {
      fixture = await mount('bit-sidebar', { attrs: { label: 'App sidebar' } });

      const nav = fixture.query('nav');

      expect(nav?.getAttribute('aria-label')).toBe('App sidebar');
    });

    it('nav has default aria-label when none provided', async () => {
      fixture = await mount('bit-sidebar');

      const nav = fixture.query('nav');

      expect(nav?.getAttribute('aria-label')).toBe('Sidebar navigation');
    });
  });

  describe('Toggle Button Accessibility', () => {
    it('toggle button is a native <button>', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const btn = fixture.query('[part="toggle-btn"]');

      expect(btn?.tagName.toLowerCase()).toBe('button');
    });

    it('toggle button has type="button"', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      expect(fixture.query('[part="toggle-btn"]')?.getAttribute('type')).toBe('button');
    });

    it('toggle button has descriptive aria-label', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const label = fixture.query('[part="toggle-btn"]')?.getAttribute('aria-label');

      expect(label).toBeTruthy();
      expect(['Collapse sidebar', 'Expand sidebar']).toContain(label);
    });

    it('toggle button aria-expanded reflects state', async () => {
      fixture = await mount('bit-sidebar', { attrs: { collapsible: '' } });

      const btn = fixture.query('[part="toggle-btn"]');

      expect(btn?.getAttribute('aria-expanded')).toBe('true');

      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.flush();

      expect(btn?.getAttribute('aria-expanded')).toBe('false');
    });
  });
});

// ─── bit-sidebar-group ────────────────────────────────────────────────────────

describe('bit-sidebar-group', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders group label', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { label: 'Settings' } });

      expect(fixture.query('[part="group-label"]')?.textContent?.trim()).toBe('Settings');
    });

    it('renders default slot items', async () => {
      fixture = await mount('bit-sidebar-group', {
        html: '<bit-sidebar-item>Item A</bit-sidebar-item>',
      });

      expect(fixture.element.textContent).toContain('Item A');
    });

    it('renders icon slot content', async () => {
      fixture = await mount('bit-sidebar-group', {
        html: '<span slot="icon">★</span>',
      });

      expect(fixture.element.textContent).toContain('★');
    });

    it('items list has role="list"', async () => {
      fixture = await mount('bit-sidebar-group');

      expect(fixture.query('[part="group-items"]')?.getAttribute('role')).toBe('list');
    });
  });

  describe('Props', () => {
    it('reflects label attribute', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { label: 'Main' } });

      expect(fixture.element.getAttribute('label')).toBe('Main');
    });

    it('reflects collapsible attribute', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '' } });

      expect(fixture.element.hasAttribute('collapsible')).toBe(true);
    });

    it('reflects open attribute', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });
  });

  describe('Collapsible Behavior', () => {
    it('group header role is "button" when collapsible', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '' } });

      expect(fixture.query('[part="group-header"]')?.getAttribute('role')).toBe('button');
    });

    it('group header has no role when not collapsible', async () => {
      fixture = await mount('bit-sidebar-group');

      expect(fixture.query('[part="group-header"]')?.getAttribute('role')).toBeNull();
    });

    it('group header is keyboard accessible when collapsible (tabindex="0")', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '' } });

      expect(fixture.query('[part="group-header"]')?.getAttribute('tabindex')).toBe('0');
    });

    it('clicking header toggles open state', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      fixture.query<HTMLElement>('[part="group-header"]')?.click();
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });

    it('Enter key toggles open state on group header', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      const header = fixture.query<HTMLElement>('[part="group-header"]');

      header?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });

    it('Space key toggles open state on group header', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      const header = fixture.query<HTMLElement>('[part="group-header"]');

      header?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });

    it('items are hidden when collapsible group is closed', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '' } });

      // open defaults to true, close it
      fixture.query<HTMLElement>('[part="group-header"]')?.click();
      await fixture.flush();

      expect(fixture.query('[part="group-items"]')?.hasAttribute('hidden')).toBe(true);
    });

    it('items are visible when non-collapsible', async () => {
      fixture = await mount('bit-sidebar-group');

      expect(fixture.query('[part="group-items"]')?.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Events', () => {
    it('fires toggle event when clicked', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('toggle', handler);

      fixture.query<HTMLElement>('[part="group-header"]')?.click();
      await fixture.flush();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('toggle event detail contains open state', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      let detail: unknown;

      fixture.element.addEventListener('toggle', (e) => {
        detail = (e as unknown as CustomEvent).detail;
      });

      fixture.query<HTMLElement>('[part="group-header"]')?.click();
      await fixture.flush();

      expect((detail as { open: boolean }).open).toBe(false);
    });
  });
});

// ─── bit-sidebar-group accessibility ────────────────────────────────────────

describe('bit-sidebar-group accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('ARIA Attributes', () => {
    it('collapsible header has aria-expanded="true" when open', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '', open: '' } });

      expect(fixture.query('[part="group-header"]')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('collapsible header has aria-expanded="false" when closed', async () => {
      fixture = await mount('bit-sidebar-group', { attrs: { collapsible: '' } });

      fixture.query<HTMLElement>('[part="group-header"]')?.click();
      await fixture.flush();

      expect(fixture.query('[part="group-header"]')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('non-collapsible header has no aria-expanded', async () => {
      fixture = await mount('bit-sidebar-group');

      expect(fixture.query('[part="group-header"]')?.getAttribute('aria-expanded')).toBeNull();
    });
  });
});

// ─── bit-sidebar-item ─────────────────────────────────────────────────────────

describe('bit-sidebar-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('renders a button by default (no href)', async () => {
      fixture = await mount('bit-sidebar-item');

      expect(fixture.query('button.item')).toBeTruthy();
    });

    it('renders an anchor when href is provided', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { href: '/home' } });

      expect(fixture.query('a.item')).toBeTruthy();
    });

    it('anchor href matches the prop', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { href: '/dashboard' } });

      expect(fixture.query('a')?.getAttribute('href')).toBe('/dashboard');
    });

    it('renders label text', async () => {
      fixture = await mount('bit-sidebar-item', { html: 'Dashboard' });

      expect(fixture.element.textContent).toContain('Dashboard');
    });

    it('renders icon slot content', async () => {
      fixture = await mount('bit-sidebar-item', { html: '<span slot="icon">🏠</span>' });

      expect(fixture.element.textContent).toContain('🏠');
    });

    it('renders end slot content', async () => {
      fixture = await mount('bit-sidebar-item', { html: '<span slot="end">3</span>' });

      expect(fixture.element.textContent).toContain('3');
    });
  });

  describe('Props', () => {
    it('reflects active attribute', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { active: '' } });

      expect(fixture.element.hasAttribute('active')).toBe(true);
    });

    it('reflects disabled attribute', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { disabled: '' } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('anchor renders rel attribute', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { href: '/x', rel: 'noopener' } });

      expect(fixture.query('a')?.getAttribute('rel')).toBe('noopener');
    });

    it('anchor renders target attribute', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { href: '/x', target: '_blank' } });

      expect(fixture.query('a')?.getAttribute('target')).toBe('_blank');
    });
  });

  describe('Button type', () => {
    it('inner button has type="button"', async () => {
      fixture = await mount('bit-sidebar-item');

      expect(fixture.query('button')?.getAttribute('type')).toBe('button');
    });

    it('inner button has disabled attribute when disabled', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { disabled: '' } });

      expect(fixture.query('button')?.hasAttribute('disabled')).toBe(true);
    });
  });
});

// ─── bit-sidebar-item accessibility ─────────────────────────────────────────

describe('bit-sidebar-item accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./sidebar');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('ARIA Attributes', () => {
    it('active link has aria-current="page"', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { active: '', href: '/home' } });

      expect(fixture.query('a')?.getAttribute('aria-current')).toBe('page');
    });

    it('inactive link has no aria-current', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { href: '/home' } });

      expect(fixture.query('a')?.getAttribute('aria-current')).toBeNull();
    });

    it('active button has aria-current="page"', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { active: '' } });

      expect(fixture.query('button')?.getAttribute('aria-current')).toBe('page');
    });

    it('disabled link has aria-disabled="true"', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { disabled: '', href: '/x' } });

      expect(fixture.query('a')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('disabled link has tabindex="-1"', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { disabled: '', href: '/x' } });

      expect(fixture.query('a')?.getAttribute('tabindex')).toBe('-1');
    });

    it('icon slot is hidden from assistive technology', async () => {
      fixture = await mount('bit-sidebar-item', {
        html: '<span slot="icon">★</span>',
      });

      const icon = fixture.query('[part="item-icon"]');

      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('button item is focusable (no tabindex=-1 by default)', async () => {
      fixture = await mount('bit-sidebar-item');

      expect(fixture.query('button')?.getAttribute('tabindex')).not.toBe('-1');
    });

    it('link item is focusable by default', async () => {
      fixture = await mount('bit-sidebar-item', { attrs: { href: '/home' } });

      expect(fixture.query('a')?.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
