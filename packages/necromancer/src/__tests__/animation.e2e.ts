import type { Page } from '@playwright/test';

import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type NecromancerRuntime = Pick<typeof import('../index'), 'animate' | 'captureLayout'>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.resolve(__dirname, '../../dist/necromancer.iife.js');

async function loadNecromancer(page: Page): Promise<void> {
  await page.setContent('<!DOCTYPE html><html><body></body></html>');
  await page.addScriptTag({ path: bundle });
}

test.beforeEach(async ({ page }) => {
  await loadNecromancer(page);
});

test('reports native cancellation without disposing its owner', async ({ page }) => {
  const outcome = await page.evaluate(async () => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const handle = necromancer.animate(
      document.body.appendChild(document.createElement('div')),
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 120,
        fill: 'both',
        motion: 'full',
      },
    );

    handle.animation.cancel();

    const result = await handle.result;

    return {
      disposed: handle.disposed,
      hasAbortReason: result.status === 'cancelled' && result.reason instanceof DOMException,
      status: result.status,
    };
  });

  expect(outcome).toEqual({ disposed: false, hasAbortReason: true, status: 'cancelled' });
});

test('reports native completion after finish', async ({ page }) => {
  const outcome = await page.evaluate(async () => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const handle = necromancer.animate(
      document.body.appendChild(document.createElement('div')),
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 120,
        fill: 'both',
        motion: 'full',
      },
    );

    handle.animation.finish();

    return await handle.result;
  });

  expect(outcome).toEqual({ status: 'finished' });
});

test('interrupts prior Necromancer-owned animations without touching native caller animations', async ({ page }) => {
  const outcome = await page.evaluate(async () => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const element = document.body.appendChild(document.createElement('div'));
    const external = element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'both' });
    const first = necromancer.animate(element, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 120,
      fill: 'both',
      motion: 'full',
    });
    const second = necromancer.animate(element, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 120,
      fill: 'both',
      interrupt: 'cancel',
      motion: 'full',
    });
    const result = await first.result;

    second.dispose();

    return {
      externalState: external.playState,
      firstDisposed: first.disposed,
      firstStatus: result.status,
    };
  });

  expect(outcome).toEqual({ externalState: 'running', firstDisposed: true, firstStatus: 'cancelled' });
});
test('reduces motion while preserving its requested keyframes', async ({ page }) => {
  const outcome = await page.evaluate(async () => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const element = document.body.appendChild(document.createElement('div'));

    element.style.opacity = '0.4';

    const handle = necromancer.animate(element, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 120,
      fill: 'both',
      motion: 'reduced',
    });

    const status = (await handle.result).status;
    const frames = handle.animation.effect?.getKeyframes();

    return {
      finalOpacity: getComputedStyle(element).opacity,
      firstOpacity: frames?.[0]?.['opacity'],
      status,
    };
  });

  expect(outcome).toEqual({ finalOpacity: '1', firstOpacity: '0', status: 'reduced' });
});

test('adds FLIP translation without replacing authored transforms or translate', async ({ page }) => {
  const outcome = await page.evaluate(() => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const element = document.body.appendChild(document.createElement('div'));

    element.style.cssText = 'height: 20px; transform: rotate(12deg); translate: 12px 6px; width: 20px';

    const transition = necromancer.captureLayout([element]);

    element.style.marginLeft = '40px';

    const group = transition.animate({ duration: 120, motion: 'full' });
    const handle = group.handles[0];

    if (!handle) throw new Error('Expected a FLIP animation.');

    handle.animation.pause();

    const frames = handle.animation.effect?.getKeyframes();
    const firstFrame = frames?.[0];

    group.dispose();

    return {
      authoredTranslate: element.style.translate,
      composite: firstFrame?.['composite'],
      handleCount: group.handles.length,
      transform: element.style.transform,
      translate: firstFrame?.['translate'],
    };
  });

  expect(outcome.composite).toBe('add');
  expect(outcome.handleCount).toBe(1);
  expect(outcome.authoredTranslate).toBe('12px 6px');
  expect(outcome.transform).toBe('rotate(12deg)');
  expect(Number.parseFloat(outcome.translate ?? '')).toBe(-40);
});

test('adds FLIP scaling without replacing an authored scale', async ({ page }) => {
  // jsdom cannot render layout, so the unit test suite can only assert the keyframe
  // strings Necromancer generates — not that a real browser actually composes an
  // additive `scale` by multiplying (per spec) rather than adding the raw numbers.
  // This test measures the rendered box itself to confirm that composition. No rotation
  // here deliberately: `getBoundingClientRect()`'s width is the rotated, axis-aligned
  // bounding box, which would distort a direct width comparison — this test isolates
  // scale from that (rotation-vs-scale interaction is covered by the layout capture
  // itself using `offsetWidth`, not `getBoundingClientRect()`, for size — see layout.ts).
  const outcome = await page.evaluate(() => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const element = document.body.appendChild(document.createElement('div'));

    element.style.cssText = 'height: 20px; scale: 1; width: 20px';

    const transition = necromancer.captureLayout([element]);

    element.style.width = '40px';

    const group = transition.animate({ duration: 120, motion: 'full' });
    const handle = group.handles[0];

    if (!handle) throw new Error('Expected a FLIP animation.');

    handle.animation.pause();

    const startWidth = element.getBoundingClientRect().width;
    const frames = handle.animation.effect?.getKeyframes();
    const firstFrame = frames?.[0];

    handle.animation.finish();

    const endWidth = element.getBoundingClientRect().width;

    group.dispose();

    return {
      authoredScale: element.style.scale,
      composite: firstFrame?.['composite'],
      endWidth,
      scale: firstFrame?.['scale'],
      startWidth,
    };
  });

  expect(outcome.composite).toBe('add');
  expect(outcome.scale).toBe('0.5 1');
  // Additive `scale` composes by multiplying (per the Web Animations spec), so the box
  // renders at its captured 20px width at the start of the transition...
  expect(Math.round(outcome.startWidth)).toBe(20);
  // ...and at its new native 40px width once the animation settles back to `scale: 1`.
  expect(Math.round(outcome.endWidth)).toBe(40);
  expect(outcome.authoredScale).toBe('1');
});

test('matches replacement layout elements by key', async ({ page }) => {
  const outcome = await page.evaluate(() => {
    const necromancer = (window as Window & { Necromancer?: NecromancerRuntime }).Necromancer;

    if (!necromancer) throw new Error('Necromancer IIFE did not load.');

    const captured = document.body.appendChild(document.createElement('div'));

    captured.dataset.id = 'notice';
    captured.style.cssText = 'height: 20px; transform: rotate(12deg); width: 20px';

    const transition = necromancer.captureLayout([captured], {
      getKey: (element) => element.getAttribute('data-id') ?? '',
    });
    const replacement = document.createElement('div');

    replacement.dataset.id = 'notice';
    replacement.style.cssText = 'height: 20px; margin-left: 40px; transform: rotate(12deg); width: 20px';
    captured.replaceWith(replacement);

    const group = transition.animate({ duration: 120, elements: [replacement], motion: 'full' });
    const handle = group.handles[0];

    if (!handle) throw new Error('Expected a replacement FLIP animation.');

    handle.animation.pause();

    const firstFrame = handle.animation.effect?.getKeyframes()[0];

    group.dispose();

    return {
      composite: firstFrame?.['composite'],
      targetIsReplacement: handle.animation.effect?.target === replacement,
      transform: replacement.style.transform,
      translate: firstFrame?.['translate'],
    };
  });

  expect(outcome.composite).toBe('add');
  expect(outcome.targetIsReplacement).toBe(true);
  expect(outcome.transform).toBe('rotate(12deg)');
  expect(Number.parseFloat(outcome.translate ?? '')).toBe(-40);
});
