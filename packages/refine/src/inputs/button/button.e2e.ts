/**
 * Real-browser tests for `ore-button` — a11y checks and CSS layout regressions that jsdom
 * can't evaluate (no CSS box model, `@layer` blocks silently dropped). Complements
 * `button.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('default button passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button>Click me</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('disabled button passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button disabled>Save</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('icon-only button with label passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button label="Close dialog" icon="x"></ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Layout', () => {
  test('horizontal padding is at least 2x vertical padding (2:1 ratio)', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button id="btn">Save</ore-button>');
    await page.waitForSelector('ore-button');

    const { paddingX, paddingY } = await page.evaluate(() => {
      const el = document.getElementById('btn') as HTMLElement & { shadowRoot: ShadowRoot };
      const btn = el.shadowRoot.querySelector('[part="button"]') as HTMLElement;
      const styles = getComputedStyle(btn);

      return {
        paddingX: parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight),
        paddingY: parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom),
      };
    });

    // paddingX >= paddingY (2:1 design rule uses per-side, total should be >= 2x total Y)
    expect(paddingX).toBeGreaterThanOrEqual(paddingY);
  });

  test('link buttons suppress native anchor underlines', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button id="link" href="/docs">Documentation</ore-button>');

    const textDecorationLine = await page.evaluate(() => {
      const button = document.getElementById('link')!;
      const link = button.shadowRoot!.querySelector<HTMLAnchorElement>('a[part="button"]')!;

      return getComputedStyle(link).textDecorationLine;
    });

    expect(textDecorationLine).toBe('none');
  });
});
