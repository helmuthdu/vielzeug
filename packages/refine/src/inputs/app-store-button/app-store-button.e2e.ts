/**
 * Real-browser tests for `ore-app-store-button`: axe scans with colour contrast
 * re-enabled and badge geometry that jsdom cannot evaluate. Complements
 * `app-store-button.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build:e2e first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('filled apple link badge passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-app-store-button store="apple" href="https://apps.apple.com/app/id1"></ore-app-store-button>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('outline google-play badge passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-app-store-button store="google-play" variant="outline" href="https://play.google.com/store/apps/details?id=test"></ore-app-store-button>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('huawei image badge (no href) passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-app-store-button store="huawei"></ore-app-store-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Interaction', () => {
  test('keyboard focus shows the focus ring on the badge link', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-app-store-button id="badge" href="https://apps.apple.com/app/id1"></ore-app-store-button>',
    );

    await page.keyboard.press('Tab');

    const focused = await page.locator('#badge').evaluate((badge: HTMLElement) => {
      const link = badge.shadowRoot!.querySelector<HTMLElement>('[part="link"]')!;

      return {
        isFocused: badge.shadowRoot!.activeElement === link,
        outlineWidth: getComputedStyle(link).outlineWidth,
        visible: link.matches(':focus-visible'),
      };
    });

    expect(focused.isFocused).toBe(true);
    expect(focused.visible).toBe(true);
    expect(parseFloat(focused.outlineWidth)).toBeGreaterThan(0);
  });
});

test.describe('Layout', () => {
  test('md and lg tiers match the 40px/44px badge heights', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-app-store-button id="md" href="#"></ore-app-store-button>' +
        '<ore-app-store-button id="lg" size="lg" store="google-play" href="#"></ore-app-store-button>',
    );

    const md = await page.evaluate(() => {
      const link = document.querySelector<HTMLElement>('#md')!.shadowRoot!.querySelector<HTMLElement>('[part="link"]')!;

      return link.getBoundingClientRect().height;
    });
    const lg = await page.evaluate(() => {
      const link = document.querySelector<HTMLElement>('#lg')!.shadowRoot!.querySelector<HTMLElement>('[part="link"]')!;

      return link.getBoundingClientRect().height;
    });

    expect(md).toBeCloseTo(40, 0);
    expect(lg).toBeCloseTo(44, 0);
  });

  test('outline variant keeps a border without changing the badge height', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-app-store-button id="outline" variant="outline" href="#"></ore-app-store-button>',
    );

    const measured = await page.evaluate(() => {
      const link = document
        .querySelector<HTMLElement>('#outline')!
        .shadowRoot!.querySelector<HTMLElement>('[part="link"]')!;
      const style = getComputedStyle(link);

      return { border: style.borderTopWidth, height: link.getBoundingClientRect().height };
    });

    expect(parseFloat(measured.border)).toBeGreaterThanOrEqual(1);
    expect(measured.height).toBeCloseTo(40, 0);
  });
});
