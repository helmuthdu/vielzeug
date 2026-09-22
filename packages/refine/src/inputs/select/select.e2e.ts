/**
 * Real-browser accessibility check for `ore-select` — a real axe scan against the rendered
 * shadow DOM. Complements `select.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  // axe-core cannot pierce shadow DOM to see listbox children (ore-option elements in light DOM).
  // This produces a false-positive aria-required-children violation. The component is correct;
  // the limitation is axe's flat-tree traversal, not following shadow-slot assignments.
  test.fail(
    'labeled select passes a11y checks (aria-required-children shadow DOM limitation)',
    async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-select label="Country">' +
          '<ore-option value="us">United States</ore-option>' +
          '<ore-option value="de">Germany</ore-option>' +
          '</ore-select>',
      );

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    },
  );
});

test.describe('Disabled reason', () => {
  test('shows and announces why an option is unavailable', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-select label="Plan">' +
        '<option value="starter">Starter</option>' +
        '<option value="enterprise" disabled data-disabled-reason="Contact sales to enable">Enterprise</option>' +
        '</ore-select>',
    );

    await page.locator('ore-select[label="Plan"]').click();
    const option = page.getByRole('option', { name: 'Enterprise Contact sales to enable' });
    await expect(option).toBeVisible();
    await expect(option.locator('.disabled-reason')).toHaveAttribute('title', 'Contact sales to enable');
  });
});

test.describe('Layout', () => {
  // A narrow (e.g. fullwidth in a phone grid column) select must still open a readable list: the
  // dropdown is floored at the trigger width, grows to fit its longest option, and `shift` keeps
  // it inside the viewport even when the trigger sits at the right edge.
  test('narrow select at the right edge opens a dropdown that fits its options and the viewport', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<div style="display:flex;justify-content:flex-end">' +
        '<div style="width:110px">' +
        '<ore-select id="narrow" fullwidth label="Potion">' +
        '<option value="a">Alemore · Lv. 1</option>' +
        '<option value="b">Concentrated Bitterroot Tonic · Lv. 3</option>' +
        '</ore-select>' +
        '</div></div>',
    );

    await page.locator('#narrow').click();
    const option = page.getByRole('option', { name: 'Concentrated Bitterroot Tonic · Lv. 3' });
    await expect(option).toBeVisible();

    const metrics = await page.evaluate(() => {
      const select = document.getElementById('narrow') as HTMLElement & { shadowRoot: ShadowRoot };
      const dropdown = select.shadowRoot.querySelector('.dropdown') as HTMLElement;
      const label = dropdown.querySelector('.option:nth-of-type(2) > span:first-child') as HTMLElement;
      const rect = dropdown.getBoundingClientRect();

      return {
        right: rect.right,
        triggerWidth: select.getBoundingClientRect().width,
        truncated: label.scrollWidth > label.clientWidth,
        viewportWidth: window.innerWidth,
        width: rect.width,
      };
    });

    expect(metrics.width).toBeGreaterThan(metrics.triggerWidth);
    expect(metrics.truncated).toBe(false);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
  });
});
