import { expect, test } from '../../testing/fixtures';

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
