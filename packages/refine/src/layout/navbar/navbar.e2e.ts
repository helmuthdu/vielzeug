/**
 * CSS layout regression test for `ore-navbar` — real flexbox geometry that jsdom can't evaluate
 * (no layout engine, `@layer` blocks silently dropped). Complements `navbar.test.ts`'s jsdom
 * coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
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

  // Icon-only items (no visible label — see OreNavbarItemProps['icon-only']) render a hidden,
  // empty label region alongside the icon. Left un-hidden, that empty region still reserves the
  // inter-element `gap`, so the item ends up wider than tall — never a square-ish icon button —
  // even though it has no visible text. `icon-only` collapses that phantom gap and switches to
  // symmetric padding; regression-test the resulting box shape since jsdom can't evaluate it
  // (see navbar.test.ts's jsdom coverage note for the same limitation).
  test('icon-only items render compact, roughly square padding around the icon', async ({ page, refinePage }) => {
    // Force desktop mode regardless of the test harness's narrow `.frame` (max-width: 600px) —
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

    // Not a pixel-exact assertion (padding tokens may evolve) — just guards against the
    // reported bug: a lopsided item noticeably wider than it is tall from the phantom label gap.
    expect(box.width).toBeLessThan(box.height * 1.5);
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

      if (!sidebar?.hasAttribute('data-mobile-open') || !drawer || !shell) return false;

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
