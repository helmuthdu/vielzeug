import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('content-sized sheets fit short content and scroll long content', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(
      '<ore-drawer default-open placement="bottom" size="content" title="Reading"><p>Short content.</p><ore-button slot="footer">Done</ore-button></ore-drawer>',
    );
    const panel = page.locator('ore-drawer [part="panel"]');
    await expect(panel).toBeVisible();
    expect((await panel.boundingBox())!.height).toBeLessThan(300);
    await page.locator('ore-drawer > p').evaluate((el) => (el.textContent = 'Long rules. '.repeat(600)));
    await expect.poll(async () => (await panel.boundingBox())!.height).toBeLessThanOrEqual(796);
    const body = page.locator('ore-drawer .body');
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(page.getByRole('button', { name: 'Done' })).toBeInViewport();
  });

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

test.describe('Accessibility', () => {
  test('open drawer passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-drawer default-open label="Preview drawer"><p>Drawer content</p></ore-drawer>',
    );

    await expect(page.locator('ore-drawer').locator('dialog')).toBeVisible();

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
