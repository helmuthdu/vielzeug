/**
 * Real-browser tests for `ore-rank-list`/`ore-rank-item`: full axe scans (color-contrast
 * re-enabled, unlike jsdom) and CSS-box bar geometry the jsdom suite cannot evaluate.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('rank list with bars, slots, and a bar-less row passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-rank-list aria-label="Most visited pages">' +
        '<ore-rank-item value="8"><span slot="leading">avatar</span>Documentation</ore-rank-item>' +
        '<ore-rank-item value="4">Pricing</ore-rank-item>' +
        '<ore-rank-item value="6" bar="false">Blog<span slot="trailing">31m 08s</span><span slot="description">2 timed sessions</span></ore-rank-item>' +
        '</ore-rank-list>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Layout', () => {
  test('sizes bar fills against the widest row in the real box model', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-rank-list aria-label="Most visited pages">' +
        '<ore-rank-item value="8">Documentation</ore-rank-item>' +
        '<ore-rank-item value="4">Pricing</ore-rank-item>' +
        '</ore-rank-list>',
    );

    const full = await page.locator('ore-rank-item').nth(0).locator('[part="bar-fill"]').boundingBox();
    const half = await page.locator('ore-rank-item').nth(1).locator('[part="bar-fill"]').boundingBox();

    expect(full?.width).toBeGreaterThan(0);
    // 4 against a scale of 8: the fill is half the widest row's, within the sub-pixel
    // rounding a percentage of a real track width produces.
    expect((half?.width ?? 0) * 2).toBeCloseTo(full?.width ?? 0, 0);
  });

  test('keeps the rank numeral column from shifting the label edge', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-rank-list aria-label="Most visited pages">' +
        '<ore-rank-item value="8">Documentation</ore-rank-item>' +
        '<ore-rank-item value="4">Pricing</ore-rank-item>' +
        '</ore-rank-list>',
    );

    const firstLabel = await page.locator('[part="label"]').first().boundingBox();
    const secondLabel = await page.locator('[part="label"]').nth(1).boundingBox();

    // Both rows are single-digit ranks, so the labels share a start edge; a rank column that
    // sized to its content would shift the second row by a different width.
    expect(Math.abs((firstLabel?.x ?? 0) - (secondLabel?.x ?? 0))).toBeLessThanOrEqual(1);
  });
});
