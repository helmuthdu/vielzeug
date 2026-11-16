import { expect, test } from 'playwright/test';

/**
 * keymap resolves `mod` from navigator.userAgentData.platform, which the pinned
 * Playwright device descriptors report as Windows/Android, so Ctrl is the
 * matching modifier in the runner regardless of the host OS.
 */
const MOD = 'Control';

async function viewportBox(page: import('playwright/test').Page) {
  const viewport = page.locator('[data-testid="board-viewport"]');
  await expect(viewport).toBeVisible();
  const box = await viewport.boundingBox();
  if (!box) throw new Error('viewport not visible');
  return box;
}

async function shapeCount(page: import('playwright/test').Page) {
  return page.locator('.studio-shape').count();
}

async function drawRect(page: import('playwright/test').Page, from: [number, number], to: [number, number]) {
  await page.keyboard.press('b');
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.mouse.move(to[0], to[1], { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('v');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="board-viewport"]')).toBeVisible();
});

test('draws rectangles with the pen tool and selects them with a click', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 100, box.y + 100], [box.x + 220, box.y + 180]);
  await expect.poll(() => shapeCount(page)).toBe(1);

  await page.mouse.click(box.x + 150, box.y + 140);
  await expect(page.locator('.studio-selection-toolbar')).toBeVisible();

  await page.mouse.click(box.x + box.width - 40, box.y + box.height - 40);
  await expect(page.locator('.studio-selection-toolbar')).toBeHidden();
});

test('moves a shape and restores it with undo/redo', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 100, box.y + 100], [box.x + 220, box.y + 180]);
  const shape = page.locator('.studio-shape').first();
  const before = await shape.boundingBox();

  await page.mouse.click(box.x + 150, box.y + 140);
  await page.mouse.move(box.x + 150, box.y + 140);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + 220, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => (await shape.boundingBox())?.x ?? 0, { message: 'shape moved' })
    .toBeGreaterThan((before?.x ?? 0) + 50);
  const movedX = (await shape.boundingBox())?.x ?? 0;

  await page.keyboard.press(`${MOD}+z`);
  await expect
    .poll(async () => Math.abs(((await shape.boundingBox())?.x ?? 0) - (before?.x ?? 0)), { message: 'undo restores' })
    .toBeLessThan(2);

  await page.keyboard.press(`${MOD}+Shift+z`);
  await expect
    .poll(async () => Math.abs(((await shape.boundingBox())?.x ?? 0) - movedX), { message: 'redo reapplies' })
    .toBeLessThan(2);
});

test('marquee selects multiple shapes and Delete removes them with undo', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 60, box.y + 60], [box.x + 160, box.y + 140]);
  await drawRect(page, [box.x + 200, box.y + 180], [box.x + 320, box.y + 260]);
  await expect.poll(() => shapeCount(page)).toBe(2);

  // Start away from the toolbar pinned to the viewport's top-left corner.
  await page.mouse.move(box.x + 360, box.y + 320);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.studio-selection-toolbar')).toBeVisible();

  await page.keyboard.press('Delete');
  await expect.poll(() => shapeCount(page)).toBe(0);

  await page.keyboard.press(`${MOD}+z`);
  await expect.poll(() => shapeCount(page)).toBe(2);
});

test('space-drag pans the camera', async ({ page }) => {
  const world = page.locator('[data-testid="board-world"]');
  const before = await world.evaluate((el) => el.style.transform);

  await page.keyboard.down('Space');
  await page.mouse.move(400, 300);
  await page.mouse.down();
  await page.mouse.move(500, 380, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Space');

  const after = await world.evaluate((el) => el.style.transform);
  expect(after).not.toBe(before);
});

test('wheel zooms the camera', async ({ page }) => {
  const world = page.locator('[data-testid="board-world"]');
  const before = await world.evaluate((el) => el.style.transform);

  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => world.evaluate((el) => el.style.transform)).not.toBe(before);
});

test('pinch zooms the camera', async ({ page }) => {
  const world = page.locator('[data-testid="board-world"]');
  const before = await world.evaluate((el) => el.style.transform);

  await page.evaluate(() => {
    const vp = document.querySelector('[data-testid="board-viewport"]');
    if (!(vp instanceof HTMLElement)) throw new Error('viewport missing');
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fire = (type: string, id: number, x: number, y: number) =>
      vp.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          buttons: 1,
          cancelable: true,
          clientX: x,
          clientY: y,
          isPrimary: id === 1,
          pointerId: id,
          pointerType: 'touch',
        }),
      );
    fire('pointerdown', 1, cx - 50, cy);
    fire('pointerdown', 2, cx + 50, cy);
    for (let i = 1; i <= 5; i++) {
      fire('pointermove', 1, cx - 50 - i * 20, cy);
      fire('pointermove', 2, cx + 50 + i * 20, cy);
    }
    fire('pointerup', 1, cx - 150, cy);
    fire('pointerup', 2, cx + 150, cy);
  });

  await expect.poll(async () => world.evaluate((el) => el.style.transform)).not.toBe(before);
});
