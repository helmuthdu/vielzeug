/**
 * Real-browser interaction test for `ore-accordion`/`ore-accordion-item`: expand-on-click via
 * the real shadow-DOM `<summary>` element, which jsdom can evaluate but this cross-checks in a
 * real browser alongside the rest of the disclosure family's e2e suite. Complements
 * `accordion.test.ts`/`accordion-item.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('keeps grouped spacing while using shorter solid and flat rows', async ({ page, refinePage }) => {
    await page.evaluate(() => {
      document.querySelector('style')?.remove();
      const frame = document.querySelector<HTMLElement>('.frame');

      if (!frame) throw new Error('Expected the component frame.');

      Object.entries({
        '--border': '1px',
        '--size-2': '8px',
        '--size-3': '12px',
        '--size-4': '16px',
        '--size-11': '44px',
        '--text-base': '16px',
      }).forEach(([name, value]) => {
        frame.style.setProperty(name, value);
      });
    });

    await refinePage.mountComponent(`
      <ore-accordion variant="solid">
        <ore-accordion-item><span slot="title">Solid</span>Content</ore-accordion-item>
      </ore-accordion>
      <ore-accordion variant="flat">
        <ore-accordion-item><span slot="title">Flat</span>Content</ore-accordion-item>
      </ore-accordion>
      <ore-accordion variant="bordered">
        <ore-accordion-item><span slot="title">Bordered</span>Content</ore-accordion-item>
      </ore-accordion>
    `);

    const measurements = await page.locator('ore-accordion').evaluateAll((accordions) =>
      accordions.map((accordion) => {
        const row = accordion.querySelector('ore-accordion-item');
        const summary = row?.shadowRoot?.querySelector('summary');

        if (!row || !summary) throw new Error('Expected an accordion row summary.');

        const containerStyle = getComputedStyle(accordion);
        const summaryStyle = getComputedStyle(summary);

        return {
          containerPadding: [containerStyle.paddingTop, containerStyle.paddingBottom],
          summaryHeight: summary.getBoundingClientRect().height,
          summaryPadding: [summaryStyle.paddingTop, summaryStyle.paddingBottom],
        };
      }),
    );

    expect(measurements[0]?.containerPadding).toEqual(['8px', '8px']);
    expect(measurements[1]?.containerPadding).toEqual(['8px', '8px']);
    expect(measurements[0]?.summaryPadding).toEqual(['8px', '8px']);
    expect(measurements[1]?.summaryPadding).toEqual(['8px', '8px']);
    expect(measurements[0]?.summaryHeight).toBeLessThan(measurements[2]?.summaryHeight ?? 0);
    expect(measurements[1]?.summaryHeight).toBeLessThan(measurements[2]?.summaryHeight ?? 0);
  });

  test('derives contained corner radii from the outer radius and inset', async ({ page, refinePage }) => {
    await page.evaluate(() => {
      document.querySelector('style')?.remove();
      const frame = document.querySelector<HTMLElement>('.frame');

      if (!frame) throw new Error('Expected the component frame.');

      Object.entries({
        '--border': '1px',
        '--rounded-lg': '8px',
        '--rounded-xl': '12px',
        '--size-2': '8px',
      }).forEach(([name, value]) => {
        frame.style.setProperty(name, value);
      });
    });

    await refinePage.mountComponent(`
      <ore-accordion variant="solid">
        <ore-accordion-item expanded><span slot="title">Solid</span>Content</ore-accordion-item>
      </ore-accordion>
      <ore-accordion variant="flat">
        <ore-accordion-item expanded><span slot="title">Flat</span>Content</ore-accordion-item>
      </ore-accordion>
      <ore-accordion variant="frost">
        <ore-accordion-item expanded><span slot="title">Frost</span>Content</ore-accordion-item>
      </ore-accordion>
    `);

    const measurements = await page.locator('ore-accordion').evaluateAll((accordions) =>
      accordions.map((accordion) => {
        const item = accordion.querySelector('ore-accordion-item');
        const summary = item?.shadowRoot?.querySelector('summary');
        const content = item?.shadowRoot?.querySelector('.content-wrapper');

        if (!item || !summary || !content) throw new Error('Expected an expanded accordion item.');

        const outerStyle = getComputedStyle(accordion);

        return {
          contentRadius: getComputedStyle(content).borderRadius,
          groupInset: outerStyle.paddingTop,
          groupRadius: outerStyle.borderRadius,
          itemRadius: getComputedStyle(item).borderRadius,
          summaryRadius: getComputedStyle(summary).borderRadius,
        };
      }),
    );

    for (const measurement of measurements) {
      expect(measurement.groupRadius).toBe('12px');
      expect(measurement.groupInset).toBe('8px');
      expect(measurement.itemRadius).toBe('4px');
      expect(measurement.summaryRadius).toBe('4px 4px 0px 0px');
      expect(measurement.contentRadius).toBe('0px 0px 4px 4px');
    }
  });

  test('rounds every frost item in a contained group', async ({ page, refinePage }) => {
    await page.evaluate(() => {
      document.querySelector('style')?.remove();
      const frame = document.querySelector<HTMLElement>('.frame');

      if (!frame) throw new Error('Expected the component frame.');

      Object.entries({
        '--rounded-lg': '8px',
        '--rounded-xl': '12px',
        '--size-2': '8px',
      }).forEach(([name, value]) => {
        frame.style.setProperty(name, value);
      });
    });

    await refinePage.mountComponent(`
      <ore-accordion variant="frost">
        <ore-accordion-item><span slot="title">First</span>Content</ore-accordion-item>
        <ore-accordion-item expanded><span slot="title">Middle</span>Content</ore-accordion-item>
        <ore-accordion-item><span slot="title">Last</span>Content</ore-accordion-item>
      </ore-accordion>
    `);

    const measurements = await page.locator('ore-accordion-item').evaluateAll((items) =>
      items.map((item) => {
        const summary = item.shadowRoot?.querySelector('summary');
        const content = item.shadowRoot?.querySelector('.content-wrapper');

        if (!summary || !content) throw new Error('Expected the accordion item internals.');

        return {
          contentRadius: getComputedStyle(content).borderRadius,
          itemRadius: getComputedStyle(item).borderRadius,
          summaryRadius: getComputedStyle(summary).borderRadius,
        };
      }),
    );

    expect(measurements.map(({ itemRadius }) => itemRadius)).toEqual(['4px', '4px', '4px']);
    expect(measurements[0]?.summaryRadius).toBe('4px');
    expect(measurements[1]?.summaryRadius).toBe('4px 4px 0px 0px');
    expect(measurements[1]?.contentRadius).toBe('0px 0px 4px 4px');
    expect(measurements[2]?.summaryRadius).toBe('4px');
  });
});

test.describe('Interaction', () => {
  test('expands panel on click', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-accordion>' +
        '<ore-accordion-item id="item1">' +
        '<span slot="header">Section 1</span>' +
        '<p>Content for section 1</p>' +
        '</ore-accordion-item>' +
        '</ore-accordion>',
    );

    // Click the summary trigger inside the shadow DOM
    await page.locator('#item1').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;

      (shadow.querySelector('summary') as HTMLElement)?.click();
    });

    // ore-accordion-item uses the `expanded` attribute (and <details open> internally)
    const isExpanded = await page.locator('#item1').evaluate((el) => {
      return el.hasAttribute('expanded') || el.getAttribute('aria-expanded') === 'true';
    });

    expect(isExpanded).toBe(true);
  });
});

test.describe('Keyboard focus', () => {
  test('keeps the summary focus halo visible', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<button id="before">Before</button>' +
        '<ore-accordion-item id="item1">' +
        '<span slot="header">Game library</span>' +
        '</ore-accordion-item>',
    );

    await page.locator('#before').focus();
    await page.keyboard.press('Tab');

    const focusStyles = await page.locator('#item1').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
      const details = shadow.querySelector('details') as HTMLElement;
      const summary = shadow.querySelector('summary') as HTMLElement;

      return {
        detailsOverflow: getComputedStyle(details).overflow,
        focusVisible: summary.matches(':focus-visible'),
        outline: getComputedStyle(summary).outline,
      };
    });

    expect(focusStyles.focusVisible).toBe(true);
    expect(focusStyles.detailsOverflow).toBe('visible');
    expect(focusStyles.outline).toContain('solid');
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-accordion><ore-accordion-item expanded><span slot="title">Baggage</span>One carry-on bag is included.</ore-accordion-item></ore-accordion>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
