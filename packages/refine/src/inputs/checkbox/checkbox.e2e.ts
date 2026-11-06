/**
 * Real-browser accessibility check for `ore-checkbox`: a real axe scan against the rendered
 * shadow DOM. Complements `checkbox.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

const RING = /0px 0px 0px 4px/;

test.describe('Focus', () => {
  // Keyboard focus lands on the host, so the stylesheet suppresses the
  // browser's own `outline: auto` ring. That is only safe while the themed
  // `.box` ring still paints: this is the assertion that keeps a focused
  // checkbox from ending up with no indicator at all (WCAG 2.4.7).
  test('replaces the browser outline with the themed ring on keyboard focus', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent('<button id="tab-start">start</button><ore-checkbox>Accept terms</ore-checkbox>');
    await page.waitForSelector('ore-checkbox');

    await page.locator('#tab-start').focus();
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const host = document.activeElement as HTMLElement;
      const box = host.shadowRoot?.querySelector<HTMLElement>('.box');
      return {
        host: host.tagName,
        outlineStyle: getComputedStyle(host).outlineStyle,
        ring: box ? getComputedStyle(box).boxShadow : '',
      };
    });

    expect(focused.host).toBe('ORE-CHECKBOX');
    expect(focused.outlineStyle).toBe('none');
    expect(focused.ring).toMatch(RING);
  });
});

test.describe('Accessibility', () => {
  // The slot is the labeling API (`@slot - Checkbox label text`): the host's
  // `aria-labelledby` points at the shadow `.label` span, which projects the
  // slotted text. axe's flat-tree traversal resolves this correctly: a `label`
  // attribute is not a prop and renders nothing, so mounting that way produces
  // an unnamed checkbox (the source of a long-misread "known gap" here).
  test('slot-labelled checkbox passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-checkbox>Accept terms and conditions</ore-checkbox>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('helper text is linked to the checkbox via aria-describedby', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-checkbox helper="Required for the site to work">Essential</ore-checkbox>');
    await page.waitForTimeout(100);

    const wiring = await page.locator('ore-checkbox').evaluate((element) => {
      const host = element as HTMLElement;
      const describedBy = host.getAttribute('aria-describedby');
      const helper = host.shadowRoot?.querySelector<HTMLElement>('.helper-text');
      return {
        describedBy,
        helperId: helper?.id,
        helperText: helper?.textContent?.trim(),
        helperVisible: helper ? !helper.hasAttribute('hidden') : false,
      };
    });

    expect(wiring.describedBy).toBe(wiring.helperId);
    expect(wiring.helperVisible).toBe(true);
    expect(wiring.helperText).toBe('Required for the site to work');
  });
});
