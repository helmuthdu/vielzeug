import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import type { PanGesture } from '../index.ts';

type GestureRuntime = Pick<
  typeof import('../index.ts'),
  'createDragGesture' | 'createPanGesture' | 'createPinchGesture'
>;
type TestWindow = Window & {
  Gesture?: GestureRuntime;
  captureCalls?: number;
  pan?: PanGesture;
  result?: { distance: number; reason: string; vertical?: number };
  pinchResult?: { reason: string; scale: number };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.resolve(__dirname, '../../dist/gesture.iife.js');

async function loadGesture(page: Page, body = '<div id="target"></div>'): Promise<void> {
  await page.setContent(`<!doctype html><style>#target{width:100px;height:100px}</style>${body}`);
  await page.addScriptTag({ path: bundle });
}

async function installPan(page: Page, pointerCapture: boolean): Promise<void> {
  await page.evaluate((capture) => {
    const testWindow = window as TestWindow;
    const gesture = testWindow.Gesture;
    const target = document.getElementById('target');
    if (!gesture || !target) throw new Error('Gesture test fixture did not load.');

    testWindow.captureCalls = 0;
    const setPointerCapture = target.setPointerCapture.bind(target);
    target.setPointerCapture = (pointerId) => {
      testWindow.captureCalls = (testWindow.captureCalls ?? 0) + 1;
      setPointerCapture(pointerId);
    };
    testWindow.pan = gesture.createPanGesture(target, {
      axis: 'x',
      onEnd: ({ distance, reason }) => {
        testWindow.result = { distance, reason };
      },
      pointerCapture: capture,
    });
  }, pointerCapture);
}

async function installDrag(page: Page): Promise<void> {
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const gesture = testWindow.Gesture;
    const target = document.getElementById('target');
    if (!gesture || !target) throw new Error('Gesture test fixture did not load.');

    testWindow.pan = gesture.createDragGesture(target, {
      onEnd: ({ delta, reason }) => {
        testWindow.result = { distance: delta.x, reason, vertical: delta.y };
      },
      pointerCapture: false,
    });
  });
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => (window as TestWindow).pan?.dispose());
});

test('cancels trusted touch dragging when another finger touches elsewhere', async ({ page }) => {
  await loadGesture(page, '<style>#target{touch-action:none;width:200px;height:200px}</style><div id="target"></div>');
  await installDrag(page);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { touchPoints: [{ id: 1, x: 30, y: 30 }], type: 'touchStart' });
    await session.send('Input.dispatchTouchEvent', { touchPoints: [{ id: 1, x: 60, y: 30 }], type: 'touchMove' });
    await session.send('Input.dispatchTouchEvent', {
      touchPoints: [
        { id: 1, x: 60, y: 30 },
        { id: 2, x: 280, y: 40 },
      ],
      type: 'touchStart',
    });
    await expect.poll(() => page.evaluate(() => (window as TestWindow).result?.reason)).toBe('cancel');
    await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
    expect(await page.evaluate(() => (window as TestWindow).pan?.active)).toBe(false);
  } finally {
    await session.detach();
  }
});

test('honors pointer-capture policy in a real browser', async ({ page }) => {
  await loadGesture(page);
  const target = page.locator('#target');
  const box = await target.boundingBox();
  if (!box) throw new Error('Gesture target has no layout box.');

  await installPan(page, true);
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 10);
  await page.mouse.up();
  expect(await page.evaluate(() => (window as TestWindow).captureCalls)).toBe(1);

  await page.evaluate(() => (window as TestWindow).pan?.dispose());
  await installPan(page, false);
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 10);
  await page.mouse.up();
  expect(await page.evaluate(() => (window as TestWindow).captureCalls)).toBe(0);
});

test('finishes an uncaptured drag released outside its target', async ({ page }) => {
  await loadGesture(page);
  await installDrag(page);
  const box = await page.locator('#target').boundingBox();
  if (!box) throw new Error('Gesture target has no layout box.');

  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + 150);
  await page.mouse.up();

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).result))
    .toEqual({
      distance: 240,
      reason: 'release',
      vertical: 140,
    });
});

test('tracks a target owned by a same-origin iframe document', async ({ page }) => {
  await loadGesture(
    page,
    '<iframe id="frame" style="width:400px;height:200px" srcdoc="<style>body{margin:0}#target{width:100px;height:100px}</style><div id=target></div>"></iframe>',
  );
  await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.getElementById('target'));
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const gesture = testWindow.Gesture;
    const target = document.querySelector('iframe')?.contentDocument?.getElementById('target');
    if (!gesture || !target) throw new Error('Iframe gesture fixture did not load.');

    testWindow.pan = gesture.createPanGesture(target, {
      axis: 'x',
      onEnd: ({ distance, reason }) => {
        testWindow.result = { distance, reason };
      },
      pointerCapture: false,
    });
  });
  const box = await page.frameLocator('#frame').locator('#target').boundingBox();
  if (!box) throw new Error('Iframe gesture target has no layout box.');

  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 10);
  await page.mouse.up();

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).result))
    .toEqual({
      distance: 170,
      reason: 'release',
    });
});

test('pinch gesture reports baseline-relative scale from real touch input', async ({ page }) => {
  await loadGesture(page, '<div id="target" style="width:300px;height:300px;touch-action:none"></div>');
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const gesture = testWindow.Gesture;
    const target = document.getElementById('target');
    if (!gesture || !target) throw new Error('Gesture test fixture did not load.');

    gesture.createPinchGesture(target, {
      activationDistance: 0,
      onEnd: (detail) => {
        testWindow.pinchResult = { reason: detail.reason, scale: detail.scale };
      },
      onMove: (detail) => {
        testWindow.pinchResult = { reason: 'move', scale: detail.scale };
      },
    });
  });

  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel', points: { x: number; y: number }[]) =>
    cdp.send('Input.dispatchTouchEvent', {
      touchPoints: points.map((point, index) => ({ ...point, id: index })),
      type,
    });

  await send('touchStart', [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ]);
  // Double the span: (100,100)-(300,100) against the (100,100)-(200,100) baseline.
  await send('touchMove', [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ]);
  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).pinchResult))
    .toEqual({ reason: 'move', scale: 2 });

  await send('touchEnd', [{ x: 100, y: 100 }]);
  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).pinchResult))
    .toEqual({ reason: 'release', scale: 2 });
});
