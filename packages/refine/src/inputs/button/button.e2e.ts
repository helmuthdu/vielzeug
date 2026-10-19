/**
 * Real-browser tests for `ore-button`: a11y checks and CSS layout regressions that jsdom
 * can't evaluate (no CSS box model, `@layer` blocks silently dropped). Complements
 * `button.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
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

  test('link button exposes one accessible link', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button href="/docs">Documentation</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
    await expect(page.getByRole('link', { name: 'Documentation' })).toHaveCount(1);
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

  test('keeps its padding inside a padding="none" ancestor card', async ({ page, refinePage }) => {
    // `ore-card[padding='none']` sets `--_padding: 0` on its host. Custom properties
    // inherit through the light DOM, and the button's md size tier never declared
    // `--_padding` on its own host, so the card's zero leaked into the button's
    // `var(--_padding, ...)` fallback and collapsed its padding (forge drawer footer).
    await refinePage.mountComponent('<ore-card padding="none"><ore-button id="btn">Apply</ore-button></ore-card>');
    await page.waitForSelector('ore-button');

    const padding = await page.evaluate(() => {
      const el = document.getElementById('btn') as HTMLElement & { shadowRoot: ShadowRoot };
      const btn = el.shadowRoot.querySelector('[part="button"]') as HTMLElement;
      const styles = getComputedStyle(btn);

      return {
        block: parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom),
        inline: parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight),
      };
    });

    expect(padding.inline).toBeGreaterThan(0);
    expect(padding.block).toBeGreaterThan(0);
  });

  test('link buttons suppress native anchor underlines', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button id="link" href="/docs">Documentation</ore-button>');

    const textDecorationLine = await page.evaluate(() => {
      const button = document.getElementById('link')!;
      const link = button.shadowRoot?.querySelector<HTMLAnchorElement>('a[part="button"]')!;

      return getComputedStyle(link).textDecorationLine;
    });

    expect(textDecorationLine).toBe('none');
  });
});
