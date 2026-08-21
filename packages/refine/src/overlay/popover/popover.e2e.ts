/**
 * Real-browser interaction test for `ore-popover` — click-to-open against real positioning
 * (`@vielzeug/orbit`), which jsdom can't evaluate. Complements `popover.test.ts`'s jsdom
 * coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('shows below its trigger when clicked', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      // Default slot = trigger element; slot="content" = panel content
      '<ore-popover>' +
        '<ore-button>Open popover</ore-button>' +
        '<div slot="content">Popover content</div>' +
        '</ore-popover>',
    );

    await page.locator('ore-button').click();
    await page.waitForTimeout(300);

    // ore-popover wires aria-expanded onto the slotted trigger (ore-button host)
    const isOpen = await page.evaluate(() => {
      const btn = document.querySelector('ore-button') as HTMLElement | null;

      return btn?.getAttribute('aria-expanded') === 'true';
    });

    expect(isOpen).toBe(true);

    const positions = await page.evaluate(() => {
      const popover = document.querySelector('ore-popover')!;
      const trigger = document.querySelector('ore-button')?.getBoundingClientRect();
      const panel = popover.shadowRoot?.querySelector<HTMLElement>('.panel')?.getBoundingClientRect();

      return { panel, trigger } as { panel: DOMRect; trigger: DOMRect };
    });

    expect(positions.panel!.top).toBeGreaterThanOrEqual(positions.trigger!.bottom);
    expect(Math.abs(positions.panel!.top - positions.trigger!.bottom - 8)).toBeLessThan(2);
    expect(
      Math.abs(
        positions.panel!.left + positions.panel!.width / 2 - (positions.trigger!.left + positions.trigger!.width / 2),
      ),
    ).toBeLessThan(4);
  });
});
