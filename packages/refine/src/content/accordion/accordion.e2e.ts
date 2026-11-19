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

  test('keeps contained corners concentric with the measured border and padding inset', async ({
    page,
    refinePage,
  }) => {
    // Isolate component geometry from the optional document reset without removing its color tokens.
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
          const rule = sheet.cssRules[index];

          if (rule instanceof CSSLayerBlockRule && rule.name === 'refine.reset') sheet.deleteRule(index);
        }
      }
    });

    for (const { border, inset, radius } of [
      { border: 1, inset: 8, radius: 12 },
      { border: 3, inset: 4, radius: 20 },
      { border: 2, inset: 8, radius: 4 },
    ]) {
      await refinePage.mountComponent(
        ['solid', 'flat', 'frost']
          .map(
            (variant) => `
            <ore-accordion variant="${variant}"
              style="--border: ${border}px; --size-2: ${inset}px; --rounded-xl: ${radius}px">
              <ore-accordion-item expanded><span slot="title">${variant}</span>Content</ore-accordion-item>
            </ore-accordion>`,
          )
          .join(''),
      );

      const measurements = await page.locator('ore-accordion').evaluateAll((accordions) =>
        accordions.map((accordion) => {
          const item = accordion.querySelector('ore-accordion-item');
          const summary = item?.shadowRoot?.querySelector('summary');
          const content = item?.shadowRoot?.querySelector('.content-wrapper');

          if (!item || !summary || !content) throw new Error('Expected an expanded accordion item.');

          const outer = accordion.getBoundingClientRect();
          const inner = item.getBoundingClientRect();

          return {
            bottomInset: outer.bottom - inner.bottom,
            contentRadius: Number.parseFloat(getComputedStyle(content).borderBottomLeftRadius),
            innerRadius: Number.parseFloat(getComputedStyle(item).borderTopLeftRadius),
            leftInset: inner.left - outer.left,
            outerRadius: Number.parseFloat(getComputedStyle(accordion).borderTopLeftRadius),
            summaryRadius: Number.parseFloat(getComputedStyle(summary).borderTopLeftRadius),
            topInset: inner.top - outer.top,
          };
        }),
      );

      for (const measurement of measurements) {
        const expected = Math.max(0, measurement.outerRadius - measurement.topInset);

        expect(measurement.topInset).toBeCloseTo(measurement.leftInset);
        expect(measurement.bottomInset).toBeCloseTo(measurement.topInset);
        expect(measurement.innerRadius).toBeCloseTo(expected);
        expect(measurement.summaryRadius).toBeCloseTo(expected);
        expect(measurement.contentRadius).toBeCloseTo(expected);
      }
    }
  });

  for (const variant of ['solid', 'flat', 'frost']) {
    test(`keeps adjoining ${variant} item corners square when collapsed and expanded`, async ({ page, refinePage }) => {
      await page.evaluate(() => {
        document.querySelector('style')?.remove();
        const frame = document.querySelector<HTMLElement>('.frame');

        if (!frame) throw new Error('Expected the component frame.');

        Object.entries({
          '--accordion-border-color': 'transparent',
          '--border': '1px',
          '--rounded-lg': '8px',
          '--rounded-xl': '12px',
          '--size-2': '8px',
        }).forEach(([name, value]) => {
          frame.style.setProperty(name, value);
        });
      });

      for (const expanded of [false, true]) {
        await refinePage.mountComponent(
          `
      <ore-accordion variant="${variant}">
        <ore-accordion-item><span slot="title">First</span>Content</ore-accordion-item>
        <ore-accordion-item><span slot="title">Middle</span>Content</ore-accordion-item>
        <ore-accordion-item><span slot="title">Last</span>Content</ore-accordion-item>
      </ore-accordion>
    `.replaceAll('<ore-accordion-item>', `<ore-accordion-item${expanded ? ' expanded' : ''}>`),
        );

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

        const radius = variant === 'frost' ? '4px' : '3px';

        expect(measurements.map(({ itemRadius }) => itemRadius)).toEqual([
          `${radius} ${radius} 0px 0px`,
          '0px',
          `0px 0px ${radius} ${radius}`,
        ]);
        expect(measurements.map(({ summaryRadius }) => summaryRadius)).toEqual([
          `${radius} ${radius} 0px 0px`,
          '0px',
          expanded ? '0px' : `0px 0px ${radius} ${radius}`,
        ]);
        expect(measurements.map(({ contentRadius }) => contentRadius)).toEqual([
          '0px',
          '0px',
          expanded ? `0px 0px ${radius} ${radius}` : '0px',
        ]);
      }
    });
  }
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
