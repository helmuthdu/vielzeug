/**
 * Real-browser interaction test for `ore-tooltip` — hover-triggered show/hide, which jsdom can't
 * evaluate (no real `:hover` state, no positioning). Complements `tooltip.test.ts`'s jsdom
 * coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('shows tooltip above its trigger on hover', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tooltip content="Helpful hint">' + '<ore-button>Hover me</ore-button>' + '</ore-tooltip>',
    );

    await page.locator('ore-button').hover();
    await page.waitForTimeout(300);

    const positions = await page.evaluate(() => {
      const tooltip = document.querySelector('ore-tooltip')!;
      const trigger = document.querySelector('ore-button')?.getBoundingClientRect();
      const panel = tooltip.shadowRoot?.querySelector<HTMLElement>('.tooltip')?.getBoundingClientRect();

      return { panel, trigger };
    });

    expect(positions.panel.bottom).toBeLessThanOrEqual(positions.trigger.top);
    expect(Math.abs(positions.panel.bottom - positions.trigger.top + 8)).toBeLessThan(2);
    expect(
      Math.abs(
        positions.panel.left + positions.panel.width / 2 - (positions.trigger.left + positions.trigger.width / 2),
      ),
    ).toBeLessThan(2);
  });
});
