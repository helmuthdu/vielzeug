import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('exposes an event history with metadata and description', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="Order history">
        <ore-timeline-item color="success">Shipped<time slot="meta" datetime="2026-06-10">June 10</time><span slot="description">Handed to carrier</span></ore-timeline-item>
        <ore-timeline-item>Ordered</ore-timeline-item>
      </ore-timeline>
    `);

    await expect(page.getByRole('list', { name: 'Order history' }).getByRole('listitem')).toHaveCount(2);
    await expect(page.locator('ore-timeline-item').first().locator('[part="meta"]')).toBeVisible();
    await expect(page.locator('ore-timeline-item').first().locator('[part="description"]')).toBeVisible();
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('shows and hides metadata when its slot content changes', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="History"><ore-timeline-item>First</ore-timeline-item></ore-timeline>
    `);
    const item = page.locator('ore-timeline-item');
    const metadata = item.locator('[part="meta"]');
    await expect(metadata).toBeHidden();
    await item.evaluate((element) => {
      const time = document.createElement('time');
      time.slot = 'meta';
      time.textContent = 'June 10';
      element.append(time);
    });
    await expect(item.locator('time')).toHaveText('June 10');
    await expect(metadata).toBeVisible();
    await item.locator('time').evaluate((element) => element.remove());
    await expect(metadata).toBeHidden();
  });
});

test.describe('Layout', () => {
  test('keeps content next to the marker and connects all but the last item', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="History">
        <ore-timeline-item>First event</ore-timeline-item>
        <ore-timeline-item>Second event</ore-timeline-item>
      </ore-timeline>
    `);

    const items = page.locator('ore-timeline-item');
    const marker = await items.first().locator('[part="marker"]').boundingBox();
    const content = await items.first().locator('[part="content"]').boundingBox();

    expect(marker).not.toBeNull();
    expect(content).not.toBeNull();
    expect(content!.x).toBeGreaterThan(marker!.x);
    await expect(items.first().locator('.line')).toBeVisible();
    await expect(items.last().locator('.line')).toBeHidden();

    await items.last().evaluate((item) => item.remove());
    await expect(items.first().locator('.line')).toBeHidden();
  });

  test('updates connectors when events are hidden or shown', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="History">
        <ore-timeline-item>First</ore-timeline-item>
        <ore-timeline-item>Middle</ore-timeline-item>
        <ore-timeline-item>Last</ore-timeline-item>
      </ore-timeline>
    `);

    const timeline = page.locator('ore-timeline');
    const items = page.locator('ore-timeline-item');
    const first = items.nth(0);
    const middle = items.nth(1);
    const last = items.nth(2);
    await last.evaluate((item) => item.setAttribute('hidden', ''));
    await expect(last).toBeHidden();
    await expect(middle.locator('.line')).toBeHidden();
    await expect(first.locator('.line')).toBeVisible();
    await middle.evaluate((item) => item.setAttribute('hidden', ''));
    await expect(middle).toBeHidden();
    await expect(first.locator('.line')).toBeHidden();
    await last.evaluate((item) => item.removeAttribute('hidden'));
    await expect(last).toBeVisible();
    await expect(first.locator('.line')).toBeVisible();
    await first.evaluate((item) => item.setAttribute('hidden', ''));
    await expect(first).toBeHidden();
    await expect(last.locator('.line')).toBeHidden();
    await last.evaluate((item) => item.setAttribute('hidden', ''));
    await expect(items).toHaveCount(3);
    await expect(last).toBeHidden();
    await first.evaluate((item) => item.removeAttribute('hidden'));
    await expect(first).toBeVisible();
    await expect(first.locator('.line')).toBeHidden();
    await timeline.evaluate((element) => element.setAttribute('hidden', ''));
    await expect(timeline).toBeHidden();
  });

  test('updates both timelines when an event moves between them', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="First history">
        <ore-timeline-item>First</ore-timeline-item>
        <ore-timeline-item>Moving</ore-timeline-item>
      </ore-timeline>
      <ore-timeline aria-label="Second history"><ore-timeline-item>Other</ore-timeline-item></ore-timeline>
    `);
    const first = page.getByRole('list', { name: 'First history' });
    const second = page.getByRole('list', { name: 'Second history' });
    const moving = first.locator('ore-timeline-item').last();

    await moving.evaluate((item) => document.querySelectorAll('ore-timeline')[1].append(item));
    await expect(first.locator('.line')).toBeHidden();
    await expect(second.locator('ore-timeline-item').first().locator('.line')).toBeVisible();
    await expect(second.locator('ore-timeline-item').last().locator('.line')).toBeHidden();

    await second
      .locator('ore-timeline-item')
      .last()
      .evaluate((item) => item.parentElement?.prepend(item));
    await expect(second.locator('ore-timeline-item').first().locator('.line')).toBeVisible();
    await expect(second.locator('ore-timeline-item').last().locator('.line')).toBeHidden();

    await first
      .locator('ore-timeline-item')
      .evaluate((item) => document.querySelectorAll('ore-timeline')[1].prepend(item));
    await expect(second.locator('ore-timeline-item').first().locator('.line')).toBeVisible();
    await expect(second.locator('ore-timeline-item').last().locator('.line')).toBeHidden();
  });

  test('preserves the browser until-found state on an event', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="History">
        <ore-timeline-item>First</ore-timeline-item>
        <ore-timeline-item hidden="until-found">Unique archived event</ore-timeline-item>
      </ore-timeline>
    `);
    const items = page.locator('ore-timeline-item');
    await expect(items.first().locator('.line')).toBeHidden();
    await expect(items.last()).toHaveCSS('content-visibility', 'hidden');
    await expect(items.last()).not.toHaveCSS('display', 'none');
    await items.last().evaluate((element) => element.removeAttribute('hidden'));
    await expect(items.last()).not.toHaveAttribute('hidden');
    await expect(items.first().locator('.line')).toBeVisible();
  });

  test('preserves case-insensitive until-found values on timelines and events', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <div hidden="UNTIL-FOUND">Archived native content</div>
      <ore-timeline aria-label="History">
        <ore-timeline-item hidden="UNTIL-FOUND">Archived</ore-timeline-item>
      </ore-timeline>
    `);
    const timeline = page.locator('ore-timeline');
    const item = page.locator('ore-timeline-item');
    const native = page.locator('.frame > div');

    await expect(native).not.toHaveCSS('display', 'none');
    await expect(item).toHaveCSS('content-visibility', 'hidden');
    await expect(item).not.toHaveCSS('display', 'none');
    await timeline.evaluate((element) => element.setAttribute('hidden', 'UNTIL-FOUND'));
    await expect(timeline).toHaveCSS('content-visibility', 'hidden');
    await expect(timeline).not.toHaveCSS('display', 'none');
  });

  test('bridges the configured gap between consecutive event markers', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-timeline aria-label="History" style="--timeline-gap: 24px">
        <ore-timeline-item>First</ore-timeline-item>
        <ore-timeline-item>Second</ore-timeline-item>
      </ore-timeline>
    `);
    const items = page.locator('ore-timeline-item');
    const line = await items.first().locator('.line').boundingBox();
    const nextMarker = await items.last().locator('[part="marker"]').boundingBox();
    expect(line).not.toBeNull();
    expect(nextMarker).not.toBeNull();
    expect(Math.abs(line!.y + line!.height - nextMarker!.y)).toBeLessThan(1);
  });

  for (const direction of ['ltr', 'rtl']) {
    test(`aligns wide custom markers and content in ${direction}`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`
        <ore-timeline aria-label="History" dir="${direction}">
          <ore-timeline-item>
            <span slot="marker" style="display:block;width:80px;height:24px">Marker</span>
            First
          </ore-timeline-item>
          <ore-timeline-item>Second</ore-timeline-item>
        </ore-timeline>
      `);
      const items = page.locator('ore-timeline-item');
      const marker = await items.first().locator('[slot="marker"]').boundingBox();
      const content = await items.first().locator('[part="content"]').boundingBox();
      const firstLine = await items.first().locator('.line').boundingBox();
      const nextMarker = await items.last().locator('[part="marker"]').boundingBox();
      expect(marker).not.toBeNull();
      expect(content).not.toBeNull();
      expect(firstLine).not.toBeNull();
      expect(nextMarker).not.toBeNull();
      if (direction === 'rtl') {
        expect(content!.x + content!.width).toBeLessThanOrEqual(marker!.x);
      } else {
        expect(content!.x).toBeGreaterThanOrEqual(marker!.x + marker!.width);
      }
      expect(Math.abs(firstLine!.x + firstLine!.width / 2 - (nextMarker!.x + nextMarker!.width / 2))).toBeLessThan(1);
    });
  }

  test('keeps markers and connectors visible in forced colors', async ({ page, refinePage }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    test.skip(
      !(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)),
      'Forced colors not supported',
    );
    await refinePage.mountComponent(`
      <ore-timeline aria-label="History">
        <ore-timeline-item>First</ore-timeline-item>
        <ore-timeline-item>Second</ore-timeline-item>
      </ore-timeline>
    `);
    const item = page.locator('ore-timeline-item').first();
    const foreground = await page.evaluate(() => {
      const sample = document.createElement('span');

      sample.style.color = 'CanvasText';
      document.body.append(sample);
      const color = getComputedStyle(sample).color;

      sample.remove();

      return color;
    });
    for (const selector of ['.dot', '.line']) {
      expect(await item.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
        foreground,
      );
    }
  });
});
