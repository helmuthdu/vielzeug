import { axeCheck, expect, test } from '../../testing/fixtures';

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

  test('uses the panel foreground for items inside a contrasting container', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="color: rgb(247, 249, 253); --color-contrast-900: rgb(13, 20, 34); --menu-panel-bg: rgb(255, 255, 255)">
        <ore-menu default-open>
          <ore-button slot="trigger">Switch user</ore-button>
          <ore-menu-item type="radio" value="alex">Alex</ore-menu-item>
        </ore-menu>
      </div>
    `);

    const colors = await page.locator('ore-menu').evaluate((menu) => {
      const panel = menu.shadowRoot?.querySelector<HTMLElement>('.menu-panel');
      const item = menu.querySelector('ore-menu-item')?.shadowRoot?.querySelector<HTMLElement>('.item');

      return { item: item ? getComputedStyle(item).color : '', panel: panel ? getComputedStyle(panel).color : '' };
    });

    expect(colors).toEqual({ item: 'rgb(13, 20, 34)', panel: 'rgb(13, 20, 34)' });
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

test.describe('Layout', () => {
  test('positions against its trigger inside a clipping card', async ({ page, refinePage }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await refinePage.mountComponent(
      '<ore-card style="width:480px;margin-left:240px"><ore-menu id="menu" placement="bottom-end">' +
        '<ore-button id="trigger" slot="trigger">More</ore-button>' +
        '<ore-menu-item value="rename">Rename</ore-menu-item>' +
        '<ore-menu-item value="delete">Delete</ore-menu-item>' +
        '</ore-menu></ore-card>',
    );

    await page.locator('#trigger').click();
    await page.waitForTimeout(100);
    const geometry = await page.locator('#menu').evaluate((menu) => {
      const card = menu
        .closest('ore-card')!
        .shadowRoot!.querySelector<HTMLElement>('[part="card"]')!
        .getBoundingClientRect();
      const trigger = menu.querySelector<HTMLElement>('#trigger')!.getBoundingClientRect();
      const panel = menu.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!.getBoundingClientRect();
      return {
        cardBottom: card.bottom,
        panelBottom: panel.bottom,
        panelRight: panel.right,
        triggerRight: trigger.right,
      };
    });

    expect(geometry.panelRight).toBeCloseTo(geometry.triggerRight, 0);
    expect(geometry.panelBottom).toBeGreaterThan(geometry.cardBottom);
    expect(errors).toEqual([]);
  });

  test('lays items out as equal cards in grid layout', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-menu id="menu" layout="grid" columns="2" default-open>
        <ore-button slot="trigger">Actions</ore-button>
        <ore-menu-item value="a">Share this build with the table</ore-menu-item>
        <ore-menu-item value="b">Retreat</ore-menu-item>
        <ore-menu-separator></ore-menu-separator>
        <ore-menu-item value="c">Export</ore-menu-item>
      </ore-menu>
    `);

    const grid = await page.locator('#menu').evaluate((menu) => {
      const panel = menu.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!;
      const items = Array.from(menu.querySelectorAll<HTMLElement>('ore-menu-item'), (item) => {
        const card = item.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!;
        const rect = card.getBoundingClientRect();

        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
      });
      const separator = menu.querySelector<HTMLElement>('ore-menu-separator')!.getBoundingClientRect();

      return {
        // a/b sit in row one, c in row two under the separator: same left/top means the
        // separator did not span, different column widths means the tracks followed content.
        firstRow: items.slice(0, 2),
        panelWidth: panel.getBoundingClientRect().width,
        separatorWidth: separator.width,
        third: items[2]!,
      };
    });

    expect(grid.firstRow[0]!.width).toBeCloseTo(grid.firstRow[1]!.width, 0);
    expect(grid.firstRow[0]!.top).toBeCloseTo(grid.firstRow[1]!.top, 0);
    expect(grid.firstRow[0]!.height).toBeGreaterThan(0);
    // The separator spans the panel's content box, so it is wider than one card column.
    expect(grid.separatorWidth).toBeGreaterThan(grid.firstRow[0]!.width * 1.5);
    expect(grid.third.top).toBeGreaterThan(grid.firstRow[0]!.top + grid.firstRow[0]!.height);
  });

  test('stacks the icon above a clamped label in grid cards', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-menu layout="grid" default-open>
        <ore-button slot="trigger">Actions</ore-button>
        <ore-menu-item value="share">
          <ore-icon slot="icon" name="share-2" size="18"></ore-icon>
          Share this build with everyone at the table right now
        </ore-menu-item>
      </ore-menu>
    `);

    const card = await page.locator('ore-menu').evaluate((menu) => {
      const item = menu.querySelector<HTMLElement>('ore-menu-item')!;
      const icon = item.shadowRoot!.querySelector('.icon-slot')!.getBoundingClientRect();
      const label = item.shadowRoot!.querySelector('[part="item-label"]')!;
      const labelRect = label.getBoundingClientRect();
      const style = getComputedStyle(label);

      return {
        clamped: style.webkitLineClamp,
        iconAboveLabel: icon.bottom <= labelRect.top + 1,
        // Two lines of a size-3.5-ish label: taller than one line, bounded by the clamp.
        labelLines: Math.round(labelRect.height / parseFloat(style.lineHeight)),
      };
    });

    expect(card).toEqual({ clamped: '2', iconAboveLabel: true, labelLines: 2 });
  });
});

test.describe('Accessibility', () => {
  test('open menu passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-menu default-open><ore-button slot="trigger">Open menu</ore-button><ore-menu-item value="edit">Edit</ore-menu-item></ore-menu>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
