import { axeCheck, expect, test } from '../../testing/fixtures';

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

test.describe('Accessibility', () => {
  test('closed picker passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-date-picker label="Departure"></ore-date-picker>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('open calendar passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-date-picker label="Departure" value="2026-10-12"></ore-date-picker>');

    await page.getByRole('textbox', { name: 'Departure' }).click();

    await expect(page.locator('ore-date-picker').locator('.cal-grid-days')).toBeVisible();

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('view-switch button name starts with its visible text (SC 2.5.3)', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-date-picker label="Departure" value="2026-10-12"></ore-date-picker>');

    await page.getByRole('textbox', { name: 'Departure' }).click();

    const labelBtn = page.locator('ore-date-picker').locator('.cal-label-btn').first();

    const { name, text } = await labelBtn.evaluate((element) => {
      // The "/" separator is aria-hidden, so it is not part of the name; compare
      // against the visible text an AT actually matches (SC 2.5.3).
      const month = element.querySelector('.cal-label-month')?.textContent?.trim() ?? '';
      const year = element.querySelector('.cal-label-year')?.textContent?.trim() ?? '';

      return {
        name: element.getAttribute('aria-label') ?? '',
        text: `${month} ${year}`,
      };
    });

    expect(name).not.toBe('');
    expect(name.startsWith(text)).toBe(true);
  });
});
