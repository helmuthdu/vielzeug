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
});
