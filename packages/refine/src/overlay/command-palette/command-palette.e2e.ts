import { axeCheck, expect, test } from '../../testing/fixtures';

const itemsHtml = `
  <ore-command-palette-item value="alpha" group="Group">Alpha</ore-command-palette-item>
  <ore-command-palette-item value="beta" group="Group">Beta</ore-command-palette-item>
`;

test.describe('Interaction', () => {
  test('emits active-change as the focused row moves', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${itemsHtml}</ore-command-palette>`);

    await page.evaluate(() => {
      const palette = document.querySelector('ore-command-palette')!;

      (window as unknown as { __active: string[] }).__active = [];
      palette.addEventListener('active-change', (e) => {
        (window as unknown as { __active: string[] }).__active.push((e as CustomEvent).detail.value);
      });
    });

    const input = page.locator('ore-command-palette').locator('input');

    await input.press('ArrowDown');

    const values = await page.evaluate(() => (window as unknown as { __active: string[] }).__active);

    expect(values).toContain('beta');
  });

  test('emits an empty active-change when the query matches nothing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${itemsHtml}</ore-command-palette>`);

    const detail = page.evaluate(
      () =>
        new Promise<{ value: string; hasItem: boolean }>((resolve) => {
          const palette = document.querySelector('ore-command-palette')!;
          const input = palette.shadowRoot!.querySelector('input')!;

          palette.addEventListener('active-change', (e) => {
            const d = (e as CustomEvent).detail;

            resolve({ hasItem: d.item !== undefined, value: d.value });
          });
          input.value = 'zzz-no-match';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }),
    );

    expect(await detail).toEqual({ hasItem: false, value: '' });
  });
});

test.describe('Layout', () => {
  test('shows the preview pane beside the list while its slot has content', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 1000 });
    await refinePage.mountComponent(`
      <ore-command-palette open label="Palette">
        ${itemsHtml}
        <div slot="preview">Detail pane</div>
      </ore-command-palette>
    `);

    const geometry = await page.locator('ore-command-palette').evaluate((palette) => {
      const shadow = palette.shadowRoot!;
      const list = shadow.querySelector<HTMLElement>('.listbox')!;
      const preview = shadow.querySelector<HTMLElement>('.preview')!;

      return {
        hidden: preview.hasAttribute('hidden'),
        listRight: list.getBoundingClientRect().right,
        previewLeft: preview.getBoundingClientRect().left,
        previewWidth: preview.getBoundingClientRect().width,
      };
    });

    expect(geometry.hidden).toBe(false);
    expect(geometry.previewWidth).toBeGreaterThan(100);
    // Side-by-side: the pane starts at or after the list's right edge.
    expect(geometry.previewLeft).toBeGreaterThanOrEqual(geometry.listRight - 1);
  });

  test('folds the preview pane away while its slot is empty', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${itemsHtml}</ore-command-palette>`);

    const hidden = await page
      .locator('ore-command-palette')
      .evaluate((palette) => palette.shadowRoot?.querySelector('.preview')?.hasAttribute('hidden'));

    expect(hidden).toBe(true);
  });
});

test.describe('Accessibility', () => {
  test('passes axe checks with the preview pane open', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-command-palette open label="Palette">
        ${itemsHtml}
        <div slot="preview">Detail pane for the active command</div>
      </ore-command-palette>
    `);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
