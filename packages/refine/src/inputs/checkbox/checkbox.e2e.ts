/**
 * Real-browser accessibility check for `ore-checkbox` — a real axe scan against the rendered
 * shadow DOM. Complements `checkbox.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  // Known a11y gap: axe reports aria-toggle-field-name on the shadow <input> because the label
  // element is in light DOM and axe cannot pierce the shadow boundary to compute the accessible
  // name via the label-via-slot association. This is a real bug to fix in ore-checkbox.
  test.fail('labeled checkbox accessible name reaches shadow input (known a11y gap)', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-checkbox label="Accept terms and conditions"></ore-checkbox>');

    const results = await axeCheck(page);

    // When fixed, violations should be empty
    expect(results.violations).toEqual([]);
  });
});
