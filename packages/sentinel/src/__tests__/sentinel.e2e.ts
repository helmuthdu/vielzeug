import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { Sentinel, ViewportState } from '../index.ts';

type SentinelRuntime = Pick<
  typeof import('../index.ts'),
  'createElementSize' | 'createIntersection' | 'createMediaQuery' | 'createViewport'
>;

type TestWindow = Window & {
  Sentinel?: SentinelRuntime;
  sentinelHandle?: Sentinel<unknown>;
  sentinelUnsubscribe?: () => void;
  sentinelValue?: unknown;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rippleBundle = path.resolve(__dirname, '../../../ripple/dist/ripple.iife.js');
const sentinelBundle = path.resolve(__dirname, '../../dist/sentinel.iife.js');

async function loadSentinel(page: Page): Promise<void> {
  await page.setContent('<!DOCTYPE html><html><body></body></html>');
  await page.addScriptTag({ path: rippleBundle });
  await page.addScriptTag({ path: sentinelBundle });
}

async function disposeSentinel(page: Page): Promise<void> {
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    testWindow.sentinelUnsubscribe?.();
    testWindow.sentinelHandle?.dispose();
  });
}

async function createScaledContext(browser: Browser) {
  return browser.newContext({
    deviceScaleFactor: 2,
    viewport: { height: 600, width: 800 },
  });
}

test('tracks viewport dimensions in a real browser', async ({ page }) => {
  await page.setViewportSize({ height: 600, width: 800 });
  await loadSentinel(page);
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const sentinel = testWindow.Sentinel?.createViewport();
    if (!sentinel) throw new Error('Sentinel IIFE did not load.');

    const update = () => {
      testWindow.sentinelValue = sentinel.value;
    };

    update();
    testWindow.sentinelHandle = sentinel;
    testWindow.sentinelUnsubscribe = sentinel.subscribe(update);
  });

  await page.setViewportSize({ height: 720, width: 960 });

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).sentinelValue))
    .toMatchObject({ height: 720, width: 960 });

  await disposeSentinel(page);
});

test('reads the browser device pixel ratio', async ({ browser }) => {
  const context = await createScaledContext(browser);
  const page = await context.newPage();
  await loadSentinel(page);

  const state = await page.evaluate(() => {
    const sentinel = (window as TestWindow).Sentinel?.createViewport();
    if (!sentinel) throw new Error('Sentinel IIFE did not load.');

    const value: ViewportState = sentinel.value;
    sentinel.dispose();
    return value;
  });

  expect(state.dpr).toBe(2);
  await context.close();
});

test('tracks media query changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadSentinel(page);
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const sentinel = testWindow.Sentinel?.createMediaQuery('(prefers-reduced-motion: reduce)');
    if (!sentinel) throw new Error('Sentinel IIFE did not load.');

    const update = () => {
      testWindow.sentinelValue = sentinel.value.matches;
    };

    update();
    testWindow.sentinelHandle = sentinel;
    testWindow.sentinelUnsubscribe = sentinel.subscribe(update);
  });

  expect(await page.evaluate(() => (window as TestWindow).sentinelValue)).toBe(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => (window as TestWindow).sentinelValue)).toBe(true);

  await disposeSentinel(page);
});

test('tracks element size changes', async ({ page }) => {
  await loadSentinel(page);
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const element = document.createElement('div');
    element.style.height = '40px';
    element.style.width = '120px';
    document.body.append(element);

    const sentinel = testWindow.Sentinel?.createElementSize(element);
    if (!sentinel) throw new Error('Sentinel IIFE did not load.');

    testWindow.sentinelHandle = sentinel;
    testWindow.sentinelUnsubscribe = sentinel.subscribe(() => {
      testWindow.sentinelValue = sentinel.value;
    });
  });

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).sentinelValue))
    .toMatchObject({ height: 40, width: 120 });

  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>('div');
    if (element) element.style.width = '240px';
  });

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).sentinelValue))
    .toMatchObject({ height: 40, width: 240 });

  await disposeSentinel(page);
});

test('tracks intersection changes', async ({ page }) => {
  await loadSentinel(page);
  await page.evaluate(() => {
    const testWindow = window as TestWindow;
    const spacer = document.createElement('div');
    spacer.style.height = '2000px';
    const target = document.createElement('div');
    target.style.height = '20px';
    document.body.append(spacer, target);

    const sentinel = testWindow.Sentinel?.createIntersection(target);
    if (!sentinel) throw new Error('Sentinel IIFE did not load.');

    testWindow.sentinelHandle = sentinel;
    testWindow.sentinelUnsubscribe = sentinel.subscribe(() => {
      testWindow.sentinelValue = sentinel.value;
    });
  });

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).sentinelValue))
    .toMatchObject({ isIntersecting: false });

  await page.evaluate(() => document.querySelector('body > div:last-child')?.scrollIntoView());

  await expect
    .poll(() => page.evaluate(() => (window as TestWindow).sentinelValue))
    .toMatchObject({ isIntersecting: true });

  await disposeSentinel(page);
});
