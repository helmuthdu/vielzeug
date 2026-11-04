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
      <ore-dock mobile-layout="compact" id="dock">
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

  test('lets full mode use the whole row for a multi-action commit flank', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" mobile-layout="full">
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

  test('rounds both ends of a lone attached tool', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" attached>
        <ore-button color="primary">New game</ore-button>
      </ore-dock>
    `);

    const tool = await page.locator('#dock').evaluate((dock) => {
      const button = dock.querySelector('ore-button');
      const style = button?.shadowRoot?.querySelector('[part="button"]')
        ? getComputedStyle(button.shadowRoot.querySelector('[part="button"]'))
        : null;

      return {
        radiusEnd: Number.parseFloat(style?.borderEndEndRadius ?? '0'),
        radiusStart: Number.parseFloat(style?.borderStartStartRadius ?? '0'),
      };
    });

    // A lone tool is the capsule's only member, so it is both ends at once. Without the
    // `:only-child` rule it matches `:first-child` and `:last-child` and the later rule wins,
    // leaving the leading edge square.
    expect(tool.radiusStart).toBeGreaterThan(0);
    expect(tool.radiusEnd).toBeGreaterThan(0);
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
      <ore-dock id="dock" mobile-layout="compact">
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
      <ore-dock id="dock" mobile-layout="compact">
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

test.describe('Adaptive mobile layout', () => {
  test('wraps crowded action zones rather than overlapping or shrinking controls', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 320 });
    await fullBleed(page);
    await refinePage.mountComponent(
      scrolling(`
        <ore-dock id="dock" style="width:calc(100% - 32px);margin-inline:16px;--dock-offset:12px">
          <ore-button slot="start" icon-only label="Back"><ore-icon name="arrow-left"></ore-icon></ore-button>
          <ore-button variant="ghost">More actions<ore-icon slot="suffix" name="chevron-down"></ore-icon></ore-button>
          <ore-button-group slot="commit" variant="bordered">
            <ore-button icon-only label="Undo"><ore-icon name="undo-2"></ore-icon></ore-button>
            <ore-button icon-only label="Redo"><ore-icon name="redo-2"></ore-icon></ore-button>
          </ore-button-group>
        </ore-dock>
      `),
    );
    await scrollToPin(page, 'dock', 400);

    const { bar, zones } = await geometry(page, 'dock');
    const boxes = await page
      .locator('#dock ore-button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON()));

    expect(zones.commit.top).toBeGreaterThan(zones.tools.top);
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(bar.left);
      expect(box.right).toBeLessThanOrEqual(bar.right);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  for (const width of [320, 360, 390]) {
    for (const direction of ['ltr', 'rtl']) {
      test(`keeps grouped history controls inside a narrow ${width}px ${direction} dock`, async ({
        page,
        refinePage,
      }) => {
        await page.setViewportSize({ height: 700, width });
        await fullBleed(page);
        await refinePage.mountComponent(
          scrolling(`
            <ore-dock id="dock" dir="${direction}" style="width:calc(100% - 32px);margin-inline:16px;--dock-offset:12px">
              <ore-button slot="start" icon-only label="Back"><ore-icon name="arrow-left"></ore-icon></ore-button>
              <ore-button variant="ghost" size="sm">Actions</ore-button>
              <ore-button-group slot="commit" variant="bordered">
                <ore-button icon-only label="Undo"><ore-icon name="undo-2"></ore-icon></ore-button>
                <ore-button icon-only label="Redo"><ore-icon name="redo-2"></ore-icon></ore-button>
              </ore-button-group>
            </ore-dock>
          `),
        );
        await scrollToPin(page, 'dock', 400);

        for (const pinned of [true, false]) {
          if (!pinned) await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await expect.poll(async () => (await geometry(page, 'dock')).pinned).toBe(pinned);

          const { bar, zones } = await geometry(page, 'dock');
          const boxes = await page
            .locator('#dock ore-button')
            .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON()));

          for (const box of boxes) {
            expect(box.left).toBeGreaterThanOrEqual(bar.left);
            expect(box.right).toBeLessThanOrEqual(bar.right);
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }

          expect(zones.tools.top).toBe(zones.commit.top);
          expect(zones.tools.top).toBe(zones.start.top);
          const ordered = boxes.toSorted((a, b) => a.left - b.left);

          for (let i = 1; i < ordered.length; i++) {
            expect(ordered[i].left).toBeGreaterThanOrEqual(ordered[i - 1].right);
          }
        }
      });
    }
  }

  for (const direction of ['ltr', 'rtl'] as const) {
    for (const slot of ['start', 'commit'] as const) {
      test(`hugs a lone ${slot} at its logical edge in ${direction}`, async ({ page, refinePage }) => {
        await page.setViewportSize({ height: 700, width: 375 });
        await fullBleed(page);
        await refinePage.mountComponent(`
          <ore-dock id="dock" dir="${direction}">
            <ore-button slot="${slot}">Action</ore-button>
          </ore-dock>
        `);

        const { bar, host, zones } = await geometry(page, 'dock');
        const onLeft = (slot === 'start') === (direction === 'ltr');

        expect(Math.round(host.width)).toBe(375);
        expect(bar.width).toBeLessThan(200);
        expect(bar.width).toBeGreaterThan(zones[slot].width);
        expect(onLeft ? bar.left : 375 - bar.right).toBeCloseTo(8, 0);
      });
    }
  }

  test('puts a lone center inside a centered content-width bar', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent('<ore-dock id="dock"><span slot="center">02:31</span></ore-dock>');

    const { bar, zones } = await geometry(page, 'dock');

    expect(bar.width).toBeLessThan(200);
    expect(zones.center.top).toBeGreaterThanOrEqual(bar.top);
    expect(zones.center.bottom).toBeLessThanOrEqual(bar.bottom);
    expect(Math.abs(bar.left + bar.width / 2 - 187.5)).toBeLessThanOrEqual(1);
  });

  test('hugs and centers default tools without requiring button elements', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent('<ore-dock id="dock"><a href="#share">Share</a></ore-dock>');

    const { bar, zones } = await geometry(page, 'dock');

    expect(bar.width).toBeLessThan(200);
    expect(zones.tools.width).toBeGreaterThan(0);
    expect(Math.abs(bar.left + bar.width / 2 - 187.5)).toBeLessThanOrEqual(1);
  });

  test('keeps a center hovering above a single action zone', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock">
        <span slot="center">02:31</span>
        <button slot="commit">Done</button>
      </ore-dock>
    `);

    const { bar, zones } = await geometry(page, 'dock');

    expect(bar.width).toBeLessThan(200);
    expect(bar.right).toBeCloseTo(367, 0);
    expect(zones.center.bottom).toBeLessThan(bar.top);
  });

  test('keeps opposing action zones spread across the row', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock"><button slot="start">Back</button><button slot="commit">Done</button></ore-dock>
    `);

    const { bar, zones } = await geometry(page, 'dock');

    expect(bar.width).toBe(375);
    expect(zones.start.left).toBe(bar.left);
    expect(zones.commit.right).toBe(bar.right);
  });

  test('adapts when slots are added, reassigned, and removed', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 375 });
    await fullBleed(page);
    await refinePage.mountComponent('<ore-dock id="dock"><button slot="commit">Done</button></ore-dock>');

    await page.locator('#dock').evaluate((dock) => {
      const start = document.createElement('button');

      start.slot = 'start';
      start.textContent = 'Back';
      dock.append(start);
    });
    await expect.poll(async () => (await geometry(page, 'dock')).bar.width).toBe(375);
    await page.locator('#dock [slot="commit"]').evaluate((button) => {
      button.slot = 'start';
    });
    await expect.poll(async () => (await geometry(page, 'dock')).bar.left).toBeCloseTo(8, 0);
    expect((await geometry(page, 'dock')).bar.width).toBeLessThan(200);

    await page.locator('#dock').evaluate((dock) => dock.replaceChildren());
    await expect(page.locator('#dock').locator('[part="bar"]')).toBeHidden();
    expect((await geometry(page, 'dock')).bar.width).toBe(0);
  });

  for (const mobileLayout of ['auto', 'full', 'compact']) {
    test(`renders no surface for an empty ${mobileLayout} dock`, async ({ page, refinePage }) => {
      await page.setViewportSize({ height: 700, width: 375 });
      await fullBleed(page);
      await refinePage.mountComponent(`<ore-dock id="dock" mobile-layout="${mobileLayout}"></ore-dock>`);

      await expect(page.locator('#dock').locator('[part="bar"]')).toBeHidden();
      expect((await geometry(page, 'dock')).bar.width).toBe(0);
    });
  }

  test('bounds a long action group and wraps it without shrinking controls', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 700, width: 320 });
    await fullBleed(page);
    await refinePage.mountComponent(`
      <ore-dock id="dock" style="--dock-offset: var(--size-4)">
        <ore-button>First long action</ore-button>
        <ore-button>Second long action</ore-button>
        <ore-button>Third long action</ore-button>
      </ore-dock>
    `);

    const { bar } = await geometry(page, 'dock');
    const boxes = await page
      .locator('#dock ore-button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON()));

    expect(bar.left).toBeGreaterThanOrEqual(16);
    expect(bar.right).toBeLessThanOrEqual(304);
    expect(boxes[1].top).toBeGreaterThan(boxes[0].top);

    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(bar.left);
      expect(box.right).toBeLessThanOrEqual(bar.right);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });

  for (const side of ['top', 'bottom']) {
    for (const attached of [false, true]) {
      test(`centers ${attached ? 'attached tools' : 'a commit'} inside a pinned ${side} pill above the safe area`, async ({
        page,
        refinePage,
      }) => {
        await page.setViewportSize({ height: 700, width: 375 });
        await fullBleed(page);
        const session = await page.context().newCDPSession(page);

        await session.send('Emulation.setSafeAreaInsetsOverride', {
          insets: { bottom: 34, left: 0, right: 0, top: 44 },
        });
        const dock = `<ore-dock id="dock" side="${side}" ${attached ? 'attached' : ''}>
          <ore-button ${attached ? '' : 'slot="commit"'}>Done</ore-button>
        </ore-dock>`;

        await refinePage.mountComponent(
          side === 'bottom' ? scrolling(dock) : `<div>${dock}<div style="height:2000px"></div></div>`,
        );
        await scrollToPin(page, 'dock', 400);
        const { bar } = await geometry(page, 'dock');
        const button = await page.locator('#dock ore-button').boundingBox();

        expect(button).not.toBeNull();
        expect(button!.y - bar.top).toBeCloseTo(bar.bottom - button!.y - button!.height, 0);
        if (side === 'top') expect(bar.top).toBeCloseTo(44, 0);
        else expect(bar.bottom).toBeCloseTo(666, 0);
        await expect(page.locator('#dock').locator('[part="bar"]')).toHaveCSS('padding-top', '8px');
        await expect(page.locator('#dock').locator('[part="bar"]')).toHaveCSS('padding-bottom', '8px');

        await page.evaluate((edge) => window.scrollTo(0, edge === 'top' ? 0 : document.body.scrollHeight), side);
        await expect(page.locator('#dock')).not.toHaveAttribute('data-pinned');
        await expect(page.locator('#dock').locator('[part="bar"]')).toHaveCSS(
          side === 'top' ? 'padding-top' : 'padding-bottom',
          side === 'top' ? '44px' : '34px',
        );
        await session.detach();
      });
    }

    test(`keeps a trailing adaptive bar aligned while pinning and releasing at the ${side}`, async ({
      page,
      refinePage,
    }) => {
      await page.setViewportSize({ height: 700, width: 375 });
      await fullBleed(page);
      const dock = `<ore-dock id="dock" side="${side}"><ore-button slot="commit">Done</ore-button></ore-dock>`;

      await refinePage.mountComponent(
        side === 'bottom' ? scrolling(dock) : `<div>${dock}<div style="height:2000px"></div></div>`,
      );
      await scrollToPin(page, 'dock', 400);

      const pinned = await geometry(page, 'dock');

      expect(pinned.bar.width).toBeLessThan(200);
      expect(pinned.bar.right).toBeCloseTo(367, 0);
      if (side === 'top') expect(pinned.bar.top).toBeCloseTo(8, 0);
      else expect(pinned.bar.bottom).toBeCloseTo(692, 0);

      await page.evaluate((edge) => window.scrollTo(0, edge === 'top' ? 0 : document.body.scrollHeight), side);
      await expect(page.locator('#dock')).not.toHaveAttribute('data-pinned');
      const released = await geometry(page, 'dock');

      expect(released.bar.width).toBeLessThan(200);
      expect(released.bar.right).toBeCloseTo(pinned.bar.right, 0);
    });
  }

  for (const mobileLayout of ['auto', 'compact']) {
    test(`keeps a centered ${mobileLayout} bar clear of asymmetric safe areas`, async ({ page, refinePage }) => {
      await page.setViewportSize({ height: 700, width: 375 });
      await fullBleed(page);
      const session = await page.context().newCDPSession(page);

      await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 0, left: 44, right: 0, top: 0 } });
      await refinePage.mountComponent(`
        <ore-dock id="dock" mobile-layout="${mobileLayout}">
          <ore-button>First long action</ore-button>
          <ore-button>Second long action</ore-button>
          <ore-button>Third long action</ore-button>
        </ore-dock>
      `);

      const { bar } = await geometry(page, 'dock');

      expect(bar.left).toBeGreaterThanOrEqual(44);
      expect(bar.right).toBeLessThanOrEqual(331);
      expect(Math.abs(bar.left + bar.width / 2 - 187.5)).toBeLessThanOrEqual(1);
      await session.detach();
    });
  }

  test('switches mobile layouts at the phone breakpoint without changing desktop sizing', async ({
    page,
    refinePage,
  }) => {
    await page.setViewportSize({ height: 700, width: 639 });
    await fullBleed(page);
    await refinePage.mountComponent('<ore-dock id="dock"><button slot="commit">Done</button></ore-dock>');

    expect((await geometry(page, 'dock')).bar.width).toBeLessThan(200);
    await page.locator('#dock').evaluate((dock) => dock.setAttribute('mobile-layout', 'full'));
    await expect.poll(async () => (await geometry(page, 'dock')).bar.width).toBe(639);
    await page.locator('#dock').evaluate((dock) => dock.setAttribute('mobile-layout', 'compact'));
    await expect.poll(async () => (await geometry(page, 'dock')).bar.width).toBeLessThan(200);
    const compact = await geometry(page, 'dock');

    expect(Math.abs(compact.bar.left + compact.bar.width / 2 - 319.5)).toBeLessThanOrEqual(1);
    for (const mobileLayout of ['auto', 'full', 'compact']) {
      await page.locator('#dock').evaluate((dock, mode) => dock.setAttribute('mobile-layout', mode), mobileLayout);
      await page.setViewportSize({ height: 700, width: 640 });
      expect((await geometry(page, 'dock')).bar.width).toBe(640);
    }
  });
});

test.describe('Accessibility', () => {
  for (const slot of ['start', 'center', 'commit']) {
    test(`has no violations for a content-width ${slot} bar`, async ({ page, refinePage }) => {
      await page.setViewportSize({ height: 700, width: 375 });
      await fullBleed(page);
      await refinePage.mountComponent(`
        <ore-dock label="Document actions"><ore-button slot="${slot}">Action</ore-button></ore-dock>
      `);

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    });
  }

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
