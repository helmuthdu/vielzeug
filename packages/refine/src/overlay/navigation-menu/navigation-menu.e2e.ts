import { expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('anchors matching panel to selected trigger', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => {
      const trigger = document.querySelector('ore-navigation-menu-item')!;
      const panelRect = panel.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return { hidden: (panel as HTMLElement).hidden, panelRect, triggerRect };
    });

    expect(state.hidden).toBe(false);
    expect(state.panelRect.top).toBeGreaterThanOrEqual(state.triggerRect.bottom);
  });

  test('keeps the panel in its host while opening it in the popover top layer', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => ({
      inHost: panel.parentElement?.tagName === 'ORE-NAVIGATION-MENU',
      open: panel.matches(':popover-open'),
    }));

    expect(state.inHost).toBe(true);
    expect(state.open).toBe(true);
  });

  test('positions a panel below its trigger inside a clipped container', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="height: 3rem; overflow: hidden;">
        <ore-navigation-menu>
          <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
          <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
        </ore-navigation-menu>
      </div>
    `);

    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => {
      const trigger = document.querySelector('ore-navigation-menu-item')!.shadowRoot!.querySelector('.trigger')!;
      const panelRect = panel.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return { panelTop: panelRect.top, triggerBottom: triggerRect.bottom };
    });

    expect(state.panelTop).toBeGreaterThanOrEqual(state.triggerBottom);
  });
});

test.describe('Layout', () => {
  test('uses content-sized grid tracks for grouped panel content', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products">
          <div><a href="/one">One</a></div>
          <div><a href="/two">Two</a></div>
        </ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => {
      const content = panel.shadowRoot?.querySelector<HTMLElement>('.content');

      if (!content) throw new Error('Expected navigation menu panel content');

      const styles = getComputedStyle(content);

      return { alignContent: styles.alignContent, gridAutoRows: styles.gridAutoRows };
    });

    expect(state.alignContent).toBe('start');
    expect(state.gridAutoRows).toBe('max-content');
  });

  test('keeps a long panel within the viewport and scrollable', async ({ page, refinePage }) => {
    const links = Array.from({ length: 48 }, (_, index) => `<a href="/package-${index}">Package ${index}</a>`).join('');

    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products">${links}</ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => {
      const element = panel as HTMLElement;
      const styles = getComputedStyle(element);

      return {
        backdropFilter: styles.backdropFilter,
        clientHeight: element.clientHeight,
        maxHeight: Number.parseFloat(styles.maxHeight),
        overflowY: styles.overflowY,
        scrollHeight: element.scrollHeight,
      };
    });

    expect(state.backdropFilter).toContain('blur');
    expect(state.overflowY).toBe('auto');
    expect(state.maxHeight).toBeLessThan(await page.evaluate(() => window.innerHeight));
    expect(state.scrollHeight).toBeGreaterThan(state.clientHeight);
  });
});
