import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/map');
  await expect(page.locator('[data-testid="map-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();
});

test('renders the tile canvas and reports visible tiles', async ({ page }) => {
  const status = page.locator('[data-testid="map-status"]');
  await expect(status).toContainText('FOV radius 7');
  const visible = Number(await status.getAttribute('data-visible'));
  expect(visible).toBeGreaterThan(30);
});

test('dragging the hero token changes which tiles are visible', async ({ page }) => {
  const status = page.locator('[data-testid="map-status"]');
  const before = Number(await status.getAttribute('data-visible'));

  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  // The hero starts at tile (0,3); the camera starts at world (-120,-120),
  // so its screen position is (120, 264) relative to the canvas.
  const heroX = box.x + 120 + 24;
  const heroY = box.y + 264 + 24;
  await page.mouse.move(heroX, heroY);
  await page.mouse.down();
  await page.mouse.move(heroX + 240, heroY + 48, { steps: 8 });
  await page.mouse.up();

  const after = Number(await status.getAttribute('data-visible'));
  expect(after).not.toBe(before);
});

test('wheel zoom keeps the canvas responsive', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -600);
  await expect(page.locator('[data-testid="map-status"]')).toContainText('FOV radius 7');
});

test('export produces a PNG blob download', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('vielzeug-map.png');
});
