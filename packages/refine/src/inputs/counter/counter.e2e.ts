import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('frost variant applies the glass surface treatment', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-counter color="error" variant="frost" label="Wounds" value="1" max="3"></ore-counter>',
    );

    const styles = await page.locator('ore-counter').evaluate((element) => {
      const counter = element.shadowRoot?.querySelector('.counter');

      if (!counter) throw new Error('Missing counter surface');

      const computed = getComputedStyle(counter);

      return {
        backdropFilter: computed.backdropFilter || computed.getPropertyValue('-webkit-backdrop-filter'),
        boxShadow: computed.boxShadow,
      };
    });

    expect(styles.backdropFilter).toContain('blur');
    expect(styles.boxShadow).not.toBe('none');
  });
});
