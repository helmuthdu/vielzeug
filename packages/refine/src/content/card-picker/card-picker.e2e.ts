import type { Page } from '@playwright/test';

import { axeCheck, expect, test } from '../../testing/fixtures';

const cards = `
  <ore-card-picker label="Choose action cards" values="alpha">
    <ore-card-picker-item value="alpha" label="Alpha">
      <img slot="media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23ddd'/%3E%3C/svg%3E">
      <span slot="header">Alpha</span>
      <p>Alpha card details.</p>
    </ore-card-picker-item>
    <ore-card-picker-item value="beta" label="Beta">
      <img slot="media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23bbb'/%3E%3C/svg%3E">
      <span slot="header">Beta</span>
      <p>Beta card details.</p>
    </ore-card-picker-item>
    <ore-card-picker-item value="gamma" label="Gamma">
      <img slot="media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23999'/%3E%3C/svg%3E">
      <span slot="header">Gamma</span>
      <p>Gamma card details.</p>
    </ore-card-picker-item>
  </ore-card-picker>`;

async function swipe(page: Page, deltaX: number, deltaY = 0): Promise<void> {
  const bounds = await page.locator('[part="stage"]').boundingBox();

  if (!bounds) throw new Error('Card picker stage must be visible before swiping');

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

test.describe('Accessibility', () => {
  test('names the browsing region and selection controls', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);

    await expect(page.getByRole('region', { name: 'Choose action cards' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Selected Alpha' })).toBeVisible();
    await page.getByRole('button', { name: 'Next card' }).click();
    await expect(page.getByRole('checkbox', { name: 'Select Beta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous card' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Next card' })).toBeEnabled();

    const results = await axeCheck(page);
    expect(results.violations).toEqual([]);
  });
});

test.describe('Responsive layout', () => {
  test.use({ isMobile: false, viewport: { height: 900, width: 1280 } });

  test('keeps the active card and controls within narrow and wide viewports', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ height: 800, width });
      const measurements = await page.evaluate(() => {
        const picker = document.querySelector('ore-card-picker')!;
        const active = picker.querySelector<HTMLElement>('[data-active]')!;
        const box = active.getBoundingClientRect();

        return {
          activeRight: box.right,
          activeWidth: box.width,
          activeX: box.x,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });

      expect(measurements.documentWidth).toBeLessThanOrEqual(measurements.viewportWidth);
      expect(measurements.activeX).toBeGreaterThanOrEqual(0);
      expect(measurements.activeRight).toBeLessThanOrEqual(width);
      expect(measurements.activeWidth).toBeGreaterThan(0);
    }
  });

  test('removes card transition motion when reduced motion is requested', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(cards);

    const durations = await page.locator('ore-card-picker-item[data-active]').evaluate((item) =>
      getComputedStyle(item)
        .transitionDuration.split(',')
        .map((duration) => duration.trim()),
    );
    expect(durations.length).toBeGreaterThan(0);
    expect(durations.every((duration) => duration === '0s')).toBe(true);
  });
});

test.describe('Desktop interaction', () => {
  test.use({ hasTouch: false, isMobile: false, viewport: { height: 900, width: 1280 } });

  test('browses with keyboard without changing selected values', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    const picker = page.getByRole('region', { name: 'Choose action cards' });
    await picker.focus();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'beta');
    await expect(picker).toHaveAttribute('values', 'alpha');

    await page.keyboard.press('End');
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'gamma');
    await page.keyboard.press('Home');
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'alpha');
  });
});

test.describe('Touch navigation', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('swipes browse only, vertical gestures do not browse, and selection stays explicit', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(cards);
    await page.locator('ore-card-picker').evaluate((picker) => {
      picker.addEventListener('change', () => picker.setAttribute('data-selection-changed', 'true'));
    });

    await swipe(page, -100);
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'beta');
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha');
    await expect(page.locator('ore-card-picker')).not.toHaveAttribute('data-selection-changed');

    await swipe(page, 0, -100);
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'beta');

    await page.getByRole('checkbox', { name: 'Select Beta' }).click();
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha,beta');
  });
});
