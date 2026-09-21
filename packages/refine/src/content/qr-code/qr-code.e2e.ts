import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  test('renders a square SVG at the default size', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-code value="https://example.com"></ore-qr-code>');

    const svg = page.locator('ore-qr-code').locator('svg');
    const box = await svg.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(box!.height, 0);
    expect(box!.width).toBeGreaterThan(0);
  });

  test('numeric size attribute controls rendered dimensions', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-code value="x" size="96"></ore-qr-code>');

    const box = await page.locator('ore-qr-code').locator('[part="svg"]').boundingBox();

    expect(box!.width).toBeCloseTo(96, 0);
    expect(box!.height).toBeCloseTo(96, 0);
  });
});

test.describe('Accessibility', () => {
  test('exposes role=img with the label and passes axe', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-code value="x" label="Pairing code"></ore-qr-code>');

    const svg = page.locator('ore-qr-code').locator('svg');

    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg).toHaveAttribute('aria-label', 'Pairing code');

    const results = await axeCheck(page);
    expect(results.violations).toEqual([]);
  });
});
