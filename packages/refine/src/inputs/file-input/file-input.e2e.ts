import { expect, test } from '../../testing/fixtures';

test.describe('Shape', () => {
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
