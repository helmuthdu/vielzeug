import { expect, test } from '../../testing/fixtures';

test.describe('Layout', () => {
  for (const layout of ['block', 'flex', 'grid']) {
    test(`fits long commands and preserves suffix controls in ${layout} containers`, async ({ page, refinePage }) => {
      const value = `bun add ${'@vielzeug/a-long-package-name '.repeat(8).trim()}`;

      for (const width of [375, 1280]) {
        await page.setViewportSize({ height: 900, width });

        for (const direction of ['ltr', 'rtl']) {
          for (const hasSuffix of [true, false]) {
            await refinePage.mountComponent(`
              <div id="container" dir="${direction}" style="display: ${layout}">
                <ore-copy-command value="${value}">
                  ${hasSuffix ? '<button slot="suffix" type="button" aria-label="Next command">Next</button>' : ''}
                </ore-copy-command>
              </div>
            `);

            const geometry = await page.locator('#container').evaluate((container) => {
              const host = container.querySelector('ore-copy-command');
              const wrapper = host?.shadowRoot?.querySelector('[part="wrapper"]');
              const text = host?.shadowRoot?.querySelector('[part="command-text"]');
              const icon = host?.shadowRoot?.querySelector('[part="copy-icon"]');
              const suffix = host?.querySelector('[slot="suffix"]');

              if (!host || !wrapper || !text || !icon) throw new Error('Expected the command surfaces.');

              const bounds = container.getBoundingClientRect();
              const outer = wrapper.getBoundingClientRect();
              const iconBounds = icon.getBoundingClientRect();
              const suffixBounds = suffix?.getBoundingClientRect();

              return {
                containerWidth: bounds.width,
                hostWidth: host.getBoundingClientRect().width,
                iconVisible: iconBounds.width > 0 && iconBounds.left >= outer.left && iconBounds.right <= outer.right,
                overflows: container.scrollWidth > container.clientWidth,
                suffixVisible:
                  !suffixBounds ||
                  (suffixBounds.width > 0 && suffixBounds.left >= outer.left && suffixBounds.right <= outer.right),
                textClipped: text.scrollWidth > text.clientWidth,
                textOverflow: getComputedStyle(text).textOverflow,
                wrapperWidth: outer.width,
              };
            });

            expect(geometry.hostWidth).toBeLessThanOrEqual(geometry.containerWidth);
            expect(geometry.wrapperWidth).toBeLessThanOrEqual(geometry.hostWidth);
            expect(geometry.overflows).toBe(false);
            expect(geometry.textClipped).toBe(true);
            expect(geometry.textOverflow).toBe('ellipsis');
            expect(geometry.iconVisible).toBe(true);
            expect(geometry.suffixVisible).toBe(true);
            await expect(page.getByRole('button', { exact: true, name: `Copy: ${value}` })).toBeVisible();

            if (hasSuffix) await page.getByRole('button', { name: 'Next command' }).click();
          }
        }
      }
    });
  }

  test('keeps short commands content-sized', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-copy-command value="bun install"></ore-copy-command>');

    const widths = await page.locator('ore-copy-command').evaluate((host) => {
      const container = host.parentElement;

      if (!container) throw new Error('Expected a command container.');

      return { container: container.getBoundingClientRect().width, host: host.getBoundingClientRect().width };
    });

    expect(widths.host).toBeGreaterThan(0);
    expect(widths.host).toBeLessThan(widths.container);
  });
});

test.describe('Shape', () => {
  test('lets the radius hook override the rounded attribute', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-copy-command value="bun install" rounded="full"
        style="--copy-command-radius: 12px"></ore-copy-command>
    `);

    const wrapper = page.locator('ore-copy-command [part="wrapper"]');

    await expect(wrapper).toHaveCSS('border-radius', '12px');
  });

  test('keeps hover and keyboard-focus corners concentric with the border', async ({ page, refinePage }) => {
    for (const rounded of ['xl', 'none']) {
      await refinePage.mountComponent(`
        <ore-copy-command value="bun install" rounded="${rounded}" style="--border: 3px"></ore-copy-command>
      `);

      const command = page.getByRole('button', { exact: true, name: 'Copy: bun install' });

      await command.hover();

      const geometry = await command.evaluate((button) => {
        const wrapper = button.parentElement;

        if (!wrapper) throw new Error('Expected the command wrapper.');

        const outer = wrapper.getBoundingClientRect();
        const inner = button.getBoundingClientRect();

        return {
          innerRadius: Number.parseFloat(getComputedStyle(button).borderTopLeftRadius),
          inset: inner.left - outer.left,
          outerRadius: Number.parseFloat(getComputedStyle(wrapper).borderTopLeftRadius),
        };
      });
      const radius = Math.max(0, geometry.outerRadius - geometry.inset);

      expect(geometry.inset).toBe(3);
      expect(geometry.innerRadius).toBe(radius);

      await page.keyboard.press('Tab');
      await expect(command).toBeFocused();
      await expect(command).toHaveCSS('outline-style', 'solid');
      await expect(command).toHaveCSS('border-radius', `${radius}px`);
    }
  });

  for (const direction of ['ltr', 'rtl']) {
    test(`keeps the joined suffix seam square in ${direction}`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`
        <ore-copy-command value="bun install" rounded="xl" dir="${direction}" style="--border: 3px">
          <button slot="suffix" type="button" aria-label="Next command">Next</button>
        </ore-copy-command>
      `);

      const command = page.getByRole('button', { exact: true, name: 'Copy: bun install' });

      await page.keyboard.press('Tab');
      await expect(command).toBeFocused();
      await expect(command).toHaveCSS('border-start-start-radius', '9px');
      await expect(command).toHaveCSS('border-end-start-radius', '9px');
      await expect(command).toHaveCSS('border-start-end-radius', '0px');
      await expect(command).toHaveCSS('border-end-end-radius', '0px');

      await page.getByRole('button', { name: 'Next command' }).evaluate((button) => button.remove());

      await expect(command).toHaveCSS('border-radius', '9px');
    });
  }
});
