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

  test('horizontal cards sit side-by-side when wide and stack when narrow', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="width:320px"><ore-card id="narrow" orientation="horizontal">' +
        '<div slot="media" style="height:80px;background:#ccc"></div>Body</ore-card></div>' +
        '<div style="width:640px"><ore-card id="wide" orientation="horizontal">' +
        '<div slot="media" style="height:80px;background:#ccc"></div>Body</ore-card></div>',
    );

    // The split is intrinsic (flex-wrap), so the observable contract is geometry: does
    // the body start below the media (stacked) or beside it (row)?
    const layout = (id: string) =>
      page.locator(`#${id}`).evaluate((host) => {
        const root = host.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!;
        const media = root.querySelector<HTMLElement>('[part="media"]')!.getBoundingClientRect();
        const body = root.querySelector<HTMLElement>('[part="body"]')!.getBoundingClientRect();
        return { mediaWidth: media.width, stacked: body.top >= media.bottom - 1 };
      });

    // Both cards see the same desktop viewport and still disagree: the split tracks the
    // card's own width.
    await expect(layout('narrow')).resolves.toMatchObject({ stacked: true });
    const wide = await layout('wide');
    expect(wide.stacked).toBe(false);
    expect(wide.mediaWidth).toBeGreaterThanOrEqual(150);
    expect(wide.mediaWidth).toBeLessThan(320);
  });

  test('horizontal cards keep their content width inside a flex layout', async ({ page, refinePage }) => {
    // The docs previews center their content in a flex body: a horizontal card there is
    // a content-sized flex item, and must not collapse to zero width.
    await refinePage.mountComponent(
      '<div style="display:flex;justify-content:center;align-items:center">' +
        '<ore-card id="flexed" orientation="horizontal">' +
        '<div slot="media" style="height:80px;width:100%;background:#ccc"></div>Body text</ore-card></div>',
    );

    const box = await page
      .locator('#flexed')
      .evaluate((host) =>
        host.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!.getBoundingClientRect().toJSON(),
      );

    expect(box.width).toBeGreaterThan(150);
    const mediaWidth = await page
      .locator('#flexed')
      .evaluate((host) => host.shadowRoot!.querySelector<HTMLElement>('[part="media"]')!.getBoundingClientRect().width);
    expect(mediaWidth).toBeGreaterThan(100);
  });

  test('resting cards show no hover affordance; interactive cards do', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="padding:16px"><ore-card id="resting" color="primary" style="width:240px">Resting</ore-card>' +
        '<ore-card id="action" color="primary" interactive style="width:240px">Action</ore-card></div>',
    );

    const readShadow = (id: string) =>
      page
        .locator(`#${id}`)
        .evaluate((host) => getComputedStyle(host.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!).boxShadow);

    const restingBefore = await readShadow('resting');
    await page.locator('#resting').hover();
    await page.waitForTimeout(250);
    // A resting card that reacts to hover lies about being clickable: no lift, no tint shift.
    expect(await readShadow('resting')).toBe(restingBefore);

    const actionBefore = await readShadow('action');
    await page.locator('#action').hover();
    await page.waitForTimeout(250);
    expect(await readShadow('action')).not.toBe(actionBefore);
  });
});
