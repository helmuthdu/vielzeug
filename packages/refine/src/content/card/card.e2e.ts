import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('interactive hover lifts without changing card dimensions', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="padding:16px"><ore-card id="card" interactive style="width:240px;height:160px">Card</ore-card></div>',
    );
    const readRect = () =>
      page
        .locator('#card')
        .evaluate((host) =>
          host.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!.getBoundingClientRect().toJSON(),
        );

    const before = await readRect();
    await page.locator('#card').hover();
    await page.waitForTimeout(250);
    const after = await readRect();

    expect(after.width).toBeCloseTo(before.width, 1);
    expect(after.height).toBeCloseTo(before.height, 1);
    expect(after.top).toBeLessThan(before.top);
  });
});
