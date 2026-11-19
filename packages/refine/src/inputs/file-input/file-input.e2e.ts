import { expect, test } from '../../testing/fixtures';

test.describe('Shape', () => {
  for (const gallery of [false, true]) {
    test(`preserves the extension in a narrow ${gallery ? 'gallery' : 'list'} filename`, async ({
      page,
      refinePage,
    }) => {
      await page.setViewportSize({ height: 800, width: 375 });
      await refinePage.mountComponent(
        `<ore-file-input label="Upload" ${gallery ? 'gallery' : ''} style="width: 240px"></ore-file-input>`,
      );
      const name = `${'a-long-report-name-'.repeat(10)}.pdf`;
      await page
        .locator('input[type="file"]')
        .setInputFiles({ buffer: Buffer.from('report'), mimeType: 'application/pdf', name });
      const label = page.locator(gallery ? '.file-card-name' : '.file-name');
      await expect(label).toHaveText(name);
      const bounds = await label.evaluate((element) => {
        const stem = element.querySelector<HTMLElement>('.file-name-stem')!;
        const extension = element.querySelector<HTMLElement>('.file-name-extension')!;
        return {
          clipped: stem.scrollWidth > stem.clientWidth,
          edge: element.getBoundingClientRect().right,
          extension: extension.textContent,
          right: extension.getBoundingClientRect().right,
        };
      });
      expect(bounds.clipped).toBe(true);
      expect(bounds.extension).toBe('.pdf');
      expect(bounds.right).toBeLessThanOrEqual(bounds.edge + 1);
    });
  }

  test('uses the control radius and keeps explicit radius overrides', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-file-input id="default" label="Upload"></ore-file-input>' +
        '<ore-file-input id="explicit" label="Upload" rounded="lg"></ore-file-input>' +
        '<ore-file-input id="custom" label="Upload" style="--file-input-radius: var(--rounded-2xl)"></ore-file-input>',
    );

    await expect(page.locator('#default .dropzone')).toHaveCSS('border-radius', '8px');
    await expect(page.locator('#explicit .dropzone')).toHaveCSS('border-radius', '8px');
    await expect(page.locator('#custom .dropzone')).toHaveCSS('border-radius', '16px');
  });
});
