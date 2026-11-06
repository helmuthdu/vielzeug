/**
 * Real-browser tests for `ore-tour`: the popover panel is focused on open, and
 * a focused popover with no outline override paints Chrome's default blue UA
 * ring around the card, clashing with every theme. jsdom never computes
 * outlines, so this guard lives in the browser suite. Complements
 * `tour.test.ts` (prop/step logic).
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

const TOUR =
  '<button id="save">Save</button><ore-tour open spotlight presentation="popover" anchor="#save" title="Save your work" description="Hit save whenever you like." step-index="1" total-steps="4"></ore-tour>';

test.describe('Tour', () => {
  test('the focused popover panel shows no UA focus ring', async ({ page, refinePage }) => {
    await refinePage.mountComponent(TOUR);

    // The panel takes focus one task after opening; wait for it to be active.
    await expect
      .poll(
        () =>
          page.locator('ore-tour').evaluate((tour) => {
            const float = tour.shadowRoot?.querySelector<HTMLElement>('.float');

            return tour.shadowRoot?.activeElement === float;
          }),
        { timeout: 5000 },
      )
      .toBe(true);

    const outline = await page
      .locator('ore-tour')
      .evaluate((tour) => getComputedStyle(tour.shadowRoot!.querySelector('.float')!).outlineStyle);

    // The card's own border is the visual edge; the panel must not add the UA ring.
    expect(outline).toBe('none');
  });

  test('meets axe expectations', async ({ page, refinePage }) => {
    await refinePage.mountComponent(TOUR);

    await axeCheck(page, 'ore-tour');
  });
});
