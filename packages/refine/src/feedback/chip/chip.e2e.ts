import { expect, test } from '../../testing/fixtures';

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
