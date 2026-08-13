/**
 * Real-browser layout checks for `ore-textarea` — CSS regressions jsdom can't catch (no real
 * box model, `@layer` blocks silently dropped, transitions don't run). Complements
 * `textarea.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  // Regression coverage for a real bug: the focus/error/success glow (`box-shadow` on
  // `.field:focus-within`) lived in `@layer refine.base`, while solid/outline/ghost's
  // rest-state `box-shadow` (`fieldVariantMixin`) lives in `@layer refine.variants` — cascade
  // layers beat specificity outright, so the glow always lost to the plain rest-state shadow,
  // regardless of focus/error/success. `box-shadow` is transitioned, so read after it settles.
  for (const variant of ['solid', 'outline', 'ghost'] as const) {
    test(`${variant} variant shows a focus glow distinct from its rest-state box-shadow`, async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(`<ore-textarea id="ta" variant="${variant}" value="x"></ore-textarea>`);

      const rest = await page.evaluate(() => {
        const field = (
          document.getElementById('ta') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).boxShadow;
      });

      await page.evaluate(() => {
        (document.getElementById('ta') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
          .querySelector('textarea')
          ?.focus();
      });
      await page.waitForTimeout(300);

      const focused = await page.evaluate(() => {
        const field = (
          document.getElementById('ta') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).boxShadow;
      });

      expect(focused).not.toBe(rest);
    });
  }
});
