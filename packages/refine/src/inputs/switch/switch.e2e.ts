import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Touch layout', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 800, width: 320 } });

  test('keeps the track horizontal without shrinking in a constrained row', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div style="display:flex;align-items:center;width:254px">
        <span style="flex:1;min-width:0">Upcoming check-ins, trains, and activities</span>
        <ore-switch aria-label="Trip reminders"></ore-switch>
      </div>
    `);

    const geometry = await page.locator('ore-switch').evaluate((element) => {
      const track = element.shadowRoot?.querySelector('.switch-track');
      if (!track) throw new Error('Switch track is unavailable');

      return {
        host: element.getBoundingClientRect().toJSON(),
        track: track.getBoundingClientRect().toJSON(),
      };
    });

    expect(geometry.host.width).toBeGreaterThanOrEqual(56);
    expect(geometry.host.height).toBeGreaterThanOrEqual(44);
    expect(geometry.track.width).toBe(56);
    expect(geometry.track.height).toBe(28);
  });
});

test.describe('Accessibility', () => {
  // The slot is the labeling API (like ore-checkbox): a `label` attribute renders
  // nothing, so slot text is what gives the switch its accessible name.
  test('slot-labelled switch passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-switch>Enable notifications</ore-switch>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
