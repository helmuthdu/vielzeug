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

test.describe('Styling', () => {
  test('dot-style, gradient, and logo attrs render in the browser', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-qr-code value="HELLO WORLD" dot-style="dots" gradient-from="#111111" gradient-to="#eeeeee" image="data:image/svg+xml;base64,AAAA" image-size="0.3"></ore-qr-code>',
    );

    const svg = page.locator('ore-qr-code').locator('svg');
    await expect(svg.locator('circle').first()).toBeVisible();
    await expect(svg.locator('linearGradient')).toHaveCount(1);
    await expect(svg.locator('image')).toHaveCount(1);
  });

  test('loading shows a shimmer skeleton until cleared', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-code value="x" loading></ore-qr-code>');

    const skeleton = page.locator('ore-qr-code').locator('[part="skeleton"]');
    await expect(skeleton).toBeVisible();

    await page.evaluate(() => document.querySelector('ore-qr-code')?.removeAttribute('loading'));
    await expect(page.locator('ore-qr-code').locator('svg')).toBeVisible();
    await expect(skeleton).toHaveCount(0);
  });
});

test.describe('Export', () => {
  test('toPng rasterizes a crisp PNG at the requested module scale', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-code value="HELLO WORLD"></ore-qr-code>');

    const info = await page.evaluate(async () => {
      const el = document.querySelector('ore-qr-code') as unknown as { toPng(scale?: number): Promise<Blob> };
      const blob = await el.toPng(6);
      const bitmap = await createImageBitmap(blob);
      const result = { height: bitmap.height, type: blob.type, width: bitmap.width };
      bitmap.close();
      return result;
    });

    // Version 1 (21 modules) + 4-module quiet zone on each side, 6 px per module.
    expect(info).toEqual({ height: 174, type: 'image/png', width: 174 });
  });

  test('toSvg exposes the rendered SVG string', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-qr-code value="x" label="Pay"></ore-qr-code>');

    const svg = await page.evaluate(() => {
      const el = document.querySelector('ore-qr-code') as unknown as { toSvg(): string };
      return el.toSvg();
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('Pay');
  });
});
