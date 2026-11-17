/**
 * Real-browser tests for `ore-pull-to-refresh`: the layout math jsdom can't
 * evaluate. The indicator overlays the band the content's transform reveals;
 * as a flex item it used to also push the content down by its own height,
 * doubling the drag distance and opening a blank gap. Complements
 * `pull-to-refresh.test.ts` (gesture/phase logic).
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test, touchSwipe } from '../../testing/fixtures';

const FEED =
  '<ore-pull-to-refresh threshold="64" style="height: 20rem; width: 20rem"><p style="margin: 0; padding: 1rem">Row one</p><p style="margin: 0; padding: 1rem">Row two</p></ore-pull-to-refresh>';

/** Drag the feed down by `dy` px with the mouse, in `steps` moves. */
async function pullDown(page: import('@playwright/test').Page, dy: number, steps = 5): Promise<void> {
  const box = await page.locator('ore-pull-to-refresh').boundingBox();

  if (!box) throw new Error('pull-to-refresh must be visible before dragging');

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps });
}

const geometry = (page: import('@playwright/test').Page) =>
  page.locator('ore-pull-to-refresh').evaluate((picker) => {
    const indicator = picker.shadowRoot?.querySelector<HTMLElement>('.indicator');
    const content = picker.shadowRoot?.querySelector<HTMLElement>('.content');

    if (!indicator || !content) throw new Error('pull-to-refresh internals missing');

    return {
      contentTop: content.getBoundingClientRect().top,
      indicatorHeight: indicator.getBoundingClientRect().height,
      phase: picker.getAttribute('data-phase'),
    };
  });

test.describe('Pull to refresh', () => {
  test('refreshes with trusted touch while retaining ordinary upward scrolling', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-pull-to-refresh style="height:320px"><div style="height:1200px">Feed</div></ore-pull-to-refresh>',
    );
    const feed = page.locator('ore-pull-to-refresh');
    const box = await feed.boundingBox();
    if (!box) throw new Error('Feed is not visible');
    const from = { x: box.x + 100, y: box.y + 100 };
    await touchSwipe(page, { from, to: { x: from.x, y: from.y + 120 } });
    await expect(feed).toHaveAttribute('data-phase', 'refreshing');
    await feed.evaluate((el) => (el as HTMLElement & { refreshed(): void }).refreshed());
    await expect(feed).toHaveAttribute('data-phase', 'idle');
    await touchSwipe(page, { from: { x: from.x, y: from.y + 120 }, to: from });
    await expect
      .poll(() => feed.evaluate((el) => el.shadowRoot!.querySelector('.scroll')!.scrollTop))
      .toBeGreaterThan(0);
    await expect(feed).toHaveAttribute('data-phase', 'idle');
  });

  test('leaves nested scrollers and editing controls in charge', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-pull-to-refresh style="height:320px"><div id="nested" style="height:220px;overflow-y:auto"><div style="height:1000px">Nested feed</div></div><input value="Edit"></ore-pull-to-refresh>',
    );
    await page.locator('#nested').evaluate((el) => {
      el.scrollTop = 180;
    });
    const box = await page.locator('#nested').boundingBox();
    if (!box) throw new Error('Nested feed is not visible');
    await touchSwipe(page, { from: { x: box.x + 80, y: box.y + 50 }, to: { x: box.x + 80, y: box.y + 150 } });
    await expect(page.locator('ore-pull-to-refresh')).not.toHaveAttribute('data-phase', 'refreshing');
    await expect.poll(() => page.locator('#nested').evaluate((el) => el.scrollTop)).toBeLessThan(180);
  });

  test('the content follows the finger 1:1, without the indicator pushing it twice', async ({ page, refinePage }) => {
    await refinePage.mountComponent(FEED);

    const rest = await geometry(page);

    await pullDown(page, 40);

    const pulled = await geometry(page);

    // The bug this guards: the in-flow indicator's height pushed the content
    // down AND the transform moved it again, so a 40px drag displaced 80px.
    expect(pulled.phase).toBe('pulling');
    expect(pulled.indicatorHeight).toBeCloseTo(40, 0);
    expect(pulled.contentTop - rest.contentTop).toBeCloseTo(40, 0);

    await page.mouse.up();

    // The release springs back: poll until the flight settles at rest.
    await expect
      .poll(() => geometry(page).then((g) => g.contentTop), { timeout: 5000 })
      .toBeCloseTo(rest.contentTop, 0);

    expect((await geometry(page)).phase).toBe('idle');
  });

  test('holds the spinner over the revealed band while refreshing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(FEED);

    const rest = await geometry(page);

    await pullDown(page, 100);
    await page.mouse.up();

    // The release springs up to the hold position: poll until it lands.
    await expect.poll(() => geometry(page).then((g) => g.indicatorHeight), { timeout: 5000 }).toBeCloseTo(64, 0);

    const refreshing = await geometry(page);

    expect(refreshing.phase).toBe('refreshing');
    expect(refreshing.contentTop - rest.contentTop).toBeCloseTo(64, 0);

    await page.locator('ore-pull-to-refresh').evaluate((picker) => {
      (picker as HTMLElement & { refreshed(): void }).refreshed();
    });

    await expect.poll(() => geometry(page).then((g) => g.phase), { timeout: 5000 }).toBe('idle');

    const retracted = await geometry(page);

    expect(retracted.indicatorHeight).toBeCloseTo(0, 0);
    expect(retracted.contentTop).toBeCloseTo(rest.contentTop, 0);
  });

  test('the held indicator does not swallow pointer input from the content', async ({ page, refinePage }) => {
    await refinePage.mountComponent(FEED);

    await pullDown(page, 100);
    await page.mouse.up();

    expect((await geometry(page)).phase).toBe('refreshing');

    // The indicator overlays the revealed band while held open. It is purely
    // decorative, so a click landing in that band must not be swallowed by it.
    await page.evaluate(() => {
      const picker = document.querySelector('ore-pull-to-refresh')!;
      const scroll = picker.shadowRoot?.querySelector('.scroll')!;

      (window as unknown as { __hits: string[] }).__hits = [];
      scroll.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        (window as unknown as { __hits: string[] }).__hits.push(target.className || target.nodeName);
      });
    });

    const band = await page.evaluate(() => {
      const indicator = document.querySelector('ore-pull-to-refresh')!.shadowRoot!.querySelector('.indicator')!;
      const box = indicator.getBoundingClientRect();

      return { height: box.height, width: box.width, x: box.x, y: box.y };
    });

    await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2);

    expect(await page.evaluate(() => (window as unknown as { __hits: string[] }).__hits)).toEqual(['scroll']);
  });

  test('meets axe expectations', async ({ page, refinePage }) => {
    await refinePage.mountComponent(FEED);

    await axeCheck(page, 'ore-pull-to-refresh');
  });
});
