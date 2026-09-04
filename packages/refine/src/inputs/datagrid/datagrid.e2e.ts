import { axeCheck, expect, test } from '../../testing/fixtures';

const mountGrid = async (
  page: import('@playwright/test').Page,
  refinePage: { mountComponent(html: string): Promise<void> },
) => {
  await refinePage.mountComponent('<ore-datagrid id="grid" label="Customers" fullwidth></ore-datagrid>');
  await page.locator('#grid').evaluate((element) => {
    const grid = element as HTMLElement & {
      columns: Array<Record<string, unknown>>;
      filterOptions: Array<Record<string, unknown>>;
      labels: Record<string, unknown>;
      pageSize: number;
      pageSizeOptions: number[];
      rows: Array<Record<string, unknown>>;
    };
    const ore = (window as unknown as { Ore: { html: typeof import('@vielzeug/ore').html } }).Ore;
    grid.columns = [
      {
        cell: (row: { name: string }) => row.name,
        key: 'name',
        label: 'Name',
        renderCell: (row: { name: string }) => ore.html`<button type="button">${row.name}</button>`,
      },
      { key: 'status', label: 'Status' },
      { key: 'amount', label: 'Amount' },
    ];
    grid.filterOptions = [
      {
        key: 'region',
        label: 'Region',
        options: [
          { label: 'EMEA prefix', value: 'eme' },
          { label: 'Americas', value: 'americas' },
        ],
      },
    ];
    grid.labels = {
      addFilter: 'Add customer filter…',
      filter: 'Customer filters',
      rowsPerPage: 'Zeilen pro Seite',
    };
    grid.pageSize = 1;
    grid.pageSizeOptions = [1, 2];
    grid.rows = [
      { amount: 10, id: '1', name: 'Acme', region: 'emea', status: 'Active' },
      { amount: 20, id: '2', name: 'Globex', region: 'americas', status: 'Trial' },
    ];
  });
};

test.describe('Accessibility', () => {
  test('rich cells and localized controls pass axe checks', async ({ page, refinePage }) => {
    await mountGrid(page, refinePage);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Interaction', () => {
  test('provided metadata filters remain inactive until selected', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');

    await expect(grid.getByRole('button', { name: 'Acme' })).toBeVisible();
    await grid.getByRole('button', { name: 'Customer filters' }).click();
    await expect(grid.getByRole('button', { name: 'Clear all filters' })).toHaveCount(0);
    expect(
      await grid.locator('ore-popover[label="Customer filters"] .dg-pop-header').evaluate((header) => {
        const style = getComputedStyle(header);
        return [style.paddingBlockStart, style.paddingInlineEnd, style.paddingBlockEnd, style.paddingInlineStart];
      }),
    ).toEqual(['8px', '12px', '8px', '12px']);
    await grid.getByRole('combobox', { name: 'Add customer filter…' }).click();
    await page.getByRole('option', { exact: true, name: 'Region' }).click();
    await expect(grid.getByRole('button', { name: 'Clear all filters' })).toBeVisible();
    await grid.getByRole('combobox', { exact: true, name: 'Region' }).click();
    await page.getByRole('option', { exact: true, name: 'EMEA prefix' }).click();

    await expect(grid.getByRole('button', { name: 'Acme' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'Globex' })).toHaveCount(0);

    await grid.locator('ore-select[label="Region operator"]').click();
    await page.getByRole('option', { exact: true, name: 'Equals' }).click();
    await expect(grid.getByRole('button', { name: 'Acme' })).toHaveCount(0);
  });

  test('internal controls use compact accessible-only labels', async ({ page, refinePage }) => {
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');

    await grid.getByRole('button', { name: 'Search' }).click();
    const search = grid.locator('.dg-search-input');
    await expect(search.getByRole('searchbox', { name: 'Search' })).toBeVisible();
    await expect(search.locator('[part="label"]')).toBeHidden();
    expect((await search.boundingBox())!.height).toBeLessThanOrEqual(40);
    await grid.getByRole('button', { name: 'Close search' }).click();

    await grid.getByRole('button', { exact: true, name: 'Sort' }).click();
    for (const select of [grid.locator('.dg-pop-select'), grid.locator('.dg-pop-dir-select')]) {
      await expect(select.locator('[part="label"]')).toBeHidden();
      expect((await select.boundingBox())!.height).toBeLessThanOrEqual(40);
    }
    await page.keyboard.press('Escape');

    await grid.getByRole('button', { name: 'Customer filters' }).click();
    const picker = grid.locator('.dg-pop-filter-fields ore-combobox');
    await expect(picker.getByRole('combobox', { name: 'Add customer filter…' })).toBeVisible();
    await expect(picker.locator('[part="label"]')).toBeHidden();
    await picker.getByRole('combobox').click();
    await picker.getByRole('option', { exact: true, name: 'Amount' }).click();
    await expect(grid.locator('.dg-pop-filter-op-select [part="label"]')).toBeHidden();
    await expect(grid.locator('.dg-filter [part="label"]')).toBeHidden();
  });

  test('column checklist reports, resets, and protects visibility', async ({ page, refinePage }) => {
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');
    const trigger = grid.getByRole('button', { exact: true, name: 'Column options' });

    await trigger.click();
    await expect(grid.getByText('3 of 3 visible', { exact: true })).toBeVisible();
    await expect(grid.getByRole('button', { exact: true, name: 'Reset' })).toHaveCount(0);
    expect(
      await grid.locator('ore-popover[label="Column options"] .dg-pop-header').evaluate((header) => {
        const style = getComputedStyle(header);
        return [style.paddingBlockStart, style.paddingInlineEnd, style.paddingBlockEnd, style.paddingInlineStart];
      }),
    ).toEqual(['8px', '12px', '8px', '12px']);
    await expect(grid.getByRole('checkbox')).toHaveCount(3);
    await grid.getByRole('checkbox', { name: 'Status' }).click();
    await expect(grid.getByText('2 of 3 visible', { exact: true })).toBeVisible();
    await expect(grid.locator('.dg-column-trigger')).toHaveAttribute('data-customized');
    await expect(grid.getByRole('button', { exact: true, name: 'Reset' })).toBeEnabled();

    await grid.getByRole('button', { exact: true, name: 'Reset' }).click();
    await expect(grid.getByText('3 of 3 visible', { exact: true })).toBeVisible();
    await expect(grid.getByRole('button', { exact: true, name: 'Reset' })).toHaveCount(0);
    await expect(grid.locator('.dg-column-trigger')).not.toHaveAttribute('data-customized');
  });

  test('controlled predefined views filter rows before pagination', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');
    await grid.evaluate((element) => {
      const dataGrid = element as HTMLElement & {
        activeView: string;
        views: Array<{ filter?: (row: { amount: number }) => boolean; id: string; label: string }>;
      };
      dataGrid.views = [
        { id: 'all', label: 'All' },
        { filter: (row) => row.amount > 10, id: 'high', label: 'High value' },
      ];
      dataGrid.activeView = 'all';
      dataGrid.addEventListener('view-change', (event) => {
        dataGrid.activeView = (event as CustomEvent<{ id: string }>).detail.id;
      });
    });

    const tabs = grid.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    expect(await tabs.evaluateAll((items) => items.every((item) => item.scrollWidth <= item.clientWidth))).toBe(true);

    await grid.getByRole('tab', { name: 'High value' }).click();
    await expect(grid.getByRole('button', { name: 'Globex' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'Acme' })).toHaveCount(0);
  });

  test('numeric operator selected before a value is preserved', async ({ page, refinePage }) => {
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');

    await grid.getByRole('button', { name: 'Customer filters' }).click();
    await grid.getByRole('combobox', { name: 'Add customer filter…' }).click();
    await page.getByRole('option', { exact: true, name: 'Amount' }).click();
    await grid.locator('ore-select[label="Amount operator"]').click();
    await page.getByRole('option', { exact: true, name: 'Greater than' }).click();
    await grid.getByRole('combobox', { exact: true, name: 'Amount' }).click();
    await page.getByRole('option', { exact: true, name: '10' }).click();

    await expect(grid.getByRole('button', { name: 'Globex' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'Acme' })).toHaveCount(0);
  });

  test('sort property and direction dropdowns remain usable', async ({ page, refinePage }) => {
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');

    await grid.getByRole('button', { exact: true, name: 'Sort' }).click();
    await expect(grid.getByRole('button', { name: 'Clear sort' })).toHaveCount(0);
    expect(
      await grid.locator('ore-popover[label="Sort"] .dg-pop-header').evaluate((header) => {
        const style = getComputedStyle(header);
        return [style.paddingBlockStart, style.paddingInlineEnd, style.paddingBlockEnd, style.paddingInlineStart];
      }),
    ).toEqual(['8px', '12px', '8px', '12px']);
    const panel = grid.locator('ore-popover[label="Sort"] [part="panel"]');
    const property = grid.locator('ore-select[label="Property"]');
    const direction = grid.locator('ore-select[label="Sort"]');
    const [panelBox, propertyBox, directionBox] = await Promise.all([
      panel.boundingBox(),
      property.boundingBox(),
      direction.boundingBox(),
    ]);
    expect(panelBox).not.toBeNull();
    expect(propertyBox).not.toBeNull();
    expect(directionBox).not.toBeNull();
    expect(propertyBox!.x).toBeGreaterThanOrEqual(panelBox!.x);
    expect(directionBox!.x + directionBox!.width).toBeLessThanOrEqual(panelBox!.x + panelBox!.width);

    await property.click();
    await page.getByRole('option', { exact: true, name: 'Name' }).click();
    await expect(grid.getByRole('button', { name: 'Clear sort' })).toBeVisible();
    await direction.click();
    const ascending = page.getByRole('option', { exact: true, name: 'A → Z' });
    const descending = page.getByRole('option', { exact: true, name: 'Z → A' });
    await expect(ascending).toBeVisible();
    await expect(descending).toBeVisible();
    expect(await ascending.evaluate((option) => option.scrollWidth <= option.clientWidth)).toBe(true);
    expect(await descending.evaluate((option) => option.scrollWidth <= option.clientWidth)).toBe(true);
    await descending.click();

    await expect(grid.getByRole('button', { name: 'Globex' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'Acme' })).toHaveCount(0);

    await page.keyboard.press('Escape');
    await grid.getByRole('button', { exact: true, name: 'Sort' }).click();
    await property.click();
    await page.getByRole('option', { exact: true, name: 'Amount' }).click();
    await direction.click();
    await expect(page.getByRole('option', { exact: true, name: '0 → 9' })).toBeVisible();
    await expect(page.getByRole('option', { exact: true, name: '9 → 0' })).toBeVisible();
  });

  test('page-size control stays left of pagination without overlap', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await mountGrid(page, refinePage);
    const grid = page.locator('#grid');
    const pageSize = grid.locator('ore-select[label="Zeilen pro Seite"]');
    const pageSizeLabel = pageSize.locator('[part="label"]');
    const pageSizeTrigger = pageSize.getByRole('combobox', { name: 'Zeilen pro Seite' });
    const pagination = grid.getByRole('group', { name: 'Page navigation' });
    const footer = grid.getByRole('navigation', { name: 'Pagination' });
    const [pageSizeBox, paginationBox, footerBox] = await Promise.all([
      pageSize.boundingBox(),
      pagination.boundingBox(),
      footer.boundingBox(),
    ]);

    expect(pageSizeBox).not.toBeNull();
    expect(paginationBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    await expect(pageSizeTrigger).toBeVisible();
    await expect(pageSizeLabel).toBeHidden();
    expect(pageSizeBox!.width).toBe(80);
    expect(footerBox!.height).toBeLessThanOrEqual(49);
    expect(pageSizeBox!.x).toBeLessThan(paginationBox!.x);
    expect(pageSizeBox!.x + pageSizeBox!.width).toBeLessThanOrEqual(paginationBox!.x);
    expect(pageSizeBox!.x).toBeGreaterThanOrEqual(footerBox!.x);
    expect(paginationBox!.x + paginationBox!.width).toBeLessThanOrEqual(footerBox!.x + footerBox!.width);

    await pageSize.click();
    await page.getByRole('option', { exact: true, name: '2' }).click();
    await expect(grid.getByRole('row')).toHaveCount(3);
  });
});
