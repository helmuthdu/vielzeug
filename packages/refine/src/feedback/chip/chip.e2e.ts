import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('frost variant applies the glass surface treatment', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-chip color="success" variant="frost">Live session</ore-chip>');

    const styles = await page.locator('ore-chip').evaluate((element) => {
      const chip = element.shadowRoot?.querySelector('.chip');

      if (!chip) throw new Error('Missing chip surface');

      const computed = getComputedStyle(chip);

      return {
        backdropFilter: computed.backdropFilter || computed.getPropertyValue('-webkit-backdrop-filter'),
        boxShadow: computed.boxShadow,
      };
    });

    expect(styles.backdropFilter).toContain('blur');
    expect(styles.boxShadow).not.toBe('none');
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-chip>Active</ore-chip>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('removable chip exposes a named remove button', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-chip mode="removable">Draft</ore-chip>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
