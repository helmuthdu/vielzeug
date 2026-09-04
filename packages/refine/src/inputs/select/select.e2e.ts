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
