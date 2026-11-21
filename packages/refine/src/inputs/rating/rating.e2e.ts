/**
 * Real-browser layout checks for `ore-rating`: geometry jsdom can't provide (no box
 * model: half-star clip widths, theme-token fills through `light-dark()`, focus-visible
 * rings, and the `@layer`-gated pop animation all need a real engine). Complements
 * `rating.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { expect, test, touchSwipe } from '../../testing/fixtures';

test.describe('Pointer interaction', () => {
  test('keeps the rating cleared while the pointer remains over the re-pressed star', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-rating id="r" value="3"></ore-rating>');
    const rating = page.locator('#r');
    const star = rating.locator('[data-star="3"]');
    const nextStar = rating.locator('[data-star="4"]');
    const box = (await star.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(rating).toHaveAttribute('value', '0');
    await page.mouse.move(x, y);
    await expect(star.locator('.star-fill')).toHaveCSS('width', '0px');
    const nextBox = (await nextStar.boundingBox())!;
    await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
    await expect(rating).toHaveAttribute('value', '4');
    await page.mouse.up();
    await expect(nextStar.locator('.star-fill')).toHaveCSS('width', '28px');
  });

  for (const reason of ['blur', 'second-touch']) {
    test(`uses the owner document for ${reason} cancellation`, async ({ page, refinePage }) => {
      await refinePage.mountComponent('<iframe title="Rating owner"></iframe>');
      const values = await page.evaluate(async (reason) => {
        const ownerDocument = document.querySelector('iframe')!.contentDocument!;
        ownerDocument.defaultView!.customElements.define('ore-rating', customElements.get('ore-rating')!);
        const rating = document.createElement('ore-rating');
        ownerDocument.body.append(rating);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const first = rating.shadowRoot!.querySelector('[data-star="1"]')!;
        const fourth = rating.shadowRoot!.querySelector('[data-star="4"]')!;
        const value = () => String(rating.value);
        const pointer = (target: EventTarget, type: string, pointerId = 1) =>
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              composed: true,
              isPrimary: pointerId === 1,
              pointerId,
              pointerType: 'touch',
            }),
          );
        pointer(first, 'pointerdown');
        pointer(document.body, 'pointerdown', 2);
        pointer(fourth, 'pointermove');
        const selected = value();
        if (reason === 'blur') ownerDocument.defaultView!.dispatchEvent(new Event('blur'));
        else pointer(ownerDocument.body, 'pointerdown', 2);
        pointer(first, 'pointermove');
        return { after: value(), selected };
      }, reason);
      expect(values.selected).toBe('4');
      expect(values.after).toBe('4');
    });
  }

  test('RTL half-star selection, capture and fill use the same leading edge', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent('<ore-rating id="r" dir="rtl" precision="0.5"></ore-rating>');
    const rating = page.locator('#r');
    const first = rating.locator('[data-star="1"]');
    const second = rating.locator('[data-star="2"]');
    const firstBox = (await first.boundingBox())!;
    const secondBox = (await second.boundingBox())!;

    await page.mouse.move(firstBox.x + firstBox.width * 0.75, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await expect(rating).toHaveAttribute('value', '0.5');
    const fill = (await first.locator('.star-fill').boundingBox())!;
    expect(fill.x + fill.width).toBeCloseTo(firstBox.x + firstBox.width, 1);
    expect(fill.width).toBeCloseTo(firstBox.width / 2, 1);
    await page.mouse.move(secondBox.x + secondBox.width * 0.75, secondBox.y + secondBox.height / 2);
    await expect(rating).toHaveAttribute('value', '1.5');
    await rating.evaluate((el) => el.setAttribute('readonly', ''));
    await page.mouse.move(secondBox.x + secondBox.width * 0.25, secondBox.y + secondBox.height / 2);
    await page.mouse.up();
    await expect(rating).toHaveAttribute('value', '1.5');
    expect(await rating.locator('.stars').evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-y pinch-zoom');
  });
});

test.describe('Touch interaction', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('allows native vertical scrolling from the stars', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div id="scroll" style="height:200px;overflow:auto"><div style="height:100px"></div><ore-rating id="r"></ore-rating><div style="height:800px"></div></div>',
    );
    const box = (await page.locator('#r .stars').boundingBox())!;
    await touchSwipe(page, {
      from: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      to: { x: box.x + box.width / 2, y: box.y - 80 },
    });
    await expect.poll(() => page.locator('#scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });
});

test.describe('Layout', () => {
  test('half-star fill clips to 50% of the star box', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-rating id="r" value="2.5" precision="0.5" color="warning"></ore-rating>`);

    const widths = await page.evaluate(() =>
      [
        ...(document.getElementById('r') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelectorAll(
          '.star-fill',
        ),
      ].map((f) => {
        const star = f.parentElement as HTMLElement;

        return Math.round((f.getBoundingClientRect().width / star.getBoundingClientRect().width) * 100);
      }),
    );

    expect(widths).toEqual([100, 100, 50, 0, 0]);
  });

  test('default fill resolves to the theme gold token (light-dark survives the build)', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(`<ore-rating id="r" value="3"></ore-rating>`);

    const colors = await page.evaluate(() => {
      const marker = document.createElement('span');

      marker.style.color = 'var(--color-star)';
      const gray = document.createElement('span');

      gray.style.color = 'var(--color-contrast-200)';
      document.body.append(marker, gray);

      const inner = (document.getElementById('r') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
        '.star-fill-inner',
      ) as HTMLElement;

      return {
        empty: getComputedStyle(gray).color,
        star: getComputedStyle(inner).color,
        token: getComputedStyle(marker).color,
      };
    });

    expect(colors.star).toBe(colors.token);
    // A broken light-dark() lowering lands as an invalid two-value color and
    // silently inherits; it must never collapse onto the empty-star gray.
    expect(colors.star).not.toBe(colors.empty);
  });

  test('the slider row shows a focus-visible ring', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-rating id="r" value="3" color="warning"></ore-rating>`);

    await page.keyboard.press('Tab');

    const ring = await page.evaluate(() => {
      const stars = (document.getElementById('r') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
        '.stars',
      ) as HTMLElement;
      const cs = getComputedStyle(stars);

      return {
        focused:
          stars === document.activeElement || (stars.getRootNode() as Document | ShadowRoot).activeElement === stars,
        style: cs.outlineStyle,
        width: cs.outlineWidth,
      };
    });

    expect(ring.focused).toBe(true);
    expect(ring.style).not.toBe('none');
    expect(parseFloat(ring.width)).toBeGreaterThan(0);
  });

  test('the committed star feedback is subtle and brief', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-rating id="r" color="warning"></ore-rating>`);
    await page.locator('#r [data-star="3"]').click();

    const animation = await page.evaluate(() => {
      const inner = (document.getElementById('r') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
        '.star[data-current] .star-fill-inner',
      ) as HTMLElement;
      const effect = inner.getAnimations()[0]?.effect;
      const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : [];
      const peakScale = Math.max(
        1,
        ...keyframes.map(({ transform }) =>
          typeof transform === 'string' && transform !== 'none' ? new DOMMatrixReadOnly(transform).a : 1,
        ),
      );

      return {
        durationMs: Number.parseFloat(getComputedStyle(inner).animationDuration) * 1000,
        name: getComputedStyle(inner).animationName,
        peakScale,
      };
    });

    expect(animation.name).toBe('rating-pop');
    expect(animation.durationMs).toBeLessThanOrEqual(150);
    expect(animation.peakScale).toBeLessThanOrEqual(1.06);
  });

  test('visible label sits above the stars', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-rating id="r" label="Quality" value="3"></ore-rating>`);

    const geometry = await page.evaluate(() => {
      const root = (document.getElementById('r') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
      const label = root.querySelector('.label') as HTMLElement;
      const stars = root.querySelector('.stars') as HTMLElement;

      return {
        labelTop: label.getBoundingClientRect().top,
        starsTop: stars.getBoundingClientRect().top,
        visible: getComputedStyle(label).display !== 'none',
      };
    });

    expect(geometry.visible).toBe(true);
    expect(geometry.labelTop).toBeLessThan(geometry.starsTop);
  });
});
