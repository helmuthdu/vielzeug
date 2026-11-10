/**
 * Real-browser layout checks for `ore-rating`: geometry jsdom can't provide (no box
 * model: half-star clip widths, theme-token fills through `light-dark()`, focus-visible
 * rings, and the `@layer`-gated pop animation all need a real engine). Complements
 * `rating.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { expect, test } from '../../testing/fixtures';

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

  test('the committed star pops (animation applied, not dropped by layers)', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-rating id="r" value="3" color="warning"></ore-rating>`);

    const animation = await page.evaluate(() => {
      const inner = (document.getElementById('r') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
        '.star[data-current] .star-fill-inner',
      ) as HTMLElement | null;

      return inner ? getComputedStyle(inner).animationName : 'missing';
    });

    expect(animation).toBe('rating-pop');
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
