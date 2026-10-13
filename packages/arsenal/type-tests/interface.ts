import { sort } from '../src/array/sort.js';

// An interface has no implicit index signature: this is the strict case.
interface Row {
  nested: { value: string };
  when: Date;
}

const rows: Row[] = [
  { nested: { value: 'b' }, when: new Date(2) },
  { nested: { value: 'a' }, when: new Date(1) },
];
export const ordered: Row[] = sort(rows, [{ key: 'nested.value' }, { key: 'when' }]);
