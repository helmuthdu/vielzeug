import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/palette');
  await expect(page.locator('[data-testid="palette-root"]')).toBeVisible();
});

test('shows all four formats for the seeded color', async ({ page }) => {
  const formats = page.locator('[data-testid="palette-formats"] .palette-format');
  await expect(formats).toHaveCount(4);
  await expect(formats.filter({ hasText: 'hex' })).toContainText('#7c3aed');
  await expect(formats.filter({ hasText: 'oklch' })).toContainText('oklch(');
});

test('contrast rows rate the seeded color against white and black', async ({ page }) => {
  const white = page.locator('[data-contrast="on white"]');
  await expect(white).toContainText('5.70:1');
  await expect(white.locator('ore-badge')).toHaveText('AA');
  await expect(page.locator('[data-contrast="on black"]')).toContainText('3.69:1');
});

test('ramp renders ten swatches and clicking one re-bases the scene', async ({ page }) => {
  const swatches = page.locator('[data-testid="palette-ramp"] .palette-swatch');
  await expect(swatches).toHaveCount(10);

  const target = swatches.nth(2);
  const hex = await target.getAttribute('data-hex');
  await target.click();
  await expect(page.locator('[data-testid="palette-formats"] .palette-format').first()).toContainText(hex ?? '');
});

test('mix strip interpolates between the two colors', async ({ page }) => {
  const swatches = page.locator('[data-testid="palette-mix"] .palette-swatch');
  await expect(swatches).toHaveCount(10);
  await expect(swatches.first()).toHaveAttribute('data-hex', '#7c3aed');
  await expect(swatches.last()).toHaveAttribute('data-hex', '#0891b2');
});

test('preset picker updates the base color', async ({ page }) => {
  await page.locator('[data-testid="palette-presets"]').locator('[role="radio"]').last().click();
  await expect(page.locator('[data-testid="palette-formats"] .palette-format').first()).toContainText('#f2efe9');
});

test('invalid input shows a parse error and keeps the last render', async ({ page }) => {
  await page.locator('[data-testid="palette-root"] [data-field="color"] input').fill('not-a-color');
  await expect(page.locator('[data-testid="palette-root"] [data-field="color"]')).toHaveAttribute('error', /.+/);
  await expect(page.locator('[data-testid="palette-formats"] .palette-format')).toHaveCount(4);
});
