/**
 * Real-browser interaction test for `ore-tooltip` — hover-triggered show/hide, which jsdom can't
 * evaluate (no real `:hover` state, no positioning). Complements `tooltip.test.ts`'s jsdom
 * coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('shows tooltip on hover', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tooltip content="Helpful hint">' + '<ore-button>Hover me</ore-button>' + '</ore-tooltip>',
    );

    await page.locator('ore-button').hover();
    // Tooltip element should become visible
    await expect(page.locator('ore-tooltip')).toBeVisible();
  });
});
