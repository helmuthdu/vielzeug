/**
 * CSS layout regression test for `ore-navbar`: real flexbox geometry that jsdom can't evaluate
 * (no layout engine, `@layer` blocks silently dropped). Complements `navbar.test.ts`'s jsdom
 * coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Keyboard recovery', () => {
  test('Escape closes the mobile menu and restores focus to the toggle', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(
      '<ore-navbar id="nav"><span slot="logo">Studio</span>' +
        '<ore-navbar-item slot="mobile-menu" href="#games">Games</ore-navbar-item></ore-navbar>',
    );
    const navbar = page.locator('#nav');
    const toggle = navbar.locator('[part="mobile-toggle"]');
    await toggle.click();
    const link = navbar.locator('ore-navbar-item').locator('a');
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(link).toBeHidden();
  });
});

test.describe('Layout', () => {
  test('removes empty start and end regions from layout', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-navbar id="nav"><span>Search controls</span></ore-navbar>');

    const navbar = page.locator('#nav');
    await expect(navbar.locator('[part="logo"]')).toBeHidden();
    await expect(navbar.locator('[part="start"]')).toBeHidden();
    await expect(navbar.locator('[part="center"]')).toBeVisible();
    await expect(navbar.locator('[part="end"]')).toBeHidden();
  });

  test('renders distinct shadows for different elevation levels', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-navbar id="low" variant="frost" elevation="1" ' +
        'style="--shadow-sm:0 2px 3px rgb(255 0 0);--halo-shadow-neutral:0 2px 3px rgb(0 0 255)">' +
        '<span>Low</span></ore-navbar>' +
        '<ore-navbar id="high" variant="frost" elevation="4"><span>High</span></ore-navbar>',
    );

    const low = await page
      .locator('#low')
      .locator('[part="bar"]')
      .evaluate((element) => getComputedStyle(element).boxShadow);
    const high = await page
      .locator('#high')
      .locator('[part="bar"]')
      .evaluate((element) => getComputedStyle(element).boxShadow);

    expect(low).toContain('rgb(255, 0, 0)');
    expect(low).not.toContain('rgb(0, 0, 255)');
    expect(high).not.toBe('none');
    expect(high).not.toBe(low);
  });

  test('navbar items do not overflow outside nav bounds', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-navbar id="nav">' +
        '<ore-button slot="brand">My App</ore-button>' +
        '<ore-button>Home</ore-button>' +
        '<ore-button>About</ore-button>' +
        '</ore-navbar>',
    );
    await page.waitForSelector('ore-navbar');

    const overflow = await page.evaluate(() => {
      const el = document.getElementById('nav') as HTMLElement;
      const navRect = el.getBoundingClientRect();
      let hasOverflow = false;

      el.querySelectorAll('ore-button').forEach((btn) => {
        const btnRect = btn.getBoundingClientRect();

        if (btnRect.right > navRect.right + 1 || btnRect.bottom > navRect.bottom + 1) {
          hasOverflow = true;
        }
      });

      return hasOverflow;
    });

    expect(overflow).toBe(false);
  });

  // Icon-only items (no visible label: see OreNavbarItemProps['icon-only']) render a hidden,
  // empty label region alongside the icon. Left un-hidden, that empty region still reserves the
  // inter-element `gap`, so the item ends up wider than tall: never a square-ish icon button :
  // even though it has no visible text. `icon-only` collapses that phantom gap and switches to
  // symmetric padding; regression-test the resulting box shape since jsdom can't evaluate it
  // (see navbar.test.ts's jsdom coverage note for the same limitation).
  test('items inherit typography and preserve the default touch target', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="font-family: Georgia, serif">' +
        '<ore-navbar breakpoint="(max-width: 0px)">' +
        '<ore-navbar-item id="item">Models</ore-navbar-item>' +
        '</ore-navbar>' +
        '</div>',
    );

    const style = await page.locator('#item').evaluate((item) => {
      const button = item.shadowRoot!.querySelector<HTMLElement>('.item')!;
      const computed = getComputedStyle(button);
      return { fontFamily: computed.fontFamily, height: button.getBoundingClientRect().height };
    });

    expect(style.fontFamily).toContain('Georgia');
    expect(style.height).toBeGreaterThanOrEqual(36);
  });

  test('icon-only items render compact, roughly square padding around the icon', async ({ page, refinePage }) => {
    // Force desktop mode regardless of the test harness's narrow `.frame` (max-width: 600px) :
    // the default breakpoint (max-width: 768px) would otherwise put the navbar in mobile mode,
    // hiding items outside the mobile menu toggle and making this a test of the wrong code path.
    await refinePage.mountComponent(
      '<ore-navbar breakpoint="(max-width: 320px)">' +
        '<ore-navbar-item id="icon-only" icon-only aria-label="Search">' +
        '<ore-icon slot="icon" name="search"></ore-icon>' +
        '</ore-navbar-item>' +
        '</ore-navbar>',
    );
    await page.waitForSelector('ore-navbar-item:visible');

    const box = await page.evaluate(() => {
      const item = document.getElementById('icon-only') as HTMLElement;
      const rect = item.getBoundingClientRect();

      return { height: rect.height, width: rect.width };
    });

    // Not a pixel-exact assertion (padding tokens may evolve): just guards against the
    // reported bug: a lopsided item noticeably wider than it is tall from the phantom label gap.
    expect(box.width).toBeLessThan(box.height * 1.5);
  });

  test('constrained containers stay desktop without container breakpoint opt-in', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 768, width: 1024 });
    await refinePage.mountComponent(
      '<div style="width:360px">' +
        '<ore-navbar id="viewport-navbar" breakpoint="(max-width: 640px)">' +
        '<span slot="logo">Workspace</span>' +
        '<ore-navbar-item href="#">Overview</ore-navbar-item>' +
        '</ore-navbar>' +
        '</div>',
    );

    await expect(page.locator('#viewport-navbar')).not.toHaveAttribute('data-mobile');
  });

  test('persistent content stays in the bar through the mobile collapse', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 600, width: 1024 });
    await refinePage.mountComponent(
      '<ore-navbar id="pnav" breakpoint="(max-width: 640px)">' +
        '<span slot="end">Trailing actions</span>' +
        '<span slot="persistent">Live status</span>' +
        '</ore-navbar>',
    );

    const navbar = page.locator('#pnav');
    await expect(navbar).not.toHaveAttribute('data-mobile');
    await expect(navbar.locator('[part="end"]')).toBeVisible();
    await expect(navbar.locator('[part="persistent"]')).toBeVisible();

    await page.setViewportSize({ height: 600, width: 400 });
    await expect(navbar).toHaveAttribute('data-mobile');
    await expect(navbar.locator('[part="end"]')).toBeHidden();
    await expect(navbar.locator('[part="persistent"]')).toBeVisible();

    // The persistent region owns the bar's right edge through the collapse.
    const bar = await navbar.locator('[part="bar"]').boundingBox();
    const persistent = await navbar.locator('[part="persistent"]').boundingBox();
    expect(persistent!.x + persistent!.width).toBeGreaterThan(bar!.x + bar!.width - 60);
  });

  test('mobile sidebar drawer stays within its positioned preview shell', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div id="shell" style="position:relative;width:360px;height:460px;overflow:hidden;">
        <ore-sidebar
          id="sidebar"
          container-breakpoints
          bottom-nav-at="(max-width: 640px)"
          variant="floating">
          <ore-sidebar-item href="#">Dashboard</ore-sidebar-item>
        </ore-sidebar>
        <ore-navbar
          id="navbar"
          container-breakpoints
          breakpoint="(max-width: 640px)"
          mobile-sidebar="#sidebar">
          <span slot="logo">Workspace</span>
        </ore-navbar>
      </div>
    `);

    await page.waitForFunction(() => {
      const navbar = document.getElementById('navbar');
      const sidebar = document.getElementById('sidebar');

      return navbar?.hasAttribute('data-mobile') && sidebar?.hasAttribute('data-bottom-nav');
    });

    await page.locator('#navbar').evaluate((navbar) => {
      (navbar as HTMLElement & { toggleMobileMenu(): void }).toggleMobileMenu();
    });

    await page.waitForFunction(() => {
      const sidebar = document.getElementById('sidebar');
      const drawer = sidebar?.shadowRoot?.querySelector('nav');
      const shell = document.getElementById('shell');

      if (!sidebar?.hasAttribute('data-drawer-open') || !drawer || !shell) return false;

      return drawer.getBoundingClientRect().left >= shell.getBoundingClientRect().left;
    });

    const bounds = await page.locator('#sidebar').evaluate((sidebar) => {
      const drawer = sidebar.shadowRoot?.querySelector('nav');
      const shell = document.getElementById('shell');

      if (!drawer || !shell) throw new Error('Sidebar drawer geometry is unavailable');

      return {
        drawer: drawer.getBoundingClientRect().toJSON(),
        shell: shell.getBoundingClientRect().toJSON(),
      };
    });

    expect(bounds.drawer.left).toBeGreaterThanOrEqual(bounds.shell.left);
    expect(bounds.drawer.right).toBeLessThanOrEqual(bounds.shell.right);
    expect(bounds.drawer.top).toBeGreaterThanOrEqual(bounds.shell.top);
    expect(bounds.drawer.bottom).toBeLessThanOrEqual(bounds.shell.bottom);
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-navbar><span slot="logo">Studio</span><ore-navbar-item href="#games">Games</ore-navbar-item></ore-navbar>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Mobile wrap', () => {
  test('keeps the bar items live on their own row when there is no panel or drawer', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 600, width: 500 });
    await refinePage.mountComponent(
      '<ore-navbar id="nav"><span slot="logo">Studio</span>' +
        '<ore-navbar-item href="#home">Home</ore-navbar-item>' +
        '<ore-navbar-item href="#team">Team</ore-navbar-item></ore-navbar>',
    );

    const navbar = page.locator('#nav');

    await expect(navbar).toHaveAttribute('data-mobile-wrap', 'true');

    const logo = navbar.locator('[part="logo"]');
    const center = navbar.locator('[part="center"]');

    await expect(logo).toBeVisible();
    await expect(navbar.locator('ore-navbar-item:not([slot])').first()).toBeVisible();

    const logoBox = await logo.boundingBox();
    const centerBox = await center.boundingBox();

    // The items row sits under the logo row, not hidden behind a toggle.
    expect(centerBox && logoBox && centerBox.y > logoBox.y + logoBox.height - 2).toBe(true);

    // Nothing overflows the bar horizontally: the row scrolls itself if needed.
    const bar = navbar.locator('[part="bar"]');

    const barBox = await bar.boundingBox();
    const centerScroll = await center.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);

    expect(barBox && barBox.width <= 500 + 1).toBe(true);
    expect(centerScroll).toBe(true);

    // Side clearance: the first pill must sit inside the scroll row's clip edge so
    // its hover pill and focus ring are not cropped at the sides.
    const rowBox = await center.boundingBox();
    const pillBox = await navbar.locator('ore-navbar-item:not([slot])').first().boundingBox();

    if (!rowBox || !pillBox) throw new Error('wrap row has no box');

    expect(pillBox.x - rowBox.x).toBeGreaterThanOrEqual(2);
  });

  test('the panel collapse still wins when mobile-menu content exists', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 600, width: 500 });
    await refinePage.mountComponent(
      '<ore-navbar id="nav"><span slot="logo">Studio</span><ore-navbar-item href="#home">Home</ore-navbar-item>' +
        '<a slot="mobile-menu" href="#home">Home</a></ore-navbar>',
    );

    const navbar = page.locator('#nav');

    await expect(navbar).toHaveAttribute('data-mobile', 'true');

    const count = await navbar.locator('[data-mobile-wrap]').count();

    expect(count).toBe(0);
    await expect(navbar.locator('[part="mobile-toggle"]')).toBeVisible();
  });
});

test.describe('Subnav', () => {
  test('renders as a second row under the bar and stays interactive', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-navbar id="nav"><span slot="logo">Studio</span><ore-navbar-item href="#home" active>Home</ore-navbar-item>' +
        '<ore-navbar-item slot="subnav" href="#docs">Docs</ore-navbar-item>' +
        '<ore-navbar-item slot="subnav" href="#blog">Blog</ore-navbar-item></ore-navbar>',
    );

    const navbar = page.locator('#nav');
    const subnav = navbar.locator('[part="subnav"]');

    await expect(subnav).toBeVisible();

    const barBox = await navbar.locator('[part="bar"]').boundingBox();
    const subnavBox = await subnav.boundingBox();

    expect(barBox && subnavBox && subnavBox.y >= barBox.y + barBox.height - 2).toBe(true);

    // The scroll row must not crop the pills: their boxes (and focus rings) need
    // clearance inside the row's padding box.
    const rowBox = subnavBox!;
    const pillBox = await navbar.locator('ore-navbar-item[slot="subnav"]').first().boundingBox();

    if (!pillBox) throw new Error('subnav pill has no box');

    expect(pillBox.y - rowBox.y).toBeGreaterThanOrEqual(2);
    expect(rowBox.y + rowBox.height - (pillBox.y + pillBox.height)).toBeGreaterThanOrEqual(2);

    await expect(navbar.locator('ore-navbar-item[slot="subnav"] a').first()).toBeVisible();
  });

  test('stays hidden without subnav content', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-navbar id="nav"><span slot="logo">Studio</span></ore-navbar>');

    await expect(page.locator('#nav [part="subnav"]')).toBeHidden();
  });
});

test.describe('Centered', () => {
  test('centers the default content with equal side space', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 600, width: 900 });
    await refinePage.mountComponent(
      '<ore-navbar id="nav" centered><span slot="logo">L</span>' +
        '<ore-navbar-item href="#a" active>A</ore-navbar-item>' +
        '<ore-button slot="end" size="sm">A long end action</ore-button></ore-navbar>',
    );

    const center = page.locator('#nav [part="center"]');

    await expect(center).toBeVisible();

    const box = await center.boundingBox();
    const barBox = await page.locator('#nav [part="bar"]').boundingBox();

    if (!box || !barBox) throw new Error('regions have no box');

    // True center of the bar itself (the bar may be narrower than the viewport).
    const centerMid = box.x + box.width / 2;
    const barMid = barBox.x + barBox.width / 2;

    expect(Math.abs(centerMid - barMid)).toBeLessThan(8);
  });
});
