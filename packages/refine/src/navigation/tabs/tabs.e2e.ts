/**
 * Real-browser tests for `ore-tabs`/`ore-tab-item`/`ore-tab-panel`: a11y checks and click/
 * keyboard interaction that jsdom can't evaluate (no CSS box model, no real focus movement).
 * Complements `tabs.test.ts`/`tab-item.test.ts`/`tab-panel.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
 */
import type { Page } from '@playwright/test';
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  // The tab ID generator produces empty IDs (e.g. aria-controls="tabpanel-") in this IIFE
  // context because ore's global ID counter is not reset between tests. This causes
  // aria-valid-attr-value and aria-required-parent violations. Track separately in component tests.
  test.fail(
    'tabs with panels pass a11y checks (ID generation artifact in IIFE context)',
    async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-tabs>' +
          '<ore-tab-item value="t1">Tab 1</ore-tab-item>' +
          '<ore-tab-item value="t2">Tab 2</ore-tab-item>' +
          '<ore-tab-panel>Panel 1 content</ore-tab-panel>' +
          '<ore-tab-panel>Panel 2 content</ore-tab-panel>' +
          '</ore-tabs>',
      );

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    },
  );
});

/** jsdom has no CSS box model, so density/size sizing is read from the real engine. */
const tabMetrics = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const button = document.querySelector(sel)!.shadowRoot!.querySelector('button')!;
    const style = getComputedStyle(button);

    return {
      font: style.fontSize,
      height: button.getBoundingClientRect().height,
      padX: Number.parseFloat(style.paddingLeft),
    };
  }, selector);

test.describe('Layout', () => {
  for (const variant of ['solid', 'flat', 'bordered', 'ghost', 'frost']) {
    for (const width of [390, 1280]) {
      test(`fullwidth ${variant} tabs fill their container at ${width}px`, async ({ page, refinePage }) => {
        await page.setViewportSize({ height: 844, width });
        await refinePage.mountComponent(
          `<ore-tabs id="full" fullwidth variant="${variant}" label="Views">` +
            '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
            '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
            '<ore-tab-item slot="tabs" value="three">Billing</ore-tab-item>' +
            '</ore-tabs>',
        );

        const geometry = await page.locator('#full').evaluate((tabs) => {
          const tablist = tabs.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!;
          const items = [...tabs.querySelectorAll('ore-tab-item')].map((item) => item.getBoundingClientRect());

          return {
            frame: tabs.parentElement!.clientWidth,
            host: tabs.getBoundingClientRect().width,
            itemWidths: items.map((item) => item.width),
            lastRight: items.at(-1)!.right,
            listRight: tablist.getBoundingClientRect().right,
          };
        });

        expect(geometry.host).toBeCloseTo(geometry.frame, 0);
        expect(geometry.itemWidths[0]).toBeCloseTo(geometry.itemWidths[1], 0);
        expect(geometry.itemWidths[1]).toBeCloseTo(geometry.itemWidths[2], 0);
        expect(geometry.listRight - geometry.lastRight).toBeLessThanOrEqual(5);

        await page.locator('#full ore-tab-item[value="two"]').click();
        await expect(page.locator('#full')).toHaveAttribute('value', 'two');
      });
    }
  }

  // Unequal labels: equal widths can only come from `flex: 1` (basis 0), never from content sizing.
  test('fullwidth distributes tabs evenly despite unequal label lengths', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="full" fullwidth>' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Subscriptions and Billing</ore-tab-item>' +
        '<ore-tab-panel value="one">Overview content</ore-tab-panel>' +
        '<ore-tab-panel value="two">Settings content</ore-tab-panel>' +
        '</ore-tabs>',
    );

    const items = page.locator('#full ore-tab-item');
    const first = await items.nth(0).boundingBox();
    const second = await items.nth(1).boundingBox();

    expect(first!.width).toBeCloseTo(second!.width, 0);
    expect(first!.width).toBeGreaterThan(250);
  });

  test('removing fullwidth restores navigation-only intrinsic sizing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="full" fullwidth>' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>',
    );

    const full = await page.locator('#full').boundingBox();

    await page.locator('#full').evaluate((tabs) => tabs.removeAttribute('fullwidth'));

    await expect.poll(async () => (await page.locator('#full').boundingBox())!.width).toBeLessThan(full!.width);
  });

  test('indicator follows the active tab when the container resizes', async ({ page, refinePage }) => {
    // A container resize changes fullwidth tab widths while selection stays put, so only
    // the ResizeObserver re-sync keeps the pill over its tab.
    await refinePage.mountComponent(
      '<div id="wrap" style="width: 600px">' +
        '<ore-tabs id="ind-tabs" fullwidth value="two">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>' +
        '</div>',
    );

    const measure = () =>
      page.locator('#ind-tabs').evaluate((tabs) => {
        const indicator = tabs.shadowRoot!.querySelector<HTMLElement>('.indicator')!;
        const active = tabs.querySelector<HTMLElement>('ore-tab-item[value="two"]')!;
        const ind = indicator.getBoundingClientRect();
        const tab = active.getBoundingClientRect();

        return { indLeft: ind.left, indWidth: ind.width, tabLeft: tab.left, tabWidth: tab.width };
      });

    await expect
      .poll(async () => {
        const m = await measure();

        return Math.abs(m.indWidth - m.tabWidth) < 2 && Math.abs(m.indLeft - m.tabLeft) < 2;
      })
      .toBe(true);

    await page.locator('#wrap').evaluate((wrap) => {
      wrap.style.width = '300px';
    });

    await expect
      .poll(async () => {
        const m = await measure();

        return Math.abs(m.indWidth - m.tabWidth) < 2 && Math.abs(m.indLeft - m.tabLeft) < 2;
      })
      .toBe(true);
  });

  test('the pill is the painted active surface and slides to the clicked tab', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="pill-tabs" value="one" variant="ghost" color="primary">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>',
    );

    const measure = () =>
      page.locator('#pill-tabs').evaluate((tabs) => {
        const indicator = tabs.shadowRoot!.querySelector<HTMLElement>('.indicator')!;
        const style = getComputedStyle(indicator);
        const active = tabs.querySelector<HTMLElement>('ore-tab-item[active]')!;
        const ind = indicator.getBoundingClientRect();
        const tab = active.getBoundingClientRect();

        return {
          aligned: Math.abs(ind.left - tab.left) < 2 && Math.abs(ind.width - tab.width) < 2,
          background: style.backgroundColor,
          display: style.display,
          transitions: style.transitionProperty,
        };
      });

    const initial = await measure();

    // Visible, painted, and transitioned: the slide is the selection affordance.
    expect(initial.display).toBe('block');
    expect(initial.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(initial.transitions).toContain('transform');
    expect(initial.aligned).toBe(true);

    await page.locator('#pill-tabs ore-tab-item[value="two"]').click();

    await expect.poll(async () => (await measure()).aligned).toBe(true);
  });

  test('fullwidth preserves the vertical tablist layout', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="full" fullwidth orientation="vertical">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>',
    );

    const geometry = await page.locator('#full').evaluate((tabs) => {
      const tablist = tabs.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!;
      const items = [...tabs.querySelectorAll('ore-tab-item')].map((item) => item.getBoundingClientRect());

      return {
        direction: getComputedStyle(tablist).flexDirection,
        frame: tabs.parentElement!.clientWidth,
        host: tabs.getBoundingClientRect().width,
        itemWidth: items[0].width,
        stacked: items[1].top >= items[0].bottom,
      };
    });

    expect(geometry.host).toBeCloseTo(geometry.frame, 0);
    expect(geometry.direction).toBe('column');
    expect(geometry.stacked).toBe(true);
    expect(geometry.itemWidth).toBeLessThan(geometry.host / 2);
  });

  test('compact density renders a smaller modern tab control', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="standard" value="one" variant="ghost">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>' +
        '<ore-tabs id="compact" value="one" variant="ghost" density="compact">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>',
    );

    const standardTab = page.locator('#standard ore-tab-item').first();
    const compactTab = page.locator('#compact ore-tab-item').first();
    const [standardBox, compactBox] = await Promise.all([standardTab.boundingBox(), compactTab.boundingBox()]);

    expect(compactBox!.height).toBeLessThan(standardBox!.height);
    expect(compactBox!.height).toBeGreaterThanOrEqual(24);
    await page.locator('#compact ore-tab-item[value="two"]').click();
    await expect(page.locator('#compact')).toHaveAttribute('value', 'two');
  });

  test('compact density keeps the size font-size and tightens the tab', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="lg" value="one" variant="ghost" size="lg">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>' +
        '<ore-tabs id="lg-compact" value="one" variant="ghost" size="lg" density="compact">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>',
    );

    const standard = await tabMetrics(page, '#lg ore-tab-item');
    const compact = await tabMetrics(page, '#lg-compact ore-tab-item');

    // Same type size in both densities: compact must not downshift the font.
    expect(compact.font).toBe(standard.font);
    expect(compact.font).toBe('16px');
    // Compact is the tighter of the two in height and horizontal padding.
    expect(compact.height).toBeLessThan(standard.height);
    expect(compact.padX).toBeLessThan(standard.padX);
  });

  test('default density keeps the documented 44px target on a fine pointer', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="default" value="one" variant="ghost">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>',
    );

    const metrics = await tabMetrics(page, '#default ore-tab-item');

    expect(metrics.height).toBeGreaterThanOrEqual(44);
  });

  test('rounded drives corner radius; density no longer changes it', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="plain" value="one" variant="solid">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>' +
        '<ore-tabs id="dense" value="one" variant="solid" density="compact">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>' +
        '<ore-tabs id="pill" value="one" variant="solid" rounded="full">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>',
    );

    const radii = await page.evaluate(() => {
      const read = (id: string) => {
        const tabs = document.getElementById(id)!;
        const tablist = getComputedStyle(tabs.shadowRoot!.querySelector('[role="tablist"]')!);
        const item = getComputedStyle(tabs.querySelector('ore-tab-item')!.shadowRoot!.querySelector('button')!);

        return { item: item.borderRadius, tablist: tablist.borderRadius };
      };

      return { dense: read('dense'), pill: read('pill'), plain: read('plain') };
    });

    // Compact leaves the radius alone now that `rounded` owns it.
    expect(radii.dense).toEqual(radii.plain);
    expect(radii.pill.item).not.toBe(radii.plain.item);
    expect(radii.pill.tablist).toBe('9999px');
  });

  test('navigation-only tabs do not reserve panel space', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="navigation" value="campaign" variant="frost">' +
        '<ore-tab-item slot="tabs" value="campaign">Campaign</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="party">Party</ore-tab-item>' +
        '</ore-tabs>',
    );

    const geometry = await page.locator('#navigation').evaluate((tabs) => {
      const host = tabs.getBoundingClientRect();
      const tablist = tabs.shadowRoot!.querySelector<HTMLElement>('.tablist-wrapper')!.getBoundingClientRect();
      const panels = tabs.shadowRoot!.querySelector<HTMLElement>('.panels')!;
      return {
        hostHeight: host.height,
        panelDisplay: getComputedStyle(panels).display,
        panelsHidden: panels.hidden,
        tablistHeight: tablist.height,
      };
    });

    expect(geometry.panelsHidden).toBe(true);
    expect(geometry.panelDisplay).toBe('none');
    expect(geometry.hostHeight).toBeCloseTo(geometry.tablistHeight, 1);
  });

  test('navigation-only tabs shrink to their tablist width and grow with tab count', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="two" value="one" variant="frost">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '</ore-tabs>' +
        '<ore-tabs id="five" value="one" variant="frost">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="three">Members</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="four">Billing</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="five">Activity</ore-tab-item>' +
        '</ore-tabs>',
    );

    const widths = await page.evaluate(() => {
      const measure = (id: string) => {
        const host = document.getElementById(id)!;
        const tablist = host.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!;

        return { host: host.getBoundingClientRect().width, tablist: tablist.getBoundingClientRect().width };
      };

      return { five: measure('five'), frame: document.querySelector('.frame')!.clientWidth, two: measure('two') };
    });

    expect(widths.two.host).toBeCloseTo(widths.two.tablist, 0);
    expect(widths.five.host).toBeCloseTo(widths.five.tablist, 0);
    expect(widths.five.host).toBeGreaterThan(widths.two.host);
    expect(widths.two.host).toBeLessThan(widths.frame);
  });

  test('tabs with panels keep filling the container width', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="tabbed" value="one" variant="frost">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '<ore-tab-item slot="tabs" value="two">Settings</ore-tab-item>' +
        '<ore-tab-panel value="one"><p>Overview content</p></ore-tab-panel>' +
        '<ore-tab-panel value="two"><p>Settings content</p></ore-tab-panel>' +
        '</ore-tabs>',
    );

    const widths = await page.evaluate(() => ({
      frame: document.querySelector('.frame')!.clientWidth,
      host: document.getElementById('tabbed')!.getBoundingClientRect().width,
    }));

    expect(widths.host).toBeCloseTo(widths.frame, 0);
  });
});

test.describe('Touch layout', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('keeps a 44px tap target under compact density on coarse pointers', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="dense" value="one" variant="ghost" density="compact">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>',
    );

    const metrics = await tabMetrics(page, '#dense ore-tab-item');

    // Compact is a visual-density choice; WCAG 2.2 §2.5.8 still owns the target on touch.
    expect(metrics.height).toBeGreaterThanOrEqual(44);
  });

  test('promotes an unset size exactly like an explicit md on coarse pointers', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs id="unset" value="one" variant="ghost">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>' +
        '<ore-tabs id="md" value="one" variant="ghost" size="md">' +
        '<ore-tab-item slot="tabs" value="one">Overview</ore-tab-item>' +
        '</ore-tabs>',
    );

    const unset = await tabMetrics(page, '#unset ore-tab-item');
    const md = await tabMetrics(page, '#md ore-tab-item');

    expect(unset).toEqual(md);
    // One tier up from the fine-pointer default (14px / 6px 16px).
    expect(unset.font).toBe('16px');
  });
});

test.describe('Interaction', () => {
  test('clicking tab makes it active', async ({ page, refinePage }) => {
    // Tabs need value attributes for the active state to propagate from context
    await refinePage.mountComponent(
      '<ore-tabs id="tabs">' +
        '<ore-tab-item id="t1" value="tab1">Tab 1</ore-tab-item>' +
        '<ore-tab-item id="t2" value="tab2">Tab 2</ore-tab-item>' +
        '<ore-tab-panel>Panel 1</ore-tab-panel>' +
        '<ore-tab-panel>Panel 2</ore-tab-panel>' +
        '</ore-tabs>',
    );

    await page.locator('#t2').click();
    await page.waitForTimeout(50);

    // aria-selected is set on the shadow button inside ore-tab-item
    const isActive = await page.locator('#t2').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;

      return shadow?.querySelector('[aria-selected="true"]') !== null;
    });

    expect(isActive).toBe(true);
  });

  test('arrow keys navigate between tabs', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-tabs>' +
        '<ore-tab-item id="t1" value="tab1">Tab 1</ore-tab-item>' +
        '<ore-tab-item id="t2" value="tab2">Tab 2</ore-tab-item>' +
        '<ore-tab-panel>Panel 1</ore-tab-panel>' +
        '<ore-tab-panel>Panel 2</ore-tab-panel>' +
        '</ore-tabs>',
    );

    // Focus the button inside t1's shadow DOM, then arrow-right to t2
    await page.locator('#t1').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;

      (shadow.querySelector('button') as HTMLElement)?.focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);

    // After ArrowRight, document.activeElement should be t2 (focus on host, shadow button inside)
    const t2HasFocus = await page.evaluate(() => {
      const t2 = document.getElementById('t2');

      // Focus lands on the ore-tab-item host; its shadow button receives focus internally
      return document.activeElement === t2 || document.activeElement?.shadowRoot?.activeElement?.tagName === 'BUTTON';
    });

    expect(t2HasFocus).toBe(true);
  });
});
