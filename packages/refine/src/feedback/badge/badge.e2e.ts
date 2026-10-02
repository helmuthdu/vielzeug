import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  for (const mode of ['light', 'dark']) {
    test(`${mode} badge passes axe checks`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-badge color="primary">New</ore-badge>' + '<ore-badge color="primary" variant="flat">Beta</ore-badge>',
      );
      await page.evaluate((theme) => {
        document.documentElement.className = theme;
      }, mode);

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Layout', () => {
  /**
   * The pill's resolved size metrics beside the page's own token values. The size cascade is
   * the point of these tests: `sizeVariantMixin` emits unlayered `:host` defaults, so the
   * badge's own size contract — the `--badge-*` variables and the `xs` size — must beat them
   * from unlayered rules adopted after the mixin's sheet.
   */
  const readMetrics = async (page: import('@playwright/test').Page, selector: string) => {
    return await page.locator(selector).evaluate((host) => {
      const pill = host.shadowRoot!.querySelector<HTMLElement>('.badge')!;
      const pillStyle = getComputedStyle(pill);
      // Tokens resolve to px on a probe — custom properties never resolve units on their own.
      const probe = document.createElement('div');
      probe.style.display = 'none';
      probe.style.paddingTop = 'var(--size-1)';
      probe.style.paddingRight = 'var(--size-1-5)';
      probe.style.paddingBottom = 'var(--size-0-5)';
      probe.style.fontSize = 'var(--text-2xs)';
      host.ownerDocument.body.append(probe);
      const probeStyle = getComputedStyle(probe);
      const metrics = {
        fontSize: pillStyle.fontSize,
        gap: pillStyle.gap,
        paddingX: pillStyle.paddingLeft,
        paddingY: pillStyle.paddingTop,
        token: {
          size1: probeStyle.paddingTop,
          size05: probeStyle.paddingBottom,
          size15: probeStyle.paddingRight,
          text2xs: probeStyle.fontSize,
        },
      };
      probe.remove();
      return metrics;
    });
  };

  test('default size resolves the authored metrics, not the shared md defaults', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-badge id="badge">Label</ore-badge>');

    const metrics = await readMetrics(page, '#badge');

    expect(metrics.gap).toBe(metrics.token.size1);
    expect(metrics.paddingX).toBe(metrics.token.size15);
    expect(metrics.paddingY).toBe(metrics.token.size05);
  });

  test('the public --badge-* size variables are honored', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-badge id="badge" style="--badge-padding-x: 13px; --badge-gap: 9px; --badge-font-size: 15px">Label</ore-badge>',
    );

    const metrics = await readMetrics(page, '#badge');

    expect(metrics.paddingX).toBe('13px');
    expect(metrics.gap).toBe('9px');
    expect(metrics.fontSize).toBe('15px');
  });

  test('the xs size beats the shared defaults', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-badge id="badge" size="xs">Label</ore-badge>');

    const metrics = await readMetrics(page, '#badge');

    expect(metrics.paddingX).toBe(metrics.token.size1);
    expect(metrics.paddingY).toBe('0px');
    expect(metrics.fontSize).toBe(metrics.token.text2xs);
  });

  test('the sm size still resolves the shared mixin config', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-badge id="badge" size="sm">Label</ore-badge>');

    const metrics = await readMetrics(page, '#badge');

    expect(metrics.paddingX).toBe(metrics.token.size15);
  });

  test('anchor mode pins the pill over the target corner', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-badge id="badge" anchor="bottom-end" count="3">' +
        '<div slot="target" style="width:120px;height:32px">Target</div>' +
        '</ore-badge>',
    );

    const geometry = await page.locator('#badge').evaluate((host) => {
      const pill = host.shadowRoot!.querySelector<HTMLElement>('.badge')!;
      const target = host.querySelector<HTMLElement>('[slot="target"]')!;

      return {
        hostPosition: getComputedStyle(host).position,
        pillBottom: pill.getBoundingClientRect().bottom,
        pillPosition: getComputedStyle(pill).position,
        pillRight: pill.getBoundingClientRect().right,
        targetBottom: target.getBoundingClientRect().bottom,
        targetRight: target.getBoundingClientRect().right,
      };
    });

    expect(geometry.hostPosition).toBe('relative');
    expect(geometry.pillPosition).toBe('absolute');
    // The pinned pill rides over the target's bottom-end corner, overflowing it.
    expect(geometry.pillBottom).toBeGreaterThanOrEqual(geometry.targetBottom);
    expect(geometry.pillRight).toBeGreaterThanOrEqual(geometry.targetRight);
  });

  test('an icon-only badge carries no trailing gap beside the glyph', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-badge id="badge" size="sm" rounded="full">' +
        '<span slot="icon" style="display:block;width:12px;height:12px"></span>' +
        '</ore-badge>',
    );

    const geometry = await page.locator('#badge').evaluate((host) => {
      const pill = host.shadowRoot!.querySelector<HTMLElement>('.badge')!;
      const icon = host.querySelector<HTMLElement>('[slot="icon"]')!;
      const pillRect = pill.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const style = getComputedStyle(pill);

      return {
        borderW: Number.parseFloat(style.borderLeftWidth),
        iconCenterOffset: iconRect.left + iconRect.width / 2 - pillRect.left,
        iconW: iconRect.width,
        labelHidden: host.shadowRoot!.querySelector('.badge-label')!.hasAttribute('hidden'),
        paddingX: Number.parseFloat(style.paddingLeft),
        pillW: pillRect.width,
      };
    });

    expect(geometry.labelHidden).toBe(true);
    // The pill is exactly the glyph between its padding and border — no phantom trailing gap.
    expect(geometry.pillW).toBeCloseTo(geometry.iconW + 2 * (geometry.paddingX + geometry.borderW), 1);
    expect(geometry.iconCenterOffset).toBeCloseTo(geometry.pillW / 2, 1);
  });
});
