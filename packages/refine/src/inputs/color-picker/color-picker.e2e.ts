/**
 * Real-browser tests for `ore-color-picker`: focus behavior jsdom can't
 * evaluate (real focus traversal through the swatch ring), plus axe on the
 * `radiogroup`/`radio` shape. Complements `color-picker.test.ts`.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

const PALETTE =
  '<ore-color-picker label="Paint" value="midnight" options=\'[{"value":"midnight","color":"#19202b","label":"Midnight Black"},{"value":"pearl","color":"#f2efe9","label":"Pearl White"},{"value":"crimson","color":"#7a1f2b","label":"Crimson"}]\'></ore-color-picker>';

const swatchState = (
  page: import('@playwright/test').Page,
): Promise<{ checked: (string | null)[]; tabindex: (string | null)[] }> =>
  page.locator('ore-color-picker').evaluate((picker) => {
    const swatches = Array.from(picker.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-swatch]') ?? []);

    return {
      checked: swatches.map((s) => s.getAttribute('aria-checked')),
      tabindex: swatches.map((s) => s.getAttribute('tabindex')),
    };
  });

test.describe('Color picker', () => {
  test('exposes the radiogroup/radio shape with a roving tab stop', async ({ page, refinePage }) => {
    await refinePage.mountComponent(PALETTE);

    const shape = await page.locator('ore-color-picker').evaluate((picker) => {
      const role = picker.shadowRoot?.querySelector('[role="radiogroup"]')?.getAttribute('role');
      const swatches = Array.from(picker.shadowRoot?.querySelectorAll<HTMLButtonElement>('[data-swatch]') ?? []);

      return {
        groupRole: role,
        roles: swatches.map((s) => s.getAttribute('role')),
      };
    });

    expect(shape).toEqual({ groupRole: 'radiogroup', roles: ['radio', 'radio', 'radio'] });
    expect(await swatchState(page)).toEqual({
      checked: ['true', 'false', 'false'],
      tabindex: ['0', '-1', '-1'],
    });
  });

  test('arrow keys move focus and select', async ({ page, refinePage }) => {
    await refinePage.mountComponent(PALETTE);

    await page.locator('ore-color-picker').evaluate((picker) => {
      picker.shadowRoot?.querySelector<HTMLButtonElement>('[data-swatch="midnight"]')?.focus();
    });
    await page.keyboard.press('ArrowRight');

    expect(await page.locator('ore-color-picker').evaluate((p) => p.getAttribute('value'))).toBe('pearl');

    const focused = await page.locator('ore-color-picker').evaluate((picker) => {
      const active = picker.shadowRoot?.activeElement as HTMLElement | null;

      return active?.getAttribute('data-swatch') ?? null;
    });

    expect(focused).toBe('pearl');
  });

  test('a single Tab reaches the picker on the selected swatch', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<div><button id="before">Before</button>${PALETTE}</div>`);

    await page.locator('#before').focus();
    await page.keyboard.press('Tab');

    const focused = await page.locator('ore-color-picker').evaluate((picker) => {
      const active = picker.shadowRoot?.activeElement as HTMLElement | null;

      return active?.getAttribute('data-swatch') ?? null;
    });

    expect(focused).toBe('midnight');
  });

  test('keeps the selection ring clear of the legend', async ({ page, refinePage }) => {
    // Chrome lays the legend out outside the fieldset's grid, so the row gap cannot
    // separate it from the swatches; the legend's margin must clear the scaled
    // checked/focus ring instead (color-picker.css legend margin).
    await refinePage.mountComponent(
      '<ore-color-picker label="Paint" size="lg" value="midnight" options=\'[{"value":"midnight","color":"#19202b","label":"Midnight Black"},{"value":"pearl","color":"#f2efe9","label":"Pearl White"}]\'></ore-color-picker>',
    );
    const checked = page.locator('ore-color-picker [role="radio"][aria-checked="true"]');
    await checked.focus();

    const ringClearance = () =>
      checked.evaluate((el) => {
        const root = el.getRootNode() as ShadowRoot;
        const legend = root.querySelector('legend')!.getBoundingClientRect();
        const swatch = el.getBoundingClientRect();
        const styles = getComputedStyle(el);
        const ringExtend = (parseFloat(styles.outlineOffset) + parseFloat(styles.outlineWidth)) * 1.08;

        return swatch.top - ringExtend - legend.bottom;
      });

    await expect.poll(ringClearance).toBeGreaterThan(0);
  });

  test('meets axe expectations', async ({ page, refinePage }) => {
    await refinePage.mountComponent(PALETTE);

    await axeCheck(page, 'ore-color-picker');
  });
});
