import { expect, test } from '../../testing/fixtures';

test.describe('Calendar views', () => {
  test('shows only the active calendar grid', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-date-picker label="Departure" value="2026-10-12"></ore-date-picker>');

    await page.getByRole('textbox', { name: 'Departure' }).click();

    const picker = page.locator('ore-date-picker');
    await expect(picker.locator('.cal-grid-days')).toBeVisible();
    await expect(picker.locator('.cal-grid-months')).toBeHidden();
    await expect(picker.locator('.cal-grid-years')).toBeHidden();
    await expect(picker.locator('.calendar')).toBeInViewport();
  });
});
