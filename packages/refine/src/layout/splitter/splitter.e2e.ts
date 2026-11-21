import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  for (const orientation of ['horizontal', 'vertical']) {
    test(`keeps the ${orientation} divider compact and its controls reachable`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`
        <ore-splitter label="Files" orientation="${orientation}" show-buttons style="width: 320px; height: 220px">
          <div slot="primary">Files</div><div slot="secondary">Editor</div>
        </ore-splitter>
      `);
      const separator = page.getByRole('separator', { name: 'Files' });
      const button = page.getByRole('button', { name: 'Increase primary pane size' });
      const dimensions = await button.boundingBox();
      if (!dimensions) throw new Error('Splitter control has no layout box');
      expect(dimensions.width).toBeGreaterThanOrEqual(24);
      expect(dimensions.height).toBeGreaterThanOrEqual(24);
      expect(orientation === 'horizontal' ? dimensions.width : dimensions.height).toBe(24);
      await button.click();
      await expect(separator).toHaveAttribute('aria-valuenow', '55');
      expect((await axeCheck(page)).violations).toEqual([]);
    });
  }
});

test.describe('Coarse pointers', () => {
  test.use({ hasTouch: true });

  test('provides larger resize controls without overlapping the panes', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-splitter label="Files" show-buttons style="width: 320px; height: 220px">
        <button slot="primary">Files</button><button slot="secondary">Editor</button>
      </ore-splitter>
    `);
    const button = page.getByRole('button', { name: 'Increase primary pane size' });
    const dimensions = await button.boundingBox();
    if (!dimensions) throw new Error('Splitter control has no layout box');
    expect(dimensions.width).toBeGreaterThanOrEqual(44);
    expect(dimensions.height).toBeGreaterThanOrEqual(44);
    await button.tap();
    await expect(page.getByRole('separator', { name: 'Files' })).toHaveAttribute('aria-valuenow', '55');
    await page.getByRole('button', { name: 'Editor' }).tap();
    await expect(page.getByRole('button', { name: 'Editor' })).toBeFocused();
  });
});

test.describe('Interaction', () => {
  test('hides buttons by default and supports toggling them', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-splitter label="Files" style="width: 320px; height: 220px">
        <div slot="primary">Files</div><div slot="secondary">Editor</div>
      </ore-splitter>
    `);
    const splitter = page.locator('ore-splitter');
    const increase = page.getByRole('button', { name: 'Increase primary pane size' });
    const separator = page.getByRole('separator', { name: 'Files' });
    await expect(increase).toHaveCount(0);
    await separator.focus();
    await page.keyboard.press('ArrowRight');
    await expect(separator).toHaveAttribute('aria-valuenow', '55');
    await splitter.evaluate((element) => element.setAttribute('show-buttons', ''));
    await expect(increase).toBeVisible();
    await splitter.evaluate((element: HTMLElement) => element.style.setProperty('--splitter-divider-size', '32px'));
    expect((await increase.boundingBox())?.width).toBe(32);
    await increase.click();
    await expect(separator).toHaveAttribute('aria-valuenow', '60');
    await splitter.evaluate((element) => element.removeAttribute('show-buttons'));
    await expect(increase).toHaveCount(0);
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('supports dragging and non-drag buttons within bounds', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-splitter label="Files" value="35" min="10" max="90" show-buttons style="height: 220px">
        <div slot="primary">Files</div><div slot="secondary">Editor</div>
      </ore-splitter>
    `);
    const splitter = page.locator('ore-splitter');
    const separator = page.getByRole('separator', { name: 'Files' });

    await page.getByRole('button', { name: 'Increase primary pane size' }).click();
    await expect(separator).toHaveAttribute('aria-valuenow', '40');
    const rect = await separator.boundingBox();
    if (!rect) throw new Error('Separator has no layout box');
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 80, rect.y + rect.height / 2, { steps: 4 });
    await page.mouse.up();
    expect(Number(await splitter.getAttribute('value'))).toBeGreaterThan(40);
    await separator.focus();
    await page.keyboard.press('Home');
    await expect(separator).toHaveAttribute('aria-valuenow', '10');
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('uses physical arrow directions in RTL and vertical orientations', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-splitter label="Files" dir="rtl" value="50" style="height: 220px">
        <div slot="primary">Files</div><div slot="secondary">Editor</div>
      </ore-splitter>
    `);
    const splitter = page.locator('ore-splitter');
    const separator = page.getByRole('separator', { name: 'Files' });
    await separator.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(separator).toHaveAttribute('aria-valuenow', '55');
    await splitter.evaluate((element) => element.setAttribute('orientation', 'vertical'));
    await expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    await page.keyboard.press('ArrowUp');
    await expect(separator).toHaveAttribute('aria-valuenow', '50');
  });
});
