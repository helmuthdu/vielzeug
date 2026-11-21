import { axeCheck, expect, test } from '../../testing/fixtures';

const image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

test.describe('Appearance', () => {
  for (const theme of ['light', 'dark']) {
    test(`matches dialog and drawer surfaces in ${theme} mode`, async ({ page, refinePage }) => {
      await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
      await refinePage.mountComponent(`
        <ore-lightbox><button type="button"><img src="${image}" alt="Photo"></button></ore-lightbox>
        <ore-dialog></ore-dialog>
        <ore-drawer></ore-drawer>
      `);
      const lightbox = page.locator('ore-lightbox');
      const background = (selector: string) =>
        page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);

      expect(await background('ore-lightbox dialog')).toBe(await background('ore-dialog [part="panel"]'));
      expect(await background('ore-lightbox dialog')).toBe(await background('ore-drawer [part="panel"]'));
      const filter = (selector: string) =>
        page.locator(selector).evaluate((element) => getComputedStyle(element).backdropFilter);
      expect(await filter('ore-lightbox dialog')).toBe(await filter('ore-dialog [part="panel"]'));
      expect(await filter('ore-lightbox dialog')).not.toBe('none');
      await lightbox.evaluate((element) => element.style.setProperty('--lightbox-bg', 'rgb(25, 50, 75)'));
      expect(await background('ore-lightbox dialog')).toBe('rgb(25, 50, 75)');
    });
  }
});

test.describe('Layout', () => {
  for (const viewport of [
    { height: 800, width: 1280 },
    { height: 600, width: 375 },
    { height: 400, width: 375 },
  ]) {
    test(`separates the image stage from controls at ${viewport.width}x${viewport.height}`, async ({
      page,
      refinePage,
    }) => {
      await page.setViewportSize(viewport);
      await refinePage.mountComponent(`
        <ore-lightbox label="Photos">
          <button type="button"><img src="${image}" alt="Front"></button>
          <button type="button"><img src="${image}" alt="Back"></button>
        </ore-lightbox>
      `);
      await page.getByRole('button', { exact: true, name: 'Front' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('img', { name: 'Front' })).toBeVisible();
      const geometry = await dialog.evaluate((element) => {
        const stage = element.querySelector('.stage')!.getBoundingClientRect();
        const controls = element.querySelector('.controls')!.getBoundingClientRect();
        const toolbar = element.querySelector('.toolbar')!.getBoundingClientRect();
        return {
          gap: controls.top - stage.bottom,
          overflow: element.scrollHeight - element.clientHeight,
          toolbarGap: stage.top - toolbar.bottom,
        };
      });
      expect(geometry.gap).toBeGreaterThanOrEqual(8);
      expect(geometry.toolbarGap).toBeGreaterThanOrEqual(8);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('Interaction', () => {
  test('opens the selected image, navigates without wrapping, and restores focus', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos">
        <button type="button" style="min-width:44px;min-height:44px"><img src="${image}" alt="Front view"></button>
        <button type="button" style="min-width:44px;min-height:44px"><img src="${image}" alt="Back view"></button>
      </ore-lightbox>
    `);
    const trigger = page.getByRole('button', { name: 'Front view' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Photos' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: 'Front view' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('img', { name: 'Back view' })).toBeVisible();
    const next = dialog.getByRole('button', { name: 'Next image' });
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(next).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('recovers focus when the invoking trigger is removed', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos">
        <button type="button"><img src="${image}" alt="Front"></button>
        <button type="button"><img src="${image}" alt="Back"></button>
      </ore-lightbox>
    `);
    await page.getByRole('button', { name: 'Front' }).click();
    await page
      .locator('ore-lightbox > button')
      .first()
      .evaluate((element) => element.remove());
    await expect(page.getByRole('dialog').getByRole('img', { name: 'Back' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Back' })).toBeFocused();
  });

  test('recovers thumbnail focus when its image is removed', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos">
        <button type="button"><img src="${image}" alt="Front"></button>
        <button type="button"><img src="${image}" alt="Back"></button>
      </ore-lightbox>
    `);
    await page.getByRole('button', { exact: true, name: 'Front' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Front (1 of 2)' }).focus();
    await page
      .locator('ore-lightbox > button')
      .first()
      .evaluate((element) => element.remove());
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
  });

  test('focuses the replacement thumbnail when other images remain', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos">
        <button type="button"><img src="${image}" alt="Front"></button>
        <button type="button"><img src="${image}" alt="Back"></button>
        <button type="button"><img src="${image}" alt="Side"></button>
      </ore-lightbox>
    `);
    await page.getByRole('button', { exact: true, name: 'Front' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Front (1 of 3)' }).focus();
    await page
      .locator('ore-lightbox > button')
      .first()
      .evaluate((element) => element.remove());
    await expect(dialog.getByRole('button', { name: 'Back (1 of 2)' })).toBeFocused();
  });

  for (const direction of ['ltr', 'rtl']) {
    test(`selects and scrolls thumbnails in a narrow ${direction} gallery`, async ({ page, refinePage }) => {
      await page.setViewportSize({ height: 800, width: 375 });
      const triggers = Array.from(
        { length: 10 },
        (_, index) =>
          `<button type="button" style="min-width:44px;min-height:44px"><img src="${image}" alt="Photo ${index + 1}"></button>`,
      ).join('');
      await refinePage.mountComponent(`<ore-lightbox dir="${direction}" label="Photos">${triggers}</ore-lightbox>`);
      await page.getByRole('button', { exact: true, name: 'Photo 1' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.locator('[part="thumbnail"]')).toHaveCount(5);
      await expect(dialog.getByRole('button', { name: 'Photo 6 (6 of 10)' })).toHaveCount(0);
      const last = dialog.getByRole('button', { name: 'Photo 10 (10 of 10)' });
      for (let index = 0; index < 9; index++) {
        await dialog.getByRole('button', { name: 'Next image' }).click();
      }
      await expect(last).toHaveAttribute('aria-current', 'true');
      await expect
        .poll(() =>
          last.evaluate((button) => {
            const track = button.parentElement!.getBoundingClientRect();
            const rect = button.getBoundingClientRect();
            return rect.left >= track.left && rect.right <= track.right;
          }),
        )
        .toBe(true);
      const previous = dialog.getByRole('button', { name: 'Photo 9 (9 of 10)' });
      await previous.click();
      await previous.focus();
      await page.keyboard.press('Enter');
      await expect(previous).toHaveAttribute('aria-current', 'true');
      await expect(dialog.getByRole('img', { name: 'Photo 9' })).toBeVisible();
      await expect(previous).toBeFocused();
      expect((await axeCheck(page)).violations).toEqual([]);
    });
  }

  test('retains focus when a changed limit removes the focused thumbnail', async ({ page, refinePage }) => {
    const triggers = Array.from(
      { length: 7 },
      (_, index) => `<button type="button"><img src="${image}" alt="Photo ${index + 1}"></button>`,
    ).join('');
    await refinePage.mountComponent(`<ore-lightbox label="Photos">${triggers}</ore-lightbox>`);
    await page.getByRole('button', { exact: true, name: 'Photo 4' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Photo 2 (2 of 7)' }).focus();
    await page.locator('ore-lightbox').evaluate((element) => element.setAttribute('max-thumbnails', '1'));
    await expect(dialog.locator('[part="thumbnail"]')).toHaveCount(1);
    await expect(dialog.getByRole('button', { name: 'Photo 4 (4 of 7)' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('button', { name: 'Photo 5 (5 of 7)' })).toBeFocused();
  });

  test('does not steal focus when it moves before the thumbnail window updates', async ({ page, refinePage }) => {
    const triggers = Array.from(
      { length: 7 },
      (_, index) => `<button type="button"><img src="${image}" alt="Photo ${index + 1}"></button>`,
    ).join('');
    await refinePage.mountComponent(`<ore-lightbox label="Photos">${triggers}</ore-lightbox>`);
    await page.getByRole('button', { exact: true, name: 'Photo 4' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Photo 2 (2 of 7)' }).focus();
    await page.locator('ore-lightbox').evaluate((element) => {
      element.setAttribute('max-thumbnails', '1');
      element.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!.focus();
    });
    await expect(dialog.locator('[part="thumbnail"]')).toHaveCount(1);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
  });

  test('shows a load error without closing the gallery', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos"><button type="button" data-preview-src="data:image/png,invalid">
        <img src="${image}" alt="Unloaded photo">
      </button></ore-lightbox>
    `);
    await page.getByRole('button', { name: 'Unloaded photo' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('status')).toContainText('Image could not be loaded.');
    await expect(dialog.locator('ore-skeleton')).toBeHidden();
    await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeVisible();
  });

  test('shows a skeleton until the preview image loads', async ({ page, refinePage }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('https://example.test/preview.gif', async (route) => {
      await pending;
      await route.fulfill({
        body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64'),
        contentType: 'image/gif',
      });
    });
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos"><button type="button" data-preview-src="https://example.test/preview.gif">
        <img src="${image}" alt="Photo">
      </button></ore-lightbox>
    `);
    await page.getByRole('button', { name: 'Photo' }).click();
    const dialog = page.getByRole('dialog');
    const skeleton = dialog.locator('ore-skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).not.toHaveAttribute('striped');
    await expect(dialog.locator('img[part="image"]')).toBeHidden();
    const geometry = await skeleton.evaluate((element) => {
      const stage = element.parentElement!.getBoundingClientRect();
      const skeletonRect = element.getBoundingClientRect();
      return {
        skeletonHeight: skeletonRect.height,
        skeletonWidth: skeletonRect.width,
        stageHeight: stage.height,
        stageWidth: stage.width,
      };
    });
    expect(Math.abs(geometry.skeletonWidth - geometry.stageWidth)).toBeLessThan(1);
    expect(Math.abs(geometry.skeletonHeight - geometry.stageHeight)).toBeLessThan(1);
    release();
    await expect(dialog.getByRole('img', { name: 'Photo' })).toBeVisible();
    await expect(skeleton).toBeHidden();
  });

  test('ignores a stale image error after navigating away', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos">
        <button type="button"><img src="${image}" alt="First"></button>
        <button type="button"><img src="${image}" alt="Fast"></button>
      </ore-lightbox>
    `);
    await page.getByRole('button', { exact: true, name: 'First' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('img', { name: 'First' })).toBeVisible();
    const previous = await dialog.locator('img[part="image"]').elementHandle();
    if (!previous) throw new Error('Preview image not found');
    await dialog.getByRole('button', { name: 'Next image' }).click();
    await expect(dialog.getByRole('img', { name: 'Fast' })).toBeVisible();
    await previous.evaluate((element) => element.dispatchEvent(new Event('error')));
    await expect(dialog.getByRole('img', { name: 'Fast' })).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveText('2 of 2');
  });

  test('reports blocked preview URLs instead of staying in the loading state', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos"><button type="button" data-preview-src="data:image/svg+xml,%3Csvg%3E">
        <img src="${image}" alt="Photo">
      </button></ore-lightbox>
    `);
    await page.getByRole('button', { name: 'Photo' }).click();
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('Image could not be loaded.');
  });

  test('releases the modal when disconnected while open', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-lightbox label="Photos"><button type="button"><img src="${image}" alt="Photo"></button></ore-lightbox>
      <button type="button">Outside</button>
    `);
    await page.getByRole('button', { name: 'Photo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('ore-lightbox').evaluate((element) => element.remove());
    await page.getByRole('button', { name: 'Outside' }).click();
    await expect(page.getByRole('button', { name: 'Outside' })).toBeFocused();
  });
});
