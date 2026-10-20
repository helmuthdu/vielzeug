import type { Page } from '@playwright/test';

import { expect, test } from '../../testing/fixtures';

const SIZES = {
  lg: { rail: 16, thumb: 24 },
  md: { rail: 12, thumb: 20 },
  sm: { rail: 8, thumb: 16 },
} as const;

const getSliderGeometry = (page: Page, size: keyof typeof SIZES) =>
  page.locator(`#${size}`).evaluate((slider) => {
    const container = slider.shadowRoot?.querySelector('.slider-container');
    const thumb = slider.shadowRoot?.querySelector('.slider-thumb-sole');
    const track = slider.shadowRoot?.querySelector('.slider-track');

    if (!container || !thumb || !track) throw new Error('Slider geometry is unavailable');

    return {
      interactionHeight: container.getBoundingClientRect().height,
      thumbHeight: thumb.getBoundingClientRect().height,
      trackHeight: track.getBoundingClientRect().height,
    };
  });

test.describe('Layout', () => {
  for (const [size, expected] of Object.entries(SIZES) as [keyof typeof SIZES, (typeof SIZES)[keyof typeof SIZES]][]) {
    test(`${size} uses the compact visual scale`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`<ore-slider id="${size}" size="${size}" value="50">Volume</ore-slider>`);

      const dimensions = await getSliderGeometry(page, size);

      expect(dimensions.interactionHeight).toBeGreaterThanOrEqual(44);
      expect(dimensions.thumbHeight).toBe(expected.thumb);
      expect(dimensions.trackHeight).toBe(expected.rail);
    });
  }

  test('keeps endpoint thumbs within the control and fills to the logical rail end', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-slider id="minimum" value="0">Minimum</ore-slider>
      <ore-slider id="maximum" value="100">Maximum</ore-slider>
    `);

    const bounds = await page.locator('ore-slider').evaluateAll((sliders) =>
      sliders.map((slider) => {
        const container = slider.shadowRoot?.querySelector('.slider-container');
        const fill = slider.shadowRoot?.querySelector('.slider-fill');
        const track = slider.shadowRoot?.querySelector('.slider-track');
        const thumb = slider.shadowRoot?.querySelector('.slider-thumb-sole');

        if (!container || !fill || !track || !thumb) throw new Error('Slider geometry is unavailable');

        const containerRect = container.getBoundingClientRect();
        const fillRect = fill.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();

        return {
          containerLeft: containerRect.left,
          containerRight: containerRect.right,
          fillRight: fillRect.right,
          thumbLeft: thumbRect.left,
          thumbRight: thumbRect.right,
          trackLeft: trackRect.left,
          trackRight: trackRect.right,
        };
      }),
    );

    for (const slider of bounds) {
      expect(slider.thumbLeft).toBeGreaterThanOrEqual(slider.containerLeft);
      expect(slider.thumbRight).toBeLessThanOrEqual(slider.containerRight);
    }

    expect(bounds[0].thumbLeft).toBeCloseTo(bounds[0].trackLeft - SIZES.md.thumb / 2, 3);
    expect(bounds[1].fillRight).toBeCloseTo(bounds[1].trackRight, 3);
    expect(bounds[1].thumbRight).toBeCloseTo(bounds[1].trackRight + SIZES.md.thumb / 2, 3);
  });

  test('keeps the track usable when a long label cannot share the line', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-slider id="long" value="50" style="width: 220px">Temperature (0-200 C) extended label</ore-slider>
    `);

    const geometry = await page.locator('#long').evaluate((slider) => {
      const container = slider.shadowRoot?.querySelector('.slider-container');
      const label = slider.shadowRoot?.querySelector('.label');

      if (!container || !label) throw new Error('Slider geometry is unavailable');

      const containerRect = container.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        labelBelow: labelRect.top >= containerRect.bottom - 1,
        trackWidth: containerRect.width,
      };
    });

    // Before the flex-basis fix the nowrap label sized the shrink-to-fit host and
    // starved the track to near zero; it must keep at least a usable width instead.
    expect(geometry.trackWidth).toBeGreaterThanOrEqual(120);
    expect(geometry.labelBelow).toBe(true);
  });

  test('keeps label and track on one line when the host is wide', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-slider id="wide" value="50" style="width: 640px">Volume</ore-slider>
    `);

    const geometry = await page.locator('#wide').evaluate((slider) => {
      const container = slider.shadowRoot?.querySelector('.slider-container');
      const label = slider.shadowRoot?.querySelector('.label');

      if (!container || !label) throw new Error('Slider geometry is unavailable');

      const containerRect = container.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        sameLine: labelRect.top < containerRect.bottom - 1,
        trackWidth: containerRect.width,
      };
    });

    expect(geometry.sameLine).toBe(true);
    expect(geometry.trackWidth).toBeGreaterThan(400);
  });
});

test.describe('Touch layout', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  for (const [size, expected] of Object.entries(SIZES) as [keyof typeof SIZES, (typeof SIZES)[keyof typeof SIZES]][]) {
    test(`${size} preserves the visual scale`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`<ore-slider id="${size}" size="${size}" value="50">Volume</ore-slider>`);

      const dimensions = await getSliderGeometry(page, size);

      expect(dimensions.interactionHeight).toBeGreaterThanOrEqual(44);
      expect(dimensions.thumbHeight).toBe(expected.thumb);
      expect(dimensions.trackHeight).toBe(expected.rail);
    });
  }
});
