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

  test('cards stay cards when markup parses before the bundle loads', async ({ page, refinePage }) => {
    // The docs sandbox scenario: markup is parsed first, then the IIFE defines the elements, so
    // each define() upgrades its tag's parser-created elements immediately. If ore-menu-item were
    // defined before ore-menu, the item would inject(MENU_CTX) before any menu provides it, and
    // inject caches the miss: the grid would render list rows. Parent-before-child define order
    // is what keeps this honest; this test is the guard against silently inverting it again.
    await refinePage.mountComponent('<iframe title="Static preview"></iframe>');

    await page.evaluate(() => {
      const scripts = Array.from(document.scripts, (script) => `<script>${script.textContent}</script>`).join('');
      const iframe = document.querySelector('iframe')!;

      iframe.srcdoc = `<html><body><ore-menu layout="grid" default-open><ore-button slot="trigger">Actions</ore-button><ore-menu-item value="a">Share this build with the table</ore-menu-item></ore-menu>${scripts}</body></html>`;
    });

    const preview = page.frameLocator('iframe[title="Static preview"]');

    // Wait for the srcdoc bundle to finish defining the elements and upgrading the parsed markup.
    await preview.locator('ore-menu-item').evaluate(() => customElements.whenDefined('ore-menu-item'));

    const card = await preview.locator('ore-menu').evaluate((menu) => {
      const item = menu.querySelector<HTMLElement>('ore-menu-item')!;
      const row = item.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!;

      return { classes: row.className, stacked: getComputedStyle(row).flexDirection };
    });

    expect(card.classes).toContain('is-grid');
    expect(card.stacked).toBe('column');
  });
});

test.describe('Focus', () => {
  test('a keyboard-focused item paints the themed highlight, not the UA blue ring', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<button id="before">Before</button><ore-menu default-open><ore-button slot="trigger">Open</ore-button><ore-menu-item value="a">Option A</ore-menu-item><ore-menu-item value="b">Option B</ore-menu-item></ore-menu>',
    );

    // Real keyboard navigation: Tab to the trigger, ArrowDown into the first
    // item. Programmatic .focus() would not set :focus-visible, so the ring
    // bug only reproduces through the keyboard.
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');

    const focused = await page.locator('ore-menu').evaluate((menu) => {
      const item = menu.querySelector('ore-menu-item[value="a"]');
      const inner = item?.shadowRoot?.querySelector<HTMLElement>('.item');
      const cs = inner ? getComputedStyle(inner) : null;

      return {
        background: cs?.backgroundColor ?? '',
        focused: inner?.matches(':focus-visible') ?? false,
        outlineStyle: cs?.outlineStyle ?? '',
      };
    });

    // The themed focus background paints (a resolved color, not transparent)...
    expect(focused).toMatchObject({ focused: true, outlineStyle: 'none' });
    expect(focused.background).not.toBe('rgba(0, 0, 0, 0)');
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

test.describe('Contextmenu trigger', () => {
  test('opens the panel at the pointer on right-click', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-menu trigger="contextmenu"><p slot="trigger" style="padding:24px">Right-click me</p><ore-menu-item value="copy">Copy</ore-menu-item></ore-menu>',
    );

    await page.locator('ore-menu > [slot="trigger"]').click({ button: 'right' });

    const state = await page.locator('ore-menu').evaluate((menu) => {
      const panel = menu.shadowRoot?.querySelector<HTMLElement>('.menu-panel');
      const rect = panel?.getBoundingClientRect();

      return { open: panel?.hasAttribute('data-open'), x: rect?.left ?? 0, y: rect?.top ?? 0 };
    });

    expect(state.open).toBe(true);
    // The panel is anchored to the click point, not the trigger's box: its
    // top-left sits near the cursor inside the padded target.
    expect(state.x).toBeGreaterThan(0);
    expect(state.y).toBeGreaterThan(0);
  });

  test('a left-click does not open a contextmenu menu', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-menu trigger="contextmenu"><p slot="trigger">Target</p><ore-menu-item value="copy">Copy</ore-menu-item></ore-menu>',
    );

    await page.locator('ore-menu > [slot="trigger"]').click();

    const open = await page
      .locator('ore-menu')
      .evaluate((menu) => menu.shadowRoot?.querySelector('.menu-panel')?.hasAttribute('data-open'));

    expect(open).toBe(false);
  });
});

test.describe('Height fit', () => {
  const items = Array.from({ length: 12 }, (_, i) => `<ore-menu-item value="i${i}">Item ${i + 1}</ore-menu-item>`).join(
    '\n',
  );

  test('shows every item when the opened side has more room than the old viewport cap', async ({
    page,
    refinePage,
  }) => {
    await page.setViewportSize({ height: 500, width: 640 });
    await refinePage.mountComponent(`
      <ore-menu default-open>
        <ore-button slot="trigger">Menu</ore-button>
        ${items}
      </ore-menu>
    `);

    const panel = page.locator('ore-menu .menu-panel');

    await expect(panel).toBeVisible();

    const metrics = await panel.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));

    // ~404px of content: larger than the legacy min(70vh, 32rem) cap (350px here), smaller
    // than the ~418px actually available below the trigger: it must not scroll.
    expect(metrics.scroll).toBeGreaterThan(350);
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  });

  test('honors an authored max-height cap', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 500, width: 640 });
    await refinePage.mountComponent(`
      <ore-menu default-open style="--menu-panel-max-height: 6rem">
        <ore-button slot="trigger">Menu</ore-button>
        ${items}
      </ore-menu>
    `);

    const panel = page.locator('ore-menu .menu-panel');

    await expect(panel).toBeVisible();

    const metrics = await panel.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));

    expect(metrics.client).toBeLessThanOrEqual(96 + 2);
    expect(metrics.scroll).toBeGreaterThan(metrics.client);
  });
});

test.describe('Keyboard shortcut end slot', () => {
  test('renders one keycap per pressed key with menu-tight spacing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-menu default-open>
        <ore-button slot="trigger">Menu</ore-button>
        <ore-menu-item value="sign-out">
          Sign out
          <ore-keyboard-shortcut slot="end">
            <ore-keyboard-key>⇧</ore-keyboard-key>
            <ore-keyboard-key>⌘</ore-keyboard-key>
            <ore-keyboard-key>Q</ore-keyboard-key>
          </ore-keyboard-shortcut>
        </ore-menu-item>
      </ore-menu>
    `);

    await expect(page.locator('.menu-panel')).toBeVisible();
    await expect(page.locator('ore-keyboard-shortcut kbd.key')).toHaveCount(3);

    const { gap, probe } = await page.evaluate(() => {
      const inner = document.querySelector('ore-keyboard-shortcut')!.shadowRoot!.querySelector('.shortcut')!;
      const ruler = document.createElement('div');

      ruler.style.columnGap = 'var(--size-0-5)';
      document.body.append(ruler);

      const result = { gap: getComputedStyle(inner).columnGap, probe: getComputedStyle(ruler).columnGap };

      ruler.remove();

      return result;
    });

    // The menu tightens the shortcut group to the tightest spacing token.
    expect(gap).toBe(probe);
  });
});
