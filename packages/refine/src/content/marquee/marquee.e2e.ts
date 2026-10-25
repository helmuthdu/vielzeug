import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('preserves the Carousel marquee viewport and card sizing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-marquee><div style="background:var(--color-contrast-100);width:200px">Item A</div>' +
        '<div style="background:var(--color-contrast-200);width:200px">Item B</div></ore-marquee>',
    );

    const marquee = page.locator('ore-marquee');
    const track = marquee.locator('div[part="track"]');
    const firstCard = marquee.locator('div').first();

    await expect(marquee).toHaveCSS('border-radius', '12px');
    await expect(track).toHaveCSS('position', 'absolute');
    await expect(firstCard).toHaveCSS('height', '240px');
  });

  test('repeats enough cards to cover the viewport and exposes Carousel-style controls', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<ore-marquee><div style="background:var(--color-contrast-100);width:200px">Item A</div>' +
        '<div style="background:var(--color-contrast-200);width:200px">Item B</div></ore-marquee>',
    );

    const marquee = page.locator('ore-marquee');
    const track = marquee.locator('div[part="track"]');

    await expect(marquee.locator('.controls')).toBeVisible();
    await expect(track).toHaveCSS('animation-iteration-count', 'infinite');
    await expect
      .poll(() => track.evaluate((element) => element.style.getPropertyValue('--_marquee-translate')))
      .toMatch(/^-\d+px$/);
    await expect(marquee.locator('[data-marquee-clone]')).not.toHaveCount(0);

    await marquee.locator('.next-btn').click();

    await expect(track).not.toHaveCSS('animation-delay', '0s');
  });

  test('initializes its loop when children arrive after the element connects', async ({ page, refinePage }) => {
    await refinePage.mountComponent('');

    await page.evaluate(() => {
      const marquee = document.createElement('ore-marquee');

      document.querySelector('.frame')?.append(marquee);
      marquee.innerHTML =
        '<div style="background:var(--color-contrast-100);width:200px">Item A</div>' +
        '<div style="background:var(--color-contrast-200);width:200px">Item B</div>';
    });

    const marquee = page.locator('ore-marquee');
    const track = marquee.locator('div[part="track"]');

    await expect
      .poll(() => track.evaluate((element) => element.style.getPropertyValue('--_marquee-translate')))
      .toMatch(/^-\d+px$/);
    await expect(marquee.locator('[data-marquee-clone]')).not.toHaveCount(0);
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-marquee><div style="background:var(--color-contrast-100);width:200px">Free shipping</div>' +
        '<div style="background:var(--color-contrast-200);width:200px">New arrivals</div></ore-marquee>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('pauses the animation on hover and keyboard focus by default (SC 2.2.2)', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-marquee><div style="background:var(--color-contrast-100);width:200px">Item A</div>' +
        '<div style="background:var(--color-contrast-200);width:200px">Item B</div></ore-marquee>',
    );

    const track = page.locator('ore-marquee div[part="track"]');

    await expect(track).toHaveCSS('animation-play-state', 'running');

    await page.locator('ore-marquee').hover();

    await expect(track).toHaveCSS('animation-play-state', 'paused');

    await page.mouse.move(0, 0);

    await page.locator('ore-marquee .next-btn').focus();

    await expect(track).toHaveCSS('animation-play-state', 'paused');
  });
});
