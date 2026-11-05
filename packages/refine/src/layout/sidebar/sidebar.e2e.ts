import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('keeps the bottom bar out of desktop layout and accessibility', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-sidebar id="sidebar">
        <ore-sidebar-item href="/" bottom-nav>Overview</ore-sidebar-item>
      </ore-sidebar>
    `);

    const bottomBar = page.locator('#sidebar').locator('[part="bottom-bar"]');

    await expect(bottomBar).toBeHidden();
    expect(await bottomBar.evaluate((bar) => getComputedStyle(bar).display)).toBe('none');
  });

  test('hides the collapse control when the sidebar is not collapsible', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-sidebar id="sidebar"><span slot="header">Voyage</span></ore-sidebar>');

    await expect(page.locator('#sidebar').locator('[part="toggle-btn"]')).toBeHidden();
  });

  test('normalizes button items without native control chrome', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-sidebar-item id="item">Explore</ore-sidebar-item>');

    const item = page.locator('#item').locator('[part="item"]');
    await expect(item).toHaveCSS('border-top-width', '0px');
    await expect(item).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    // Source sets `text-align: start`; the built bundle lowers it to `left` for the
    // browserslist floor. Assert the intent: the button's native `center` default is gone.
    await expect(item).not.toHaveCSS('text-align', 'center');
  });

  test('promoted nested bottom tabs fit a mobile viewport', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-sidebar id="sidebar" container-breakpoints bottom-nav-at="(max-width: 640px)">
        <ore-sidebar-group label="Overview">
          <ore-sidebar-item bottom-nav><ore-icon slot="icon" name="home"></ore-icon>Overview</ore-sidebar-item>
        </ore-sidebar-group>
        <ore-sidebar-group label="Sales">
          <ore-sidebar-item bottom-nav><ore-icon slot="icon" name="kanban-square"></ore-icon>Pipeline</ore-sidebar-item>
          <ore-sidebar-item>Opportunities</ore-sidebar-item>
        </ore-sidebar-group>
        <ore-sidebar-group label="Customers">
          <ore-sidebar-item bottom-nav bottom-nav-label="Records"><ore-icon slot="icon" name="building-2"></ore-icon>Companies</ore-sidebar-item>
        </ore-sidebar-group>
        <ore-sidebar-group label="Activity">
          <ore-sidebar-item bottom-nav><ore-icon slot="icon" name="activity"></ore-icon>Activity</ore-sidebar-item>
        </ore-sidebar-group>
      </ore-sidebar>
    `);
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-bottom-nav'));

    const layout = await page.locator('#sidebar').evaluate((sidebar) => {
      const bar = sidebar.shadowRoot?.querySelector('[part="bottom-bar"]');
      const tabs = [...(bar?.querySelectorAll<HTMLElement>('.bottom-tab') ?? [])];
      const barRect = bar?.getBoundingClientRect();

      return {
        bar: barRect?.toJSON(),
        host: sidebar.getBoundingClientRect().toJSON(),
        tabCount: tabs.length,
        tabs: tabs.map((tab) => tab.getBoundingClientRect().toJSON()),
      };
    });

    expect(layout.tabCount).toBe(4);
    expect(layout.bar).toBeTruthy();
    expect(layout.bar!.left).toBeGreaterThanOrEqual(layout.host.left);
    expect(layout.bar!.right).toBeLessThanOrEqual(layout.host.right);
    for (const tab of layout.tabs) {
      expect(tab.left).toBeGreaterThanOrEqual(layout.bar!.left);
      expect(tab.right).toBeLessThanOrEqual(layout.bar!.right);
    }
  });

  test('keeps the collapse control anchored to the panel edge', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="width:320px;height:400px;">
        <ore-sidebar id="sidebar" collapsible>
          <ore-icon slot="logo" name="rocket"></ore-icon>
          <span slot="header">Workspace</span>
          <ore-sidebar-item>Overview</ore-sidebar-item>
        </ore-sidebar>
      </div>
    `);
    const sidebar = page.locator('#sidebar');
    const toggle = sidebar.locator('[part="toggle-btn"]');
    const header = sidebar.locator('[part="header"]');
    const padding = () =>
      header.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
      });
    const edgeOffset = async () => {
      const hostBox = await sidebar.boundingBox();
      const toggleBox = await toggle.boundingBox();
      return Math.abs((toggleBox?.x ?? 0) + (toggleBox?.width ?? 0) / 2 - (hostBox?.x ?? 0) - (hostBox?.width ?? 0));
    };

    const expandedPadding = await padding();
    const expandedHeight = (await header.boundingBox())!.height;
    await expect.poll(edgeOffset).toBeLessThanOrEqual(1);
    await toggle.click();
    await expect(sidebar).toHaveAttribute('data-collapsed');
    await expect.poll(edgeOffset).toBeLessThanOrEqual(1);
    expect(await padding()).toEqual(expandedPadding);
    expect((await header.boundingBox())!.height).toBe(expandedHeight);
  });

  test('keeps a text-only collapse control inside the header', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="width:320px;height:400px;">
        <ore-sidebar id="sidebar" collapsible>
          <span slot="header">Workspace</span>
          <ore-sidebar-item>Overview</ore-sidebar-item>
        </ore-sidebar>
      </div>
    `);
    const sidebar = page.locator('#sidebar');
    const toggle = sidebar.locator('[part="toggle-btn"]');
    const expectInside = async () => {
      const hostBox = await sidebar.boundingBox();
      const toggleBox = await toggle.boundingBox();
      expect(toggleBox!.x).toBeGreaterThanOrEqual(hostBox!.x);
      expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(hostBox!.x + hostBox!.width);
    };

    await expectInside();
    await toggle.click();
    await expect(sidebar).toHaveAttribute('data-collapsed');
    await expectInside();
  });
});

test.describe('Interaction', () => {
  test('mobile drawer manages focus, Escape, and close-on-select', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="position:relative;width:360px;height:460px;overflow:hidden;">
        <ore-navbar id="navbar" container-breakpoints breakpoint="(max-width: 640px)" mobile-sidebar="#sidebar">
          <span slot="logo">Workspace</span>
        </ore-navbar>
        <ore-sidebar id="sidebar" close-on-select container-breakpoints bottom-nav-at="(max-width: 640px)">
          <ore-sidebar-group label="Sales">
            <ore-sidebar-item id="pipeline" bottom-nav>Pipeline</ore-sidebar-item>
          </ore-sidebar-group>
        </ore-sidebar>
      </div>
    `);
    await page.waitForFunction(() => {
      const navbar = document.getElementById('navbar');
      const sidebar = document.getElementById('sidebar');

      return navbar?.hasAttribute('data-mobile') && sidebar?.hasAttribute('data-bottom-nav');
    });

    const nav = page.locator('#sidebar').locator('[part="nav"]');

    await expect(nav).toHaveAttribute('inert', '');
    await expect(nav).toHaveAttribute('aria-hidden', 'true');
    await page.locator('#navbar').evaluate((navbar) => {
      const toggle = navbar.shadowRoot?.querySelector<HTMLButtonElement>('[part="mobile-toggle"]');
      toggle?.focus();
      toggle?.click();
    });
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));

    await expect(nav).not.toHaveAttribute('inert', '');
    await expect(nav).not.toHaveAttribute('aria-hidden', 'true');
    expect(
      await page.locator('#sidebar').evaluate((sidebar) => sidebar.shadowRoot?.activeElement?.getAttribute('part')),
    ).toBe('nav');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));
    await expect(nav).toHaveAttribute('inert', '');
    await expect(nav).toHaveAttribute('aria-hidden', 'true');
    expect(
      await page.locator('#navbar').evaluate((navbar) => navbar.shadowRoot?.activeElement?.getAttribute('part')),
    ).toBe('mobile-toggle');

    await page.locator('#navbar').evaluate((navbar) => {
      navbar.shadowRoot?.querySelector<HTMLButtonElement>('[part="mobile-toggle"]')?.click();
    });
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));
    await page.locator('#pipeline').evaluate((item) => {
      item.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click();
    });
    await page.waitForFunction(() => !document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));
    await expect(nav).toHaveAttribute('inert', '');
  });

  /**
   * Paints a resolved background over white on a canvas and reads the pixel
   * back. Format-independent (color-mix may compute to oklab) and proves a
   * dark, semi-transparent fill rather than a bright fog or no fill at all.
   */
  const compositeOverWhite = (page: Parameters<typeof axeCheck>[0], selector: string) =>
    page.locator(selector).evaluate((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      const canvas = document.createElement('canvas');

      canvas.width = 1;
      canvas.height = 1;

      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1, 1);

      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

      return { bg, rgb: [r, g, b] as number[] };
    });

  const SHELL_DRAWER = (extra = '') => `
      <div style="position:relative;width:360px;height:460px;overflow:hidden;">
        <ore-sidebar id="sidebar" container-breakpoints bottom-nav-at="(max-width: 640px)" ${extra}>
          <span slot="header">Workspace</span>
          <ore-sidebar-item bottom-nav>Pipeline</ore-sidebar-item>
        </ore-sidebar>
      </div>
    `;

  test('drawer backdrop does not dim by default but still closes on click', async ({ page, refinePage }) => {
    // A navigation drawer slides in from the edge the user just tapped, so it
    // must not darken the content it is meant to be read against. The veil
    // stays invisible while open, yet still covers the page so tap-outside
    // dismisses the drawer.
    await refinePage.mountComponent(SHELL_DRAWER());
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-bottom-nav'));

    const sidebar = page.locator('#sidebar');
    const backdrop = sidebar.locator('[part="drawer-backdrop"]');
    const closeBtn = sidebar.locator('[part="drawer-close-btn"]');

    await expect(backdrop).toBeHidden();
    await expect(closeBtn).toBeHidden();

    await sidebar.evaluate((el) => (el as { openDrawer(): void }).openDrawer());
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));

    const veil = await compositeOverWhite(page, '#sidebar [part="drawer-backdrop"]');

    // Composited over white, a non-dimming backdrop leaves every channel at 255.
    for (const channel of veil.rgb) {
      expect(channel).toBe(255);
    }

    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForFunction(() => !document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));

    await sidebar.evaluate((el) => (el as { openDrawer(): void }).openDrawer());
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));
    await backdrop.click({ position: { x: 300, y: 20 } });
    await page.waitForFunction(() => !document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));
  });

  test('backdrop="opaque" dims the page while the drawer is open', async ({ page, refinePage }) => {
    // The opt-in dimming mode must still darken: --overlay-veil is built from
    // --color-scrim so it never inverts into a bright fog in dark mode.
    await refinePage.mountComponent(SHELL_DRAWER('backdrop="opaque"'));
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-bottom-nav'));

    const sidebar = page.locator('#sidebar');

    await sidebar.evaluate((el) => (el as { openDrawer(): void }).openDrawer());
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-drawer-open'));

    const veil = await compositeOverWhite(page, '#sidebar [part="drawer-backdrop"]');

    for (const channel of veil.rgb) {
      expect(channel).toBeLessThan(230);
    }
  });

  test('drawer panel width honors the sidebar-drawer-width token', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="position:relative;width:360px;height:460px;overflow:hidden;">
        <ore-sidebar id="sidebar" container-breakpoints bottom-nav-at="(max-width: 640px)" style="--sidebar-drawer-width: 20rem;">
          <ore-sidebar-item bottom-nav>Pipeline</ore-sidebar-item>
        </ore-sidebar>
      </div>
    `);
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-bottom-nav'));

    const width = await page.locator('#sidebar').evaluate((sidebar) => {
      const nav = sidebar.shadowRoot?.querySelector('nav');

      return nav ? nav.getBoundingClientRect().width : 0;
    });

    // 20rem = 320px, below the 85vw cap at this container width.
    expect(Math.round(width)).toBe(320);
  });
});

test.describe('Focus', () => {
  // Opening the drawer moves focus to the `tabindex="-1"` nav so the panel is
  // reachable by keyboard. The nav is the whole panel, not a control, so the
  // stylesheet suppresses the browser's default focus ring, which would
  // otherwise draw a blue border around the entire sidebar.
  test('shows no browser focus ring on the nav when the drawer opens', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<button id="tab-start">start</button><ore-sidebar id="sb" drawer></ore-sidebar>');
    await page.waitForSelector('ore-sidebar');

    // Real Tab first: Chromium only treats programmatic focus as
    // keyboard-originated (and paints :focus-visible) once the user has shown
    // keyboard modality.
    await page.locator('#tab-start').focus();
    await page.keyboard.press('Tab');

    const nav = await page.evaluate(async () => {
      const host = document.getElementById('sb') as HTMLElement & { openDrawer(): void };
      host.openDrawer();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const navEl = host.shadowRoot?.querySelector<HTMLElement>('nav');
      if (!navEl) throw new Error('Missing nav');
      return {
        focused: host.shadowRoot?.activeElement === navEl,
        outlineStyle: getComputedStyle(navEl).outlineStyle,
      };
    });

    expect(nav.focused).toBe(true);
    expect(nav.outlineStyle).toBe('none');
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-sidebar><span slot="header">Voyage</span><ore-sidebar-item>Explore</ore-sidebar-item></ore-sidebar>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
