/**
 * Real-browser layout checks for `ore-otp-input`: CSS regressions jsdom can't catch (no real
 * box model, `@layer` blocks silently dropped, transitions don't run). Complements
 * `otp-input.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test('accepts a complete native insertion without truncation or duplicate input events', async ({
  page,
  refinePage,
}) => {
  await refinePage.mountComponent('<ore-otp-input label="Verification code"></ore-otp-input>');
  await page.evaluate(() => {
    const host = document.querySelector('ore-otp-input')!;
    const values: string[] = [];
    host.addEventListener('input', () => {
      if ('value' in host && typeof host.value === 'string') values.push(host.value);
      host.setAttribute('data-input-values', JSON.stringify(values));
    });
  });
  const cells = page.locator('ore-otp-input input.cell');
  await cells.first().fill('123456');
  await expect(page.locator('ore-otp-input')).toHaveAttribute('value', '123456');
  await expect(page.locator('ore-otp-input')).toHaveAttribute('data-input-values', '["123456"]');
  expect(await cells.evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value))).toEqual(
    ['1', '2', '3', '4', '5', '6'],
  );
  await expect(cells.last()).toBeFocused();
});

test.describe('Layout', () => {
  test('uses the control radius and keeps the public radius override', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-otp-input id="default" label="Code" length="4"></ore-otp-input>' +
        '<ore-otp-input id="custom" label="Code" length="4" style="--otp-cell-radius: var(--rounded-xl)"></ore-otp-input>',
    );

    await expect(page.locator('#default .cell').first()).toHaveCSS('border-radius', '8px');
    await expect(page.locator('#custom .cell').first()).toHaveCSS('border-radius', '12px');
  });

  // Regression coverage for a real bug: a focused cell's glow `box-shadow` lived in
  // `@layer refine.base` (`.cell:focus`), while every variant's rest-state `box-shadow`
  // (`fieldVariantMixin`'s solid/outline/ghost rules) lives in `@layer refine.variants` :
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
      // Box-shadow is transitioned: wait for it to settle before reading the final value.
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

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-otp-input label="Verification code"></ore-otp-input>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
