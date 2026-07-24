/**
 * Real-browser accessibility checks for `ore-input` — the `color-contrast`/`target-size` rules
 * jsdom can't compute. Complements `input.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('labeled input passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-input label="Email address" type="email"></ore-input>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('required input with error passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-input label="Username" required invalid error="Username is required"></ore-input>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
