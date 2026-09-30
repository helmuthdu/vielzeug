/**
 * Real-browser accessibility check for `ore-checkbox` — a real axe scan against the rendered
 * shadow DOM. Complements `checkbox.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  // The slot is the labeling API (`@slot - Checkbox label text`): the host's
  // `aria-labelledby` points at the shadow `.label` span, which projects the
  // slotted text. axe's flat-tree traversal resolves this correctly — a `label`
  // attribute is not a prop and renders nothing, so mounting that way produces
  // an unnamed checkbox (the source of a long-misread "known gap" here).
  test('slot-labelled checkbox passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-checkbox>Accept terms and conditions</ore-checkbox>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('helper text is linked to the checkbox via aria-describedby', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-checkbox helper="Required for the site to work">Essential</ore-checkbox>');
    await page.waitForTimeout(100);

    const wiring = await page.locator('ore-checkbox').evaluate((element) => {
      const host = element as HTMLElement;
      const describedBy = host.getAttribute('aria-describedby');
      const helper = host.shadowRoot?.querySelector<HTMLElement>('.helper-text');
      return {
        describedBy,
        helperId: helper?.id,
        helperText: helper?.textContent?.trim(),
        helperVisible: helper ? !helper.hasAttribute('hidden') : false,
      };
    });

    expect(wiring.describedBy).toBe(wiring.helperId);
    expect(wiring.helperVisible).toBe(true);
    expect(wiring.helperText).toBe('Required for the site to work');
  });
});
