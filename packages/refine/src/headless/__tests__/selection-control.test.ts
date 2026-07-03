import { createSelectionControl } from '../selection-control';

type Row = { id: string };

const ROWS: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function makeControl(overrides: Partial<Parameters<typeof createSelectionControl<Row>>[0]> = {}) {
  return createSelectionControl<Row>({
    getRowKey: (item) => item.id,
    pageItems: () => ROWS,
    selectionMode: () => 'multi',
    ...overrides,
  });
}

describe('createSelectionControl()', () => {
  describe('initial state', () => {
    it('starts with no rows selected', () => {
      const ctrl = makeControl();

      expect(ctrl.selectedKeys.value.size).toBe(0);
      expect(ctrl.isSelected('a')).toBe(false);
    });

    it('isAllSelected() returns false when the page is empty', () => {
      const ctrl = makeControl({ pageItems: () => [] });

      expect(ctrl.isAllSelected()).toBe(false);
    });
  });

  describe('toggleRow() — multi mode', () => {
    it('selects and deselects a row', () => {
      const ctrl = makeControl();

      ctrl.toggleRow('a');
      expect(ctrl.isSelected('a')).toBe(true);

      ctrl.toggleRow('a');
      expect(ctrl.isSelected('a')).toBe(false);
    });

    it('accumulates multiple selections', () => {
      const ctrl = makeControl();

      ctrl.toggleRow('a');
      ctrl.toggleRow('b');
      expect(ctrl.selectedKeys.value).toEqual(new Set(['a', 'b']));
    });

    it('fires onSelectionChange with the full selection', () => {
      const onSelectionChange = vi.fn();
      const ctrl = makeControl({ onSelectionChange });

      ctrl.toggleRow('a');
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['a']));
    });
  });

  describe('toggleRow() — single mode', () => {
    it('replaces the previous selection instead of accumulating', () => {
      const ctrl = makeControl({ selectionMode: () => 'single' });

      ctrl.toggleRow('a');
      ctrl.toggleRow('b');
      expect(ctrl.selectedKeys.value).toEqual(new Set(['b']));
    });

    it('deselects when toggling the already-selected row', () => {
      const ctrl = makeControl({ selectionMode: () => 'single' });

      ctrl.toggleRow('a');
      ctrl.toggleRow('a');
      expect(ctrl.selectedKeys.value.size).toBe(0);
    });
  });

  describe('toggleRow() — none mode', () => {
    it('is a no-op', () => {
      const onSelectionChange = vi.fn();
      const ctrl = makeControl({ onSelectionChange, selectionMode: () => 'none' });

      ctrl.toggleRow('a');
      expect(ctrl.selectedKeys.value.size).toBe(0);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('selectAll()', () => {
    it('selects every row on the current page in multi mode', () => {
      const ctrl = makeControl();

      ctrl.selectAll();
      expect(ctrl.isAllSelected()).toBe(true);
      expect(ctrl.selectedKeys.value.size).toBe(ROWS.length);
    });

    it('deselects the page when all rows are already selected (toggle-off)', () => {
      const ctrl = makeControl();

      ctrl.selectAll();
      ctrl.selectAll();
      expect(ctrl.selectedKeys.value.size).toBe(0);
    });

    it('is a no-op outside multi mode', () => {
      const single = makeControl({ selectionMode: () => 'single' });

      single.selectAll();
      expect(single.selectedKeys.value.size).toBe(0);

      const none = makeControl({ selectionMode: () => 'none' });

      none.selectAll();
      expect(none.selectedKeys.value.size).toBe(0);
    });
  });

  describe('clearSelection()', () => {
    it('deselects all rows and fires onSelectionChange', () => {
      const onSelectionChange = vi.fn();
      const ctrl = makeControl({ onSelectionChange });

      ctrl.selectAll();
      ctrl.clearSelection();

      expect(ctrl.selectedKeys.value.size).toBe(0);
      expect(onSelectionChange).toHaveBeenLastCalledWith(new Set());
    });
  });

  describe('setSelection()', () => {
    it('replaces the selection with an explicit set of keys', () => {
      const ctrl = makeControl();

      ctrl.toggleRow('a');
      ctrl.setSelection(new Set(['b', 'c']));

      expect(ctrl.selectedKeys.value).toEqual(new Set(['b', 'c']));
    });
  });

  describe('selectedKeys immutability', () => {
    it('mutating a read snapshot does not leak into the next reactive update', () => {
      const ctrl = makeControl();

      ctrl.toggleRow('a');

      const snapshot = ctrl.selectedKeys.value as Set<string>;

      snapshot.add('z');

      // Force a new snapshot to be computed via a real state change.
      ctrl.toggleRow('b');

      expect(ctrl.selectedKeys.value.has('z')).toBe(false);
      expect(ctrl.selectedKeys.value).toEqual(new Set(['a', 'b']));
    });
  });
});
