import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Disabled reason', () => {
  test('shows and announces why an option is unavailable', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-combobox label="Country">' +
        '<ore-combobox-option value="us">United States</ore-combobox-option>' +
        '<ore-combobox-option value="restricted" disabled disabled-reason="Requires regional access">Restricted</ore-combobox-option>' +
        '</ore-combobox>',
    );

    const combobox = page.locator('ore-combobox');
    await combobox.getByRole('combobox', { name: 'Country' }).click();
    const option = page.getByRole('option', { name: 'Restricted Requires regional access' });
    await expect(option).toBeVisible();
    await expect(option.locator('.disabled-reason')).toHaveAttribute('title', 'Requires regional access');
    await option.click({ force: true });
    await expect(combobox).toHaveJSProperty('value', '');

    const results = await axeCheck(page);
    expect(results.violations).toEqual([]);
  });
});
