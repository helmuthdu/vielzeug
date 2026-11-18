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
  test('aligns solid and flat row height with their container', async ({ page, refinePage }) => {
    await page.evaluate(() => {
      document.querySelector('style')?.remove();
      const frame = document.querySelector<HTMLElement>('.frame');

      if (!frame) throw new Error('Expected the component frame.');

      frame.style.setProperty('--size-2', '8px');
    });

    await refinePage.mountComponent(`
      <ore-accordion variant="solid">
        <ore-accordion-item><span slot="title">Solid</span>Content</ore-accordion-item>
      </ore-accordion>
      <ore-accordion variant="flat">
        <ore-accordion-item><span slot="title">Flat</span>Content</ore-accordion-item>
      </ore-accordion>
    `);

    const heightDifferences = await page.locator('ore-accordion').evaluateAll((accordions) =>
      accordions.map((accordion) => {
        const row = accordion.querySelector('ore-accordion-item');

        if (!row) throw new Error('Expected an accordion row.');

        const container = accordion.getBoundingClientRect();
        const rowHeight = row.getBoundingClientRect().height;
        const style = getComputedStyle(accordion);
        const borderHeight = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);

        return container.height - borderHeight - rowHeight;
      }),
    );

    expect(heightDifferences).toEqual([0, 0]);
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
