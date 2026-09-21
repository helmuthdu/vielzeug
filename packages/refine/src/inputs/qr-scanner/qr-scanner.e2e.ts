import { axeCheck, expect, test } from '../../testing/fixtures';

// Camera interaction (getUserMedia + BarcodeDetector) cannot run in CI — Chromium
// lacks a real camera and jsdom path is covered by the injected-factory unit tests.
// e2e coverage is limited to the static states: layout + accessibility.
test.describe('Layout', () => {
  test('renders a square preview stage at the default size', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-scanner></ore-qr-scanner>');

    const stage = page.locator('ore-qr-scanner').locator('[part="stage"]');
    const box = await stage.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(box!.height, 0);
    expect(box!.width).toBeGreaterThan(0);
  });

  test('numeric size attribute controls the stage edge length', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-scanner size="160"></ore-qr-scanner>');

    const box = await page.locator('ore-qr-scanner').locator('[part="stage"]').boundingBox();

    expect(box!.width).toBeCloseTo(160, 0);
    expect(box!.height).toBeCloseTo(160, 0);
  });
});

test.describe('Accessibility', () => {
  test('exposes a labelled region with a polite status line and passes axe', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-scanner label="Pairing scanner"></ore-qr-scanner>');

    const wrapper = page.locator('ore-qr-scanner').locator('[part="wrapper"]');

    await expect(wrapper).toHaveAttribute('role', 'region');
    await expect(wrapper).toHaveAttribute('aria-label', 'Pairing scanner');
    await expect(page.locator('ore-qr-scanner').locator('[part="status"]')).toHaveAttribute('role', 'status');

    const results = await axeCheck(page);
    expect(results.violations).toEqual([]);
  });
});
