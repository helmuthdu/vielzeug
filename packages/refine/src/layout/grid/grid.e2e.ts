import { expect, test } from '../../testing/fixtures';

test.describe('ore-grid layout', () => {
  test('resolves columns and areas from the grid container width', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 1200 });
    await refinePage.mountComponent(`
      <div id="container" style="width: 639px">
        <ore-grid cols="1" cols-sm="2" cols-lg="3" areas="'mobile'" areas-sm="'desktop desktop'">
          <div>One</div>
          <div>Two</div>
          <div>Three</div>
        </ore-grid>
      </div>
    `);

    await page.locator('.frame').evaluate((frame) => {
      frame.style.maxWidth = 'none';
    });

    const grid = page.locator('ore-grid');
    const columnCount = () =>
      grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
    const areas = () => grid.evaluate((element) => getComputedStyle(element).gridTemplateAreas);

    await expect.poll(columnCount).toBe(1);
    await expect.poll(areas).toBe('"mobile"');

    await page.locator('#container').evaluate((container) => {
      container.style.width = '640px';
    });

    await expect.poll(columnCount).toBe(2);
    await expect.poll(areas).toBe('"desktop desktop"');

    await page.locator('#container').evaluate((container) => {
      container.style.width = '1024px';
    });

    await expect.poll(columnCount).toBe(3);
  });

  test('resolves rem-based breakpoint tokens to CSS pixels', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 1200 });
    await refinePage.mountComponent(`
      <div id="container" style="width: 639px">
        <ore-grid cols="1" cols-sm="2">
          <div>One</div>
          <div>Two</div>
        </ore-grid>
      </div>
    `);

    await page.locator('.frame').evaluate((frame) => {
      frame.style.maxWidth = 'none';
      frame.style.setProperty('--size-screen-sm', '48rem');
    });

    const container = page.locator('#container');
    const columnCount = () =>
      page
        .locator('ore-grid')
        .evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);

    await expect.poll(columnCount).toBe(1);

    await container.evaluate((element) => {
      element.style.width = '767px';
    });
    await expect.poll(columnCount).toBe(1);

    await container.evaluate((element) => {
      element.style.width = '768px';
    });
    await expect.poll(columnCount).toBe(2);
  });

  test('fits auto columns to the requested minimum width', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 1200 });
    await refinePage.mountComponent(`
      <div id="container" style="width: 400px">
        <ore-grid cols="auto" min-col-width="200px">
          <div>One</div>
          <div>Two</div>
          <div>Three</div>
        </ore-grid>
      </div>
    `);

    await page.locator('.frame').evaluate((frame) => {
      frame.style.maxWidth = 'none';
    });

    const columnCount = () =>
      page
        .locator('ore-grid')
        .evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);

    await expect.poll(columnCount).toBe(1);

    await page.locator('#container').evaluate((container) => {
      container.style.width = '440px';
    });

    await expect.poll(columnCount).toBe(2);
  });

  test('allows consumer inline styles to override the areas attribute', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-grid areas="'component'" style="grid-template-areas: 'consumer'">
        <div>Item</div>
      </ore-grid>
    `);

    await expect(page.locator('ore-grid')).toHaveCSS('grid-template-areas', '"consumer"');
  });
});
