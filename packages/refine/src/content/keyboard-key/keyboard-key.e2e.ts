import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  for (const mode of ['light', 'dark']) {
    test(`${mode} keyboard keys pass axe checks`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-keyboard-key>⌘</ore-keyboard-key>' +
          '<ore-keyboard-shortcut pressed>' +
          '<ore-keyboard-key size="lg" symbol="⇧">Shift</ore-keyboard-key>' +
          '<ore-keyboard-key size="lg">K</ore-keyboard-key>' +
          '</ore-keyboard-shortcut>',
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
  test('large keys provide a prominent key-state surface', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div class="frame">' +
        '<ore-keyboard-key id="small">K</ore-keyboard-key>' +
        '<ore-keyboard-key id="large" size="lg" symbol="⌘" pressed>Command</ore-keyboard-key>' +
        '</div>',
    );

    const geometry = await page.locator('#large').evaluate((large, small) => {
      const key = large.shadowRoot!.querySelector<HTMLElement>('[part="key"]')!;
      const smallKey = document.querySelector(small)!.shadowRoot!.querySelector<HTMLElement>('[part="key"]')!;
      const rect = key.getBoundingClientRect();
      const smallRect = smallKey.getBoundingClientRect();
      const style = getComputedStyle(key);

      return {
        boxShadow: style.boxShadow,
        height: rect.height,
        smallHeight: smallRect.height,
        width: rect.width,
      };
    }, '#small');

    expect(geometry.height).toBeGreaterThanOrEqual(64);
    expect(geometry.width).toBeGreaterThanOrEqual(64);
    expect(geometry.height).toBeGreaterThan(geometry.smallHeight);
    expect(geometry.boxShadow).not.toBe('none');
  });

  test('pressed shortcuts surround every grouped key with one surface', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-keyboard-shortcut id="shortcut" pressed>' +
        '<ore-keyboard-key id="command" size="lg" symbol="⌘">Command</ore-keyboard-key>' +
        '<ore-keyboard-key size="lg" symbol="⇧">Shift</ore-keyboard-key>' +
        '<ore-keyboard-key id="letter" size="lg">K</ore-keyboard-key>' +
        '</ore-keyboard-shortcut>',
    );

    const geometry = await page.locator('#shortcut').evaluate((shortcut) => {
      const surface = shortcut.shadowRoot!.querySelector<HTMLElement>('[part="shortcut"]')!;
      const first = shortcut.querySelector<HTMLElement>('#command')!;
      const last = shortcut.querySelector<HTMLElement>('#letter')!;
      const surfaceRect = surface.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const style = getComputedStyle(surface);

      return {
        background: style.backgroundColor,
        boxShadow: style.boxShadow,
        first: firstRect.toJSON(),
        last: lastRect.toJSON(),
        surface: surfaceRect.toJSON(),
      };
    });

    expect(geometry.surface.left).toBeLessThan(geometry.first.left);
    expect(geometry.surface.top).toBeLessThan(geometry.first.top);
    expect(geometry.surface.right).toBeGreaterThan(geometry.last.right);
    expect(geometry.surface.bottom).toBeGreaterThan(geometry.last.bottom);
    expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(geometry.boxShadow).not.toBe('none');
  });
});
