import type { Page } from '@playwright/test';

import { expect, test } from '../../testing/fixtures';

test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

async function swipe(page: Page, deltaX: number, deltaY = 0): Promise<void> {
  const bounds = await page.locator('ore-carousel').boundingBox();

  if (!bounds) throw new Error('Carousel must be visible before swiping');

  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const session = await page.context().newCDPSession(page);

  try {
    await session.send('Input.dispatchTouchEvent', { touchPoints: [{ x, y }], type: 'touchStart' });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {
        touchPoints: [{ x: x + (deltaX * step) / 6, y: y + (deltaY * step) / 6 }],
        type: 'touchMove',
      });
    }
    await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  } finally {
    await session.detach();
  }
}

const covers = `
  <ore-carousel label="Cover selection" show-controls="false" show-indicators="false" style="height:240px">
    <ore-carousel-slide><button style="width:100%;height:100%">Cover one</button></ore-carousel-slide>
    <ore-carousel-slide><button style="width:100%;height:100%">Cover two</button></ore-carousel-slide>
    <ore-carousel-slide><button style="width:100%;height:100%">Cover three</button></ore-carousel-slide>
  </ore-carousel>
`;

test.describe('Touch navigation', () => {
  test('swipes over cover buttons without firing a selection click, then permits a tap', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(covers);
    await page.locator('ore-carousel').evaluate((carousel) => {
      carousel.addEventListener('click', () => carousel.setAttribute('data-clicked', 'true'));
    });

    await swipe(page, -100);

    await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '1');
    await expect(page.locator('ore-carousel')).not.toHaveAttribute('data-clicked');
    await page.getByRole('button', { name: 'Cover two' }).tap();
    await expect(page.locator('ore-carousel')).toHaveAttribute('data-clicked', 'true');
  });

  test('swipes from clickable articles used by custom cover layouts', async ({ page, refinePage }) => {
    await refinePage.mountComponent(covers.replaceAll('button', 'article'));
    await page.locator('ore-carousel').evaluate((carousel) => {
      carousel.addEventListener('change', () =>
        carousel.setAttribute('data-selected', carousel.getAttribute('slide-index')!),
      );
      carousel.addEventListener('click', () => carousel.setAttribute('data-selected', '0'));
    });

    await swipe(page, -100);

    await expect(page.locator('ore-carousel')).toHaveAttribute('data-selected', '1');
    await swipe(page, 100);
    await expect(page.locator('ore-carousel')).toHaveAttribute('data-selected', '0');
  });

  test('preserves vertical page scrolling over a horizontal carousel', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`${covers}<div style="height:2000px"></div>`);

    await swipe(page, 0, -100);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(page.locator('ore-carousel-slide[data-active]')).toHaveText('Cover one');
  });

  test('uses the vertical swipe axis after an orientation change', async ({ page, refinePage }) => {
    await refinePage.mountComponent(covers);
    await page.locator('ore-carousel').evaluate((carousel) => carousel.setAttribute('orientation', 'vertical'));
    await expect(page.locator('ore-carousel')).toHaveCSS('touch-action', 'pan-x pinch-zoom');

    await swipe(page, 0, -100);

    await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '1');
  });

  test('allows page scrolling and pinch zoom without replacing consumer inline styles', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(covers);

    await expect(page.locator('ore-carousel')).toHaveCSS('touch-action', 'pan-y pinch-zoom');
    await expect(page.locator('ore-carousel')).toHaveCSS('height', '240px');
  });
});
