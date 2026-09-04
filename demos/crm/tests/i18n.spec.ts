import { expect, test } from 'playwright/test';

test('language switch translates the full CRM interface', async ({ page }) => {
  const switchLanguage = async (mobileLabel: string): Promise<void> => {
    const desktopButton = page.locator('.locale-button');
    if (await desktopButton.isVisible()) await desktopButton.click();
    else {
      await page.getByRole('button', { name: /navigation menu|Navigationsmenü/ }).click();
      await page.getByRole('button', { name: mobileLabel }).click();
      await page.keyboard.press('Escape');
    }
  };

  await page.goto('/');

  await switchLanguage('Change language');

  await expect(page.locator('#crm-sidebar ore-sidebar-item[data-route="dashboard"]')).toContainText('Übersicht');
  if ((page.viewportSize()?.width ?? 1000) < 600)
    await expect(page.getByRole('button', { name: 'Navigationsmenü öffnen' })).toBeVisible();
  else await expect(page.getByRole('button', { name: 'Seitenleiste einklappen' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  await expect(page.getByRole('heading', { name: /Guten (Morgen|Tag|Abend), Alex/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neue Verkaufschance' })).toBeVisible();

  await page.getByRole('link', { exact: true, name: 'Pipeline' }).click();
  await expect(page.getByText('Deals voranbringen. Jede Stufenänderung bleibt validiert und umkehrbar.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Prognose' })).toBeVisible();

  await page.getByRole('link', { exact: true, name: 'Unternehmen' }).click();
  await expect(page.getByRole('heading', { name: 'Unternehmen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neues Unternehmen' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Zustand' })).toBeVisible();
  const grid = page.locator('ore-datagrid');
  expect((await grid.getByRole('tab').allTextContents()).map((label) => label.trim())).toEqual([
    'Alle Konten',
    'Gesund',
    'Gefährdet',
  ]);
  await expect(grid.getByRole('button', { name: 'Sortieren' })).toBeVisible();
  await expect(grid.getByRole('button', { name: 'Filter' })).toBeVisible();
  await expect(grid.getByRole('button', { name: 'Spaltenoptionen' })).toBeVisible();
  await grid.getByRole('button', { name: 'Filter' }).click();
  await expect(grid.getByRole('combobox', { name: 'Filter hinzufügen…' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Neues Unternehmen' }).click();
  await expect(page.getByLabel('Jahresumsatz (EUR)')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('link', { exact: true, name: 'Pipeline' }).click();

  await switchLanguage('Sprache wechseln');
  await expect(page.locator('#crm-sidebar ore-sidebar-item[data-route="dashboard"]')).toContainText('Overview');
  await expect(page.getByText('Move deals forward. Every stage change stays validated and reversible.')).toBeVisible();
});
