import { expect, test } from '../../testing/fixtures';

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
    await expect(item).toHaveCSS('text-align', 'start');
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

    await page.locator('#navbar').evaluate((navbar) => {
      const toggle = navbar.shadowRoot?.querySelector<HTMLButtonElement>('[part="mobile-toggle"]');
      toggle?.focus();
      toggle?.click();
    });
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-mobile-open'));

    expect(
      await page.locator('#sidebar').evaluate((sidebar) => sidebar.shadowRoot?.activeElement?.getAttribute('part')),
    ).toBe('nav');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('sidebar')?.hasAttribute('data-mobile-open'));
    expect(
      await page.locator('#navbar').evaluate((navbar) => navbar.shadowRoot?.activeElement?.getAttribute('part')),
    ).toBe('mobile-toggle');

    await page.locator('#navbar').evaluate((navbar) => {
      navbar.shadowRoot?.querySelector<HTMLButtonElement>('[part="mobile-toggle"]')?.click();
    });
    await page.waitForFunction(() => document.getElementById('sidebar')?.hasAttribute('data-mobile-open'));
    await page.locator('#pipeline').evaluate((item) => {
      item.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click();
    });
    await page.waitForFunction(() => !document.getElementById('sidebar')?.hasAttribute('data-mobile-open'));
  });
});
