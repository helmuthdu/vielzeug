/**
 * Real-browser layout checks for `ore-otp-input` — CSS regressions jsdom can't catch (no real
 * box model, `@layer` blocks silently dropped, transitions don't run). Complements
 * `otp-input.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  // Regression coverage for a real bug: a focused cell's glow `box-shadow` lived in
  // `@layer refine.base` (`.cell:focus`), while every variant's rest-state `box-shadow`
  // (`fieldVariantMixin`'s solid/outline/ghost rules) lives in `@layer refine.variants` —
  // cascade layers decide the winner before specificity is ever consulted, so the glow always
  // lost to the rest-state shadow regardless of focus, for every variant except `flat` (which
  // has its own same-layer override). jsdom can't catch this: no real box model, no transitions,
  // and `@layer` is dropped entirely.
  for (const variant of ['solid', 'bordered', 'outline', 'ghost'] as const) {
    test(`${variant} variant shows a focus glow distinct from its rest-state box-shadow`, async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(`<ore-otp-input id="otp" variant="${variant}" length="4"></ore-otp-input>`);

      const rest = await page.evaluate(() => {
        const cell = (
          document.getElementById('otp') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.cell') as HTMLElement;

        return getComputedStyle(cell).boxShadow;
      });

      await page.evaluate(() => {
        const cell = (
          document.getElementById('otp') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.cell') as HTMLElement;

        cell.focus();
      });
      // Box-shadow is transitioned — wait for it to settle before reading the final value.
      await page.waitForTimeout(300);

      const focused = await page.evaluate(() => {
        const cell = (
          document.getElementById('otp') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.cell') as HTMLElement;

        return getComputedStyle(cell).boxShadow;
      });

      expect(focused).not.toBe(rest);
    });
  }
});
