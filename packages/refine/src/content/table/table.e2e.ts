import { expect, test } from '../../testing/fixtures';

const HTML = `
  <ore-table id="table">
    <ore-tr head>
      <ore-th>Name</ore-th>
      <ore-th align="right">Score</ore-th>
    </ore-tr>
    <ore-tr>
      <ore-td>Alice</ore-td>
      <ore-td id="score" align="right">10</ore-td>
    </ore-tr>
  </ore-table>
`;

test.describe('Cell alignment', () => {
  test('align attribute right-aligns the mirrored native cells', async ({ page, refinePage }) => {
    await refinePage.mountComponent(HTML);

    const table = page.locator('#table');

    await expect(table.locator('thead th:nth-child(2)')).toHaveCSS('text-align', 'right');
    await expect(table.locator('tbody td[data-align="right"]')).toHaveCSS('text-align', 'right');
    await expect(table.locator('tbody td:not([data-align])')).toHaveCSS('text-align', 'start');
  });
});
