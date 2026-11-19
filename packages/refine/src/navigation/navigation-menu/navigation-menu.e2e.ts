import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Interaction', () => {
  test('moves keyboard focus into the panel and restores it on Escape', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><ore-navigation-menu-link href="/products">Products link</ore-navigation-menu-link></ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    const trigger = page.getByRole('button', { name: 'Products' });
    const link = page.getByRole('link', { name: 'Products link' });

    await trigger.click();
    await trigger.press('Tab');
    await expect(link).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(page.locator('ore-navigation-menu-panel')).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('activates a panel link before dismissing the menu on pointer interaction', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="#products">Products link</a></ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    const menu = page.locator('ore-navigation-menu');
    await menu.evaluate((element) => {
      element.addEventListener('select', () => element.setAttribute('data-selected', ''), { once: true });
    });
    await page.getByRole('button', { name: 'Products' }).click();
    await page.getByRole('link', { name: 'Products link' }).click();

    await expect(menu).toHaveAttribute('data-selected', '');
    await expect(page.locator('ore-navigation-menu-panel')).toBeHidden();
  });

  test('switches the open panel after hovering another trigger', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
        <ore-navigation-menu-panel for="resources"><a href="/resources">Resources</a></ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    await page.locator('ore-navigation-menu-item').nth(0).click();
    await page.locator('ore-navigation-menu-item').nth(1).hover();

    await expect(page.locator('ore-navigation-menu-panel[for="resources"]')).toBeVisible();
    await expect(page.locator('ore-navigation-menu-panel[for="products"]')).toBeHidden();
  });

  test('uses the navbar mobile context to render its panel inline', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(`
      <ore-navbar id="nav" breakpoint="(max-width: 640px)" label="Primary navigation">
        <ore-navigation-menu slot="mobile-menu">
          <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
          <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
        </ore-navigation-menu>
      </ore-navbar>
    `);

    await page.locator('#nav [part="mobile-toggle"]').click();
    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => ({
      inline: panel.hasAttribute('data-inline'),
      position: getComputedStyle(panel).position,
    }));

    expect(state).toEqual({ inline: true, position: 'static' });
  });

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
      const trigger = document.querySelector('ore-navigation-menu-item')?.shadowRoot?.querySelector('.trigger')!;
      const panelRect = panel.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return { panelTop: panelRect.top, triggerBottom: triggerRect.bottom };
    });

    expect(state.panelTop).toBeGreaterThanOrEqual(state.triggerBottom);
  });
});

test.describe('Layout', () => {
  test('keeps inline panels in document flow instead of the popover layer', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-navigation-menu inline>
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
      </ore-navigation-menu>
    `);

    await page.locator('ore-navigation-menu-item').click();

    const state = await page.locator('ore-navigation-menu-panel').evaluate((panel) => ({
      inline: panel.hasAttribute('data-inline'),
      open: !panel.hasAttribute('hidden'),
      popover: panel.matches(':popover-open'),
      position: getComputedStyle(panel).position,
    }));

    expect(state).toEqual({ inline: true, open: true, popover: false, position: 'static' });
  });

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

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-navigation-menu><ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><ore-navigation-menu-link href="/products">Products link</ore-navigation-menu-link></ore-navigation-menu-panel></ore-navigation-menu>',
    );

    await page.locator('ore-navigation-menu-item').click();
    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
