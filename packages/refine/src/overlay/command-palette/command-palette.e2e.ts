import { axeCheck, expect, test } from '../../testing/fixtures';

const itemsHtml = `
  <ore-command-palette-item value="alpha" group="Group">Alpha</ore-command-palette-item>
  <ore-command-palette-item value="beta" group="Group">Beta</ore-command-palette-item>
`;

const nestedHtml = `
  <ore-command-palette-item value="cat-file" label="File">
    <ore-command-palette-item value="new-file">New File</ore-command-palette-item>
    <ore-command-palette-item value="open-file">Open File</ore-command-palette-item>
  </ore-command-palette-item>
  <ore-command-palette-item value="help">Help</ore-command-palette-item>
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

  test('tints the keyboard-focused item with the neutral theme tint', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${itemsHtml}</ore-command-palette>`);

    await page.locator('ore-command-palette').locator('input').press('ArrowDown');

    // The fill fades in, so poll until the transition lands on the final color.
    await expect
      .poll(() =>
        page.locator('ore-command-palette').evaluate((palette) => {
          const shadow = palette.shadowRoot!;
          const focused = shadow.querySelector<HTMLElement>('.item[data-focused]')!;
          const probe = document.createElement('div');

          // Same recipe the option lists (select/combobox/query-bar) focus with by default.
          probe.style.background = 'color-mix(in oklch, var(--color-neutral) 12%, var(--color-contrast-100))';
          shadow.append(probe);

          const expected = getComputedStyle(probe).backgroundColor;

          probe.remove();

          return getComputedStyle(focused).backgroundColor === expected;
        }),
      )
      .toBe(true);
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

  test('renders group headings as plain labels with a divider between groups', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-command-palette open label="Palette">
        <ore-command-palette-item value="a" group="First">A</ore-command-palette-item>
        <ore-command-palette-item value="b" group="Second">B</ore-command-palette-item>
      </ore-command-palette>
    `);

    const styles = await page.locator('ore-command-palette').evaluate((palette) => {
      const shadow = palette.shadowRoot!;
      const [first, second] = [...shadow.querySelectorAll<HTMLElement>('.group-heading')];

      return {
        backdrop: getComputedStyle(first).backdropFilter,
        background: getComputedStyle(first).backgroundColor,
        firstBorder: getComputedStyle(first).borderTopWidth,
        position: getComputedStyle(first).position,
        secondBorder: getComputedStyle(second).borderTopWidth,
      };
    });

    // No sticky paint job: the label sits directly on the panel frost.
    expect(styles.position).toBe('static');
    expect(styles.background).toBe('rgba(0, 0, 0, 0)');
    expect(styles.backdrop).toBe('none');
    // The hairline only separates groups: the first heading carries none.
    expect(Number.parseFloat(styles.firstBorder)).toBe(0);
    expect(Number.parseFloat(styles.secondBorder)).toBeGreaterThan(0);
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

  test('passes axe checks on the root list and inside an opened category', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${nestedHtml}</ore-command-palette>`);

    expect((await axeCheck(page)).violations).toEqual([]);

    await page
      .locator('ore-command-palette')
      .evaluate((palette) => palette.shadowRoot!.querySelector<HTMLElement>('.item[data-category]')!.click());

    expect((await axeCheck(page)).violations).toEqual([]);
  });
});

test.describe('Drill-down Categories', () => {
  const shadowValues = (page: import('@playwright/test').Page, selector: string) =>
    page
      .locator('ore-command-palette')
      .evaluate(
        (palette, sel) =>
          [...palette.shadowRoot!.querySelectorAll<HTMLElement>(sel)].map((el) => el.dataset.value ?? ''),
        selector,
      );

  test('clicking a category row opens its children and shows the back row', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${nestedHtml}</ore-command-palette>`);

    await page
      .locator('ore-command-palette')
      .evaluate((palette) => palette.shadowRoot!.querySelector<HTMLElement>('.item[data-category]')!.click());

    expect(await shadowValues(page, '.item')).toEqual(['new-file', 'open-file']);
    await expect(page.locator('ore-command-palette').locator('.back-row')).toBeVisible();

    await page.locator('ore-command-palette').locator('.back-row').click();

    expect(await shadowValues(page, '.item')).toEqual(['cat-file', 'help']);
    await expect(page.locator('ore-command-palette').locator('.back-row')).toHaveCount(0);
  });

  test('keeps focus inside the panel after the back row is clicked', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${nestedHtml}</ore-command-palette>`);

    await page
      .locator('ore-command-palette')
      .evaluate((palette) => palette.shadowRoot!.querySelector<HTMLElement>('.item[data-category]')!.click());
    await page.locator('ore-command-palette').locator('.back-row').click();

    const focused = await page
      .locator('ore-command-palette')
      .evaluate((palette) => palette.shadowRoot!.activeElement?.className ?? '');

    expect(focused).toContain('search-input');
  });

  test('flattens category leaves into global search results', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-command-palette open label="Palette">${nestedHtml}</ore-command-palette>`);

    await page.locator('ore-command-palette').evaluate((palette) => {
      const input = palette.shadowRoot!.querySelector<HTMLInputElement>('input')!;

      input.value = 'open';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(await shadowValues(page, '.item')).toEqual(['open-file']);
  });
});
