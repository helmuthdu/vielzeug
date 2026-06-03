import { fire, type Fixture, mount } from '@vielzeug/craft/testing';

// ── Helpers ─────────────────────────────────────────────────────────────────

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

type User = { id: string; name: string; role: string; age: number };

const COLS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'age', label: 'Age', sortable: true },
];

const ROWS: User[] = [
  { id: '1', name: 'Alice', role: 'Admin', age: 32 },
  { id: '2', name: 'Bob', role: 'Editor', age: 25 },
  { id: '3', name: 'Carol', role: 'Viewer', age: 28 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function mountGrid(
  overrides: Record<string, unknown> = {},
): Promise<Fixture<HTMLElement>> {
  const fixture = await mount('bit-datagrid', { props: overrides });
  const el = fixture.element as HTMLElement & { columns: typeof COLS; rows: typeof ROWS };

  el.columns = COLS;
  el.rows = ROWS;
  await flush();

  return fixture;
}

function getHeaderCells(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.dg-th'));
}

function getBodyRows(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.dg-body .dg-tr'));
}

function getCell(fixture: Fixture<HTMLElement>, rowIdx: number, colIdx: number): Element | null {
  const rows = getBodyRows(fixture);
  const row = rows[rowIdx];

  if (!row) return null;

  return row.querySelectorAll('.dg-td')[colIdx] ?? null;
}

function getSortableHeader(fixture: Fixture<HTMLElement>, label: string): Element | null {
  return (
    Array.from(fixture.queryAll('.dg-th[aria-sort]')).find(
      (th) => th.textContent?.trim().startsWith(label),
    ) ?? null
  );
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('bit-datagrid', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./datagrid');
    await import('../../content/icon/icon');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a table element', async () => {
      fixture = await mountGrid();

      expect(fixture.query('.dg-table')).toBeTruthy();
    });

    it('renders a thead and tbody', async () => {
      fixture = await mountGrid();

      expect(fixture.query('.dg-head')).toBeTruthy();
      expect(fixture.query('.dg-body')).toBeTruthy();
    });

    it('renders one header cell per column', async () => {
      fixture = await mountGrid();

      expect(getHeaderCells(fixture).length).toBe(COLS.length);
    });

    it('renders one body row per item', async () => {
      fixture = await mountGrid();

      expect(getBodyRows(fixture).length).toBe(ROWS.length);
    });

    it('renders cell values from row data', async () => {
      fixture = await mountGrid();

      expect(getCell(fixture, 0, 0)?.textContent?.trim()).toBe('Alice');
    });

    it('renders empty-text when rows is empty', async () => {
      fixture = await mount('bit-datagrid', { props: { 'empty-text': 'Nothing here' } });
      (fixture.element as HTMLElement & { columns: typeof COLS; rows: never[] }).columns = COLS;
      (fixture.element as HTMLElement & { rows: never[] }).rows = [];
      await Promise.resolve();

      expect(fixture.query('.dg-empty')?.textContent?.trim()).toBe('Nothing here');
    });

    it('renders pagination footer when page-size > 0', async () => {
      fixture = await mountGrid({ 'page-size': 10 });

      expect(fixture.query('.dg-footer')).toBeTruthy();
    });

    it('does not render pagination footer when page-size is 0', async () => {
      fixture = await mountGrid({ 'page-size': 0 });

      expect(fixture.query('.dg-footer')).toBeNull();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('sets role="grid" on the table', async () => {
      fixture = await mountGrid();

      expect(fixture.query('.dg-table')?.getAttribute('role')).toBe('grid');
    });

    it('sets role="columnheader" on header cells', async () => {
      fixture = await mountGrid();
      const headers = fixture.queryAll('.dg-th');

      for (const th of headers) {
        expect(th.getAttribute('role')).toBe('columnheader');
      }
    });

    it('sets scope="col" on header cells', async () => {
      fixture = await mountGrid();
      const headers = fixture.queryAll('.dg-th');

      for (const th of headers) {
        expect(th.getAttribute('scope')).toBe('col');
      }
    });

    it('sets role="row" on body rows', async () => {
      fixture = await mountGrid();
      const rows = getBodyRows(fixture);

      for (const row of rows) {
        expect(row.getAttribute('role')).toBe('row');
      }
    });

    it('sets role="gridcell" on body cells', async () => {
      fixture = await mountGrid();
      const cells = fixture.queryAll('.dg-td');

      for (const cell of cells) {
        expect(cell.getAttribute('role')).toBe('gridcell');
      }
    });

    it('sets aria-sort="none" on sortable headers initially', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');

      expect(nameHeader?.getAttribute('aria-sort')).toBe('none');
    });

    it('sets aria-sort="ascending" after first sort click', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');

      if (nameHeader) fire.click(nameHeader);
      await Promise.resolve();

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('ascending');
    });

    it('sets aria-sort="descending" after second sort click', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');

      if (nameHeader) {
        fire.click(nameHeader);
        await Promise.resolve();
        fire.click(nameHeader);
        await Promise.resolve();
      }

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('descending');
    });

    it('sets aria-label on the table when label prop is set', async () => {
      fixture = await mountGrid({ label: 'User list' });

      expect(fixture.query('.dg-table')?.getAttribute('aria-label')).toBe('User list');
    });

    it('sets aria-disabled="true" on the table when disabled', async () => {
      fixture = await mountGrid({ disabled: true });

      expect(fixture.query('.dg-table')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('sets aria-busy="true" on the table when loading', async () => {
      fixture = await mountGrid({ loading: true });

      expect(fixture.query('.dg-table')?.getAttribute('aria-busy')).toBe('true');
    });

    it('non-sortable header cells have no aria-sort', async () => {
      fixture = await mountGrid();
      const roleHeader = Array.from(fixture.queryAll('.dg-th')).find(
        (th) => th.textContent?.trim() === 'Role',
      );

      expect(roleHeader?.hasAttribute('aria-sort')).toBe(false);
    });

    it('has role="navigation" on pagination footer', async () => {
      fixture = await mountGrid({ 'page-size': 10 });

      expect(fixture.query('.dg-footer')?.getAttribute('role')).toBe('navigation');
    });

    it('prev/next page buttons have aria-label', async () => {
      fixture = await mountGrid({ 'page-size': 10 });

      expect(fixture.query('[aria-label="Previous page"]')).toBeTruthy();
      expect(fixture.query('[aria-label="Next page"]')).toBeTruthy();
    });
  });

  // ── Sorting ───────────────────────────────────────────────────────────────────

  describe('Sorting', () => {
    it('sorts rows ascending on first click of a sortable header', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');

      if (nameHeader) fire.click(nameHeader);
      await flush();

      const firstCell = getCell(fixture, 0, 0)?.textContent?.trim();

      expect(firstCell).toBe('Alice');
    });

    it('sorts rows descending on second click', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');

      if (nameHeader) {
        fire.click(nameHeader);
        await flush();
        fire.click(nameHeader);
        await flush();
      }

      const firstCell = getCell(fixture, 0, 0)?.textContent?.trim();

      expect(firstCell).toBe('Carol');
    });

    it('resets sort on third click', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');

      if (nameHeader) {
        fire.click(nameHeader);
        await flush();
        fire.click(nameHeader);
        await flush();
        fire.click(nameHeader);
        await flush();
      }

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('none');
    });

    it('sorts numeric column correctly (ascending)', async () => {
      fixture = await mountGrid();
      const ageHeader = getSortableHeader(fixture, 'Age');

      if (ageHeader) fire.click(ageHeader);
      await flush();

      const firstAge = getCell(fixture, 0, 2)?.textContent?.trim();

      expect(firstAge).toBe('25');
    });

    it('activates sort with Enter key', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name') as HTMLElement | null;

      if (nameHeader) fire.keyDown(nameHeader, { key: 'Enter' });
      await flush();

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('ascending');
    });

    it('emits sort-change event with key and direction', async () => {
      fixture = await mountGrid();
      const nameHeader = getSortableHeader(fixture, 'Name');
      let detail: { direction: string; key: string } | null = null;

      fixture.element.addEventListener('sort-change', (e: Event) => {
        detail = (e as CustomEvent<{ key: string; direction: string }>).detail;
      });

      if (nameHeader) fire.click(nameHeader);
      await flush();

      expect(detail).toEqual({ direction: 'asc', key: 'name' });
    });
  });

  // ── Selection ─────────────────────────────────────────────────────────────────

  describe('Selection — single', () => {
    it('sets aria-selected="true" on clicked row', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('true');
    });

    it('deselects previous row when new row is clicked', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();
      fire.click(rows[1]);
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('false');
      expect(rows[1].getAttribute('aria-selected')).toBe('true');
    });

    it('toggles selection off when same row is clicked again', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();
      fire.click(rows[0]);
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('false');
    });

    it('emits selection-change with selected row keys', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);
      let selectionDetail: { keys: string[] } | null = null;

      fixture.element.addEventListener('selection-change', (e: Event) => {
        selectionDetail = (e as CustomEvent<{ keys: string[] }>).detail;
      });

      fire.click(rows[0]);
      await Promise.resolve();

      expect(selectionDetail!.keys).toEqual(['1']);
    });

    it('selects row with Enter key', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);

      fire.keyDown(rows[0] as HTMLElement, { key: 'Enter' });
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('Selection — multi', () => {
    it('renders a checkbox column when selection-mode="multi"', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      expect(fixture.query('.dg-th-check')).toBeTruthy();
      expect(fixture.queryAll('.dg-td-check').length).toBe(ROWS.length);
    });

    it('allows selecting multiple rows independently', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });
      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();
      fire.click(rows[1]);
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('true');
      expect(rows[1].getAttribute('aria-selected')).toBe('true');
    });

    it('selects all visible rows via select-all checkbox', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });
      const selectAll = fixture.query('.dg-th-check input') as HTMLInputElement | null;

      if (selectAll) fire.change(selectAll);
      await Promise.resolve();

      const rows = getBodyRows(fixture);

      for (const row of rows) {
        expect(row.getAttribute('aria-selected')).toBe('true');
      }
    });

    it('deselects all rows when select-all is clicked again', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });
      const selectAll = fixture.query('.dg-th-check input') as HTMLInputElement | null;

      if (selectAll) {
        fire.change(selectAll);
        await Promise.resolve();
        fire.change(selectAll);
        await Promise.resolve();
      }

      const rows = getBodyRows(fixture);

      for (const row of rows) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('no rows have aria-selected in selection-mode="none"', async () => {
      fixture = await mountGrid({ 'selection-mode': 'none' });
      const rows = getBodyRows(fixture);

      for (const row of rows) {
        expect(row.hasAttribute('aria-selected')).toBe(false);
      }
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────────

  describe('Pagination', () => {
    it('shows only page-size rows when data exceeds page size', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      expect(getBodyRows(fixture).length).toBe(2);
    });

    it('navigates to next page', async () => {
      fixture = await mountGrid({ 'page-size': 2 });
      const nextBtn = fixture.query('[aria-label="Next page"]') as HTMLButtonElement | null;

      if (nextBtn) fire.click(nextBtn);
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(1);
    });

    it('prev button is disabled on first page', async () => {
      fixture = await mountGrid({ 'page-size': 2 });
      const prevBtn = fixture.query('[aria-label="Previous page"]') as HTMLButtonElement | null;

      expect(prevBtn?.disabled).toBe(true);
    });

    it('next button is disabled on last page', async () => {
      fixture = await mountGrid({ 'page-size': 2 });
      const nextBtn = fixture.query('[aria-label="Next page"]') as HTMLButtonElement | null;

      if (nextBtn) fire.click(nextBtn);
      await Promise.resolve();

      const nextBtn2 = fixture.query('[aria-label="Next page"]') as HTMLButtonElement | null;

      expect(nextBtn2?.disabled).toBe(true);
    });

    it('emits page-change with new pageIndex', async () => {
      fixture = await mountGrid({ 'page-size': 2 });
      const nextBtn = fixture.query('[aria-label="Next page"]') as HTMLButtonElement | null;
      let pageDetail: { pageIndex: number } | null = null;

      fixture.element.addEventListener('page-change', (e: Event) => {
        pageDetail = (e as CustomEvent<{ pageIndex: number }>).detail;
      });

      if (nextBtn) fire.click(nextBtn);
      await Promise.resolve();

      expect(pageDetail!.pageIndex).toBe(1);
    });

    it('shows pagination info text', async () => {
      fixture = await mountGrid({ 'page-size': 2 });
      const info = fixture.query('.dg-footer-info')?.textContent?.trim();

      expect(info).toBe('1–2 of 3');
    });
  });

  // ── Disabled / loading states ─────────────────────────────────────────────────

  describe('Disabled & loading', () => {
    it('does not select rows when disabled', async () => {
      fixture = await mountGrid({ disabled: true, 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).not.toBe('true');
    });

    it('adds data-disabled to rows when disabled', async () => {
      fixture = await mountGrid({ disabled: true, 'selection-mode': 'single' });
      const rows = getBodyRows(fixture);

      for (const row of rows) {
        expect(row.hasAttribute('data-disabled')).toBe(true);
      }
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('renders empty state when rows is empty', async () => {
      fixture = await mount('bit-datagrid', {});
      (fixture.element as HTMLElement & { columns: typeof COLS; rows: never[] }).columns = COLS;
      (fixture.element as HTMLElement & { rows: never[] }).rows = [];
      await flush();

      expect(fixture.query('.dg-empty')).toBeTruthy();
    });

    it('empty state colspan spans all columns', async () => {
      fixture = await mount('bit-datagrid', {});
      (fixture.element as HTMLElement & { columns: typeof COLS; rows: never[] }).columns = COLS;
      (fixture.element as HTMLElement & { rows: never[] }).rows = [];
      await flush();

      expect(fixture.query('.dg-empty')?.getAttribute('colspan')).toBe(String(COLS.length));
    });

    it('empty state colspan includes checkbox column in multi mode', async () => {
      fixture = await mount('bit-datagrid', { props: { 'selection-mode': 'multi' } });
      (fixture.element as HTMLElement & { columns: typeof COLS; rows: never[] }).columns = COLS;
      (fixture.element as HTMLElement & { rows: never[] }).rows = [];
      await flush();

      expect(fixture.query('.dg-empty')?.getAttribute('colspan')).toBe(String(COLS.length + 1));
    });

    it('renders correctly with a single column and single row', async () => {
      fixture = await mount('bit-datagrid', {});
      (fixture.element as HTMLElement & { columns: { key: string; label: string }[]; rows: { id: string; name: string }[] }).columns = [
        { key: 'name', label: 'Name' },
      ];
      (fixture.element as HTMLElement & { rows: { id: string; name: string }[] }).rows = [{ id: '1', name: 'Solo' }];
      await flush();

      expect(getBodyRows(fixture).length).toBe(1);
      expect(getCell(fixture, 0, 0)?.textContent?.trim()).toBe('Solo');
    });

    it('uses custom getRowKey function', async () => {
      fixture = await mount('bit-datagrid', {
        props: { 'selection-mode': 'single' },
      });

      const el = fixture.element as HTMLElement & {
        columns: typeof COLS;
        rows: typeof ROWS;
        getRowKey: (r: User) => string;
      };

      el.columns = COLS;
      el.rows = ROWS;
      el.getRowKey = (r: User) => `user-${r.id}`;
      await Promise.resolve();

      let rowKeyDetail: { keys: string[] } | null = null;

      fixture.element.addEventListener('selection-change', (e: Event) => {
        rowKeyDetail = (e as CustomEvent<{ keys: string[] }>).detail;
      });

      fire.click(getBodyRows(fixture)[0]);
      await Promise.resolve();

      expect(rowKeyDetail!.keys[0]).toBe('user-1');
    });

    it('applies striped attribute to host', async () => {
      fixture = await mountGrid({ striped: true });

      expect(fixture.element.hasAttribute('striped')).toBe(true);
    });
  });
});
