import { axeCheck, expect, test } from '../../testing/fixtures';

const MANY_CATEGORIES = Array.from({ length: 6 }, (_, index) => ({
  description: `Category ${index} description text`,
  id: `cat-${index}`,
  label: `Category ${index}`,
}));

test.describe('Layout', () => {
  test('actions stack full-width on narrow viewports', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 720, width: 390 });
    await refinePage.mountComponent('<ore-cookie-banner>Policy text.</ore-cookie-banner>');
    await page.evaluate((categories) => {
      (document.querySelector('ore-cookie-banner') as { categories: unknown }).categories = categories;
    }, MANY_CATEGORIES);

    const layout = await page.locator('ore-cookie-banner').evaluate((element) => {
      const actions = element.shadowRoot?.querySelector('.actions');
      const buttons = element.shadowRoot?.querySelectorAll('.actions ore-button');

      if (!actions || !buttons) throw new Error('Missing actions');

      const widths = [...buttons].map((button) => Math.round(button.getBoundingClientRect().width));
      const actionWidth = Math.round(actions.getBoundingClientRect().width);
      const tops = [...buttons].map((button) => Math.round(button.getBoundingClientRect().top));

      return { actionWidth, stacked: new Set(tops).size === tops.length, widths };
    });

    expect(layout.stacked).toBe(true);
    for (const width of layout.widths) {
      expect(width).toBeGreaterThan(layout.actionWidth - 20);
    }
  });

  test('actions sit in a right-aligned row on wide viewports', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 1280 });
    await refinePage.mountComponent('<ore-cookie-banner>Policy text.</ore-cookie-banner>');

    const layout = await page.locator('ore-cookie-banner').evaluate((element) => {
      const actions = element.shadowRoot?.querySelector('.actions');
      const buttons = element.shadowRoot?.querySelectorAll('.actions ore-button');

      if (!actions || !buttons) throw new Error('Missing actions');

      const tops = [...buttons].map((button) => Math.round(button.getBoundingClientRect().top));
      const computed = getComputedStyle(actions);

      return { justifyContent: computed.justifyContent, oneRow: new Set(tops).size === 1 };
    });

    expect(layout.oneRow).toBe(true);
    expect(layout.justifyContent).toBe('flex-end');
  });

  test('category panel scrolls internally instead of growing the banner past the viewport', async ({
    page,
    refinePage,
  }) => {
    await page.setViewportSize({ height: 720, width: 1280 });
    await refinePage.mountComponent('<ore-cookie-banner>Policy text.</ore-cookie-banner>');
    await page.evaluate((categories) => {
      (document.querySelector('ore-cookie-banner') as { categories: unknown }).categories = categories;
    }, MANY_CATEGORIES);

    const geometry = await page.locator('ore-cookie-banner').evaluate((element) => {
      const banner = element.shadowRoot?.querySelector('.banner');
      const categories = element.shadowRoot?.querySelector('.categories');

      if (!banner || !categories) throw new Error('Missing banner or categories');

      const rect = banner.getBoundingClientRect();

      return {
        bannerFitsViewport: rect.bottom <= window.innerHeight && rect.top >= 0,
        panelScrolls: categories.scrollHeight > categories.clientHeight,
      };
    });

    expect(geometry.bannerFitsViewport).toBe(true);
    expect(geometry.panelScrolls).toBe(true);
  });

  // A consumer docking the banner above a bottom nav sets a large
  // --cookie-banner-inset; the card must shrink to stay inside the viewport
  // instead of overflowing its top edge.
  test('a large dock inset shrinks the card instead of overflowing the top', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 600, width: 390 });
    await refinePage.mountComponent(
      '<ore-cookie-banner style="--cookie-banner-inset: 68px">Policy text.</ore-cookie-banner>',
    );
    await page.evaluate((categories) => {
      (document.querySelector('ore-cookie-banner') as { categories: unknown }).categories = categories;
    }, MANY_CATEGORIES);
    // The rise animation starts translated toward the docked edge; let it
    // settle before measuring resting geometry.
    await page.waitForTimeout(500);

    const geometry = await page.locator('ore-cookie-banner').evaluate((element) => {
      const banner = element.shadowRoot?.querySelector('.banner');

      if (!banner) throw new Error('Missing banner');

      const rect = banner.getBoundingClientRect();

      return {
        bottomClearsInset: Math.round(rect.bottom) <= window.innerHeight - 68,
        topInsideViewport: rect.top >= 0,
      };
    });

    expect(geometry.bottomClearsInset).toBe(true);
    expect(geometry.topInsideViewport).toBe(true);
  });
});

test.describe('Accessibility', () => {
  // axe's color-contrast rule mis-parses oklch() tokens: for --color-neutral
  // (oklch 52%) it reports #808080 where Chrome actually renders #696969 —
  // verified below via canvas rasterization. The rule's violations on this
  // component are false positives, so it is excluded here and covered by the
  // rendered-color test that follows, which is the stronger oracle.
  test('passes axe checks except the oklch-blind color-contrast rule', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-cookie-banner>Policy text with a <a href="#">link</a>.</ore-cookie-banner>');
    await page.evaluate((categories) => {
      (document.querySelector('ore-cookie-banner') as { categories: unknown }).categories = categories;
    }, MANY_CATEGORIES);

    const results = await axeCheck(page);

    expect(results.violations.filter((violation) => violation.id !== 'color-contrast')).toHaveLength(0);
  });

  // Real rendered contrast, measured through Chrome's own rasterization (canvas)
  // — immune to the oklch parsing bug above. Buttons sit on the banner card
  // (ghost), their own themed backdrop (bordered), or their theme base (primary).
  test('button and description text meet 4.5:1 in actual rendered colors', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-cookie-banner>Policy text.</ore-cookie-banner>');
    await page.evaluate((categories) => {
      (document.querySelector('ore-cookie-banner') as { categories: unknown }).categories = categories;
    }, MANY_CATEGORIES);

    const ratios = await page.locator('ore-cookie-banner').evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      const luminance = ([r, g, b]: [number, number, number]): number => {
        const lin = (v: number): number => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      };
      const contrast = (fg: [number, number, number], bg: [number, number, number]): number => {
        const a = luminance(fg);
        const b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const toRGB = (color: string): [number, number, number] => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return [data[0]!, data[1]!, data[2]!];
      };
      // Themed surfaces carry alpha (e.g. the neutral backdrop at 83%); rasterize
      // them over the banner card the way the compositor actually paints them.
      const overCard = (color: string): [number, number, number] => {
        ctx.fillStyle = cardBg;
        ctx.fillRect(0, 0, 1, 1);
        return toRGB(color);
      };

      const card = element.shadowRoot?.querySelector<HTMLElement>('.banner');
      if (!card) throw new Error('missing banner card');
      const cardBg = getComputedStyle(card).backgroundColor;

      const measure = (selector: string): number => {
        const button = element.shadowRoot?.querySelector<HTMLElement>(selector);
        if (!button) throw new Error(`missing ${selector}`);
        const content = button.shadowRoot?.querySelector<HTMLElement>('.content');
        const surface = button.shadowRoot?.querySelector<HTMLElement>('[part="button"]');
        if (!content || !surface) throw new Error(`missing parts in ${selector}`);
        return contrast(toRGB(getComputedStyle(content).color), overCard(getComputedStyle(surface).backgroundColor));
      };

      // Descriptions render as checkbox helper text (aria-describedby-wired)
      // over the sunken category panel, not the card.
      const panel = element.shadowRoot?.querySelector<HTMLElement>('.categories');
      if (!panel) throw new Error('missing categories panel');
      const panelBg = getComputedStyle(panel).backgroundColor;

      const description = element.shadowRoot
        ?.querySelector<HTMLElement>('.category-row ore-checkbox')
        ?.shadowRoot?.querySelector<HTMLElement>('.helper-text');
      if (!description) throw new Error('missing description');

      return {
        bordered: measure('ore-button[variant="bordered"]'),
        description: contrast(toRGB(getComputedStyle(description).color), toRGB(panelBg)),
        ghost: measure('ore-button[variant="ghost"]'),
        primary: measure('ore-button[color="primary"]'),
      };
    });

    for (const [surface, value] of Object.entries(ratios)) {
      expect(value, `${surface} contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
