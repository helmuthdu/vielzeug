/**
 * Real-browser interaction test for `ore-tooltip`: hover-triggered show/hide, which jsdom can't
 * evaluate (no real `:hover` state, no positioning). Complements `tooltip.test.ts`'s jsdom
 * coverage.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('updates trigger listeners without replacing the tooltip or its button', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-tooltip content="Helpful hint" trigger="focus">
        <ore-button>Info</ore-button>
      </ore-tooltip>
    `);
    const tooltip = page.locator('ore-tooltip');
    const panel = tooltip.locator('[part="tooltip"]');
    const button = page.locator('ore-button');

    await tooltip.evaluate((element) => element.setAttribute('trigger', 'click'));
    await button.focus();
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await button.click();
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveAttribute('aria-hidden', 'true');

    await tooltip.evaluate((element) => element.setAttribute('trigger', 'hover,focus'));
    await page.mouse.move(0, 0);
    await button.evaluate((element: HTMLElement) => element.blur());
    await button.focus();
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  test('shows tooltip above its trigger on hover', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tooltip content="Helpful hint" delay="0">' + '<ore-button>Hover me</ore-button>' + '</ore-tooltip>',
    );

    await page.locator('ore-button').hover();
    await page.waitForTimeout(300);

    const positions = await page.evaluate(() => {
      const tooltip = document.querySelector('ore-tooltip')!;
      const trigger = document.querySelector('ore-button')?.getBoundingClientRect();
      const panel = tooltip.shadowRoot?.querySelector<HTMLElement>('.tooltip')?.getBoundingClientRect();

      return { panel, trigger } as { panel: DOMRect; trigger: DOMRect };
    });

    expect(positions.panel!.bottom).toBeLessThanOrEqual(positions.trigger!.top);
    expect(Math.abs(positions.panel!.bottom - positions.trigger!.top + 8)).toBeLessThan(2);
    expect(
      Math.abs(
        positions.panel!.left + positions.panel!.width / 2 - (positions.trigger!.left + positions.trigger!.width / 2),
      ),
    ).toBeLessThan(2);
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tooltip content="Helpful hint"><ore-button>Hover me</ore-button></ore-tooltip>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Touch interaction', () => {
  test.use({ hasTouch: true, viewport: { height: 844, width: 390 } });

  test('keeps a combined-trigger tooltip open after its first tap', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-tooltip content="Helpful hint" trigger="hover,focus,click">
        <ore-button icon-only label="About Power"><ore-icon name="info"></ore-icon></ore-button>
      </ore-tooltip>
      <p>Outside content</p>
    `);
    const button = page.locator('ore-button');
    const panel = page.locator('ore-tooltip').locator('[part="tooltip"]');

    await button.tap();
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    // Let pointerleave and any delayed close run: an immediate assertion misses the original flash.
    await page.waitForTimeout(400);
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await button.tap();
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await button.tap();
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await page.locator('p').tap();
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await button.tap();
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
  });
});
