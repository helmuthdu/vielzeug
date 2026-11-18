import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/map');
  await expect(page.locator('[data-testid="map-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();
});

test('renders the tile canvas and reports visible tiles', async ({ page }) => {
  const status = page.locator('[data-testid="map-status"]');
  await expect(status).toContainText('tiles visible · Main thread');
  const visible = Number(await status.getAttribute('data-visible'));
  expect(visible).toBeGreaterThan(30);
});

test('dragging the hero token changes which tiles are visible', async ({ page }) => {
  const status = page.locator('[data-testid="map-status"]');
  const before = Number(await status.getAttribute('data-visible'));

  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  // The hero starts at tile (0,3), world centre (24, 168); the camera state is
  // the world point at the viewport centre, so screen = world + 120/48 + half-size.
  const heroX = box.x + box.width / 2 + 144;
  const heroY = box.y + box.height / 2 + 216;
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
  await expect(page.locator('[data-testid="map-status"]')).toContainText('tiles visible · Main thread');
});

test('export produces a PNG blob download', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('vielzeug-map.png');
});

test.describe('worker render mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-testid="map-thread"] [value="worker"]').click();
    await expect(page.locator('[data-testid="map-status"]')).toHaveAttribute('data-mode', 'worker');
  });

  test('worker mode keeps the canvas mounted and status live', async ({ page }) => {
    await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-status"]')).toContainText('Worker thread');
  });

  test('export round-trips a PNG blob through the worker', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('vielzeug-map.png');
  });

  test('dragging the hero token updates visibility in worker mode', async ({ page }) => {
    const status = page.locator('[data-testid="map-status"]');
    const before = Number(await status.getAttribute('data-visible'));

    const canvas = page.locator('[data-testid="map-canvas"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');
    // See the main-thread drag test for the camera-centre math.
    const heroX = box.x + box.width / 2 + 144;
    const heroY = box.y + box.height / 2 + 216;
    await page.mouse.move(heroX, heroY);
    await page.mouse.down();
    await page.mouse.move(heroX + 240, heroY + 48, { steps: 8 });
    await page.mouse.up();

    const after = Number(await status.getAttribute('data-visible'));
    expect(after).not.toBe(before);
  });

  test('toggling back to main thread rendering works', async ({ page }) => {
    await page.locator('[data-testid="map-thread"] [value="main"]').click();
    await expect(page.locator('[data-testid="map-status"]')).toHaveAttribute('data-mode', 'main');
    await expect(page.locator('[data-testid="map-status"]')).toContainText('Main thread');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('vielzeug-map.png');
  });
});

test('dragging empty terrain pans the camera', async ({ page }) => {
  const root = page.locator('[data-testid="map-root"]');
  const before = (await root.getAttribute('data-camera')) ?? '0.0,0.0';

  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  // Drag from an empty stretch of terrain (away from the hero at tile (0,3)).
  const startX = box.x + box.width - 60;
  const startY = box.y + 200;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 120, startY - 60, { steps: 6 });
  await page.mouse.up();

  await expect(root).not.toHaveAttribute('data-camera', before, { timeout: 2000 });
});

test('zooming out stops at the floor so terrain rendering stays bounded', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');

  // Hammer the wheel far past any reasonable floor; the camera must clamp.
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1200);
  }

  await expect(page.locator('[data-testid="shell-zoom-label"]')).toHaveText('25%');
  // The page still responds to input at the floor.
  await expect(page.locator('[data-testid="map-status"]')).toContainText('tiles visible', {
    timeout: 2000,
  });
});
