/**
 * Real-browser coverage for `ore-prose`: full axe scan (style-dependent rules enabled) and
 * token-driven typography layout that jsdom cannot compute.
 *
 * Run with: bun run --filter @vielzeug/refine test:e2e (requires built dist).
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('rich prose document passes the full axe scan', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-prose markdown="# Guide\n\nIntro with [a link](https://example.com) and `code`.\n\n- one\n- two\n\n## Code\n\n```js\nlet a;\n```\n\n| a | b |\n|:-:|--:|\n| 1 | 2 |\n\n> quoted"></ore-prose>',
    );
    await page.waitForSelector('ore-prose');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Layout', () => {
  test('heading scale follows the Refine type tokens', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-prose id="p" markdown="# One\n\n## Two"></ore-prose>');
    await page.waitForSelector('ore-prose');

    const { h1Size, h2Size } = await page.evaluate(() => {
      const root = (document.getElementById('p') as HTMLElement).shadowRoot as ShadowRoot;

      return {
        h1Size: Number.parseFloat(getComputedStyle(root.querySelector('h1') as HTMLElement).fontSize),
        h2Size: Number.parseFloat(getComputedStyle(root.querySelector('h2') as HTMLElement).fontSize),
      };
    });

    expect(h1Size).toBeGreaterThan(h2Size);
  });

  test('code blocks scroll horizontally instead of overflowing the card', async ({ page, refinePage }) => {
    const source = '```js\nconst line = aVeryLongIdentifier + anotherLongIdentifier + yetAnother + more + more2;\n```';
    await refinePage.mountComponent(
      `<div style="width: 240px"><ore-prose id="p" markdown="${source}"></ore-prose></div>`,
    );
    await page.waitForSelector('ore-prose');

    const overflow = await page.evaluate(() => {
      const root = (document.getElementById('p') as HTMLElement).shadowRoot as ShadowRoot;
      const pre = root.querySelector('pre') as HTMLElement;

      return { overflowX: getComputedStyle(pre).overflowX, scrollable: pre.scrollWidth >= pre.clientWidth };
    });

    expect(overflow.overflowX).toBe('auto');
    expect(overflow.scrollable).toBe(true);
  });
});
