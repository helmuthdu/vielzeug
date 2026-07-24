/**
 * Real-browser interaction test for `ore-popover` — click-to-open against real positioning
 * (`@vielzeug/orbit`), which jsdom can't evaluate. Complements `popover.test.ts`'s jsdom
 * coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('shows when trigger is clicked', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      // Default slot = trigger element; slot="content" = panel content
      '<ore-popover>' +
        '<ore-button>Open popover</ore-button>' +
        '<div slot="content">Popover content</div>' +
        '</ore-popover>',
    );

    await page.locator('ore-button').click();
    await page.waitForTimeout(100);

    // ore-popover wires aria-expanded onto the slotted trigger (ore-button host)
    const isOpen = await page.evaluate(() => {
      const btn = document.querySelector('ore-button') as HTMLElement | null;

      return btn?.getAttribute('aria-expanded') === 'true';
    });

    expect(isOpen).toBe(true);
  });
});
