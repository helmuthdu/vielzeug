/**
 * Real-browser accessibility checks for `ore-input` — the `color-contrast`/`target-size` rules
 * jsdom can't compute — plus CSS layout regressions jsdom can't catch either (no real box model,
 * `@layer` blocks silently dropped). Complements `input.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('labeled input passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-input label="Email address" type="email"></ore-input>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('required input with error passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-input label="Username" required invalid error="Username is required"></ore-input>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Layout', () => {
  // Regression coverage for a real bug: `fieldVariantMixin`'s `@layer refine.variants` rules
  // were silently losing to `componentStyles`'s `@layer refine.base` defaults when the mixin
  // was wired into `styles` *before* `componentStyles` — every variant rendered identically to
  // the unconditional base background, and jsdom can't catch this since it drops `@layer`
  // entirely (see `input.ts`'s `styles` array ordering comment for the actual fix).
  test('each variant renders a visually distinct field background', async ({ page, refinePage }) => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'] as const;

    await refinePage.mountComponent(
      variants.map((variant) => `<ore-input id="${variant}" variant="${variant}" value="x"></ore-input>`).join(''),
    );

    const backgrounds = await page.evaluate((ids) => {
      return ids.map((id) => {
        const el = document.getElementById(id) as HTMLElement & { shadowRoot: ShadowRoot };
        const field = el.shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).backgroundColor;
      });
    }, variants);

    // Not every variant needs a unique background (`outline`/`ghost`/`text` are all legitimately
    // transparent at rest), but they must not *all* collapse to the same value — that's the
    // signature of the base layer winning over every variant rule.
    expect(new Set(backgrounds).size).toBeGreaterThan(1);
  });

  // Regression coverage for a related bug: the focus/error/success glow (`box-shadow` on
  // `.field:focus-within`) lived in `@layer refine.overrides`, while solid/outline/ghost's
  // rest-state `box-shadow` (`fieldVariantMixin`) lives in `@layer refine.variants` — cascade
  // layers beat specificity outright, so the glow always lost to the plain rest-state shadow,
  // regardless of focus/error/success. `box-shadow` is transitioned, so read after it settles.
  for (const variant of ['solid', 'outline', 'ghost'] as const) {
    test(`${variant} variant shows a focus glow distinct from its rest-state box-shadow`, async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(`<ore-input id="in" variant="${variant}" value="x"></ore-input>`);

      const rest = await page.evaluate(() => {
        const field = (
          document.getElementById('in') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).boxShadow;
      });

      await page.evaluate(() => {
        (document.getElementById('in') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
          .querySelector('input')
          ?.focus();
      });
      await page.waitForTimeout(300);

      const focused = await page.evaluate(() => {
        const field = (
          document.getElementById('in') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).boxShadow;
      });

      expect(focused).not.toBe(rest);
    });
  }
});
