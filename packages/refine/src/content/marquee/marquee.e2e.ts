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
    const buttonRadii = await marquee.locator('ore-button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const surface = button.shadowRoot?.querySelector('[part="button"]');

        return surface ? getComputedStyle(surface).borderRadius : null;
      }),
    );
    expect(buttonRadii).toEqual(['50%', '50%', '50%']);
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
  test('navigation reveals items without animation under reduced motion', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<ore-marquee style="width:200px"><div style="width:200px">Item A</div>' +
        '<div style="width:200px">Item B</div></ore-marquee>',
    );
    const marquee = page.locator('ore-marquee');
    const track = marquee.locator('[part="track"]');
    await expect
      .poll(() => track.evaluate((element) => element.style.getPropertyValue('--_marquee-translate')))
      .not.toBe('');
    const second = marquee.locator('div').nth(1);
    const before = (await second.boundingBox())!.x;
    await page.getByRole('button', { name: 'Next item' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await second.boundingBox())!.x).toBeLessThan(before - 100);
    await expect(track).toHaveCSS('animation-name', 'none');
    await page.getByRole('button', { name: 'Previous item' }).click();
    await expect.poll(async () => (await second.boundingBox())!.x).toBeGreaterThan(before - 1);
    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'full'));
    await expect(track).not.toHaveCSS('animation-name', 'none');
    await page.locator('html').evaluate((root) => root.setAttribute('data-motion', 'reduced'));
    await page.getByRole('button', { name: 'Next item' }).click();
    await expect.poll(async () => (await second.boundingBox())!.x).toBeLessThan(before - 100);
  });

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

  test('keeps a persistent pause and resumes while the toggle remains focused', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-marquee><div style="background:var(--color-contrast-100);width:200px">Item A</div>' +
        '<div style="background:var(--color-contrast-200);width:200px">Item B</div></ore-marquee>',
    );

    const track = page.locator('ore-marquee div[part="track"]');
    const pause = page.getByRole('button', { name: 'Pause marquee' });

    await pause.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Resume marquee' })).toBeVisible();
    await expect(track).toHaveCSS('animation-play-state', 'paused');

    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Pause marquee' })).toBeVisible();
    await expect(track).toHaveCSS('animation-play-state', 'running');
  });
});
