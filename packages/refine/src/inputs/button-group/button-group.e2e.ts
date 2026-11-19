/**
 * Real-browser tests for `ore-button-group`'s segmented control: focus movement
 * and roving-tabindex behavior jsdom can't evaluate (no real focus traversal),
 * plus axe on the `radiogroup`/`radio` shape. Complements `button-group.test.ts`.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

const SEGMENTED =
  '<ore-button-group value="list" label="View mode"><ore-button value="list">List</ore-button><ore-button value="grid">Grid</ore-button></ore-button-group>';

test.describe('Shape', () => {
  for (const orientation of ['horizontal', 'vertical']) {
    test(`${orientation} attached groups round only their exterior and own their default`, async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(
        `<ore-card rounded="none"><ore-button-group attached orientation="${orientation}" label="Actions">` +
          '<ore-button>First</ore-button>' +
          '<ore-tooltip content="Middle action"><ore-button>Middle</ore-button></ore-tooltip>' +
          '<ore-button>Last</ore-button>' +
          '</ore-button-group></ore-card>',
      );

      const buttons = page.locator('ore-button [part="button"]');
      const horizontal = orientation === 'horizontal';

      for (const radius of ['8px', '12px']) {
        await expect(buttons.nth(0)).toHaveCSS(
          'border-radius',
          horizontal ? `${radius} 0px 0px ${radius}` : `${radius} ${radius} 0px 0px`,
        );
        await expect(buttons.nth(1)).toHaveCSS('border-radius', '0px');
        await expect(buttons.nth(2)).toHaveCSS(
          'border-radius',
          horizontal ? `0px ${radius} ${radius} 0px` : `0px 0px ${radius} ${radius}`,
        );
        await page.locator('ore-button-group').evaluate((group) => group.setAttribute('rounded', 'xl'));
      }
    });
  }

  test('respects the scoped control radius and the group override', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="--radius: var(--rounded-xl)">' +
        '<ore-button-group id="scoped" attached><ore-button>First</ore-button><ore-button>Last</ore-button></ore-button-group>' +
        '<ore-button-group id="custom" attached style="--group-radius: 4px"><ore-button>First</ore-button><ore-button>Last</ore-button></ore-button-group>' +
        '</div>',
    );

    await expect(page.locator('#scoped ore-button [part="button"]').first()).toHaveCSS(
      'border-radius',
      '12px 0px 0px 12px',
    );
    await expect(page.locator('#custom ore-button [part="button"]').first()).toHaveCSS(
      'border-radius',
      '4px 0px 0px 4px',
    );
  });
});

test.describe('Segmented control', () => {
  test('exposes the radiogroup/radio shape', async ({ page, refinePage }) => {
    await refinePage.mountComponent(SEGMENTED);

    const shape = await page.locator('ore-button-group').evaluate((group) => {
      const role = group.shadowRoot?.querySelector('[part="group"]')?.getAttribute('role');
      const buttons = Array.from(group.querySelectorAll<HTMLElement>('ore-button'));

      return {
        checked: buttons.map((b) => b.getAttribute('aria-checked')),
        groupRole: role,
        roles: buttons.map((b) => b.getAttribute('role')),
        tabindex: buttons.map((b) => b.getAttribute('tabindex')),
      };
    });

    expect(shape).toEqual({
      checked: ['true', 'false'],
      groupRole: 'radiogroup',
      roles: ['radio', 'radio'],
      tabindex: ['0', '-1'],
    });
  });

  test('selects on click and moves the tab stop', async ({ page, refinePage }) => {
    await refinePage.mountComponent(SEGMENTED);

    await page.locator('ore-button-group > ore-button[value="grid"]').click();

    const state = await page.locator('ore-button-group').evaluate((group) => {
      const buttons = Array.from(group.querySelectorAll<HTMLElement>('ore-button'));

      return {
        checked: buttons.map((b) => b.getAttribute('aria-checked')),
        tabindex: buttons.map((b) => b.getAttribute('tabindex')),
        value: group.getAttribute('value'),
      };
    });

    expect(state).toEqual({ checked: ['false', 'true'], tabindex: ['-1', '0'], value: 'grid' });
  });

  test('moves and selects with the arrow keys', async ({ page, refinePage }) => {
    await refinePage.mountComponent(SEGMENTED);

    await page.locator('ore-button-group > ore-button[value="list"]').focus();
    await page.keyboard.press('ArrowRight');

    const value = await page.locator('ore-button-group').evaluate((group) => group.getAttribute('value'));

    expect(value).toBe('grid');
  });

  test('a single Tab reaches the group and arrows move within it', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<div><button id="before">Before</button>${SEGMENTED}</div>`);

    await page.locator('#before').focus();
    await page.keyboard.press('Tab');

    // Tab lands on the checked segment (the only one in the tab order).
    const focusedValue = await page.evaluate(() => document.activeElement?.getAttribute('value'));

    expect(focusedValue).toBe('list');

    await page.keyboard.press('ArrowRight');

    const afterArrow = await page.evaluate(() => ({
      focused: document.activeElement?.getAttribute('value'),
      group: document.querySelector('ore-button-group')?.getAttribute('value'),
    }));

    expect(afterArrow).toEqual({ focused: 'grid', group: 'grid' });
  });

  test('a tooltip-wrapped segment joins the selection', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-button-group value="list" label="View mode"><ore-tooltip content="List view" placement="top"><ore-button value="list">List</ore-button></ore-tooltip><ore-tooltip content="Grid view" placement="top"><ore-button value="grid">Grid</ore-button></ore-tooltip></ore-button-group>',
    );

    await page.locator('ore-tooltip ore-button[value="grid"]').click();

    const state = await page.locator('ore-button-group').evaluate((group) => {
      const buttons = Array.from(group.querySelectorAll<HTMLElement>('ore-button'));

      return {
        checked: buttons.map((b) => b.getAttribute('aria-checked')),
        roles: buttons.map((b) => b.getAttribute('role')),
        value: group.getAttribute('value'),
      };
    });

    expect(state).toEqual({ checked: ['false', 'true'], roles: ['radio', 'radio'], value: 'grid' });
  });

  test('keeps tooltip-wrapped attached segments contiguous with rounded outer edges', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-button-group attached value="full" label="Viewport">' +
        '<ore-tooltip content="Full width"><ore-button value="full">Full</ore-button></ore-tooltip>' +
        '<ore-tooltip content="Mobile"><ore-button value="mobile">Mobile</ore-button></ore-tooltip>' +
        '<ore-tooltip content="Tablet"><ore-button value="tablet">Tablet</ore-button></ore-tooltip>' +
        '<ore-tooltip content="Desktop"><ore-button value="desktop">Desktop</ore-button></ore-tooltip>' +
        '</ore-button-group>',
    );

    const shape = await page.locator('ore-button-group').evaluate((group) => {
      const buttons = Array.from(group.querySelectorAll<HTMLElement>('ore-button'));
      const edges = buttons.map((button) => {
        const surface = button.shadowRoot?.querySelector<HTMLElement>('[part="button"]');

        if (!surface) throw new Error('Button surface was not rendered.');

        const style = getComputedStyle(surface);
        const rect = button.getBoundingClientRect();

        return {
          left: rect.left,
          leftRounded: style.borderTopLeftRadius !== '0px',
          right: rect.right,
          rightRounded: style.borderTopRightRadius !== '0px',
          startBorder: style.borderInlineStartWidth,
        };
      });

      return {
        edges: edges.map(({ leftRounded, rightRounded, startBorder }) => ({ leftRounded, rightRounded, startBorder })),
        gaps: edges.slice(1).map((edge, index) => edge.left - (edges[index]?.right ?? 0)),
      };
    });

    expect(shape.edges).toEqual([
      { leftRounded: true, rightRounded: false, startBorder: '1px' },
      { leftRounded: false, rightRounded: false, startBorder: '0px' },
      { leftRounded: false, rightRounded: false, startBorder: '0px' },
      { leftRounded: false, rightRounded: true, startBorder: '0px' },
    ]);
    expect(shape.gaps).toEqual([0, 0, 0]);
  });

  test('segmented control passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(SEGMENTED);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
