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

/** The canvas runs under the floating navbar; drawing starts below its tallest (mobile) extent. */
const BELOW_BAR = 160;

test('draws rectangles with the pen tool and selects them with a click', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 100, box.y + BELOW_BAR], [box.x + 220, box.y + BELOW_BAR + 80]);
  await expect.poll(() => shapeCount(page)).toBe(1);

  await page.mouse.click(box.x + 150, box.y + BELOW_BAR + 40);
  await expect(page.locator('.studio-selection-toolbar')).toBeVisible();

  // Clear of the tool dock floating at the bottom edge of the canvas.
  await page.mouse.click(box.x + box.width - 40, box.y + box.height - 140);
  await expect(page.locator('.studio-selection-toolbar')).toBeHidden();
});

test('moves a shape and restores it with undo/redo', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 100, box.y + BELOW_BAR], [box.x + 220, box.y + BELOW_BAR + 80]);
  const shape = page.locator('.studio-shape').first();
  const before = await shape.boundingBox();

  await page.mouse.click(box.x + 150, box.y + BELOW_BAR + 40);
  await page.mouse.move(box.x + 150, box.y + BELOW_BAR + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + BELOW_BAR + 120, { steps: 5 });
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
  await drawRect(page, [box.x + 60, box.y + BELOW_BAR], [box.x + 160, box.y + BELOW_BAR + 80]);
  await drawRect(page, [box.x + 200, box.y + BELOW_BAR + 120], [box.x + 320, box.y + BELOW_BAR + 200]);
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

test('dragging a shape shows snap guides and align centers a selection', async ({ page }) => {
  const box = await viewportBox(page);
  // Drawn low enough that the selection toolbar never overlaps the fixed board toolbar.
  await drawRect(page, [box.x + 60, box.y + 160], [box.x + 160, box.y + 240]);
  await drawRect(page, [box.x + 240, box.y + 300], [box.x + 340, box.y + 380]);
  await expect.poll(() => shapeCount(page)).toBe(2);

  // Select the second shape, then drag it near the first's edges so a guide appears mid-drag.
  await page.mouse.click(box.x + 290, box.y + 340);
  await page.mouse.move(box.x + 290, box.y + 340);
  await page.mouse.down();
  await page.mouse.move(box.x + 168, box.y + 340, { steps: 6 });
  await expect(page.locator('[data-testid="board-guides"] .studio-guide').first()).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('[data-testid="board-guides"]')).toBeHidden();

  // Marquee-select both shapes and center them on X.
  await page.mouse.move(box.x + 400, box.y + 420);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.studio-selection-toolbar')).toBeVisible();

  const shapes = page.locator('.studio-shape');
  await page.locator('[data-action="align-x"]').click();
  const centers = [await shapes.nth(0).boundingBox(), await shapes.nth(1).boundingBox()];
  expect(
    Math.abs(
      (centers[0]?.x ?? 0) + (centers[0]?.width ?? 0) / 2 - ((centers[1]?.x ?? 0) + (centers[1]?.width ?? 0) / 2),
    ),
  ).toBeLessThan(2);

  // Align is one undoable step.
  await page.keyboard.press(`${MOD}+z`);
  const undone = [await shapes.nth(0).boundingBox(), await shapes.nth(1).boundingBox()];
  expect(
    Math.abs((undone[0]?.x ?? 0) + (undone[0]?.width ?? 0) / 2 - ((undone[1]?.x ?? 0) + (undone[1]?.width ?? 0) / 2)),
  ).toBeGreaterThan(2);
});

test('draws a freehand stroke with the pen tool that can be selected and undone', async ({ page }) => {
  const box = await viewportBox(page);
  await page.keyboard.press('p');
  await page.mouse.move(box.x + 120, box.y + 240);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 236, { steps: 6 });
  await page.mouse.move(box.x + 300, box.y + 244, { steps: 6 });
  await page.mouse.up();

  const stroke = page.locator('path.studio-stroke');
  await expect(stroke).toHaveCount(1);
  await expect(stroke).toHaveAttribute('d', /^M/);

  // Clicking the stroke body selects it (polygon narrow-phase hit-test).
  await page.mouse.click(box.x + 200, box.y + 238);
  await expect(page.locator('.studio-selection-toolbar')).toBeVisible();

  await page.keyboard.press(`${MOD}+z`);
  await expect(page.locator('path.studio-stroke')).toHaveCount(0);
});

test('selection shows a dashed frame and eight resize handles', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 100, box.y + BELOW_BAR], [box.x + 220, box.y + BELOW_BAR + 80]);
  await expect(page.locator('[data-testid="board-selection-frame"]')).toBeVisible();
  await expect(page.locator('[data-testid="board-handles"] .studio-handle')).toHaveCount(8);

  // Deselecting hides the chrome; switching tools hides it too. (The handles
  // layer itself is zero-sized, so assert on the handle dots.)
  await page.mouse.click(box.x + box.width - 40, box.y + box.height - 140);
  await expect(page.locator('[data-testid="board-handles"] .studio-handle').first()).toBeHidden();

  await page.mouse.click(box.x + 150, box.y + BELOW_BAR + 40);
  await expect(page.locator('[data-testid="board-handles"] .studio-handle').first()).toBeVisible();
  await page.keyboard.press('b');
  await expect(page.locator('[data-testid="board-handles"] .studio-handle').first()).toBeHidden();
});

test('dragging the southeast handle resizes the shape, with undo', async ({ page }) => {
  const box = await viewportBox(page);
  await drawRect(page, [box.x + 100, box.y + BELOW_BAR], [box.x + 220, box.y + BELOW_BAR + 80]);
  const shape = page.locator('.studio-shape').first();
  const before = await shape.boundingBox();
  if (!before) throw new Error('shape not visible');

  const handle = page.locator('[data-handle="se"]');
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error('handle not visible');
  const hx = handleBox.x + handleBox.width / 2;
  const hy = handleBox.y + handleBox.height / 2;

  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 60, hy + 40, { steps: 6 });
  await page.mouse.up();

  const after = await shape.boundingBox();
  expect(after?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 50);
  expect(after?.height ?? 0).toBeGreaterThan((before?.height ?? 0) + 30);
  // The opposite (northwest) corner stays put.
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2);
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);

  await page.keyboard.press(`${MOD}+z`);
  await expect
    .poll(async () => (await shape.boundingBox())?.width ?? 0, { message: 'undo restores width' })
    .toBeCloseTo(before?.width ?? 0, 0);
});
