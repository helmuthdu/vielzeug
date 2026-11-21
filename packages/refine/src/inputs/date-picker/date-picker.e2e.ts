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

  test('reflects external values in the calendar after a user selection', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-date-picker label="Departure" value="2026-10-12"></ore-date-picker>');

    const picker = page.locator('ore-date-picker');

    await page.getByRole('textbox', { name: 'Departure' }).click();
    await picker.locator('[data-iso="2026-10-13"]').click();
    await picker.evaluate((element) => element.setAttribute('value', '2026-10-20'));
    await page.getByRole('textbox', { name: 'Departure' }).click();

    await expect(picker.locator('[data-iso="2026-10-20"]')).toHaveAttribute('aria-selected', 'true');
    await expect(picker.locator('[data-iso="2026-10-13"]')).toHaveAttribute('aria-selected', 'false');
  });
});

test.describe('Date ranges', () => {
  test('supports keyboard selection and returns focus on Escape', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-date-picker label="Stay" range value="2026-10-12/2026-10-15"></ore-date-picker>',
    );
    const picker = page.locator('ore-date-picker');

    await page.getByRole('textbox', { name: 'Stay' }).click();
    const start = picker.locator('[data-iso="2026-10-12"]');

    await expect(start).toBeFocused();
    await expect(picker.locator('.cal-cell-day[tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
    await expect(picker.locator('[data-iso="2026-10-13"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(picker.locator('.range-instruction')).toHaveText('Choose an end date');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: 'Stay' })).toBeFocused();
    await expect(picker).toHaveJSProperty('value', '2026-10-12/2026-10-15');
  });

  test('does not submit the previous value when submitting an unfinished draft', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <form onsubmit="event.preventDefault(); this.dataset.submitted = 'true'">
        <ore-date-picker label="Stay" name="stay" range value="2026-10-12/2026-10-15"></ore-date-picker>
        <button type="submit">Submit</button>
      </form>
    `);
    const picker = page.locator('ore-date-picker');

    await page.getByRole('textbox', { name: 'Stay' }).click();
    await picker.locator('[data-iso="2026-10-18"]').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('form')).not.toHaveAttribute('data-submitted', 'true');
  });

  test('does not submit the previous value after a slow pointer press on submit', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <form onsubmit="event.preventDefault(); this.dataset.submitted = 'true'">
        <ore-date-picker label="Stay" name="stay" range value="2026-10-12/2026-10-15"></ore-date-picker>
        <button type="submit">Submit</button>
      </form>
    `);
    const picker = page.locator('ore-date-picker');

    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('form')).toHaveAttribute('data-submitted', 'true');
    await page.locator('form').evaluate((form) => form.removeAttribute('data-submitted'));
    await page.getByRole('textbox', { name: 'Stay' }).click();
    await picker.locator('[data-iso="2026-10-18"]').click();
    await page.getByRole('button', { name: 'Submit' }).click({ delay: 250 });
    await expect(page.locator('form')).not.toHaveAttribute('data-submitted', 'true');
  });

  test('validates drafts and submits only the completed range', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <form>
        <ore-date-picker label="Stay" name="stay" range required value="2026-10-12/2026-10-15"></ore-date-picker>
      </form>
    `);

    const picker = page.locator('ore-date-picker');

    await page.getByRole('textbox', { name: 'Stay' }).click();
    await picker.locator('[data-iso="2026-10-18"]').click();
    await expect(picker.locator('.range-instruction')).toHaveText('Choose an end date');
    expect(await picker.evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(false);
    await picker.locator('[data-iso="2026-10-14"]').click();

    const state = await page.locator('form').evaluate((form) => {
      if (!(form instanceof HTMLFormElement)) throw new Error('Expected a form');

      return { valid: form.checkValidity(), value: new FormData(form).get('stay') };
    });

    expect(state).toEqual({ valid: true, value: '2026-10-14/2026-10-18' });
    await page.locator('form').evaluate((form) => {
      if (!(form instanceof HTMLFormElement)) throw new Error('Expected a form');
      form.reset();
    });
    await expect(picker).toHaveJSProperty('value', '2026-10-12/2026-10-15');
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
