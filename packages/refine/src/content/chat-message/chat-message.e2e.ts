/**
 * CSS layout regression tests for `ore-chat-message`. Supersedes `scripts/verify-layout.mjs`'s
 * chat-message scenarios — jsdom has no layout engine and silently drops `@layer` rules, so
 * flex/box-model regressions here are invisible to `pnpm test`. Complements
 * `chat-message.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('bubble width hugs content instead of stretching to fill the row', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-chat-message id="msg" sender="user">Hello, world!</ore-chat-message>');
    await page.waitForSelector('ore-chat-message');

    const { bubbleWidth, rowWidth } = await page.evaluate(() => {
      const el = document.getElementById('msg') as HTMLElement & { shadowRoot: ShadowRoot };
      const row = el.shadowRoot.querySelector('.row') as HTMLElement;
      const bubble = el.shadowRoot.querySelector('.bubble') as HTMLElement;

      return {
        bubbleWidth: bubble.getBoundingClientRect().width,
        rowWidth: row.getBoundingClientRect().width,
      };
    });

    expect(bubbleWidth).toBeLessThan(rowWidth);
  });

  test('assistant name and bubble text share the same left edge', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-chat-message id="msg" sender="assistant" name="Assistant">' +
        '<ore-avatar slot="avatar" initials="AI" size="sm"></ore-avatar>' +
        'Here is the summary.' +
        '</ore-chat-message>',
    );
    await page.waitForSelector('ore-chat-message');

    const { contentTextX, nameTextX } = await page.evaluate(() => {
      const el = document.getElementById('msg') as HTMLElement & { shadowRoot: ShadowRoot };
      const name = el.shadowRoot.querySelector('.name') as HTMLElement;
      const content = el.shadowRoot.querySelector('.content') as HTMLElement;
      const nameStyles = getComputedStyle(name);

      return {
        contentTextX: content.getBoundingClientRect().left,
        nameTextX: name.getBoundingClientRect().left + parseFloat(nameStyles.paddingLeft),
      };
    });

    expect(Math.abs(nameTextX - contentTextX)).toBeLessThan(1);
  });

  test('single-line content has no phantom blank lines from template whitespace', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-chat-message id="msg" sender="assistant">Single line of text.</ore-chat-message>',
    );
    await page.waitForSelector('ore-chat-message');

    const { contentHeight, fontSize } = await page.evaluate(() => {
      const el = document.getElementById('msg') as HTMLElement & { shadowRoot: ShadowRoot };
      const content = el.shadowRoot.querySelector('.content') as HTMLElement;
      const styles = getComputedStyle(content);
      // lineHeight may be 'normal' — fall back to fontSize * 1.2 as a conservative estimate
      const rawLineHeight = parseFloat(styles.lineHeight);
      const rawFontSize = parseFloat(styles.fontSize);

      return {
        contentHeight: content.getBoundingClientRect().height,
        fontSize: isNaN(rawLineHeight) ? rawFontSize : rawLineHeight,
      };
    });

    // Content height should be roughly one line tall (< 2 × line height)
    expect(contentHeight).toBeLessThan(fontSize * 2);
  });
});
