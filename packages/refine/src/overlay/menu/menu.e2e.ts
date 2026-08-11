import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('opens menu from an ore-button trigger', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-menu><ore-button slot="trigger">Open menu</ore-button><ore-menu-item value="edit">Edit</ore-menu-item></ore-menu>',
    );

    await page.locator('ore-menu > ore-button').click();

    const isOpen = await page
      .locator('ore-menu')
      .evaluate((menu) => menu.shadowRoot?.querySelector('.menu-panel')?.hasAttribute('data-open'));

    expect(isOpen).toBe(true);
  });

  test('opens menu inside an iframe preview', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<iframe title="Preview"></iframe>');

    await page.evaluate(() => {
      const scripts = Array.from(document.scripts, (script) => `<script>${script.textContent}</script>`).join('');
      const styles = Array.from(
        document.head.querySelectorAll('style'),
        (style) => `<style>${style.textContent}</style>`,
      ).join('');
      const iframe = document.querySelector('iframe')!;

      iframe.srcdoc = `<html><head>${styles}</head><body><ore-menu><ore-button slot="trigger">Open menu</ore-button><ore-menu-item value="edit">Edit</ore-menu-item></ore-menu>${scripts}</body></html>`;
    });

    const preview = page.frameLocator('iframe[title="Preview"]');

    await preview.locator('ore-menu > ore-button').click();

    const panel = await preview.locator('ore-menu').evaluate((menu) => {
      const panel = menu.shadowRoot?.querySelector<HTMLElement>('.menu-panel');
      const rect = panel?.getBoundingClientRect();
      const style = panel ? getComputedStyle(panel) : null;

      return {
        height: rect?.height ?? 0,
        opacity: style?.opacity,
        open: panel?.hasAttribute('data-open'),
        pointerEvents: style?.pointerEvents,
        top: rect?.top ?? 0,
        width: rect?.width ?? 0,
      };
    });

    expect(panel).toMatchObject({ opacity: '1', open: true, pointerEvents: 'auto' });
    expect(panel.width).toBeGreaterThan(0);
    expect(panel.height).toBeGreaterThan(0);
    expect(panel.top).toBeGreaterThanOrEqual(0);
  });
});
