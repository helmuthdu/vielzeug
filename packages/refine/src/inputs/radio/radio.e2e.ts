/**
 * Real-browser focus checks for `ore-radio`. Keyboard focus lands on the host
 * (the group owns a roving tabindex), so the stylesheet must both suppress the
 * browser's own `outline: auto` ring and keep the themed `.circle` ring alive.
 * jsdom cannot compute either, so this lives in Playwright.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

const RING = /0px 0px 0px 4px/;

test.describe('Focus', () => {
  test('replaces the browser outline with the themed ring on keyboard focus', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<button id="tab-start">start</button><ore-radio-group><ore-radio value="a">Alpha</ore-radio><ore-radio value="b">Beta</ore-radio></ore-radio-group>',
    );
    await page.waitForSelector('ore-radio');

    await page.locator('#tab-start').focus();
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const host = document.activeElement as HTMLElement;
      const circle = host.shadowRoot?.querySelector<HTMLElement>('.circle');
      return {
        host: host.tagName,
        outlineStyle: getComputedStyle(host).outlineStyle,
        ring: circle ? getComputedStyle(circle).boxShadow : '',
      };
    });

    expect(focused.host).toBe('ORE-RADIO');
    expect(focused.outlineStyle).toBe('none');
    expect(focused.ring).toMatch(RING);
  });
});

test.describe('Accessibility', () => {
  test('radio group passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-radio-group><ore-radio value="a" checked>Alpha</ore-radio><ore-radio value="b">Beta</ore-radio></ore-radio-group>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
