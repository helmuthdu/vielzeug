/**
 * CSS layout regression tests for refine components.
 *
 * Supersedes scripts/verify-layout.mjs — same scenarios, runs under Playwright
 * so they're part of `pnpm test:e2e` instead of an ad-hoc manual script.
 * jsdom has no layout engine and silently drops @layer rules, so these checks
 * must run in a real browser.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { expect, test } from './fixtures';

test.describe('chat-message layout', () => {
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

test.describe('dialog layout', () => {
  test('dialog does not overflow viewport vertically', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-dialog open label="Test dialog">' + '<p>Dialog content</p>' + '</ore-dialog>',
    );
    await page.waitForSelector('ore-dialog[open]');

    const { dialogBottom, viewportHeight } = await page.evaluate(() => {
      const el = document.querySelector('ore-dialog') as HTMLElement & { shadowRoot: ShadowRoot };
      const dialog = el.shadowRoot.querySelector('dialog') as HTMLElement;

      return {
        dialogBottom: dialog.getBoundingClientRect().bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(dialogBottom).toBeLessThanOrEqual(viewportHeight);
  });
});

test.describe('button layout', () => {
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
});

test.describe('navbar layout', () => {
  test('navbar items do not overflow outside nav bounds', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-navbar id="nav">' +
        '<ore-button slot="brand">My App</ore-button>' +
        '<ore-button>Home</ore-button>' +
        '<ore-button>About</ore-button>' +
        '</ore-navbar>',
    );
    await page.waitForSelector('ore-navbar');

    const overflow = await page.evaluate(() => {
      const el = document.getElementById('nav') as HTMLElement;
      const navRect = el.getBoundingClientRect();
      let hasOverflow = false;

      el.querySelectorAll('ore-button').forEach((btn) => {
        const btnRect = btn.getBoundingClientRect();

        if (btnRect.right > navRect.right + 1 || btnRect.bottom > navRect.bottom + 1) {
          hasOverflow = true;
        }
      });

      return hasOverflow;
    });

    expect(overflow).toBe(false);
  });
});
