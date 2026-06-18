import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import { createSortControl } from '../sort-control';

type Row = { age: number; id: string; name: string };

const ROWS: Row[] = [
  { age: 30, id: '1', name: 'Charlie' },
  { age: 25, id: '2', name: 'Alice' },
  { age: 35, id: '3', name: 'Bob' },
];

describe('createSortControl()', () => {
  describe('initial state', () => {
    it('starts with no sort applied', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({ columns: () => [], items });

      expect(ctrl.sortState.value).toEqual({ direction: 'none', key: '' });
    });

    it('sortedItems matches the original order when no sort is active', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({ columns: () => [], items });

      expect(ctrl.sortedItems.value).toBe(items.value);
    });
  });

  describe('sortBy() cycling', () => {
    it('cycles: none → asc → desc → none', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [{ key: 'name', label: 'Name', sortable: true }],
        items,
      });

      ctrl.sortBy('name');
      expect(ctrl.sortState.value).toEqual({ direction: 'asc', key: 'name' });

      ctrl.sortBy('name');
      expect(ctrl.sortState.value).toEqual({ direction: 'desc', key: 'name' });

      ctrl.sortBy('name');
      expect(ctrl.sortState.value).toEqual({ direction: 'none', key: '' });
    });

    it('switching column resets to asc', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'age', label: 'Age', sortable: true },
        ],
        items,
      });

      ctrl.sortBy('name');
      ctrl.sortBy('age');

      expect(ctrl.sortState.value).toEqual({ direction: 'asc', key: 'age' });
    });
  });

  describe('numeric sort', () => {
    it('sorts numeric columns in ascending order', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [{ key: 'age', label: 'Age', sortable: true }],
        items,
      });

      ctrl.sortBy('age');

      expect(ctrl.sortedItems.value.map((r) => r.age)).toEqual([25, 30, 35]);
    });

    it('sorts numeric columns in descending order', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [{ key: 'age', label: 'Age', sortable: true }],
        items,
      });

      ctrl.sortBy('age');
      ctrl.sortBy('age');

      expect(ctrl.sortedItems.value.map((r) => r.age)).toEqual([35, 30, 25]);
    });

    it('does not mutate the original items array', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [{ key: 'age', label: 'Age', sortable: true }],
        items,
      });

      ctrl.sortBy('age');

      expect(items.value[0].age).toBe(30);
    });
  });

  describe('string sort', () => {
    it('sorts string columns in ascending order', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [{ key: 'name', label: 'Name', sortable: true }],
        items,
      });

      ctrl.sortBy('name');

      expect(ctrl.sortedItems.value.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('custom sortValue', () => {
    it('uses sortValue when provided', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createSortControl({
        columns: () => [
          {
            key: 'name',
            label: 'Name',
            sortable: true,
            sortValue: (r: Row) => r.name.length,
          },
        ],
        items,
      });

      ctrl.sortBy('name');

      const sorted = ctrl.sortedItems.value;

      expect(sorted[0].name).toBe('Bob');
      expect(sorted[sorted.length - 1].name).toBe('Charlie');
    });
  });

  describe('onSortChange callback', () => {
    it('fires onSortChange with the new sort state', () => {
      const items = signal<Row[]>(ROWS);
      const onSortChange = vi.fn();
      const ctrl = createSortControl({
        columns: () => [{ key: 'name', label: 'Name', sortable: true }],
        items,
        onSortChange,
      });

      ctrl.sortBy('name');

      expect(onSortChange).toHaveBeenCalledWith({ direction: 'asc', key: 'name' });
    });

    it('fires onSortChange when sort is cleared (back to none)', () => {
      const items = signal<Row[]>(ROWS);
      const onSortChange = vi.fn();
      const ctrl = createSortControl({
        columns: () => [{ key: 'name', label: 'Name', sortable: true }],
        items,
        onSortChange,
      });

      ctrl.sortBy('name');
      ctrl.sortBy('name');
      ctrl.sortBy('name');

      expect(onSortChange).toHaveBeenLastCalledWith({ direction: 'none', key: '' });
    });
  });

  describe('undefined / null values in column data', () => {
    it('treats undefined values as empty string in string sort', () => {
      const rows = [
        { age: 0, id: '1', name: 'Charlie' },
        { age: 0, id: '2', name: undefined as unknown as string },
        { age: 0, id: '3', name: 'Alice' },
      ];
      const items = signal(rows);
      const ctrl = createSortControl({
        columns: () => [{ key: 'name', label: 'Name', sortable: true }],
        items,
      });

      ctrl.sortBy('name');

      const sorted = ctrl.sortedItems.value;

      expect(sorted[0].name).toBeUndefined();
      expect(sorted[sorted.length - 1].name).toBe('Charlie');
    });
  });
});
