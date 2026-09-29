/**
 * Real-browser coverage for `ore-chat-panel`. jsdom has no layout engine and
 * silently drops `@layer` rules, so the fixed-window box model, colour contrast,
 * and native focus/Escape behaviour asserted here are invisible to `pnpm test`.
 * Complements `chat-panel.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm --filter @vielzeug/refine test:e2e (requires built dist).
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

// The transcript is driven by the `messages` property (not slotted children), so
// each test mounts the shell then assigns the array via `mountPanel`.
const shell = (id = 'panel'): string => `<ore-chat-panel id="${id}" label="Model advisor" open></ore-chat-panel>`;

const conversation = [
  { sender: 'assistant', text: 'Hi! How can I help?' },
  { sender: 'user', text: 'What is the range?' },
];

async function mountPanel(page: import('@playwright/test').Page, id: string, messages: unknown[]): Promise<void> {
  await page.evaluate(
    ({ panelId, msgs }) => {
      (document.getElementById(panelId) as HTMLElement & { messages: unknown[] }).messages = msgs;
    },
    { msgs: messages, panelId: id },
  );
  await page.waitForTimeout(50);
}

test.describe('Accessibility', () => {
  test('an open conversation passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });
    await mountPanel(page, 'panel', conversation);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('a fresh greeting passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });
    await mountPanel(page, 'panel', [{ sender: 'assistant', text: 'Hi! How can I help?' }]);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Layout', () => {
  test('the window has real dimensions when open', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });

    const box = await page.evaluate(() => {
      const el = document.getElementById('panel') as HTMLElement;
      const win = el.shadowRoot?.querySelector<HTMLElement>('.window');
      const rect = win?.getBoundingClientRect();

      return { height: rect?.height ?? 0, width: rect?.width ?? 0 };
    });

    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('the window collapses to zero size when closed', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-chat-panel id="panel" label="Model advisor"></ore-chat-panel>');
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });

    const hidden = await page.evaluate(() => {
      const el = document.getElementById('panel') as HTMLElement;
      const win = el.shadowRoot?.querySelector<HTMLElement>('.window');

      return { height: win?.getBoundingClientRect().height ?? -1, hidden: win?.hidden };
    });

    expect(hidden.hidden).toBe(true);
    expect(hidden.height).toBe(0);
  });

  test('the transcript scrolls when it overflows the window', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });
    await mountPanel(
      page,
      'panel',
      Array.from({ length: 15 }, (_, i) => ({
        sender: 'assistant',
        text: `Message number ${i}, long enough to wrap across a couple of lines in the narrow panel.`,
      })),
    );

    const scrollable = await page.evaluate(() => {
      const el = document.getElementById('panel') as HTMLElement;
      const list = el.shadowRoot?.querySelector<HTMLElement>('.messages');

      return { clientHeight: list?.clientHeight ?? 0, scrollHeight: list?.scrollHeight ?? 0 };
    });

    expect(scrollable.scrollHeight).toBeGreaterThan(scrollable.clientHeight);
  });

  // Regression: custom properties inherit across shadow boundaries, so a generic
  // private var on the panel host (e.g. `--_height`) leaks into the send button,
  // which reads `height: var(--_height, …)`. The panel's private vars are namespaced
  // (`--_panel-*`) to prevent this; assert the button keeps its own compact height.
  test('the composer send button is not stretched by the panel height', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });

    const heights = await page.evaluate(() => {
      const el = document.getElementById('panel') as HTMLElement;
      const win = el.shadowRoot?.querySelector<HTMLElement>('.window');
      const composer = el.shadowRoot?.querySelector<HTMLElement>('ore-message-composer');
      const button = composer?.shadowRoot?.querySelector<HTMLElement>('.send-btn');

      return { button: button?.getBoundingClientRect().height ?? -1, window: win?.getBoundingClientRect().height ?? 0 };
    });

    expect(heights.button).toBeGreaterThan(0);
    expect(heights.button).toBeLessThan(heights.window / 2);
  });
});

test.describe('Interaction', () => {
  test('typing and sending emits a send event with the text', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });

    await page.evaluate(() => {
      const el = document.getElementById('panel') as HTMLElement;

      (window as unknown as { __sent?: string[] }).__sent = [];
      el.addEventListener('send', (e) =>
        (window as unknown as { __sent: string[] }).__sent.push((e as CustomEvent<{ text: string }>).detail.text),
      );
    });

    const composer = page.locator('#panel ore-message-composer');

    await composer.locator('textarea').fill('What is the range?');
    await composer.locator('textarea').press('Enter');

    const sent = await page.evaluate(() => (window as unknown as { __sent: string[] }).__sent);

    expect(sent).toContain('What is the range?');
  });

  test('Escape closes the panel', async ({ page, refinePage }) => {
    await refinePage.mountComponent(shell());
    await page.waitForSelector('ore-chat-panel', { state: 'attached' });

    // The panel listens for Escape on the document, so focus is irrelevant.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);

    const open = await page.evaluate(() => document.getElementById('panel')?.hasAttribute('open'));

    expect(open).toBe(false);
  });
});
