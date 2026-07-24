/**
 * Real-browser layout checks for `ore-message-composer` — CSS regressions jsdom can't catch
 * (no real box model, `@layer` blocks silently dropped). Complements `message-composer.test.ts`'s
 * jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  // Regression coverage for a real bug: `fieldVariantMixin`'s `outline` branch only set `--_bg`,
  // never `--_border-color` — `ore-input`/`ore-textarea` masked this with an unconditional
  // `:host{}` base fallback, but `ore-message-composer` has none (its base layer assumes every
  // variant rule sets both custom properties, which was true for every variant except this one),
  // so its outline border silently fell back to an unset custom property instead of matching the
  // other two. jsdom can't catch this since it drops `@layer` entirely.
  test('outline variant border color matches ore-input and ore-textarea', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-input id="input" variant="outline" value="x"></ore-input>
      <ore-textarea id="textarea" variant="outline" value="x"></ore-textarea>
      <ore-message-composer id="composer" variant="outline" value="x"></ore-message-composer>
    `);

    const borders = await page.evaluate(() => {
      const shadowField = (id: string, selector: string) =>
        (document.getElementById(id) as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector(
          selector,
        ) as HTMLElement;

      return {
        composer: getComputedStyle(shadowField('composer', '.composer')).borderColor,
        input: getComputedStyle(shadowField('input', '.field')).borderColor,
        textarea: getComputedStyle(shadowField('textarea', '.field')).borderColor,
      };
    });

    expect(borders.composer).toBe(borders.input);
    expect(borders.composer).toBe(borders.textarea);
  });

  // Regression coverage for a related bug: the focus/error/success glow (`box-shadow` on
  // `.composer:focus-within`) lived in `@layer refine.base`, while solid/outline/ghost's
  // rest-state `box-shadow` (`fieldVariantMixin`) lives in `@layer refine.variants` — cascade
  // layers beat specificity outright, so the glow always lost to the plain rest-state shadow,
  // regardless of focus/error/success. `box-shadow` is transitioned, so read after it settles.
  for (const variant of ['solid', 'outline', 'ghost'] as const) {
    test(`${variant} variant shows a focus glow distinct from its rest-state box-shadow`, async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(
        `<ore-message-composer id="mc" variant="${variant}" value="x"></ore-message-composer>`,
      );

      const rest = await page.evaluate(() => {
        const composer = (
          document.getElementById('mc') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.composer') as HTMLElement;

        return getComputedStyle(composer).boxShadow;
      });

      await page.evaluate(() => {
        (document.getElementById('mc') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
          .querySelector('textarea')!
          .focus();
      });
      await page.waitForTimeout(300);

      const focused = await page.evaluate(() => {
        const composer = (
          document.getElementById('mc') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.composer') as HTMLElement;

        return getComputedStyle(composer).boxShadow;
      });

      expect(focused).not.toBe(rest);
    });
  }
});
