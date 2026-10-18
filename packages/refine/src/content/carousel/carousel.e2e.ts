import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

import { axeCheck, expect, test } from '../../testing/fixtures';

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

  const coverflow = (attributes = '', count = 15): string => `
      <style>
        .cover { display:block; width:100%; height:100%; margin:0; background:var(--color-contrast-100); }
        .cover button { min-width:44px; min-height:44px; }
      </style>
      <ore-carousel variant="coverflow" label="Browse covers" show-controls="false" show-indicators="false"
        style="width:320px;height:240px" ${attributes}>
        ${Array.from(
          { length: count },
          (_, index) => `<ore-carousel-slide aria-label="Cover ${index + 1}">
            <article class="cover"><button tabindex="0">Choose ${index + 1}</button></article>
          </ore-carousel-slide>`,
        ).join('')}
      </ore-carousel>
    `;

  test.describe('Coverflow', () => {
    test.use({ isMobile: false, viewport: { height: 1000, width: 1280 } });

    for (const layout of ['horizontal', 'rtl', 'vertical']) {
      test(`tapers ${layout} desktop outer covers consistently through the final slide`, async ({
        page,
        refinePage,
      }) => {
        const vertical = layout === 'vertical';
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await refinePage.mountComponent(
          coverflow(vertical ? 'orientation="vertical"' : `dir="${layout === 'rtl' ? 'rtl' : 'ltr'}"`).replace(
            vertical ? 'height:240px' : 'width:320px',
            vertical ? 'height:1100px' : 'width:1100px',
          ),
        );
        for (const current of [0, 7, 14]) {
          await page
            .locator('ore-carousel')
            .evaluate((el, index) => el.setAttribute('slide-index', String(index)), current);
          await expect(page.locator('ore-carousel-slide[data-active]')).toHaveAttribute(
            'aria-label',
            `Cover ${current + 1}`,
          );
          const positions = await page.locator('ore-carousel-slide').evaluateAll(
            (slides, vertical) =>
              slides.map((slide) => {
                const box = slide.getBoundingClientRect();
                return {
                  center: vertical ? box.y + box.height / 2 : box.x + box.width / 2,
                  cross: vertical ? box.x : box.y,
                  size: vertical ? box.width : box.height,
                };
              }),
            vertical,
          );
          for (let distance = 1; distance <= 7; distance++) {
            const next = positions[(current + distance) % 15]!;
            const previous = positions[(current + distance - 1) % 15]!;
            const opposite = positions[(current - distance + 15) % 15]!;
            const center = positions[current]!.center;

            expect(next.size).toBeLessThan(previous.size - 1);
            expect(Math.abs(next.center - center)).toBeGreaterThan(Math.abs(previous.center - center));
            expect(Math.abs(next.center + opposite.center - 2 * center)).toBeLessThan(1);
            expect(next.cross).toBeCloseTo(opposite.cross);
            expect(next.size).toBeCloseTo(opposite.size);
            if (distance >= 4) {
              expect(next.size).toBeLessThan(positions[current]!.size * 0.75);
            }
          }
        }
      });
    }

    for (const orientation of ['horizontal', 'vertical']) {
      for (const navigation of ['combined', 'controls', 'indicators', 'hidden']) {
        test(`reserves space for ${navigation} navigation in ${orientation} coverflow`, async ({
          page,
          refinePage,
        }) => {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await refinePage.mountComponent(
            coverflow(`orientation="${orientation}"`, 3)
              .replace('show-controls="false"', `show-controls="${['combined', 'controls'].includes(navigation)}"`)
              .replace(
                'show-indicators="false"',
                `show-indicators="${['combined', 'indicators'].includes(navigation)}"`,
              ),
          );
          const track = (await page.locator('[part="track"]').boundingBox())!;
          const host = (await page.locator('ore-carousel').boundingBox())!;

          if (navigation === 'hidden') {
            await expect(page.locator('.indicators, .controls')).toHaveCount(0);
            expect(host.height - track.height).toBeLessThan(20);
            expect(host.width - track.width).toBeLessThan(20);
          } else {
            const nav = (await page.locator(navigation === 'controls' ? '.controls' : '.indicators').boundingBox())!;

            if (orientation === 'horizontal') {
              expect(nav.y).toBeGreaterThanOrEqual(track.y + track.height);
            } else {
              expect(nav.x + nav.width).toBeLessThanOrEqual(track.x);
            }
          }
          const cover = (await page.locator('[data-active]').boundingBox())!;

          expect(cover.x).toBeGreaterThanOrEqual(track.x);
          expect(cover.y).toBeGreaterThanOrEqual(track.y);
          expect(cover.x + cover.width).toBeLessThanOrEqual(track.x + track.width + 1);
          expect(cover.y + cover.height).toBeLessThanOrEqual(track.y + track.height + 1);
          if (navigation === 'combined' || navigation === 'controls') {
            await page.getByRole('button', { name: 'Next slide' }).click();
            await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '1');
          }
        });
      }
    }

    test('renders fully rounded navigation buttons in every variant', async ({ page, refinePage }) => {
      for (const variant of ['default', 'fade', 'filmstrip', 'gallery', 'coverflow']) {
        await refinePage.mountComponent(covers.replace('show-controls="false"', `variant="${variant}"`));
        for (const button of await page.locator('.nav-btn').all()) {
          await expect(button).toHaveAttribute('rounded', 'full');
          const shape = await button.locator('[part="button"]').evaluate((el) => {
            const style = getComputedStyle(el);
            const box = el.getBoundingClientRect();
            return { height: box.height, radius: style.borderTopLeftRadius, width: box.width };
          });

          expect(shape.radius).toBe('50%');
          expect(shape.width).toBeCloseTo(shape.height);
        }
      }
    });

    test('releases navigation space when controls and indicators are hidden at runtime', async ({
      page,
      refinePage,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await refinePage.mountComponent(
        coverflow('', 3).replace('show-controls="false"', '').replace('show-indicators="false"', ''),
      );
      const carousel = page.locator('ore-carousel');
      const track = page.locator('[part="track"]');
      const original = (await track.boundingBox())!;

      await carousel.evaluate((el) => {
        el.setAttribute('show-controls', 'false');
        el.setAttribute('show-indicators', 'false');
      });
      await expect(page.locator('.indicators, .controls')).toHaveCount(0);
      await expect.poll(async () => (await track.boundingBox())!.height).toBeGreaterThan(original.height);
      await carousel.evaluate((el) => {
        el.setAttribute('show-controls', 'true');
        el.setAttribute('show-indicators', 'true');
      });
      await expect(page.locator('.indicators .controls')).toBeVisible();
      await expect.poll(async () => (await track.boundingBox())!.height).toBeCloseTo(original.height);
    });

    test('centers the labels in both square documentation examples and keeps the shared navigation bar', async ({
      page,
      refinePage,
    }) => {
      const docs = readFileSync(new URL('../../../../../docs/refine/components/carousel.md', import.meta.url), 'utf8');
      const section = docs.split('### Coverflow\n')[1]!.split('## Keyboard Navigation')[0]!;
      const examples = [...section.matchAll(/```html\n([\s\S]*?)```/g)];

      expect(examples).toHaveLength(2);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const [index, example] of examples.entries()) {
        await refinePage.mountComponent(example[1]!);
        const slide = page.locator('ore-carousel-slide[data-active]');
        const cover = (await slide.boundingBox())!;
        const label = (await slide.locator('ore-text').boundingBox())!;
        const track = (await page.locator('[part="track"]').boundingBox())!;

        expect(cover.width).toBeCloseTo(cover.height);
        expect(cover.y).toBeGreaterThanOrEqual(track.y);
        expect(cover.y + cover.height).toBeLessThanOrEqual(track.y + track.height);
        expect(Math.abs(label.x + label.width / 2 - (cover.x + cover.width / 2))).toBeLessThan(1);
        expect(Math.abs(label.y + label.height / 2 - (cover.y + cover.height / 2))).toBeLessThan(1);
        if (index === 0) {
          await expect(page.locator('.indicators .indicator-list')).toBeVisible();
          await expect(page.locator('.indicators .controls')).toBeVisible();
          await expect(page.getByRole('button', { name: 'Next slide' })).toBeVisible();
        }
      }
    });

    test('fits additional previews when only its container grows, preserving selection and focus', async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(coverflow());
      const carousel = page.locator('ore-carousel');
      const visible = page.locator('ore-carousel-slide[data-coverflow-visible]');
      const active = page.locator('ore-carousel-slide[data-active]');
      const before = await active.boundingBox();

      await expect(visible).toHaveCount(3);
      await carousel.focus();
      await carousel.evaluate((el) => {
        el.addEventListener('change', () => el.setAttribute('data-changed', 'true'));
        el.style.width = '800px';
      });
      await expect(visible).toHaveCount(13);
      await expect(carousel).toBeFocused();
      await expect(carousel).not.toHaveAttribute('data-changed');
      await expect(active).toHaveAttribute('aria-label', 'Cover 1');
      expect((await active.boundingBox())!.width).toBeCloseTo(before!.width);
      for (const slide of await visible.all()) {
        const box = (await slide.boundingBox())!;
        const host = (await carousel.boundingBox())!;

        expect(box.x).toBeGreaterThanOrEqual(host.x);
        expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
    });

    test('selects the painted preview without activating its inert button', async ({ page, refinePage }) => {
      await refinePage.mountComponent(coverflow());
      const carousel = page.locator('ore-carousel');

      await carousel.evaluate((el) => {
        el.setAttribute('data-changes', '0');
        el.addEventListener('change', () =>
          el.setAttribute('data-changes', String(Number(el.getAttribute('data-changes')) + 1)),
        );
        for (const button of el.querySelectorAll('button')) {
          button.addEventListener('click', () => el.setAttribute('data-activated', button.textContent!));
        }
      });
      const preview = (await page.locator('ore-carousel-slide').nth(1).boundingBox())!;

      await page.mouse.click(preview.x + preview.width - 8, preview.y + preview.height / 2);
      await expect(carousel).toHaveAttribute('slide-index', '1');
      await expect(carousel).toHaveAttribute('data-changes', '1');
      await expect(carousel).not.toHaveAttribute('data-activated');
      await page.getByRole('button', { exact: true, name: 'Choose 2' }).click();
      await expect(carousel).toHaveAttribute('data-activated', 'Choose 2');
      await expect(carousel).toHaveAttribute('data-changes', '1');
    });

    test('keeps hidden content out of tab order and moves focus before hiding the active card', async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(`${coverflow()}<button tabindex="0" id="after">After carousel</button>`);
      const carousel = page.locator('ore-carousel');

      await carousel.focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { exact: true, name: 'Choose 1' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#after')).toBeFocused();
      await page.getByRole('button', { exact: true, name: 'Choose 1' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(carousel).toHaveAttribute('slide-index', '1');
      await expect(carousel).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { exact: true, name: 'Choose 2' })).toBeFocused();
    });

    test('swipes without selecting a trailing cover click, then supports tapping a preview', async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(coverflow());
      await swipe(page, -100);
      await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '1');
      const preview = (await page.locator('ore-carousel-slide').nth(2).boundingBox())!;

      await page.touchscreen.tap(preview.x + preview.width - 8, preview.y + preview.height / 2);
      await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '2');
    });

    test('adapts to vertical container height without horizontal navigation', async ({ page, refinePage }) => {
      await refinePage.mountComponent(coverflow('orientation="vertical"'));
      const carousel = page.locator('ore-carousel');

      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(1);
      await carousel.evaluate((el) => {
        el.style.height = '800px';
      });
      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(13);
      await carousel.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-active]')).toHaveAttribute('aria-label', 'Cover 1');
      await page.keyboard.press('ArrowDown');
      await expect(carousel).toHaveAttribute('slide-index', '1');
    });

    test('mirrors layout, keyboard, and touch navigation for RTL', async ({ page, refinePage }) => {
      await refinePage.mountComponent(coverflow('dir="rtl"'));
      const first = (await page.locator('ore-carousel-slide').nth(0).boundingBox())!;
      const next = (await page.locator('ore-carousel-slide').nth(1).boundingBox())!;

      expect(next.x).toBeLessThan(first.x);
      await page.locator('ore-carousel').focus();
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '1');
      await swipe(page, 100);
      await expect(page.locator('ore-carousel')).toHaveAttribute('slide-index', '2');
    });

    test('recovers focus and selection when the focused active slide is removed', async ({ page, refinePage }) => {
      await refinePage.mountComponent(coverflow('slide-index="2"', 3));
      const carousel = page.locator('ore-carousel');

      await page.getByRole('button', { exact: true, name: 'Choose 3' }).focus();
      await page.locator('[data-active]').evaluate((slide) => slide.remove());
      await expect(carousel).toHaveAttribute('slide-index', '1');
      await expect(carousel).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { exact: true, name: 'Choose 2' })).toBeFocused();
    });

    test('recomputes after reveal, spacing changes, and switching variants', async ({ page, refinePage }) => {
      await refinePage.mountComponent(`<div id="panel" style="display:none">${coverflow()}</div>`);
      await page.locator('#panel').evaluate((el) => {
        el.style.display = 'block';
      });
      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(3);
      await page.locator('ore-carousel').evaluate((el) => {
        el.style.width = '800px';
        el.style.setProperty('--carousel-coverflow-spacing', '80px');
      });
      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(7);
      await page.locator('ore-carousel').evaluate((el) => {
        el.setAttribute('variant', 'gallery');
      });
      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(0);
      await expect(page.locator('[data-gallery-visible]')).toHaveCount(2);
      await page.locator('ore-carousel').evaluate((el) => {
        el.setAttribute('variant', 'coverflow');
      });
      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(7);
    });

    test('uses static transforms under reduced motion', async ({ page, refinePage }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await refinePage.mountComponent(coverflow());
      await expect(page.locator('[data-active]')).toHaveCSS('transition-duration', '0s, 0s');
      await expect(page.locator('[data-coverflow-visible]')).toHaveCount(3);
    });

    for (const count of [0, 1, 2, 3, 4]) {
      test(`renders ${count} unique covers and honors non-looping edges`, async ({ page, refinePage }) => {
        await refinePage.mountComponent(coverflow('loop="false"', count));
        await page.locator('ore-carousel').evaluate((el) => {
          el.style.width = '800px';
        });
        await expect(page.locator('ore-carousel-slide')).toHaveCount(count);
        await expect(page.locator('[data-coverflow-visible]')).toHaveCount(count);
        await page.locator('ore-carousel').focus();
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowLeft');
        if (count > 0) {
          await expect(page.locator('[data-active]')).toHaveAttribute('aria-label', 'Cover 1');
          await page.keyboard.press('End');
          await page.keyboard.press('ArrowRight');
          await expect(page.locator('[data-active]')).toHaveAttribute('aria-label', `Cover ${count}`);
        }
      });
    }

    test('has no browser accessibility violations with default controls and indicators', async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(coverflow('', 3).replace('show-controls="false" show-indicators="false"', ''));
      expect((await axeCheck(page)).violations).toEqual([]);
    });
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
