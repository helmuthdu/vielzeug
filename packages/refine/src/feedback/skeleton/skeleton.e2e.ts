import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('fills an externally sized card media slot', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-card id="card" padding="none" style="display:block;height:240px">' +
        '<ore-skeleton id="media" slot="media" style="display:block;width:100%;height:100%"></ore-skeleton>' +
        '</ore-card>',
    );

    const dimensions = await page.locator('#media').evaluate((element) => {
      const host = element.getBoundingClientRect();
      const stack = element.shadowRoot?.querySelector('.stack')?.getBoundingClientRect();
      const bone = element.shadowRoot?.querySelector('.bone')?.getBoundingClientRect();
      return { bone: bone?.height, host: host.height, stack: stack?.height };
    });

    expect(dimensions.host).toBeGreaterThan(200);
    expect(dimensions.stack).toBeCloseTo(dimensions.host, 0);
    expect(dimensions.bone).toBeCloseTo(dimensions.host, 0);
  });

  test('fills an aspect-ratio box', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-skeleton id="media" style="display:block;width:320px;height:auto;aspect-ratio:16/9"></ore-skeleton>',
    );

    const dimensions = await page.locator('#media').evaluate((element) => {
      const host = element.getBoundingClientRect();
      const bone = element.shadowRoot?.querySelector('.bone')?.getBoundingClientRect();
      return { bone: bone?.height, host: host.height };
    });

    expect(dimensions.host).toBeCloseTo(180, 0);
    expect(dimensions.bone).toBeCloseTo(dimensions.host, 0);
  });

  test('fills an explicitly sized circle', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-skeleton id="avatar" variant="circle" width="64px" height="64px"></ore-skeleton>',
    );

    const dimensions = await page.locator('#avatar').evaluate((element) => {
      const host = element.getBoundingClientRect();
      const bone = element.shadowRoot?.querySelector('.bone')?.getBoundingClientRect();
      return { boneHeight: bone?.height, boneWidth: bone?.width, hostHeight: host.height, hostWidth: host.width };
    });

    expect(dimensions.hostHeight).toBe(64);
    expect(dimensions.hostWidth).toBe(64);
    expect(dimensions.boneHeight).toBeCloseTo(dimensions.hostHeight, 0);
    expect(dimensions.boneWidth).toBeCloseTo(dimensions.hostWidth, 0);
  });

  test('keeps text skeleton lines in intrinsic flow', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-skeleton id="text" variant="text" lines="3" width="320px"></ore-skeleton>');

    const skeleton = page.locator('#text');
    await expect(skeleton.locator('.stack')).toHaveCSS('position', 'static');
    await expect(skeleton.locator('.bone')).toHaveCount(3);
    await expect(skeleton).not.toHaveCSS('height', '0px');
  });
});
