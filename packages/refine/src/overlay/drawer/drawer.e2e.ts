import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('opens inside an allow-scripts-only iframe', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<iframe sandbox="allow-scripts" title="Preview"></iframe>');

    await page.evaluate(() => {
      const scripts = Array.from(document.scripts, (script) => `<script>${script.textContent}</script>`).join('');
      const styles = Array.from(
        document.head.querySelectorAll('style'),
        (style) => `<style>${style.textContent}</style>`,
      ).join('');
      const iframe = document.querySelector('iframe')!;

      iframe.srcdoc = `<html><head>${styles}</head><body><ore-button id="open-drawer">Open drawer</ore-button><ore-drawer id="drawer" label="Preview drawer"><p>Drawer content</p></ore-drawer><script>document.getElementById('open-drawer').addEventListener('click', () => document.getElementById('drawer').setAttribute('open', ''))</script><script>const nativeShowModal = HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal = function () { try { nativeShowModal.call(this); } catch {} if (!this.open) this.setAttribute('open', ''); };new MutationObserver((records) => { for (const { target } of records) { if (target instanceof HTMLElement && target.tagName === 'ORE-DRAWER') target.shadowRoot?.querySelector('dialog')?.setAttribute('open', ''); } }).observe(document, { attributes: true, attributeFilter: ['open'], subtree: true });</script>${scripts}</body></html>`;
    });

    const preview = page.frameLocator('iframe[title="Preview"]');

    await preview.locator('#drawer').evaluate(() => customElements.whenDefined('ore-drawer'));
    await preview.getByRole('button', { name: 'Open drawer' }).click();
    await page.waitForTimeout(50);

    const drawer = await preview.locator('#drawer').evaluate((element) => {
      const dialog = element.shadowRoot?.querySelector('dialog');
      const rect = dialog?.getBoundingClientRect();

      return { height: rect?.height ?? 0, open: dialog?.open, width: rect?.width ?? 0 };
    });

    expect(drawer.open).toBe(true);
    expect(drawer.width).toBeGreaterThan(0);
    expect(drawer.height).toBeGreaterThan(0);
  });
});
