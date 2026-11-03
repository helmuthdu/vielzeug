import type { Page } from '@playwright/test';

import { axeCheck, expect, test } from '../../testing/fixtures';

// The dock's whole job is geometry: equal flanks, a dead-center middle, a capsule that fills its
// row, a bar that releases when its container ends. jsdom computes none of that, so every
// assertion here reads real layout.
const ZONES = ['center', 'commit', 'start', 'tools'] as const;

type Rect = { bottom: number; left: number; right: number; top: number; width: number };

type Zone = Rect & { hidden: boolean };

type DockGeometry = {
  bar: Zone;
  host: Rect;
  pinned: boolean;
  zones: Record<(typeof ZONES)[number], Zone>;
};

/**
 * The shared fixture caps `.frame` at 600 px and pads the body by 40 px, which would make every
 * viewport-width assertion below wrong. A dock spans the viewport, so these tests own it.
 */
async function fullBleed(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.body.style.padding = '0';
    (document.querySelector('.frame') as HTMLElement).style.maxWidth = 'none';
  });
}

/**
 * A bottom-sticky bar is pulled up from its natural position at the end of its containing block and
 * released there once the container's end scrolls in, so the bar has to be the container's last
 * child with the scrollable content before it. Room further up the tree, or padding after the bar,
 * buys it nowhere to hold.
 */
function scrolling(markup: string): string {
  return `<div><div style="height:2000px"></div>${markup}</div>`;
}

async function geometry(page: Page, id: string): Promise<DockGeometry> {
  return page.locator(`#${id}`).evaluate((dock) => {
    const rect = (el: Element | null): Zone => {
      const box = el?.getBoundingClientRect();

      return {
        bottom: box?.bottom ?? 0,
        hidden: (el as HTMLElement | null)?.hidden ?? true,
        left: box?.left ?? 0,
        right: box?.right ?? 0,
        top: box?.top ?? 0,
        width: box?.width ?? 0,
      };
    };

    const shadow = dock.shadowRoot;
    const zones = {} as DockGeometry['zones'];

    for (const zone of ['center', 'commit', 'start', 'tools'] as const) {
      zones[zone] = rect(shadow?.querySelector(`[part="${zone}"]`) ?? null);
    }

    return {
      bar: rect(shadow?.querySelector('[part="bar"]') ?? null),
      host: dock.getBoundingClientRect().toJSON(),
      pinned: dock.hasAttribute('data-pinned'),
      zones,
    };
  });
}

/** Scroll until the bar reports itself pinned, or fail loudly rather than read a stale state. */
async function scrollToPin(page: Page, id: string, y: number): Promise<void> {
  await page.evaluate((offset) => window.scrollTo(0, offset), y);
  await page.waitForFunction((tag) => document.querySelector(tag)?.hasAttribute('data-pinned'), `#${id}`, {
    timeout: 2000,
  });
}

test.describe('Layout', () => {
  test('collapses an unclaimed place to nothing', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent('<ore-dock id="dock"><button>Share</button></ore-dock>');

    const layout = await geometry(page, 'dock');

    expect(layout.zones.start.hidden).toBe(true);
    expect(layout.zones.center.hidden).toBe(true);
    expect(layout.zones.commit.hidden).toBe(true);
    expect(layout.zones.tools.hidden).toBe(false);
    expect(Math.round(layout.bar.width)).toBe(1280);
    // An unclaimed place leaves no gap: the row ends at the bar's own edge.
    expect(Math.round(layout.zones.tools.right)).toBe(Math.round(layout.bar.right));
  });

  test('shows every claimed place in order', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button>Share</button>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    for (const zone of ZONES) {
      expect(layout.zones[zone].hidden, zone).toBe(false);
      expect(layout.zones[zone].width, zone).toBeGreaterThan(0);
    }

    expect(layout.zones.start.left).toBeLessThan(layout.zones.center.left);
    expect(layout.zones.center.right).toBeLessThan(layout.zones.tools.left);
    expect(layout.zones.tools.right).toBeLessThan(layout.zones.commit.left);
  });

  test('centers a claimed middle from the desktop width up', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button>Share</button>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const { bar, zones } = await geometry(page, 'dock');
    const barMiddle = bar.left + bar.width / 2;

    expect(Math.abs(zones.center.left + zones.center.width / 2 - barMiddle)).toBeLessThanOrEqual(1);
  });

  /**
   * The equal-share rule gives both sides a third of the row, so the trailing wrapper is wider than
   * its content and the tools have to be pushed to its far edge. A bar whose flanks weigh something
   * (a fight console: a back action, a board pair, a verdict pair) reads as broken otherwise: the
   * clock drifts left of center and the bar's whole right end sits empty.
   */
  test('holds the tools at the row end when a claimed middle widens its side', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock compact id="dock">
        <button slot="start" style="width: 40px">Back</button>
        <span slot="center" style="padding: 8px 20px">02:31</span>
        <button style="padding: 0 24px">Boards</button>
        <button slot="commit" style="padding: 0 20px">Defeat</button>
        <button slot="commit" style="padding: 0 20px">Victory</button>
      </ore-dock>
    `);

    const { bar, zones } = await geometry(page, 'dock');
    const barMiddle = bar.left + bar.width / 2;

    expect(Math.abs(zones.center.left + zones.center.width / 2 - barMiddle)).toBeLessThanOrEqual(1);
    expect(Math.round(zones.commit.right)).toBe(Math.round(bar.right));
    expect(zones.tools.right).toBeLessThan(zones.commit.left);
  });

  test('keeps the middle on the left below the desktop width', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1024 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    expect(layout.zones.center.left).toBeLessThan(layout.bar.width / 3);
    expect(Math.round(layout.zones.commit.right)).toBe(Math.round(layout.bar.right));
  });

  test('stretches the flanks equally so the tools sit on the row middle', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="start">Back</button>
        <button>Share</button>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    const tools = layout.zones.tools;
    const barMiddle = layout.bar.left + layout.bar.width / 2;
    const leadingSlack = tools.left - layout.bar.left;
    const trailingSlack = layout.bar.right - tools.right;

    expect(Math.abs(tools.left + tools.width / 2 - barMiddle)).toBeLessThanOrEqual(1);
    expect(Math.abs(leadingSlack - trailingSlack)).toBeLessThanOrEqual(1);
    // The flanks really did stretch: a lone tool would sit at one edge otherwise.
    expect(leadingSlack).toBeGreaterThan(tools.width);
  });

  test('keeps the tools centered with only one flank', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="start">Back</button>
        <button>Share</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');
    const barMiddle = layout.bar.left + layout.bar.width / 2;

    expect(Math.abs(layout.zones.tools.left + layout.zones.tools.width / 2 - barMiddle)).toBeLessThanOrEqual(1);
  });

  test('centers a tool row with no flank at all', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button>Share</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');
    const barMiddle = layout.bar.left + layout.bar.width / 2;

    expect(layout.zones.start.hidden).toBe(true);
    expect(layout.zones.commit.hidden).toBe(true);
    expect(Math.abs(layout.zones.tools.left + layout.zones.tools.width / 2 - barMiddle)).toBeLessThanOrEqual(1);
  });

  test('lets a multi-action commit flank use the full row when there are no tools to center', async ({
    page,
    refinePage,
  }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="commit">Share</button>
        <button slot="commit">Continue</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    expect(layout.zones.tools.hidden).toBe(true);
    expect(layout.zones.start.hidden).toBe(true);
    expect(layout.zones.commit.left).toBeCloseTo(layout.bar.left, 0);
    expect(Math.round(layout.zones.commit.right)).toBe(Math.round(layout.bar.right));
  });

  test('lifts the middle above the bar on a phone', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    expect(layout.zones.center.hidden).toBe(false);
    // The middle leaves the row and hovers over the content above the bar.
    expect(layout.zones.center.bottom).toBeLessThan(layout.bar.top);

    const pointer = await page.locator('#dock').evaluate((dock) => {
      const center = dock.shadowRoot?.querySelector('[part="center"]');

      return center ? getComputedStyle(center).pointerEvents : 'missing';
    });

    // The zone passes pointers through; only the chip it holds takes them.
    expect(pointer).toBe('none');
  });

  test('fuses attached tools into one full-width capsule', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" attached>
        <ore-button>Import</ore-button>
        <ore-button color="primary">New</ore-button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    // The capsule filling the row is the phone layout's own rule, so this also proves the media
    // query selected it: above the phone width the tools hug their content instead.
    expect(Math.round(layout.zones.tools.width)).toBe(Math.round(layout.bar.width));

    const tools = await page.locator('#dock').evaluate((dock) =>
      [...dock.querySelectorAll('ore-button')].map((button) => {
        const inner = button.shadowRoot?.querySelector('[part="button"]');
        const style = inner ? getComputedStyle(inner) : null;

        return {
          radiusEnd: Number.parseFloat(style?.borderEndEndRadius ?? '0'),
          radiusStart: Number.parseFloat(style?.borderStartStartRadius ?? '0'),
          width: Math.round(button.getBoundingClientRect().width),
        };
      }),
    );

    expect(tools).toHaveLength(2);
    expect(Math.abs(tools[0].width - tools[1].width)).toBeLessThanOrEqual(1);
    expect(tools[0].width).toBeGreaterThan(100);
    // The capsule's ends are round, its seam is square. `--button-radius` is the only channel that
    // reaches a slotted button's inner box, so it is what carries this.
    expect(tools[0].radiusStart).toBeGreaterThan(0);
    expect(tools[0].radiusEnd).toBe(0);
    expect(tools[1].radiusStart).toBe(0);
    expect(tools[1].radiusEnd).toBeGreaterThan(0);
  });

  test('leaves the flanks out of the fused capsule', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" attached>
        <ore-button slot="start" icon-only label="Back">
          <ore-icon name="arrow-left"></ore-icon>
        </ore-button>
        <ore-button>Share</ore-button>
        <ore-button color="primary">Save</ore-button>
      </ore-dock>
    `);

    const tools = await page.locator('#dock').evaluate((dock) =>
      [...dock.querySelectorAll('ore-button')].map((button) => {
        const inner = button.shadowRoot?.querySelector('[part="button"]');
        const style = inner ? getComputedStyle(inner) : null;

        return {
          radiusStart: Number.parseFloat(style?.borderStartStartRadius ?? '0'),
          width: Math.round(button.getBoundingClientRect().width),
        };
      }),
    );

    // `::slotted()` reaches the children of every slot, so the capsule rules have to be scoped
    // through the tool row: an unscoped rule would square off this back button too.
    expect(tools[0].radiusStart).toBeGreaterThan(0);
    expect(tools[1].radiusStart).toBe(0);
    expect(tools[0].width).toBeLessThan(tools[1].width);
  });

  test('detaches the pinned bar from the viewport edges on a phone', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(scrolling('<ore-dock id="dock"><button>Share</button></ore-dock>'));

    await scrollToPin(page, 'dock', 400);

    const layout = await geometry(page, 'dock');

    expect(layout.pinned).toBe(true);
    expect(layout.bar.left).toBeGreaterThan(0);
    expect(layout.bar.right).toBeLessThan(375);
    expect(layout.bar.bottom).toBeLessThan(700);
    await expect(page.locator('#dock').locator('[part="bar"]')).toHaveCSS('border-radius', /\d/);
  });

  test('releases the bar into the flow when its container ends', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent('<ore-dock id="dock"><button>Share</button></ore-dock>');

    const layout = await geometry(page, 'dock');

    // Nothing to scroll past: the bar rests in the flow and stops announcing itself as chrome.
    expect(layout.pinned).toBe(false);
    await expect(page.locator('#dock').locator('[part="bar"]')).toHaveCSS('border-top-width', '0px');
  });

  test('pins the bar flush while its container still scrolls', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent(scrolling('<ore-dock id="dock"><button>Share</button></ore-dock>'));

    await scrollToPin(page, 'dock', 200);

    const layout = await geometry(page, 'dock');

    expect(layout.pinned).toBe(true);
    expect(Math.round(layout.bar.bottom)).toBe(700);
    expect(Math.round(layout.bar.width)).toBe(1280);
    await expect(page.locator('#dock').locator('[part="bar"]')).toHaveCSS('border-top-width', '1px');
  });

  test('keeps the bar surface off the host so fixed panels stay free', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock"><ore-button>Actions</ore-button></ore-dock>
      <div id="panel" style="position:fixed;inset-block-end:0;inset-inline:0;height:40px;background:red"></div>
    `);

    // The blur has to live on a pseudo-element: on the host it would become the containing block
    // for fixed descendants, trapping any panel a slotted control opens inside the bar.
    const surfaces = await page.evaluate(() => {
      const dock = document.getElementById('dock') as HTMLElement;
      const bar = dock.shadowRoot?.querySelector('[part="bar"]') as HTMLElement;
      const panel = document.getElementById('panel') as HTMLElement;

      return {
        barBlur: getComputedStyle(bar, '::before').backdropFilter,
        hostBackdrop: getComputedStyle(dock).backdropFilter,
        hostFilter: getComputedStyle(dock).filter,
        panelBottom: Math.round(panel.getBoundingClientRect().bottom),
        viewport: window.innerHeight,
      };
    });

    expect(surfaces.hostBackdrop).toBe('none');
    expect(surfaces.hostFilter).toBe('none');
    expect(surfaces.barBlur).toContain('blur');
    expect(surfaces.panelBottom).toBe(surfaces.viewport);
  });

  test('shrinks a compact bar to its content', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" compact>
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    // The host keeps the full width so the sticky area stays a strip; the bar inside it hugs its
    // content and sits on the viewport's middle.
    expect(Math.round(layout.host.width)).toBe(375);
    expect(layout.bar.width).toBeLessThan(200);
    expect(Math.abs(layout.bar.left - (375 - layout.bar.right))).toBeLessThanOrEqual(1);
  });

  test('keeps a compact bar full width above the phone width', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" compact>
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const layout = await geometry(page, 'dock');

    // Compact shapes the phone row only: above the phone width the middle sits inline in a strip,
    // and a hugging bar would shrink the wash and hairline away from the row they belong to.
    expect(Math.round(layout.bar.width)).toBe(1280);
  });
});

test.describe('Accessibility', () => {
  test('has no violations for a full bar', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock label="Hunt actions">
        <button slot="start">Back</button>
        <span slot="center">02:31</span>
        <button>Share</button>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('has no violations for a phone tool row', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock attached>
        <ore-button>Import</ore-button>
        <ore-button color="primary">New</ore-button>
      </ore-dock>
    `);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
