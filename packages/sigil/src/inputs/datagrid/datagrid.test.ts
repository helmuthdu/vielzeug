import { fire, type Fixture, mount } from '@vielzeug/craft/testing';

import type { DataGridColumn } from '../../headless';

import { ariaSortValue, sortIconName } from './datagrid';

// ── Pure helper unit tests (no DOM required) ──────────────────────────────────

describe('sortIconName (pure)', () => {
  it('returns chevrons-up-down when sort is none', () => {
    expect(sortIconName({ direction: 'none', key: '' }, 'name')).toBe('chevrons-up-down');
  });

  it('returns chevrons-up-down for a different key', () => {
    expect(sortIconName({ direction: 'asc', key: 'age' }, 'name')).toBe('chevrons-up-down');
  });

  it('returns chevron-up for asc on matching key', () => {
    expect(sortIconName({ direction: 'asc', key: 'name' }, 'name')).toBe('chevron-up');
  });

  it('returns chevron-down for desc on matching key', () => {
    expect(sortIconName({ direction: 'desc', key: 'name' }, 'name')).toBe('chevron-down');
  });
});

describe('ariaSortValue (pure)', () => {
  it('returns none when direction is none', () => {
    expect(ariaSortValue({ direction: 'none', key: '' }, 'name')).toBe('none');
  });

  it('returns none for a different key', () => {
    expect(ariaSortValue({ direction: 'asc', key: 'age' }, 'name')).toBe('none');
  });

  it('returns ascending for asc on matching key', () => {
    expect(ariaSortValue({ direction: 'asc', key: 'name' }, 'name')).toBe('ascending');
  });

  it('returns descending for desc on matching key', () => {
    expect(ariaSortValue({ direction: 'desc', key: 'name' }, 'name')).toBe('descending');
  });
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

type User = { age: number; id: string; name: string; role: string };

const COLS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'age', label: 'Age', sortable: true },
];

const ROWS: User[] = [
  { age: 32, id: '1', name: 'Alice', role: 'Admin' },
  { age: 25, id: '2', name: 'Bob', role: 'Editor' },
  { age: 28, id: '3', name: 'Carol', role: 'Viewer' },
];

// ── DOM helpers ───────────────────────────────────────────────────────────────

type GridElement = HTMLElement & {
  columns: DataGridColumn<User>[];
  getRowKey?: (r: User) => string;
  'page-size-options'?: number[];
  rows: typeof ROWS;
  'selected-keys'?: string[];
};

async function mountGrid(overrides: Record<string, unknown> = {}): Promise<Fixture<HTMLElement>> {
  const fixture = await mount('bit-datagrid', { props: overrides });
  const el = fixture.element as GridElement;

  el.columns = COLS;
  el.rows = ROWS;
  await Promise.resolve();

  return fixture;
}

function getHeaderCells(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.dg-th'));
}

function getBodyRows(fixture: Fixture<HTMLElement>): Element[] {
  return Array.from(fixture.queryAll('.dg-body .dg-tr'));
}

function getCell(fixture: Fixture<HTMLElement>, rowIdx: number, colIdx: number): Element | null {
  const row = getBodyRows(fixture)[rowIdx];

  return row?.querySelectorAll('.dg-td')[colIdx] ?? null;
}

/**
 * Returns the sort button (.dg-sort-btn) inside the sortable <th> whose
 * label starts with the given string.
 */
function getSortButton(fixture: Fixture<HTMLElement>, label: string): HTMLButtonElement | null {
  const th = Array.from(fixture.queryAll('.dg-th[aria-sort]')).find((el) => el.textContent?.trim().startsWith(label));

  return (th?.querySelector('.dg-sort-btn') as HTMLButtonElement) ?? null;
}

/**
 * Returns the sortable <th> whose label starts with the given string.
 */
function getSortableHeader(fixture: Fixture<HTMLElement>, label: string): Element | null {
  return (
    Array.from(fixture.queryAll('.dg-th[aria-sort]')).find((el) => el.textContent?.trim().startsWith(label)) ?? null
  );
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('bit-datagrid', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./datagrid');
    await import('../../content/icon/icon');
    await import('../../inputs/checkbox/checkbox');
    await import('../../inputs/input/input');
    await import('../../inputs/select/select');
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

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = [] as unknown as typeof ROWS;
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

    it('sets role="columnheader" on all header cells', async () => {
      fixture = await mountGrid();

      for (const th of fixture.queryAll('.dg-th')) {
        expect(th.getAttribute('role')).toBe('columnheader');
      }
    });

    it('sets scope="col" on all header cells', async () => {
      fixture = await mountGrid();

      for (const th of fixture.queryAll('.dg-th')) {
        expect(th.getAttribute('scope')).toBe('col');
      }
    });

    it('sets role="row" on body rows', async () => {
      fixture = await mountGrid();

      for (const row of getBodyRows(fixture)) {
        expect(row.getAttribute('role')).toBe('row');
      }
    });

    it('sets role="gridcell" on body cells', async () => {
      fixture = await mountGrid();

      for (const cell of fixture.queryAll('.dg-td')) {
        expect(cell.getAttribute('role')).toBe('gridcell');
      }
    });

    it('sets aria-sort="none" on sortable headers initially', async () => {
      fixture = await mountGrid();

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('none');
    });

    it('sets aria-sort="ascending" after first sort click', async () => {
      fixture = await mountGrid();

      fire.click(getSortButton(fixture, 'Name')!);
      await Promise.resolve();

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('ascending');
    });

    it('sets aria-sort="descending" after second sort click', async () => {
      fixture = await mountGrid();

      const btn = getSortButton(fixture, 'Name')!;

      fire.click(btn);
      await Promise.resolve();
      fire.click(btn);
      await Promise.resolve();

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

      const roleHeader = Array.from(fixture.queryAll('.dg-th')).find((th) => th.textContent?.trim() === 'Role');

      expect(roleHeader?.hasAttribute('aria-sort')).toBe(false);
    });

    it('sortable header contains a button for keyboard activation', async () => {
      fixture = await mountGrid();

      expect(getSortButton(fixture, 'Name')).toBeTruthy();
    });

    it('sort button has aria-label matching column header label', async () => {
      fixture = await mountGrid();

      expect(getSortButton(fixture, 'Name')?.getAttribute('aria-label')).toBe('Name');
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
    it('sorts rows ascending on first sort-button click', async () => {
      fixture = await mountGrid();

      fire.click(getSortButton(fixture, 'Name')!);
      await Promise.resolve();

      expect(getCell(fixture, 0, 0)?.textContent?.trim()).toBe('Alice');
    });

    it('sorts rows descending on second click', async () => {
      fixture = await mountGrid();

      const btn = getSortButton(fixture, 'Name')!;

      fire.click(btn);
      await Promise.resolve();
      fire.click(btn);
      await Promise.resolve();

      expect(getCell(fixture, 0, 0)?.textContent?.trim()).toBe('Carol');
    });

    it('resets sort on third click', async () => {
      fixture = await mountGrid();

      const btn = getSortButton(fixture, 'Name')!;

      fire.click(btn);
      await Promise.resolve();
      fire.click(btn);
      await Promise.resolve();
      fire.click(btn);
      await Promise.resolve();

      expect(getSortableHeader(fixture, 'Name')?.getAttribute('aria-sort')).toBe('none');
    });

    it('sorts numeric column correctly ascending', async () => {
      fixture = await mountGrid();

      fire.click(getSortButton(fixture, 'Age')!);
      await Promise.resolve();

      expect(getCell(fixture, 0, 2)?.textContent?.trim()).toBe('25');
    });

    it('emits sort-change with key and direction', async () => {
      fixture = await mountGrid();

      let detail: { direction: string; key: string } | null = null;

      fixture.element.addEventListener('sort-change', (e: Event) => {
        detail = (e as CustomEvent<{ direction: string; key: string }>).detail;
      });

      fire.click(getSortButton(fixture, 'Name')!);
      await Promise.resolve();

      expect(detail).toEqual({ direction: 'asc', key: 'name' });
    });
  });

  // ── sort-mode="server" ────────────────────────────────────────────────────────

  describe('Sorting — server mode', () => {
    it('emits sort-change but does NOT reorder rows', async () => {
      fixture = await mountGrid({ 'sort-mode': 'server' });

      const originalFirst = getCell(fixture, 0, 0)?.textContent?.trim();
      let detail: { direction: string; key: string } | null = null;

      fixture.element.addEventListener('sort-change', (e: Event) => {
        detail = (e as CustomEvent<{ direction: string; key: string }>).detail;
      });

      fire.click(getSortButton(fixture, 'Name')!);
      await Promise.resolve();

      expect(detail).toEqual({ direction: 'asc', key: 'name' });
      expect(getCell(fixture, 0, 0)?.textContent?.trim()).toBe(originalFirst);
    });
  });

  // ── Selection — single ────────────────────────────────────────────────────────

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

    it('emits selection-change with selected row keys and rows', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });

      let detail: { keys: string[]; rows: User[] } | null = null;

      fixture.element.addEventListener('selection-change', (e: Event) => {
        detail = (e as CustomEvent<{ keys: string[]; rows: User[] }>).detail;
      });

      fire.click(getBodyRows(fixture)[0]);
      await Promise.resolve();

      expect(detail!.keys).toEqual(['1']);
      expect(detail!.rows[0]).toMatchObject({ id: '1', name: 'Alice' });
    });

    it('selects row with Enter key', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });

      const rows = getBodyRows(fixture);

      fire.keyDown(rows[0] as HTMLElement, { key: 'Enter' });
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('true');
    });

    it('no rows have aria-selected when selection-mode="none"', async () => {
      fixture = await mountGrid({ 'selection-mode': 'none' });

      for (const row of getBodyRows(fixture)) {
        expect(row.hasAttribute('aria-selected')).toBe(false);
      }
    });
  });

  // ── Selection — multi ─────────────────────────────────────────────────────────

  describe('Selection — multi', () => {
    it('renders a checkbox column when selection-mode="multi"', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      expect(fixture.query('.dg-th-check')).toBeTruthy();
      expect(fixture.queryAll('.dg-td-check').length).toBe(ROWS.length);
    });

    it('renders bit-checkbox in the header and each row', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      expect(fixture.query('.dg-th-check bit-checkbox')).toBeTruthy();
      expect(fixture.queryAll('.dg-td-check bit-checkbox').length).toBe(ROWS.length);
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

    it('selects all visible rows via the select-all bit-checkbox', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      const selectAll = fixture.query('.dg-th-check bit-checkbox') as HTMLElement | null;

      fire.change(selectAll!);
      await Promise.resolve();

      for (const row of getBodyRows(fixture)) {
        expect(row.getAttribute('aria-selected')).toBe('true');
      }
    });

    it('deselects all rows when select-all is toggled again', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      const selectAll = fixture.query('.dg-th-check bit-checkbox') as HTMLElement | null;

      fire.change(selectAll!);
      await Promise.resolve();
      fire.change(selectAll!);
      await Promise.resolve();

      for (const row of getBodyRows(fixture)) {
        expect(row.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('select-all bit-checkbox shows indeterminate when some rows are selected', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();

      const selectAll = fixture.query('.dg-th-check bit-checkbox') as HTMLElement | null;

      expect(selectAll?.hasAttribute('indeterminate')).toBe(true);
      expect(selectAll?.hasAttribute('checked')).toBe(false);
    });

    it('select-all bit-checkbox shows checked when all rows are selected', async () => {
      fixture = await mountGrid({ 'selection-mode': 'multi' });

      const selectAll = fixture.query('.dg-th-check bit-checkbox') as HTMLElement | null;

      fire.change(selectAll!);
      await Promise.resolve();

      expect(selectAll?.hasAttribute('checked')).toBe(true);
      expect(selectAll?.hasAttribute('indeterminate')).toBe(false);
    });
  });

  // ── selected-keys controlled prop ─────────────────────────────────────────────

  describe('selected-keys (controlled)', () => {
    it('pre-selects rows when selected-keys is set before mount', async () => {
      fixture = await mountGrid({ 'selected-keys': ['2'], 'selection-mode': 'single' });

      const rows = getBodyRows(fixture);

      expect(rows[1].getAttribute('aria-selected')).toBe('true');
      expect(rows[0].getAttribute('aria-selected')).toBe('false');
    });

    it('updates selection when selected-keys prop changes', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });

      const el = fixture.element as GridElement;

      (el as unknown as { 'selected-keys': string[] })['selected-keys'] = ['3'];
      await Promise.resolve();

      const rows = getBodyRows(fixture);

      expect(rows[2].getAttribute('aria-selected')).toBe('true');
    });

    it('clears selection when selected-keys is set to []', async () => {
      fixture = await mountGrid({ 'selection-mode': 'single' });

      const rows = getBodyRows(fixture);

      fire.click(rows[0]);
      await Promise.resolve();

      (fixture.element as unknown as { 'selected-keys': string[] })['selected-keys'] = [];
      await Promise.resolve();

      expect(rows[0].getAttribute('aria-selected')).toBe('false');
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

      const nextBtn = fixture.query('[aria-label="Next page"]') as HTMLButtonElement;

      fire.click(nextBtn);
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(1);
    });

    it('prev button is disabled on first page', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      const prevBtn = fixture.query('[aria-label="Previous page"]') as HTMLButtonElement;

      expect(prevBtn.disabled).toBe(true);
    });

    it('next button is disabled on last page', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      const nextBtn = fixture.query('[aria-label="Next page"]') as HTMLButtonElement;

      fire.click(nextBtn);
      await Promise.resolve();

      expect((fixture.query('[aria-label="Next page"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('emits page-change with new pageIndex', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      let pageDetail: { pageIndex: number } | null = null;

      fixture.element.addEventListener('page-change', (e: Event) => {
        pageDetail = (e as CustomEvent<{ pageIndex: number }>).detail;
      });

      fire.click(fixture.query('[aria-label="Next page"]') as HTMLButtonElement);
      await Promise.resolve();

      expect(pageDetail!.pageIndex).toBe(1);
    });

    it('shows pagination info text with "to" separator', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      expect(fixture.query('.dg-footer-info')?.textContent?.trim()).toBe('1 to 2 of 3');
    });

    it('page-size=0 shows all rows and no footer', async () => {
      fixture = await mountGrid({ 'page-size': 0 });

      expect(getBodyRows(fixture).length).toBe(ROWS.length);
      expect(fixture.query('.dg-footer')).toBeNull();
    });
  });

  // ── Disabled & loading ────────────────────────────────────────────────────────

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

      for (const row of getBodyRows(fixture)) {
        expect(row.hasAttribute('data-disabled')).toBe(true);
      }
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('renders empty state when rows is empty', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = [] as unknown as typeof ROWS;
      await Promise.resolve();

      expect(fixture.query('.dg-empty')).toBeTruthy();
    });

    it('empty state colspan spans all columns', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = [] as unknown as typeof ROWS;
      await Promise.resolve();

      expect(fixture.query('.dg-empty')?.getAttribute('colspan')).toBe(String(COLS.length));
    });

    it('empty state colspan includes checkbox column in multi mode', async () => {
      fixture = await mount('bit-datagrid', { props: { 'selection-mode': 'multi' } });

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = [] as unknown as typeof ROWS;
      await Promise.resolve();

      expect(fixture.query('.dg-empty')?.getAttribute('colspan')).toBe(String(COLS.length + 1));
    });

    it('renders correctly with a single column and single row', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as HTMLElement & {
        columns: { key: string; label: string }[];
        rows: { id: string; name: string }[];
      };

      el.columns = [{ key: 'name', label: 'Name' }];
      el.rows = [{ id: '1', name: 'Solo' }];
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(1);
      expect(getCell(fixture, 0, 0)?.textContent?.trim()).toBe('Solo');
    });

    it('uses custom getRowKey function', async () => {
      fixture = await mount('bit-datagrid', { props: { 'selection-mode': 'single' } });

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = ROWS;
      el.getRowKey = (r: User) => `user-${r.id}`;
      await Promise.resolve();

      let detail: { keys: string[] } | null = null;

      fixture.element.addEventListener('selection-change', (e: Event) => {
        detail = (e as CustomEvent<{ keys: string[] }>).detail;
      });

      fire.click(getBodyRows(fixture)[0]);
      await Promise.resolve();

      expect(detail!.keys[0]).toBe('user-1');
    });
  });

  // ── Searchable ────────────────────────────────────────────────────────────────

  describe('Searchable', () => {
    it('does not render a toolbar when searchable is not set and no filters', async () => {
      fixture = await mountGrid({});

      expect(fixture.query('.dg-toolbar')).toBeNull();
    });

    it('renders a toolbar with search input when searchable is set', async () => {
      fixture = await mountGrid({ searchable: true });

      expect(fixture.query('.dg-toolbar')).toBeTruthy();
      expect(fixture.query('.dg-search')).toBeTruthy();
    });

    it('renders a toolbar with filters but no search input when only filters are set', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = ROWS;
      (el as unknown as { filters: unknown[] }).filters = [
        { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
      ];
      await Promise.resolve();

      expect(fixture.query('.dg-toolbar')).toBeTruthy();
      expect(fixture.query('.dg-search')).toBeNull();
      expect(fixture.query('.dg-filter')).toBeTruthy();
    });

    it('filters rows matching the search query', async () => {
      fixture = await mountGrid({ searchable: true });

      const search = fixture.query('.dg-search') as HTMLElement;

      search.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: 'alice' } }));
      await Promise.resolve();

      const rows = getBodyRows(fixture);

      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Alice');
    });

    it('resets to page 0 when the search query changes', async () => {
      fixture = await mountGrid({ 'page-size': 2, searchable: true });

      const paginationLabel = fixture.query('.dg-page-label');

      expect(paginationLabel?.textContent?.trim()).toBe('1 / 2');

      fire.click(fixture.query('[aria-label="Next page"]') as HTMLElement);
      await Promise.resolve();
      expect(paginationLabel?.textContent?.trim()).toBe('2 / 2');

      const search = fixture.query('.dg-search') as HTMLElement;

      search.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: 'a' } }));
      await Promise.resolve();

      expect(paginationLabel?.textContent?.trim()).toBe('1 / 1');
    });

    it('shows all rows again when query is cleared', async () => {
      fixture = await mountGrid({ searchable: true });

      const search = fixture.query('.dg-search') as HTMLElement;

      search.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: 'alice' } }));
      await Promise.resolve();
      expect(getBodyRows(fixture).length).toBe(1);

      search.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: '' } }));
      await Promise.resolve();
      expect(getBodyRows(fixture).length).toBe(ROWS.length);
    });
  });

  // ── Page-size options ─────────────────────────────────────────────────────────

  describe('page-size-options', () => {
    it('does not render a page-size select by default', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      expect(fixture.query('.dg-page-size-select')).toBeNull();
    });

    it('renders a bit-select when page-size-options is set', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      const el = fixture.element as GridElement;

      el['page-size-options'] = [2, 5, 10];
      await Promise.resolve();

      expect(fixture.query('.dg-page-size-select')).toBeTruthy();
    });

    it('emits page-change when page size is changed via the select', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      const el = fixture.element as GridElement;

      el['page-size-options'] = [2, 10];
      await Promise.resolve();

      let detail: { pageIndex: number; pageSize: number } | null = null;

      fixture.element.addEventListener('page-change', (e: Event) => {
        detail = (e as CustomEvent<{ pageIndex: number; pageSize: number }>).detail;
      });

      const select = fixture.query('.dg-page-size-select') as HTMLElement;

      select.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: '10' } }));
      await Promise.resolve();

      expect(detail).not.toBeNull();
      expect(detail!.pageIndex).toBe(0);
      expect(detail!.pageSize).toBe(10);
    });

    it('changes the page size and resets to page 0 on select change', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      const el = fixture.element as GridElement;

      el['page-size-options'] = [2, 10];
      await Promise.resolve();

      fire.click(fixture.query('[aria-label="Next page"]') as HTMLElement);
      await Promise.resolve();
      expect(fixture.query('.dg-page-label')?.textContent?.trim()).toBe('2 / 2');

      const select = fixture.query('.dg-page-size-select') as HTMLElement;

      select.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: '10' } }));
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(ROWS.length);
      expect(fixture.query('.dg-page-label')?.textContent?.trim()).toBe('1 / 1');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('applies striped attribute to host (kept in its own suite)', async () => {
      fixture = await mountGrid({ striped: true });

      expect(fixture.element.hasAttribute('striped')).toBe(true);
    });

    it('custom cell renderer formats the displayed value', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as HTMLElement & {
        columns: { cell?: (r: User) => string; key: string; label: string }[];
        rows: User[];
      };

      el.columns = [
        { key: 'name', label: 'Name' },
        { cell: (r: User) => `${r.age} yrs`, key: 'age', label: 'Age' },
      ];
      el.rows = ROWS;
      await Promise.resolve();

      expect(getCell(fixture, 0, 1)?.textContent?.trim()).toBe('32 yrs');
    });

    it('body cells have tabindex="-1" for keyboard navigation', async () => {
      fixture = await mountGrid();

      const cells = Array.from(fixture.queryAll('.dg-td'));

      expect(cells.length).toBeGreaterThan(0);

      for (const cell of cells) {
        expect(cell.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('first header cell gets tabindex="0" as initial roving anchor', async () => {
      fixture = await mountGrid();

      const headers = Array.from(fixture.queryAll('.dg-th'));

      expect(headers.length).toBeGreaterThan(0);
      expect(headers[0].getAttribute('tabindex')).toBe('0');

      for (const th of headers.slice(1)) {
        expect(th.getAttribute('tabindex')).toBe('-1');
      }
    });
  });

  // ── Declarative bit-column ─────────────────────────────────────────────────────

  describe('Declarative bit-column children', () => {
    it('renders columns from bit-column children when no columns prop is set', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as HTMLElement & { rows: User[] };

      el.innerHTML = `
        <bit-column key="name" label="Name"></bit-column>
        <bit-column key="role" label="Role"></bit-column>
      `;
      el.rows = ROWS;
      await new Promise((r) => setTimeout(r, 0));

      const headers = Array.from(fixture.queryAll('.dg-th'));

      expect(headers.map((h) => h.textContent?.trim())).toContain('Name');
      expect(headers.map((h) => h.textContent?.trim())).toContain('Role');
    });

    it('JS columns prop wins over declarative children when both are set', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.innerHTML = '<bit-column key="name" label="FromHTML"></bit-column>';
      el.columns = [{ key: 'name', label: 'FromJS' }];
      el.rows = ROWS;
      await new Promise((r) => setTimeout(r, 0));

      const headers = Array.from(fixture.queryAll('.dg-th'));

      expect(headers[0]?.textContent?.trim()).toBe('FromJS');
    });

    it('marks sortable columns from bit-column[sortable]', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as HTMLElement & { rows: User[] };

      el.innerHTML = '<bit-column key="name" label="Name" sortable></bit-column>';
      el.rows = ROWS;
      await new Promise((r) => setTimeout(r, 0));

      expect(fixture.query('.dg-sort-btn')).toBeTruthy();
    });

    it('setting columns=[] explicitly clears declarative children', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.innerHTML = '<bit-column key="name" label="Name"></bit-column>';
      el.rows = ROWS;
      await new Promise((r) => setTimeout(r, 0));

      expect(fixture.queryAll('.dg-th').length).toBe(1);

      el.columns = [] as unknown as typeof COLS;
      await Promise.resolve();

      expect(fixture.queryAll('.dg-th').length).toBe(0);
    });

    it('reacts to dynamically added bit-column children', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as HTMLElement & { rows: User[] };

      el.rows = ROWS;
      await new Promise((r) => setTimeout(r, 0));

      expect(fixture.queryAll('.dg-th').length).toBe(0);

      const col = document.createElement('bit-column');

      col.setAttribute('key', 'name');
      col.setAttribute('label', 'Name');
      el.appendChild(col);
      await new Promise((r) => setTimeout(r, 0));

      expect(fixture.queryAll('.dg-th').length).toBe(1);
    });
  });

  // ── Keyboard cell navigation ────────────────────────────────────────────────

  describe('Keyboard cell navigation (ARIA grid)', () => {
    it('ArrowRight moves focus from first to second cell in same row', async () => {
      fixture = await mountGrid();

      const cells = Array.from(fixture.queryAll<HTMLElement>('.dg-td'));
      const firstCell = cells[0] as HTMLElement;
      const secondCell = cells[1] as HTMLElement;

      firstCell.focus();
      firstCell.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      await Promise.resolve();

      expect(fixture.element.shadowRoot?.activeElement).toBe(secondCell);
    });

    it('ArrowLeft moves focus from second to first cell', async () => {
      fixture = await mountGrid();

      const cells = Array.from(fixture.queryAll<HTMLElement>('.dg-td'));
      const firstCell = cells[0] as HTMLElement;
      const secondCell = cells[1] as HTMLElement;

      secondCell.focus();
      secondCell.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      await Promise.resolve();

      expect(fixture.element.shadowRoot?.activeElement).toBe(firstCell);
    });

    it('ArrowDown moves focus from header cell to first body cell in same column', async () => {
      fixture = await mountGrid();

      const firstHeader = fixture.queryAll<HTMLElement>('.dg-th')[0] as HTMLElement;
      const firstBodyCell = fixture.queryAll<HTMLElement>('.dg-td')[0] as HTMLElement;

      firstHeader.focus();
      firstHeader.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      await Promise.resolve();

      expect(fixture.element.shadowRoot?.activeElement).toBe(firstBodyCell);
    });

    it('ArrowDown moves focus to same column in next body row', async () => {
      fixture = await mountGrid();

      const bodyCells = Array.from(fixture.queryAll<HTMLElement>('.dg-td'));
      const firstCell = bodyCells[0] as HTMLElement;
      const cellBelow = bodyCells[COLS.length] as HTMLElement;

      firstCell.focus();
      firstCell.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
      await Promise.resolve();

      expect(fixture.element.shadowRoot?.activeElement).toBe(cellBelow);
    });
  });

  // ── F6: programmatic focusCell API ────────────────────────────────────────

  describe('focusCell API (F6)', () => {
    it('exposes focusCell function on host element', async () => {
      fixture = await mountGrid();

      expect(typeof (fixture.element as HTMLElement & { focusCell?: unknown }).focusCell).toBe('function');
    });

    it('calling focusCell before mount does not throw', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement & { focusCell?: (pos: { col: number; row: number }) => void };

      expect(() => el.focusCell?.({ col: 0, row: 0 })).not.toThrow();
    });
  });

  // ── F4: column resizing ───────────────────────────────────────────────────

  describe('Column resizing (F4)', () => {
    it('adds dg-col-resize handle to resizable columns', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = [
        { key: 'name', label: 'Name', resizable: true, sortable: true },
        { key: 'role', label: 'Role' },
      ];
      el.rows = ROWS;
      await Promise.resolve();

      expect(fixture.query('.dg-col-resize')).toBeTruthy();
    });

    it('does not add dg-col-resize handle to non-resizable columns', async () => {
      fixture = await mountGrid();

      expect(fixture.query('.dg-col-resize')).toBeNull();
    });

    it('only adds one resize handle per resizable column', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = [
        { key: 'name', label: 'Name', resizable: true },
        { key: 'role', label: 'Role', resizable: true },
        { key: 'age', label: 'Age' },
      ];
      el.rows = ROWS;
      await Promise.resolve();

      expect(fixture.queryAll('.dg-col-resize').length).toBe(2);
    });
  });

  // ── B1: single pageSize signal ────────────────────────────────────────────

  describe('B1: pageSize seeded from initial prop', () => {
    it('uses page-size prop value as initial page size', async () => {
      fixture = await mountGrid({ 'page-size': 2 });

      expect(getBodyRows(fixture).length).toBe(2);
    });

    it('falls back to 10 when page-size prop is not set', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = Array.from({ length: 15 }, (_, i) => ({ age: i, id: String(i), name: `User${i}`, role: 'User' }));
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(10);
    });
  });

  // ── B2: split searchedRows / filteredRows ─────────────────────────────────

  describe('B2: searchedRows and filteredRows composition', () => {
    it('search and filter are composed — filter operates on searched result', async () => {
      fixture = await mount('bit-datagrid', { props: { searchable: true } });

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = ROWS;
      (el as unknown as { filters: unknown[] }).filters = [
        { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
      ];
      await Promise.resolve();

      const search = fixture.query('.dg-search') as HTMLElement;

      search.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { value: 'alice' } }));
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(1);
    });
  });

  // ── B4: reactive page reset on filter/search change ───────────────────────

  describe('B4: reactive page reset', () => {
    it('resets to page 0 when filter changes', async () => {
      fixture = await mount('bit-datagrid', { props: { 'page-size': 2 } });

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = ROWS;
      (el as unknown as { filters: unknown[] }).filters = [
        { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
      ];
      await Promise.resolve();

      fire.click(fixture.query('[aria-label="Next page"]') as HTMLElement);
      await Promise.resolve();
      expect(fixture.query('.dg-page-label')?.textContent?.trim()).toBe('2 / 2');

      const filterSelect = fixture.query('.dg-filter') as HTMLElement;

      filterSelect.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { values: ['Admin'] } }));
      await Promise.resolve();

      expect(fixture.query('.dg-page-label')?.textContent?.trim()).toBe('1 / 1');
    });
  });

  // ── B5: setFilter helper ──────────────────────────────────────────────────

  describe('B5: setFilter encapsulation', () => {
    it('filter selection updates visible rows', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = ROWS;
      (el as unknown as { filters: unknown[] }).filters = [
        { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
      ];
      await Promise.resolve();

      const filterSelect = fixture.query('.dg-filter') as HTMLElement;

      filterSelect.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { values: ['Admin'] } }));
      await Promise.resolve();

      const rows = getBodyRows(fixture);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.textContent?.includes('Admin'))).toBe(true);
    });

    it('clearing filter selection restores all rows', async () => {
      fixture = await mount('bit-datagrid', {});

      const el = fixture.element as GridElement;

      el.columns = COLS;
      el.rows = ROWS;
      (el as unknown as { filters: unknown[] }).filters = [
        { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
      ];
      await Promise.resolve();

      const filterSelect = fixture.query('.dg-filter') as HTMLElement;

      filterSelect.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { values: ['Admin'] } }));
      await Promise.resolve();

      filterSelect.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { values: [] } }));
      await Promise.resolve();

      expect(getBodyRows(fixture).length).toBe(ROWS.length);
    });
  });

  // ── C3: bit-column validation warnings ───────────────────────────────────

  describe('C3: bit-column connectedCallback validation', () => {
    it('warns when bit-column is missing key attribute', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const col = document.createElement('bit-column');

      col.setAttribute('label', 'Name');
      document.body.appendChild(col);
      await Promise.resolve();

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[bit-column]'), expect.anything());

      col.remove();
      spy.mockRestore();
    });

    it('warns when bit-column is missing label attribute', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const col = document.createElement('bit-column');

      col.setAttribute('key', 'name');
      document.body.appendChild(col);
      await Promise.resolve();

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[bit-column]'), expect.anything());

      col.remove();
      spy.mockRestore();
    });

    it('does not warn when bit-column has both key and label', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const col = document.createElement('bit-column');

      col.setAttribute('key', 'name');
      col.setAttribute('label', 'Name');
      document.body.appendChild(col);
      await Promise.resolve();

      expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('[bit-column]'), expect.anything());

      col.remove();
      spy.mockRestore();
    });
  });
});
