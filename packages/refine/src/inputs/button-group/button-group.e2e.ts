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

  test('segmented control passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(SEGMENTED);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
