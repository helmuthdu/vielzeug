/**
 * Real-browser tests for `ore-color-picker`: focus behavior jsdom can't
 * evaluate (real focus traversal through the swatch ring), plus axe on the
 * `radiogroup`/`radio` shape. Complements `color-picker.test.ts`.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
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

  test('meets axe expectations', async ({ page, refinePage }) => {
    await refinePage.mountComponent(PALETTE);

    await axeCheck(page, 'ore-color-picker');
  });
});
